import * as fs from 'node:fs';
import * as path from 'node:path';

export interface ServiceType {
	id: PrupruServiceTypeId;
	label: string;
	/** Avatar color in the sidebar until the page favicon loads. */
	color: string;
	url: string;
	/** Domains (subdomains included) that stay inside the app; any other link opens in the default browser. */
	hosts: string[];
	/** Reads the unread counter from the page title; null when the service does not put one there. */
	unreadPattern: RegExp | null;
	/** Messaging services stay awake by default, since a sleeping service gets no notifications. */
	hibernateByDefault: boolean;
}

const SERVICE_ICONS_DIRECTORY = path.join(__dirname, '..', 'assets', 'services');
const ICON_MIME_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.gif': 'image/gif',
	'.jpg': 'image/jpeg',
};

/** Sign-in pages shared by several services ("Continue with Google/Microsoft/Apple"). */
const LOGIN_HOSTS = ['accounts.google.com', 'login.microsoftonline.com', 'login.live.com', 'appleid.apple.com'];
/** Titles such as "(3) WhatsApp". */
const TITLE_PREFIX_COUNT = /^\((\d+)\)/;

export const SERVICE_TYPES: readonly ServiceType[] = [
	{
		id: 'whatsapp',
		label: 'WhatsApp',
		color: '#25d366',
		url: 'https://web.whatsapp.com/',
		hosts: ['web.whatsapp.com'],
		unreadPattern: TITLE_PREFIX_COUNT,
		hibernateByDefault: false,
	},
	{
		id: 'notion',
		label: 'Notion',
		color: '#5f5e5b',
		url: 'https://www.notion.so/',
		hosts: ['notion.so', 'notion.com'],
		unreadPattern: TITLE_PREFIX_COUNT,
		hibernateByDefault: true,
	},
	{
		id: 'gmail',
		label: 'Gmail',
		color: '#ea4335',
		url: 'https://mail.google.com/',
		hosts: ['mail.google.com', 'googleusercontent.com'],
		// "Inbox (12) - name@gmail.com - Gmail": the counter sits before the first dash.
		unreadPattern: /^[^-]*?\((\d+)\)/,
		hibernateByDefault: false,
	},
	{
		id: 'outlook',
		label: 'Outlook',
		color: '#0078d4',
		url: 'https://outlook.office.com/mail/',
		hosts: ['outlook.office.com', 'outlook.office365.com', 'outlook.live.com', 'outlook.cloud.microsoft'],
		unreadPattern: null,
		hibernateByDefault: false,
	},
	{
		id: 'teams',
		label: 'Teams',
		color: '#6264a7',
		url: 'https://teams.microsoft.com/',
		hosts: ['teams.microsoft.com', 'teams.live.com', 'teams.cloud.microsoft'],
		unreadPattern: TITLE_PREFIX_COUNT,
		hibernateByDefault: false,
	},
	{
		id: 'discord',
		label: 'Discord',
		color: '#5865f2',
		url: 'https://discord.com/app',
		hosts: ['discord.com'],
		unreadPattern: TITLE_PREFIX_COUNT,
		hibernateByDefault: false,
	},
	{
		id: 'instagram',
		label: 'Instagram',
		color: '#e1306c',
		url: 'https://www.instagram.com/',
		hosts: ['instagram.com', 'facebook.com'],
		unreadPattern: TITLE_PREFIX_COUNT,
		hibernateByDefault: true,
	},
	{
		id: 'chatgpt',
		label: 'ChatGPT',
		color: '#10a37f',
		url: 'https://chatgpt.com/',
		hosts: ['chatgpt.com', 'openai.com'],
		unreadPattern: null,
		hibernateByDefault: true,
	},
	{
		id: 'claude',
		label: 'Claude',
		color: '#d97757',
		url: 'https://claude.ai/',
		hosts: ['claude.ai', 'anthropic.com'],
		unreadPattern: null,
		hibernateByDefault: true,
	},
	{
		// Address and domain come from each account; see resolveServiceType.
		id: 'custom',
		label: 'Site personalizado',
		color: '#64748b',
		url: '',
		hosts: [],
		unreadPattern: TITLE_PREFIX_COUNT,
		hibernateByDefault: true,
	},
];

/**
 * Checks whether a value names a service of the catalog.
 * @param value Value read from disk or IPC.
 * @returns True for a known service type id.
 */
export function isServiceTypeId(value: unknown): value is PrupruServiceTypeId {
	return SERVICE_TYPES.some((serviceType) => serviceType.id === value);
}

