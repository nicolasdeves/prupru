import {
	app,
	BrowserWindow,
	dialog,
	ipcMain,
	Menu,
	nativeImage,
	nativeTheme,
	session,
	shell,
	Tray,
	WebContentsView,
} from 'electron';
import type { Session, WebContents } from 'electron';
import { randomUUID } from 'node:crypto';
import * as path from 'node:path';
import { DEFAULT_DO_NOT_DISTURB, isTheme, loadStore, parseDoNotDisturb, saveStore } from './accountStore.js';
import { migrateLegacyUserData } from './legacyDataMigration.js';
import { getLogPath, writeLog } from './logger.js';
import {
	getServiceType,
	getSiteDomain,
	isInternalUrl,
	isServiceTypeId,
	normalizeSiteUrl,
	parseUnreadCount,
	resolveServiceType,
	summarizeServiceTypes,
} from './serviceCatalog.js';

const APP_ID = 'br.com.prupru';
const APP_TITLE = 'Prupru';
/** The expanded width is sent to the sidebar page; the collapsed one must match `--sidebar-collapsed-width`. */
const SIDEBAR_WIDTH_RANGE = { min: 180, max: 380, default: 220 };
const SIDEBAR_COLLAPSED_WIDTH = 68;
/** Must match the width transition of `.sidebar` in renderer/styles.css. */
const SIDEBAR_ANIMATION_MS = 220;
const ANIMATION_FRAME_MS = 16;
const SNAPSHOT_TIMEOUT_MS = 400;
const HIBERNATE_AFTER_MS = 15 * 60 * 1000;
const PERIODIC_CHECK_INTERVAL_MS = 60 * 1000;
/** Passed by the Windows startup entry, so the app starts in the tray instead of opening its window. */
const HIDDEN_START_ARGUMENT = '--hidden';
/** Must match `--background` of each theme in renderer/styles.css, to avoid a flash while the page loads. */
const WINDOW_BACKGROUND = { dark: '#1c1c20', light: '#efeff1' };
/** WhatsApp Web and Google sign-in refuse browsers they do not recognise, so every service sees plain Chrome. */
const CHROME_USER_AGENT = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
const ALLOWED_PERMISSIONS = new Set<string>(['notifications', 'media', 'clipboard-sanitized-write', 'fullscreen']);
const ICON_PATH = path.join(__dirname, '..', 'assets', 'icon.png');

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let accounts: PrupruAccount[] = [];
let folders: PrupruFolder[] = [];
let activeId: string | null = null;
let sidebarCollapsed = false;
/** Width of the expanded sidebar, set by dragging its edge. */
let sidebarWidth = SIDEBAR_WIDTH_RANGE.default;
/** Width the service views are placed at; differs from the target only while the sidebar slides or is dragged. */
let displayedSidebarWidth = SIDEBAR_WIDTH_RANGE.default;
let sidebarAnimationTimer: NodeJS.Timeout | null = null;
/** Fixed width of the service view while the sidebar slides; null outside the animation. */
let slidingViewWidth: number | null = null;
let theme: PrupruTheme = 'system';
let doNotDisturb: PrupruDoNotDisturb = DEFAULT_DO_NOT_DISTURB;
let wasDoNotDisturbActive = false;
let isModalOpen = false;
/** Set once accounts.json (or its backup) was read; saving before that could overwrite the user's accounts. */
let isStoreLoaded = false;
/** Loaded accounts only; an account missing here is hibernated. */
const views = new Map<string, WebContentsView>();
const unread = new Map<string, number>();
const favicons = new Map<string, string>();
/** When each account stopped being the one on screen. */
const lastUsedAt = new Map<string, number>();

/**
 * Converts "HH:MM" into minutes since midnight.
 * @param clock Time of day.
 * @returns Minutes, or null when the text is not a valid time.
 */
