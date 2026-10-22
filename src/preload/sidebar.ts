import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';

const prupruApi: PrupruApi = {
	getState: (): Promise<PrupruState> => ipcRenderer.invoke('state:get') as Promise<PrupruState>,
	addAccount: (newAccount: PrupruNewAccount): Promise<boolean> =>
		ipcRenderer.invoke('accounts:add', newAccount) as Promise<boolean>,
	updateAccount: (id: string, changes: PrupruAccountChanges): Promise<boolean> =>
		ipcRenderer.invoke('accounts:update', id, changes) as Promise<boolean>,
	removeAccount: (id: string): Promise<void> => ipcRenderer.invoke('accounts:remove', id) as Promise<void>,
	arrangeAccounts: (placements: PrupruAccountPlacement[]): Promise<void> =>
		ipcRenderer.invoke('accounts:arrange', placements) as Promise<void>,
	createFolder: (folderName: string): Promise<string> =>
		ipcRenderer.invoke('folders:create', folderName) as Promise<string>,
	updateFolder: (id: string, changes: PrupruFolderChanges): Promise<void> =>
		ipcRenderer.invoke('folders:update', id, changes) as Promise<void>,
	deleteFolder: (id: string): Promise<void> => ipcRenderer.invoke('folders:delete', id) as Promise<void>,
	reorderFolders: (ids: string[]): Promise<void> => ipcRenderer.invoke('folders:reorder', ids) as Promise<void>,
	selectAccount: (id: string): Promise<void> => ipcRenderer.invoke('accounts:select', id) as Promise<void>,
	hibernateAccount: (id: string): Promise<void> => ipcRenderer.invoke('accounts:hibernate', id) as Promise<void>,
	reloadAccount: (id: string): Promise<void> => ipcRenderer.invoke('accounts:reload', id) as Promise<void>,
	setModalOpen: (isOpen: boolean): Promise<string | null> =>
		ipcRenderer.invoke('modal:set-open', isOpen) as Promise<string | null>,
	setSidebarCollapsed: (isCollapsed: boolean): Promise<void> =>
		ipcRenderer.invoke('sidebar:set-collapsed', isCollapsed) as Promise<void>,
	resizeSidebar: (width: number, isFinal: boolean): void => ipcRenderer.send('sidebar:resize', width, isFinal),
	setTheme: (theme: PrupruTheme): Promise<void> => ipcRenderer.invoke('settings:set-theme', theme) as Promise<void>,
	setOpenAtLogin: (isEnabled: boolean): Promise<void> =>
		ipcRenderer.invoke('settings:set-open-at-login', isEnabled) as Promise<void>,
	setDoNotDisturb: (doNotDisturb: PrupruDoNotDisturb): Promise<void> =>
		ipcRenderer.invoke('settings:set-do-not-disturb', doNotDisturb) as Promise<void>,
	setBadge: (dataUrl: string | null, total: number): void => ipcRenderer.send('badge:set', dataUrl, total),
	onStateChanged: (listener: (state: PrupruState) => void): void => {
		ipcRenderer.on('state:changed', (_event: IpcRendererEvent, state: PrupruState) => listener(state));
	},
};

contextBridge.exposeInMainWorld('prupru', prupruApi);
