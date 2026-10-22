// Saves each catalog service's favicon into assets/services/, so the add modal shows real icons
// before any account exists. Run with `npm run icons:services` (needs `npm run build` first).
const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.join(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'assets', 'services');
const { SERVICE_TYPES } = require(path.join(projectRoot, 'dist', 'serviceCatalog.js'));

/** Pages whose own favicon is better than the sign-in page they redirect to. */
const ICON_PAGES = {
	outlook: 'https://outlook.live.com/mail/',
};
/** Services whose pages, signed out, show a generic logo (Google, Microsoft) or none at all. */
const ICON_URLS = {
	gmail: 'https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico',
	teams: 'https://teams.microsoft.com/favicon.ico',
	discord: 'https://discord.com/assets/favicon.ico',
};
const EXTENSIONS = {
	'image/png': 'png',
	'image/svg+xml': 'svg',
	'image/webp': 'webp',
	'image/x-icon': 'ico',
	'image/vnd.microsoft.icon': 'ico',
	'image/gif': 'gif',
	'image/jpeg': 'jpg',
};

app.userAgentFallback = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;
app.on('window-all-closed', () => {});

/**
 * Loads a page in a throwaway session and resolves with the favicons it announces.
 * @param {string} pageUrl
 * @param {string} partition
 * @returns {Promise<string[]>}
 */
function discoverFavicons(pageUrl, partition) {
	return new Promise((resolve) => {
		const window = new BrowserWindow({ show: false, webPreferences: { partition } });
		let faviconUrls = [];
		window.webContents.on('page-favicon-updated', (_event, urls) => {
			faviconUrls = urls;
		});
		// Pages often swap the favicon after loading, so the last one announced within the wait wins.
		setTimeout(() => {
			window.destroy();
			resolve(faviconUrls);
		}, 12000);
		window.loadURL(pageUrl).catch(() => {});
	});
}

app.whenReady().then(async () => {
	fs.mkdirSync(outputDirectory, { recursive: true });
	for (const serviceType of SERVICE_TYPES) {
		if (serviceType.id === 'custom') {
			continue;
		}
		const partition = `icons-${serviceType.id}`;
		const faviconUrl =
			ICON_URLS[serviceType.id] ??
			(await discoverFavicons(ICON_PAGES[serviceType.id] ?? serviceType.url, partition)).find((url) =>
				url.startsWith('https://'),
			);
		if (!faviconUrl) {
			console.log(`${serviceType.id}: no favicon found`);
			continue;
		}
		const response = await session.fromPartition(partition).fetch(faviconUrl);
		const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
		const extension = EXTENSIONS[contentType];
		if (!response.ok || !extension) {
			console.log(`${serviceType.id}: skipped ${faviconUrl} (${response.status} ${contentType})`);
			continue;
		}
		for (const oldFile of fs.readdirSync(outputDirectory).filter((file) => file.startsWith(`${serviceType.id}.`))) {
			fs.rmSync(path.join(outputDirectory, oldFile));
		}
		const outputFile = path.join(outputDirectory, `${serviceType.id}.${extension}`);
		fs.writeFileSync(outputFile, Buffer.from(await response.arrayBuffer()));
		console.log(`${serviceType.id}: ${path.basename(outputFile)} from ${faviconUrl}`);
	}
	app.quit();
});