function parseClockMinutes(clock: string): number | null {
	const match = /^(\d{2}):(\d{2})$/.exec(clock);
	if (!match) {
		return null;
	}
	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/**
 * Tells whether do not disturb is on, by a pause or by the daily schedule.
 * @param now Moment to check.
 * @returns True while notifications must stay silent.
 */
function isDoNotDisturbActive(now = new Date()): boolean {
	if (doNotDisturb.until !== null && doNotDisturb.until > now.getTime()) {
		return true;
	}
	if (!doNotDisturb.isScheduleEnabled) {
		return false;
	}
	const start = parseClockMinutes(doNotDisturb.scheduleStart);
	const end = parseClockMinutes(doNotDisturb.scheduleEnd);
	if (start === null || end === null || start === end) {
		return false;
	}
	const minutesNow = now.getHours() * 60 + now.getMinutes();
	// A period such as 19:00–08:00 crosses midnight.
	return start < end ? minutesNow >= start && minutesNow < end : minutesNow >= start || minutesNow < end;
}

/**
 * Tells whether an account must stay silent, by its own setting or by do not disturb.
 * @param id Account id.
 * @returns True when its notifications are suppressed.
 */
function isAccountSilenced(id: string): boolean {
	const account = accounts.find((candidate) => candidate.id === id);
	return Boolean(account?.isMuted) || isDoNotDisturbActive();
}

/**
 * Builds the arguments of the Windows startup entry; in development it must also point at the app folder.
 * @returns Command-line arguments.
 */
function getLoginItemArguments(): string[] {
	return app.isPackaged ? [HIDDEN_START_ARGUMENT] : [app.getAppPath(), HIDDEN_START_ARGUMENT];
}

/**
 * Reads whether the app is registered to start with Windows.
 * @returns True when registered.
 */
function isOpenAtLogin(): boolean {
	return app.getLoginItemSettings({ path: process.execPath, args: getLoginItemArguments() }).openAtLogin;
}

/**
 * Builds the snapshot of accounts, selection, counters, icons and preferences sent to the sidebar.
 * @returns The current state.
 */
function buildState(): PrupruState {
	return {
		accounts,
		folders,
		activeId,
		unread: Object.fromEntries(unread),
		favicons: Object.fromEntries(favicons),
		hibernatedIds: accounts.filter((account) => !views.has(account.id)).map((account) => account.id),
		serviceTypes: summarizeServiceTypes(),
		sidebarCollapsed,
		sidebarWidth,
		sidebarWidthRange: SIDEBAR_WIDTH_RANGE,
		theme,
		isOpenAtLogin: isOpenAtLogin(),
		doNotDisturb,
		isDoNotDisturbActive: isDoNotDisturbActive(),
	};
}

/** Sends the current state to the sidebar. */
function broadcastState(): void {
	mainWindow?.webContents.send('state:changed', buildState());
}

/**
 * Saves the account list, selection and preferences to disk. Until the saved file was read successfully
 * nothing is written: the empty lists in memory would replace the user's accounts.
 */
function persistAccounts(): void {
	if (!isStoreLoaded) {
		writeLog('WARN', 'Skipped a save because the account file has not been read');
		return;
	}
	try {
		saveStore({ accounts, folders, activeId, sidebarCollapsed, sidebarWidth, theme, doNotDisturb });
	} catch (error) {
		writeLog('ERROR', 'Could not save accounts.json', error);
	}
}

/**
 * Sums the unread counters of every account.
 * @returns Total unread chats.
 */
function getTotalUnread(): number {
	let total = 0;
	for (const count of unread.values()) {
		total += count;
	}
	return total;
}

/** Updates the tray tooltip with the unread total and the do not disturb status. */
function refreshTrayTooltip(): void {
	const total = getTotalUnread();
	const unreadText = total > 0 ? ` — ${total} não lidas` : '';
	const silenceText = isDoNotDisturbActive() ? ' (não perturbe)' : '';
	tray?.setToolTip(`${APP_TITLE}${unreadText}${silenceText}`);
}

/**
 * Mutes the sounds of silenced accounts that are off screen; the one on screen keeps playing audio and calls.
 */
function refreshAudioMuting(): void {
	for (const [id, view] of views) {
		view.webContents.setAudioMuted(id !== activeId && isAccountSilenced(id));
	}
}

/**
 * Stores an account's unread counter and propagates it when it changed.
 * @param id Account id.
 * @param count Unread chats read from the title.
 */
function setUnreadCount(id: string, count: number): void {
	if (unread.get(id) === count) {
		return;
	}
	unread.set(id, count);
	broadcastState();
	refreshTrayTooltip();
}

/**
 * Stores the favicon a service page announced, so the sidebar can show it.
 * @param id Account id.
 * @param faviconUrls Favicons listed by the page, best first.
 */
function setFavicon(id: string, faviconUrls: string[]): void {
	const faviconUrl = faviconUrls.find((url) => url.startsWith('https://') || url.startsWith('data:image/'));
	if (!faviconUrl || favicons.get(id) === faviconUrl) {
		return;
	}
	favicons.set(id, faviconUrl);
	broadcastState();
}

/**
 * Opens a link in the default browser, only for web addresses.
 * @param url Link clicked inside a service.
 */
function openExternalLink(url: string): void {
	if (url.startsWith('https://') || url.startsWith('http://')) {
		void shell.openExternal(url);
	}
}

/** Places every loaded view right of the sidebar and shows only the active one, unless a modal covers it. */
function layoutViews(): void {
	if (!mainWindow) {
		return;
	}
	const { width, height } = mainWindow.getContentBounds();
	const viewWidth = slidingViewWidth ?? Math.max(width - displayedSidebarWidth, 0);
	const bounds = { x: displayedSidebarWidth, y: 0, width: viewWidth, height };
	for (const [id, view] of views) {
		const isOnScreen = id === activeId && !isModalOpen;
		// While the sidebar slides, only the service on screen moves; the others catch up at the end.
		if (isOnScreen || slidingViewWidth === null) {
			view.setBounds(bounds);
		}
		view.setVisible(isOnScreen);
	}
}

/**
 * Grants the services the permissions they need (notifications, microphone and camera) and denies the rest.
 * @param accountSession Session of one account partition.
 */
function configureSession(accountSession: Session): void {
	accountSession.setPermissionRequestHandler((_webContents, permission, callback) => {
		callback(ALLOWED_PERMISSIONS.has(permission));
	});
	accountSession.setPermissionCheckHandler((_webContents, permission) => ALLOWED_PERMISSIONS.has(permission));
}

/**
 * Creates the isolated view that runs one account's web app.
 * @param account Account to load.
 */
function createAccountView(account: PrupruAccount): void {
	if (!mainWindow) {
		return;
	}
	const serviceType = resolveServiceType(account);
	const partition = `persist:${account.id}`;
	configureSession(session.fromPartition(partition));
	const view = new WebContentsView({
		webPreferences: {
			partition,
			preload: path.join(__dirname, 'preload', 'account.js'),
			contextIsolation: true,
			sandbox: true,
		},
	});
	view.webContents.setUserAgent(CHROME_USER_AGENT);
	// Sign-in popups ("Continue with Google") must stay in the app to share the account's session.
	view.webContents.setWindowOpenHandler(({ url }) => {
		if (isInternalUrl(serviceType, url)) {
			return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, icon: ICON_PATH } };
		}
		openExternalLink(url);
		return { action: 'deny' };
	});
	view.webContents.on('will-navigate', (event, url) => {
		if (!isInternalUrl(serviceType, url)) {
			event.preventDefault();
			openExternalLink(url);
		}
	});
	view.webContents.on('page-title-updated', (_event, title) => {
		setUnreadCount(account.id, parseUnreadCount(serviceType, title));
	});
	view.webContents.on('page-favicon-updated', (_event, faviconUrls) => {
		setFavicon(account.id, faviconUrls);
	});
	mainWindow.contentView.addChildView(view);
	views.set(account.id, view);
	lastUsedAt.set(account.id, Date.now());
	view.webContents.setAudioMuted(account.id !== activeId && isAccountSilenced(account.id));
	void view.webContents.loadURL(serviceType.url);
}

