type PrupruServiceTypeId =
	| 'whatsapp'
	| 'notion'
	| 'gmail'
	| 'outlook'
	| 'teams'
	| 'discord'
	| 'instagram'
	| 'chatgpt'
	| 'claude'
	| 'custom';

type PrupruTheme = 'system' | 'light' | 'dark';

/** One signed-in service; its id also names the isolated session partition. */
interface PrupruAccount {
	id: string;
	name: string;
	type: PrupruServiceTypeId;
	/** Unload the service from memory after a while unused; it stops receiving notifications while asleep. */
	autoHibernate: boolean;
	/** Silence this account's notifications and background sounds. */
	isMuted: boolean;
	/** Address of a custom site; only for the "custom" type. */
	url?: string;
	/** Folder the account sits in; null keeps it above the folders. */
	folderId: string | null;
}

/** A named group of accounts in the sidebar, such as "Trabalho" or "Pessoal". */
interface PrupruFolder {
	id: string;
	name: string;
	isCollapsed: boolean;
}

/** Fields of a folder that can change. */
interface PrupruFolderChanges {
	name?: string;
	isCollapsed?: boolean;
}

/** Where one account sits after a drag: its folder, in the order of the list. */
interface PrupruAccountPlacement {
	id: string;
	folderId: string | null;
}

/** What the sidebar needs to list and draw a service. */
interface PrupruServiceSummary {
	id: PrupruServiceTypeId;
	label: string;
	color: string;
	hibernateByDefault: boolean;
	/** Bundled service icon, shown before an account's own favicon loads. */
	iconDataUrl: string | null;
}

/** Data the add modal sends. */
interface PrupruNewAccount {
	type: PrupruServiceTypeId;
	name: string;
	autoHibernate: boolean;
	url?: string;
	folderId: string | null;
}

/** Fields the account modal can change. */
interface PrupruAccountChanges {
	name: string;
	autoHibernate: boolean;
	isMuted: boolean;
	url?: string;
	folderId: string | null;
}

/** Do not disturb: a pause until a moment and/or a daily quiet period ("HH:MM", may cross midnight). */
interface PrupruDoNotDisturb {
	until: number | null;
	isScheduleEnabled: boolean;
	scheduleStart: string;
	scheduleEnd: string;
}

/** Snapshot the main process sends to the sidebar after every change. */
interface PrupruState {
	accounts: PrupruAccount[];
	folders: PrupruFolder[];
	activeId: string | null;
	unread: Record<string, number>;
	favicons: Record<string, string>;
	/** Accounts currently unloaded from memory. */
	hibernatedIds: string[];
	serviceTypes: PrupruServiceSummary[];
	sidebarCollapsed: boolean;
	/** Width of the expanded sidebar, chosen by dragging its edge. */
	sidebarWidth: number;
	sidebarWidthRange: { min: number; max: number; default: number };
	theme: PrupruTheme;
	isOpenAtLogin: boolean;
	doNotDisturb: PrupruDoNotDisturb;
	isDoNotDisturbActive: boolean;
}

/** Bridge the sidebar preload exposes as `window.prupru`. */
interface PrupruApi {
	getState(): Promise<PrupruState>;
	/** Resolves to false when the custom site address is invalid. */
	addAccount(newAccount: PrupruNewAccount): Promise<boolean>;
	/** Resolves to false when the custom site address is invalid. */
	updateAccount(id: string, changes: PrupruAccountChanges): Promise<boolean>;
	removeAccount(id: string): Promise<void>;
	/** Applies the full list order and folders after a drag. */
	arrangeAccounts(placements: PrupruAccountPlacement[]): Promise<void>;
	createFolder(folderName: string): Promise<string>;
	updateFolder(id: string, changes: PrupruFolderChanges): Promise<void>;
	/** Deletes the folder; its accounts move above the folders. */
	deleteFolder(id: string): Promise<void>;
	reorderFolders(ids: string[]): Promise<void>;
	selectAccount(id: string): Promise<void>;
	hibernateAccount(id: string): Promise<void>;
	reloadAccount(id: string): Promise<void>;
	/** Hides the service views while a modal is open; returns a picture of the active service to blur behind it. */
	setModalOpen(isOpen: boolean): Promise<string | null>;
	setSidebarCollapsed(isCollapsed: boolean): Promise<void>;
	/** Follows the sidebar edge while it is dragged; `isFinal` on release saves the width. */
	resizeSidebar(width: number, isFinal: boolean): void;
	setTheme(theme: PrupruTheme): Promise<void>;
	setOpenAtLogin(isEnabled: boolean): Promise<void>;
	setDoNotDisturb(doNotDisturb: PrupruDoNotDisturb): Promise<void>;
	setBadge(dataUrl: string | null, total: number): void;
	onStateChanged(listener: (state: PrupruState) => void): void;
}

interface Window {
	prupru: PrupruApi;
	prupruAccount: { notifyClick(): void; isMuted(): boolean };
}
