import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { writeLog } from './logger.js';
import { getServiceType, isServiceTypeId, normalizeSiteUrl } from './serviceCatalog.js';

export interface AccountStore {
	accounts: PrupruAccount[];
	folders: PrupruFolder[];
	activeId: string | null;
	sidebarCollapsed: boolean;
	/** Null until the user drags the sidebar edge; the main process applies the default and the limits. */
	sidebarWidth: number | null;
	theme: PrupruTheme;
	doNotDisturb: PrupruDoNotDisturb;
}

export type StoreLoadResult =
	| { status: 'loaded' | 'first-run' | 'recovered-from-backup'; store: AccountStore }
	| { status: 'unreadable' };

export const DEFAULT_DO_NOT_DISTURB: PrupruDoNotDisturb = {
	until: null,
	isScheduleEnabled: false,
	scheduleStart: '19:00',
	scheduleEnd: '08:00',
};

const EMPTY_STORE: AccountStore = {
	accounts: [],
	folders: [],
	activeId: null,
	sidebarCollapsed: false,
	sidebarWidth: null,
	theme: 'system',
	doNotDisturb: DEFAULT_DO_NOT_DISTURB,
};

const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
/** About two seconds in total: long enough for an antivirus scan to let the file go. */
const READ_ATTEMPTS = 10;
const READ_RETRY_DELAY_MS = 200;

/**
 * Returns the path of the JSON file that keeps the account list.
 * @returns Absolute path inside the app's user data folder.
 */
function getStorePath(): string {
	return path.join(app.getPath('userData'), 'accounts.json');
}

/**
 * Turns a stored entry into an account, filling fields older versions did not save:
 * entries from before the service catalog were all WhatsApp, and hibernation follows the service default.
 * @param value Value read from the store file.
 * @returns The account, or null when the entry is not usable.
 */
function parseAccount(value: unknown): PrupruAccount | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.id !== 'string' || typeof record.name !== 'string') {
		return null;
	}
	const type = isServiceTypeId(record.type) ? record.type : 'whatsapp';
	const autoHibernate =
		typeof record.autoHibernate === 'boolean' ? record.autoHibernate : getServiceType(type).hibernateByDefault;
	const account: PrupruAccount = {
		id: record.id,
		name: record.name,
		type,
		autoHibernate,
		isMuted: record.isMuted === true,
		folderId: typeof record.folderId === 'string' ? record.folderId : null,
	};
	if (type === 'custom') {
		const url = typeof record.url === 'string' ? normalizeSiteUrl(record.url) : null;
		if (!url) {
			return null;
		}
		account.url = url;
	}
	return account;
}

/**
 * Turns a stored entry into a folder.
 * @param value Value read from the store file.
 * @returns The folder, or null when the entry has no string id and name.
 */
function parseFolder(value: unknown): PrupruFolder | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}
	const record = value as Record<string, unknown>;
	if (typeof record.id !== 'string' || typeof record.name !== 'string') {
		return null;
	}
	return { id: record.id, name: record.name, isCollapsed: record.isCollapsed === true };
}

/**
 * Reads the do not disturb settings, falling back to the defaults field by field.
 * @param value Value read from the store file.
 * @returns Valid do not disturb settings.
 */
export function parseDoNotDisturb(value: unknown): PrupruDoNotDisturb {
	if (typeof value !== 'object' || value === null) {
		return DEFAULT_DO_NOT_DISTURB;
	}
	const record = value as Record<string, unknown>;
	const readClock = (clock: unknown, fallback: string): string =>
		typeof clock === 'string' && CLOCK_PATTERN.test(clock) ? clock : fallback;
	return {
		until: typeof record.until === 'number' && Number.isFinite(record.until) ? record.until : null,
		isScheduleEnabled: record.isScheduleEnabled === true,
		scheduleStart: readClock(record.scheduleStart, DEFAULT_DO_NOT_DISTURB.scheduleStart),
		scheduleEnd: readClock(record.scheduleEnd, DEFAULT_DO_NOT_DISTURB.scheduleEnd),
	};
}

/**
 * Checks whether a value is one of the theme options.
 * @param value Value read from disk or IPC.
 * @returns True for "system", "light" or "dark".
 */
export function isTheme(value: unknown): value is PrupruTheme {
	return value === 'system' || value === 'light' || value === 'dark';
}

/**
 * Returns the path of the copy kept one save behind accounts.json.
 * @returns Absolute path of accounts.json.bak.
 */
function getBackupPath(): string {
	return `${getStorePath()}.bak`;
}

/**
 * Builds a fresh empty store, for the very first start.
 * @returns A store with no accounts and default preferences.
 */
function createEmptyStore(): AccountStore {
	return { ...EMPTY_STORE, accounts: [], folders: [] };
}