/**
 * Looks up a service type, falling back to WhatsApp.
 * @param id Service type id.
 * @returns The catalog entry.
 */
export function getServiceType(id: PrupruServiceTypeId): ServiceType {
	return SERVICE_TYPES.find((serviceType) => serviceType.id === id) ?? SERVICE_TYPES[0];
}

/**
 * Turns what the user typed into a web address, adding "https://" when missing.
 * @param input Address typed in the modal.
 * @returns The normalized address, or null when it is not a web address.
 */
export function normalizeSiteUrl(input: string): string | null {
	const trimmedInput = input.trim();
	if (!trimmedInput) {
		return null;
	}
	const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedInput) ? trimmedInput : `https://${trimmedInput}`;
	try {
		const url = new URL(withProtocol);
		const isWebAddress = url.protocol === 'https:' || url.protocol === 'http:';
		return isWebAddress && url.hostname.includes('.') ? url.href : null;
	} catch {
		return null;
	}
}

/**
 * Returns the domain a custom site keeps inside the app, without a leading "www.".
 * @param url Normalized site address.
 * @returns The domain.
 */
export function getSiteDomain(url: string): string {
	return new URL(url).hostname.replace(/^www\./, '');
}

/**
 * Returns the service an account runs; a custom site gets its own address and domain.
 * @param account Account to resolve.
 * @returns The service definition.
 */
export function resolveServiceType(account: PrupruAccount): ServiceType {
	const serviceType = getServiceType(account.type);
	if (account.type !== 'custom' || !account.url) {
		return serviceType;
	}
	return { ...serviceType, url: account.url, hosts: [getSiteDomain(account.url)] };
}

/**
 * Tells whether a link belongs to the service (or to a sign-in page) and should open inside the app.
 * @param serviceType Service that owns the page.
 * @param url Link being opened.
 * @returns True when the link stays inside the app.
 */
export function isInternalUrl(serviceType: ServiceType, url: string): boolean {
	try {
		const { protocol, hostname } = new URL(url);
		// Custom sites may be plain http (an intranet, for instance); catalog services are always https.
		const isAllowedProtocol = protocol === 'https:' || (serviceType.id === 'custom' && protocol === 'http:');
		if (!isAllowedProtocol) {
			return false;
		}
		return [...serviceType.hosts, ...LOGIN_HOSTS].some((host) => hostname === host || hostname.endsWith(`.${host}`));
	} catch {
		return false;
	}
}

/**
 * Reads a service's unread counter from its page title.
 * @param serviceType Service that owns the page.
 * @param title Page title.
 * @returns Unread items, or 0 when the service shows none.
 */
export function parseUnreadCount(serviceType: ServiceType, title: string): number {
	const match = serviceType.unreadPattern?.exec(title);
	return match ? Number(match[1]) : 0;
}

/**
 * Reads the bundled icons of every service (saved by scripts/fetchServiceIcons.cjs) as data URLs.
 * @returns Icons keyed by service type id; a service without a file is left out.
 */
function loadServiceIcons(): Map<PrupruServiceTypeId, string> {
	const icons = new Map<PrupruServiceTypeId, string>();
	let iconFiles: string[] = [];
	try {
		iconFiles = fs.readdirSync(SERVICE_ICONS_DIRECTORY);
	} catch {
		return icons;
	}
	for (const serviceType of SERVICE_TYPES) {
		const iconFile = iconFiles.find((file) => path.parse(file).name === serviceType.id);
		const mimeType = iconFile ? ICON_MIME_TYPES[path.extname(iconFile)] : undefined;
		if (iconFile && mimeType) {
			const content = fs.readFileSync(path.join(SERVICE_ICONS_DIRECTORY, iconFile)).toString('base64');
			icons.set(serviceType.id, `data:${mimeType};base64,${content}`);
		}
	}
	return icons;
}

let serviceIcons: Map<PrupruServiceTypeId, string> | null = null;

/**
 * Builds what the sidebar needs to list and draw every service, in catalog order.
 * @returns One summary per service.
 */
export function summarizeServiceTypes(): PrupruServiceSummary[] {
	serviceIcons ??= loadServiceIcons();
	const icons = serviceIcons;
	return SERVICE_TYPES.map(({ id, label, color, hibernateByDefault }) => ({
		id,
		label,
		color,
		hibernateByDefault,
		iconDataUrl: icons.get(id) ?? null,
	}));
}