/**
 * Unloads an account from memory, keeping its login on disk. It wakes up when selected again.
 * @param id Account id.
 */
function hibernateAccount(id: string): void {
	const view = views.get(id);
	if (!view || !mainWindow) {
		return;
	}
	mainWindow.contentView.removeChildView(view);
	view.webContents.close();
	views.delete(id);
	// A sleeping page cannot update its counter, so an old number would mislead.
	unread.delete(id);
	broadcastState();
	refreshTrayTooltip();
}

/**
 * Loads a hibernated account again.
 * @param id Account id.
 */
function wakeAccount(id: string): void {
	const account = accounts.find((candidate) => candidate.id === id);
	if (!account || views.has(id)) {
		return;
	}
	createAccountView(account);
}

/** Hibernates the accounts with automatic hibernation that have been off screen for too long. */
function hibernateIdleAccounts(): void {
	const now = Date.now();
	for (const account of accounts) {
		const idleSince = lastUsedAt.get(account.id) ?? now;
		if (account.autoHibernate && account.id !== activeId && now - idleSince >= HIBERNATE_AFTER_MS) {
			hibernateAccount(account.id);
		}
	}
}

/** Notices when do not disturb starts or ends by itself (pause expired, schedule reached). */
function refreshDoNotDisturbStatus(): void {
	const isActive = isDoNotDisturbActive();
	if (isActive === wasDoNotDisturbActive) {
		return;
	}
	wasDoNotDisturbActive = isActive;
	refreshAudioMuting();
	refreshTrayTooltip();
	broadcastState();
}

/**
 * Finds which account a web contents belongs to.
 * @param sender Web contents that sent an IPC message.
 * @returns The account id, or null when it is not an account view.
 */
function findAccountIdBySender(sender: WebContents): string | null {
	for (const [id, view] of views) {
		if (view.webContents.id === sender.id) {
			return id;
		}
	}
	return null;
}

/**
 * Shows an account, waking it if it was hibernated, and remembers it as the last selected.
 * @param id Account id.
 */
function selectAccount(id: string): void {
	if (!accounts.some((account) => account.id === id)) {
		return;
	}
	if (activeId && activeId !== id) {
		lastUsedAt.set(activeId, Date.now());
	}
	activeId = id;
	wakeAccount(id);
	layoutViews();
	refreshAudioMuting();
	persistAccounts();
	broadcastState();
	views.get(id)?.webContents.focus();
}

