import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('prupruAccount', {
	notifyClick: (): void => ipcRenderer.send('account:notification-clicked'),
	isMuted: (): boolean => ipcRenderer.sendSync('account:is-silenced') === true,
});

/**
 * Wraps the page's notifications: a click brings the window up on this account, and while the account
 * is silenced (muted or do not disturb) the page gets a notification object that never shows.
 */
contextBridge.executeInMainWorld({
	func: (): void => {
		const nativeNotification = window.Notification;
		window.Notification = new Proxy(nativeNotification, {
			construct(target, args): object {
				if (window.prupruAccount.isMuted()) {
					const silentNotification = new EventTarget();
					return Object.assign(silentNotification, {
						title: String(args[0] ?? ''),
						close: (): void => undefined,
					});
				}
				const notification = Reflect.construct(target, args) as Notification;
				notification.addEventListener('click', () => window.prupruAccount.notifyClick());
				return notification;
			},
			get(target, property): unknown {
				const value: unknown = Reflect.get(target, property, target);
				return typeof value === 'function' ? value.bind(target) : value;
			},
		});
	},
});