/**
 * Turns the content of a store file into a store.
 * @param content Text of accounts.json or its backup.
 * @returns The stored accounts, the account selected last and the app preferences.
 * @throws When the content is not a JSON object, so a damaged file is never mistaken for an empty one.
 */
function parseStore(content: string): AccountStore {
	const parsed: unknown = JSON.parse(content);
	if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
		throw new Error('The account file is not a JSON object');
	}
	const record = parsed as Record<string, unknown>;
	const folders = Array.isArray(record.folders) ? record.folders.map(parseFolder).filter((folder) => folder !== null) : [];
	const folderIds = new Set(folders.map((folder) => folder.id));
	// An account pointing at a folder that no longer exists goes back above the folders.
	const accounts = Array.isArray(record.accounts)
		? record.accounts
				.map(parseAccount)
				.filter((account) => account !== null)
				.map((account) =>
					account.folderId && !folderIds.has(account.folderId) ? { ...account, folderId: null } : account,
				)
		: [];
	const storedActiveId = record.activeId;
	const activeId =
		typeof storedActiveId === 'string' && accounts.some((account) => account.id === storedActiveId)
			? storedActiveId
			: (accounts[0]?.id ?? null);
	return {
		accounts,
		folders,
		activeId,
		sidebarCollapsed: record.sidebarCollapsed === true,
		sidebarWidth:
			typeof record.sidebarWidth === 'number' && Number.isFinite(record.sidebarWidth) ? record.sidebarWidth : null,
		theme: isTheme(record.theme) ? record.theme : 'system',
		doNotDisturb: parseDoNotDisturb(record.doNotDisturb),
	};
}

/**
 * Tells whether a read failed only because the file does not exist.
 * @param error Error thrown by the read.
 * @returns True for "file not found".
 */
function isMissingFileError(error: unknown): boolean {
	return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Reads one store file, trying again for a while: an antivirus scanning the file, or a save in progress,
 * can make a read fail for a moment.
 * @param filePath accounts.json or its backup.
 * @returns The store; "missing" when the file does not exist; null when it exists but could not be read.
 */
async function readStoreFile(filePath: string): Promise<AccountStore | 'missing' | null> {
	for (let attempt = 1; attempt <= READ_ATTEMPTS; attempt++) {
		try {
			return parseStore(await fs.promises.readFile(filePath, 'utf8'));
		} catch (error) {
			if (isMissingFileError(error)) {
				return 'missing';
			}
			writeLog('WARN', `Could not read ${path.basename(filePath)} (attempt ${attempt} of ${READ_ATTEMPTS})`, error);
			if (attempt < READ_ATTEMPTS) {
				await new Promise((resolve) => setTimeout(resolve, READ_RETRY_DELAY_MS));
			}
		}
	}
	return null;
}

/**
 * Reads the account list from disk. A missing file means a first start; a file that cannot be read is
 * replaced by its backup, and when neither can be read the caller must not save, or it would wipe them.
 * @returns The store and how it was obtained, or "unreadable".
 */
export async function loadStore(): Promise<StoreLoadResult> {
	const mainStore = await readStoreFile(getStorePath());
	if (mainStore !== null && mainStore !== 'missing') {
		return { status: 'loaded', store: mainStore };
	}
	const backupStore = await readStoreFile(getBackupPath());
	if (backupStore !== null && backupStore !== 'missing') {
		writeLog('WARN', `accounts.json is ${mainStore === 'missing' ? 'missing' : 'unreadable'}; using accounts.json.bak`);
		return { status: 'recovered-from-backup', store: backupStore };
	}
	if (mainStore === 'missing' && backupStore === 'missing') {
		return { status: 'first-run', store: createEmptyStore() };
	}
	writeLog('ERROR', 'Neither accounts.json nor accounts.json.bak could be read; nothing will be saved');
	return { status: 'unreadable' };
}

/**
 * Tells whether the current accounts.json can be read, so only a good file becomes the backup.
 * @param storePath Path of accounts.json.
 * @returns True when the file exists and parses.
 */
function isReadableStoreFile(storePath: string): boolean {
	try {
		parseStore(fs.readFileSync(storePath, 'utf8'));
		return true;
	} catch {
		return false;
	}
}

/**
 * Writes the account list to disk through a temporary file, so a crash never leaves it half written.
 * The version being replaced becomes accounts.json.bak, as long as it was readable.
 * @param store Accounts, selection and preferences to persist.
 */
export function saveStore(store: AccountStore): void {
	const storePath = getStorePath();
	const temporaryPath = `${storePath}.tmp`;
	fs.mkdirSync(path.dirname(storePath), { recursive: true });
	fs.writeFileSync(temporaryPath, JSON.stringify(store, null, 2), 'utf8');
	if (isReadableStoreFile(storePath)) {
		fs.copyFileSync(storePath, getBackupPath());
	}
	fs.renameSync(temporaryPath, storePath);
}