/**
 * Picks the first free default name: "Gmail", then "Gmail 2", "Gmail 3"...
 * @param baseName Service label, or the domain of a custom site.
 * @returns A name no account uses yet.
 */
function getDefaultAccountName(baseName: string): string {
	const usedNames = new Set(accounts.map((account) => account.name));
	if (!usedNames.has(baseName)) {
		return baseName;
	}
	let sequence = 2;
	while (usedNames.has(`${baseName} ${sequence}`)) {
		sequence++;
	}
	return `${baseName} ${sequence}`;
}

/**
 * Adds a new account and selects it.
 * @param newAccount Service, name, hibernation choice and, for a custom site, its address.
 * @returns False when the custom site address is invalid.
 */
function addAccount(newAccount: PrupruNewAccount): boolean {
	let url: string | undefined;
	if (newAccount.type === 'custom') {
		const normalizedUrl = normalizeSiteUrl(newAccount.url ?? '');
		if (!normalizedUrl) {
			return false;
		}
		url = normalizedUrl;
	}
	const baseName = url ? getSiteDomain(url) : getServiceType(newAccount.type).label;
	const account: PrupruAccount = {
		id: randomUUID(),
		name: newAccount.name.trim() || getDefaultAccountName(baseName),
		type: newAccount.type,
		autoHibernate: newAccount.autoHibernate,
		isMuted: false,
		folderId: resolveFolderId(newAccount.folderId),
		...(url ? { url } : {}),
	};
	accounts = [...accounts, account];
	selectAccount(account.id);
	return true;
}

/**
 * Applies the changes made in the account modal; a blank name keeps the current one.
 * A custom site whose address changed is reloaded at the new address.
 * @param id Account id.
 * @param changes New name, hibernation, silence and, for a custom site, address.
 * @returns False when the custom site address is invalid.
 */
function updateAccount(id: string, changes: PrupruAccountChanges): boolean {
	const account = accounts.find((candidate) => candidate.id === id);
	if (!account) {
		return true;
	}
	let url = account.url;
	if (account.type === 'custom' && changes.url !== undefined) {
		const normalizedUrl = normalizeSiteUrl(changes.url);
		if (!normalizedUrl) {
			return false;
		}
		url = normalizedUrl;
	}
	const updatedAccount: PrupruAccount = {
		...account,
		name: changes.name.trim() || account.name,
		autoHibernate: changes.autoHibernate,
		isMuted: changes.isMuted,
		folderId: resolveFolderId(changes.folderId),
		...(url ? { url } : {}),
	};
	accounts = accounts.map((candidate) => (candidate.id === id ? updatedAccount : candidate));
	if (url !== account.url && views.has(id)) {
		// The view keeps the old domain in its navigation rules, so it is rebuilt.
		favicons.delete(id);
		hibernateAccount(id);
		wakeAccount(id);
		layoutViews();
	}
	refreshAudioMuting();
	persistAccounts();
	broadcastState();
	return true;
}

/**
 * Removes an account (the modal already asked for confirmation), logging it out of this computer
 * and erasing its local data.
 * @param id Account id.
 */
async function removeAccount(id: string): Promise<void> {
	if (!accounts.some((account) => account.id === id)) {
		return;
	}
	hibernateAccount(id);
	favicons.delete(id);
	lastUsedAt.delete(id);
	accounts = accounts.filter((account) => account.id !== id);
	if (activeId === id) {
		activeId = accounts[0]?.id ?? null;
		if (activeId) {
			wakeAccount(activeId);
		}
	}
	await session.fromPartition(`persist:${id}`).clearStorageData();
	layoutViews();
	refreshAudioMuting();
	persistAccounts();
	broadcastState();
	refreshTrayTooltip();
}

/**
 * Keeps a folder reference only when that folder exists.
 * @param folderId Folder chosen in a modal or by a drag.
 * @returns The folder id, or null for "no folder".
 */
function resolveFolderId(folderId: string | null): string | null {
	return folderId && folders.some((folder) => folder.id === folderId) ? folderId : null;
}

/**
 * Checks that a list holds every id of a collection exactly once.
 * @param ids Ids received from the sidebar.
 * @param existingIds Ids that exist now.
 * @returns True when it is a reordering of the same items.
 */
function isSameIdSet(ids: string[], existingIds: string[]): boolean {
	return ids.length === existingIds.length && new Set(ids).size === ids.length && ids.every((id) => existingIds.includes(id));
}

/**
 * Applies the order and folders the user dragged the accounts into.
 * @param placements Every account, in the new order, with its folder.
 */
function arrangeAccounts(placements: PrupruAccountPlacement[]): void {
	const ids = placements.map((placement) => placement.id);
	if (!isSameIdSet(ids, accounts.map((account) => account.id))) {
		return;
	}
	accounts = placements
		.map((placement) => {
			const account = accounts.find((candidate) => candidate.id === placement.id);
			return account ? { ...account, folderId: resolveFolderId(placement.folderId) } : undefined;
		})
		.filter((account) => account !== undefined);
	persistAccounts();
	broadcastState();
}

/**
 * Creates an empty folder at the end of the list.
 * @param folderName Name typed by the user; "Nova pasta" when blank.
 * @returns The new folder id.
 */
function createFolder(folderName: string): string {
	const folder: PrupruFolder = { id: randomUUID(), name: folderName.trim() || 'Nova pasta', isCollapsed: false };
	folders = [...folders, folder];
	persistAccounts();
	broadcastState();
	return folder.id;
}

/**
 * Renames a folder or opens/closes it; a blank name keeps the current one.
 * @param id Folder id.
 * @param changes Name and/or collapsed state.
 */
function updateFolder(id: string, changes: PrupruFolderChanges): void {
	folders = folders.map((folder) =>
		folder.id === id
			? {
					...folder,
					name: changes.name?.trim() || folder.name,
					isCollapsed: changes.isCollapsed ?? folder.isCollapsed,
				}
			: folder,
	);
	persistAccounts();
	broadcastState();
}

/**
 * Deletes a folder; its accounts are kept and move above the folders.
 * @param id Folder id.
 */
function deleteFolder(id: string): void {
	folders = folders.filter((folder) => folder.id !== id);
	accounts = accounts.map((account) => (account.folderId === id ? { ...account, folderId: null } : account));
	persistAccounts();
	broadcastState();
}

/**
 * Applies the order the user dragged the folders into.
 * @param ids Every folder id, in the new order.
 */
function reorderFolders(ids: string[]): void {
	if (!isSameIdSet(ids, folders.map((folder) => folder.id))) {
		return;
	}
	folders = ids.map((id) => folders.find((folder) => folder.id === id)).filter((folder) => folder !== undefined);
	persistAccounts();
	broadcastState();
}

/**
 * Takes a picture of a service for the modal backdrop. The picture is only decoration, so a capture that
 * fails or hangs (a page still loading, a minimized window) gives up quickly instead of blocking the modal.
 * @param view Service on screen.
 * @returns A JPEG data URL, or null.
 */
async function captureSnapshot(view: WebContentsView): Promise<string | null> {
	try {
		const image = await Promise.race([
			view.webContents.capturePage(),
			new Promise<null>((resolve) => setTimeout(() => resolve(null), SNAPSHOT_TIMEOUT_MS)),
		]);
		return image && !image.isEmpty() ? `data:image/jpeg;base64,${image.toJPEG(70).toString('base64')}` : null;
	} catch {
		return null;
	}
}

/**
 * Hides the service views while the sidebar shows a modal, since views are drawn above the page.
 * @param isOpen Whether a modal is opening.
 * @returns A picture of the active service for the modal backdrop, or null.
 */
async function setModalOpen(isOpen: boolean): Promise<string | null> {
	const activeView = activeId ? views.get(activeId) : undefined;
	const snapshot = isOpen && !isModalOpen && activeView ? await captureSnapshot(activeView) : null;
	isModalOpen = isOpen;
	layoutViews();
	return snapshot;
}

/**
 * Returns the width the sidebar should have now.
 * @returns The collapsed width, or the width the user chose.
 */
function getTargetSidebarWidth(): number {
	return sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : sidebarWidth;
}

/**
 * Keeps a sidebar width inside the allowed range.
 * @param width Width asked for.
 * @returns The width, limited to the range.
 */
function clampSidebarWidth(width: number): number {
	return Math.round(Math.min(Math.max(width, SIDEBAR_WIDTH_RANGE.min), SIDEBAR_WIDTH_RANGE.max));
}

/**
 * Follows the sidebar edge while the user drags it. During the drag the service view keeps the width it
 * would have with the narrowest sidebar and only moves, so the page is not relayouted on every step;
 * on release it gets its exact width and the choice is saved.
 * @param width Width under the pointer.
 * @param isFinal Whether the user released the edge.
 */
function resizeSidebar(width: number, isFinal: boolean): void {
	if (sidebarCollapsed) {
		return;
	}
	sidebarWidth = clampSidebarWidth(width);
	displayedSidebarWidth = sidebarWidth;
	const contentWidth = mainWindow?.getContentBounds().width ?? 0;
	slidingViewWidth = isFinal ? null : Math.max(contentWidth - SIDEBAR_WIDTH_RANGE.min, 0);
	layoutViews();
	if (isFinal) {
		persistAccounts();
		broadcastState();
	}
}

/**
 * Collapses the sidebar to icons only, or expands it back.
 * @param isCollapsed Whether the sidebar is collapsed.
 */
function setSidebarCollapsed(isCollapsed: boolean): void {
	sidebarCollapsed = isCollapsed;
	animateSidebarWidth();
	persistAccounts();
	broadcastState();
}

/**
 * Slides the service view to the new sidebar width with the same easing as the sidebar's CSS transition,
 * so both move together instead of the page jumping.
 */
function animateSidebarWidth(): void {
	if (sidebarAnimationTimer) {
		clearInterval(sidebarAnimationTimer);
	}
	const startWidth = displayedSidebarWidth;
	const targetWidth = getTargetSidebarWidth();
	const startedAt = Date.now();
	// Resizing a page like WhatsApp on every frame relayouts it each time and stutters. The view keeps the
	// larger width while it slides (its right edge just goes past the window), and is resized once at the end.
	const contentWidth = mainWindow?.getContentBounds().width ?? 0;
	slidingViewWidth = Math.max(contentWidth - Math.min(startWidth, targetWidth), 0);
	sidebarAnimationTimer = setInterval(() => {
		const progress = Math.min((Date.now() - startedAt) / SIDEBAR_ANIMATION_MS, 1);
		// Ease-out cubic, the same curve as --ease-out in the stylesheet.
		const easedProgress = 1 - Math.pow(1 - progress, 3);
		displayedSidebarWidth = Math.round(startWidth + (targetWidth - startWidth) * easedProgress);
		if (progress === 1 && sidebarAnimationTimer) {
			clearInterval(sidebarAnimationTimer);
			sidebarAnimationTimer = null;
			slidingViewWidth = null;
		}
		layoutViews();
	}, ANIMATION_FRAME_MS);
}

/** Paints the window background in the current theme, so resizing never flashes the other color. */
function refreshWindowBackground(): void {
	mainWindow?.setBackgroundColor(nativeTheme.shouldUseDarkColors ? WINDOW_BACKGROUND.dark : WINDOW_BACKGROUND.light);
}

/**
 * Switches between the system theme, light and dark. Services that follow the system theme switch too.
 * @param newTheme Chosen theme.
 */
function setTheme(newTheme: PrupruTheme): void {
	theme = newTheme;
	nativeTheme.themeSource = newTheme;
	persistAccounts();
	broadcastState();
}

/**
 * Registers or unregisters the app to start with Windows, minimized to the tray.
 * @param isEnabled Whether it starts with Windows.
 */
function setOpenAtLogin(isEnabled: boolean): void {
	app.setLoginItemSettings({ openAtLogin: isEnabled, path: process.execPath, args: getLoginItemArguments() });
	broadcastState();
}

/**
 * Saves the do not disturb settings and applies them right away.
 * @param newDoNotDisturb Pause and schedule.
 */
function setDoNotDisturb(newDoNotDisturb: PrupruDoNotDisturb): void {
	doNotDisturb = newDoNotDisturb;
	wasDoNotDisturbActive = isDoNotDisturbActive();
	refreshAudioMuting();
	refreshTrayTooltip();
	persistAccounts();
	broadcastState();
}

/**
 * Checks the object sent by the add modal.
 * @param value Value received over IPC.
 * @returns True when it has a known service, a name, a hibernation flag and an optional address.
 */
function isNewAccount(value: unknown): value is PrupruNewAccount {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		isServiceTypeId(record.type) &&
		typeof record.name === 'string' &&
		typeof record.autoHibernate === 'boolean' &&
		(record.url === undefined || typeof record.url === 'string') &&
		isFolderReference(record.folderId)
	);
}

/**
 * Checks a folder reference received over IPC.
 * @param value Value received.
 * @returns True for a string id or null.
 */
function isFolderReference(value: unknown): value is string | null {
	return value === null || typeof value === 'string';
}

/**
 * Checks the list sent after dragging accounts.
 * @param value Value received over IPC.
 * @returns True when every entry has an account id and a folder reference.
 */
function isAccountPlacementList(value: unknown): value is PrupruAccountPlacement[] {
	return (
		Array.isArray(value) &&
		value.every((entry: unknown) => {
			if (typeof entry !== 'object' || entry === null) {
				return false;
			}
			const record = entry as Record<string, unknown>;
			return typeof record.id === 'string' && isFolderReference(record.folderId);
		})
	);
}

/**
 * Checks the changes object sent by the folder modal or the collapse arrow.
 * @param value Value received over IPC.
 * @returns True when name and collapsed state are absent or of the right type.
 */
function isFolderChanges(value: unknown): value is PrupruFolderChanges {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		(record.name === undefined || typeof record.name === 'string') &&
		(record.isCollapsed === undefined || typeof record.isCollapsed === 'boolean')
	);
}

/**
 * Checks the changes object sent by the account modal.
 * @param value Value received over IPC.
 * @returns True when it has a name, the two flags and an optional address.
 */
function isAccountChanges(value: unknown): value is PrupruAccountChanges {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.name === 'string' &&
		typeof record.autoHibernate === 'boolean' &&
		typeof record.isMuted === 'boolean' &&
		(record.url === undefined || typeof record.url === 'string') &&
		isFolderReference(record.folderId)
	);
}

/**
 * Shows the unread total over the taskbar icon; the sidebar draws the image.
 * @param dataUrl PNG data URL of the badge, or null to clear it.
 * @param total Unread total, used as the accessibility description.
 */
function setTaskbarBadge(dataUrl: string | null, total: number): void {
	if (!mainWindow) {
		return;
	}
	const badge = dataUrl ? nativeImage.createFromDataURL(dataUrl) : null;
	mainWindow.setOverlayIcon(badge, total > 0 ? `${total} não lidas` : '');
}

/** Brings the window back from the tray or from behind other windows. */
function showMainWindow(): void {
	if (!mainWindow) {
		return;
	}
	if (mainWindow.isMinimized()) {
		mainWindow.restore();
	}
	mainWindow.show();
	mainWindow.focus();
}

/** Wires the sidebar and account views to the main process. */
function registerIpcHandlers(): void {
	ipcMain.handle('state:get', (): PrupruState => buildState());
	ipcMain.handle('accounts:add', (_event, newAccount: unknown): boolean =>
		isNewAccount(newAccount) ? addAccount(newAccount) : false,
	);
	ipcMain.handle('accounts:update', (_event, id: unknown, changes: unknown): boolean =>
		typeof id === 'string' && isAccountChanges(changes) ? updateAccount(id, changes) : false,
	);
	ipcMain.handle('accounts:remove', async (_event, id: unknown): Promise<void> => {
		if (typeof id === 'string') {
			await removeAccount(id);
		}
	});
	ipcMain.handle('accounts:arrange', (_event, placements: unknown): void => {
		if (isAccountPlacementList(placements)) {
			arrangeAccounts(placements);
		}
	});
	ipcMain.handle('folders:create', (_event, folderName: unknown): string =>
		createFolder(typeof folderName === 'string' ? folderName : ''),
	);
	ipcMain.handle('folders:update', (_event, id: unknown, changes: unknown): void => {
		if (typeof id === 'string' && isFolderChanges(changes)) {
			updateFolder(id, changes);
		}
	});
	ipcMain.handle('folders:delete', (_event, id: unknown): void => {
		if (typeof id === 'string') {
			deleteFolder(id);
		}
	});
	ipcMain.handle('folders:reorder', (_event, ids: unknown): void => {
		if (Array.isArray(ids) && ids.every((id) => typeof id === 'string')) {
			reorderFolders(ids);
		}
	});
	ipcMain.handle('accounts:select', (_event, id: unknown): void => {
		if (typeof id === 'string') {
			selectAccount(id);
		}
	});
	ipcMain.handle('accounts:hibernate', (_event, id: unknown): void => {
		if (typeof id === 'string') {
			hibernateAccount(id);
		}
	});
	ipcMain.handle('accounts:reload', (_event, id: unknown): void => {
		if (typeof id === 'string') {
			views.get(id)?.webContents.reload();
		}
	});
	ipcMain.handle(
		'modal:set-open',
		(_event, isOpen: unknown): Promise<string | null> => setModalOpen(isOpen === true),
	);
	ipcMain.handle('sidebar:set-collapsed', (_event, isCollapsed: unknown): void => {
		setSidebarCollapsed(isCollapsed === true);
	});
	// A plain message, not invoke: it fires on every pointer move while the edge is dragged.
	ipcMain.on('sidebar:resize', (_event, width: unknown, isFinal: unknown): void => {
		if (typeof width === 'number' && Number.isFinite(width)) {
			resizeSidebar(width, isFinal === true);
		}
	});
	ipcMain.handle('settings:set-theme', (_event, newTheme: unknown): void => {
		if (isTheme(newTheme)) {
			setTheme(newTheme);
		}
	});
	ipcMain.handle('settings:set-open-at-login', (_event, isEnabled: unknown): void => {
		setOpenAtLogin(isEnabled === true);
	});
	ipcMain.handle('settings:set-do-not-disturb', (_event, newDoNotDisturb: unknown): void => {
		setDoNotDisturb(parseDoNotDisturb(newDoNotDisturb));
	});
	ipcMain.on('badge:set', (_event, dataUrl: unknown, total: unknown): void => {
		setTaskbarBadge(typeof dataUrl === 'string' ? dataUrl : null, typeof total === 'number' ? total : 0);
	});
	// Synchronous: the account page asks right before showing a notification.
	ipcMain.on('account:is-silenced', (event): void => {
		const id = findAccountIdBySender(event.sender);
		event.returnValue = id ? isAccountSilenced(id) : false;
	});
	ipcMain.on('account:notification-clicked', (event): void => {
		const id = findAccountIdBySender(event.sender);
		showMainWindow();
		if (id) {
			selectAccount(id);
		}
	});
}

/**
 * Creates the window with the sidebar; accounts with automatic hibernation start asleep, except the active one.
 * @param isHidden Start in the tray, as when Windows starts the app.
 */
function createMainWindow(isHidden: boolean): void {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 820,
		minWidth: 820,
		minHeight: 520,
		title: APP_TITLE,
		icon: ICON_PATH,
		backgroundColor: nativeTheme.shouldUseDarkColors ? WINDOW_BACKGROUND.dark : WINDOW_BACKGROUND.light,
		show: false,
		webPreferences: {
			preload: path.join(__dirname, 'preload', 'sidebar.js'),
			contextIsolation: true,
			sandbox: true,
		},
	});
	if (!isHidden) {
		mainWindow.once('ready-to-show', () => mainWindow?.show());
	}
	mainWindow.on('resize', layoutViews);
	mainWindow.on('maximize', layoutViews);
	mainWindow.on('unmaximize', layoutViews);
	mainWindow.on('close', (event) => {
		if (!isQuitting) {
			event.preventDefault();
			mainWindow?.hide();
		}
	});
	void mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
	for (const account of accounts) {
		if (!account.autoHibernate || account.id === activeId) {
			createAccountView(account);
		}
	}
	layoutViews();
}

/** Creates the tray icon that keeps the app reachable while the window is hidden. */
function createTray(): void {
	tray = new Tray(nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16, quality: 'best' }));
	tray.setContextMenu(
		Menu.buildFromTemplate([
			{ label: `Abrir ${APP_TITLE}`, click: showMainWindow },
			{ type: 'separator' },
			{ label: 'Sair', click: (): void => app.quit() },
		]),
	);
	tray.on('click', showMainWindow);
	refreshTrayTooltip();
}

app.userAgentFallback = CHROME_USER_AGENT;
app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath);

if (!app.requestSingleInstanceLock()) {
	app.quit();
} else {
	// Monitors only record: Electron still handles the error as it would without them.
	process.on('uncaughtExceptionMonitor', (error) => writeLog('ERROR', 'Uncaught exception', error));
	process.on('unhandledRejection', (reason) => writeLog('ERROR', 'Unhandled promise rejection', reason));
	const migrationResult = migrateLegacyUserData();
	app.on('second-instance', showMainWindow);
	app.on('before-quit', () => {
		isQuitting = true;
	});
	app.on('window-all-closed', () => app.quit());
	void app.whenReady().then(async () => {
		if (migrationResult === 'failed') {
			await dialog.showMessageBox({
				type: 'warning',
				title: APP_TITLE,
				message: 'Não foi possível trazer as suas contas do Zap Hub.',
				detail: 'O Zap Hub ainda parece estar aberto. Feche-o pelo ícone ao lado do relógio (Sair) e abra o Prupru de novo.',
			});
			app.quit();
			return;
		}
		const loadResult = await loadStore();
		if (loadResult.status === 'unreadable') {
			// Opening empty here is what once made the accounts look gone; quitting keeps the files untouched.
			await dialog.showMessageBox({
				type: 'error',
				title: APP_TITLE,
				message: 'Não foi possível ler as suas contas.',
				detail: `Nada foi apagado. Feche esta mensagem e abra o Prupru de novo em alguns segundos. Se continuar acontecendo, envie o arquivo ${getLogPath()} para quem cuida do app.`,
			});
			app.quit();
			return;
		}
		const store = loadResult.store;
		isStoreLoaded = true;
		writeLog('INFO', `Started ${app.getVersion()}: ${loadResult.status}, ${store.accounts.length} accounts`);
		accounts = store.accounts;
		folders = store.folders;
		activeId = store.activeId;
		sidebarCollapsed = store.sidebarCollapsed;
		sidebarWidth = clampSidebarWidth(store.sidebarWidth ?? SIDEBAR_WIDTH_RANGE.default);
		displayedSidebarWidth = getTargetSidebarWidth();
		theme = store.theme;
		doNotDisturb = store.doNotDisturb;
		wasDoNotDisturbActive = isDoNotDisturbActive();
		nativeTheme.themeSource = theme;
		nativeTheme.on('updated', refreshWindowBackground);
		Menu.setApplicationMenu(null);
		registerIpcHandlers();
		createMainWindow(process.argv.includes(HIDDEN_START_ARGUMENT));
		createTray();
		setInterval(() => {
			hibernateIdleAccounts();
			refreshDoNotDisturbStatus();
		}, PERIODIC_CHECK_INTERVAL_MS);
	});
}
