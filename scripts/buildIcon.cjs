// Turns assets/icon-source.webp into the app icons: removes the white background around the drawing,
// crops it to a square and writes assets/icon.png (256px) and assets/icon.ico (16–256px).
// Run with `npm run icon`.
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const assetsDirectory = path.join(__dirname, '..', 'assets');
const sourcePath = path.join(assetsDirectory, 'icon-source.webp');
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];

/** Runs inside the page: canvas work needs a browser. Returns base64 PNGs keyed by size. */
const PAGE_SCRIPT = `
(async (sourceUrl, sizes) => {
	const image = new Image();
	image.src = sourceUrl;
	await image.decode();
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;
	const context = canvas.getContext('2d');
	context.drawImage(image, 0, 0);
	const { width, height } = canvas;
	const pixels = context.getImageData(0, 0, width, height);
	const data = pixels.data;

	// Flood fill from the borders through light pixels: only the background touching the edge is removed,
	// so the white beak and eyes inside the drawing stay.
	const isLight = (index) => Math.min(data[index], data[index + 1], data[index + 2]) > 200;
	const visited = new Uint8Array(width * height);
	const queue = [];
	for (let x = 0; x < width; x++) { queue.push(x, (height - 1) * width + x); }
	for (let y = 0; y < height; y++) { queue.push(y * width, y * width + width - 1); }
	while (queue.length) {
		const position = queue.pop();
		if (visited[position] || !isLight(position * 4)) { continue; }
		visited[position] = 1;
		const x = position % width;
		const y = (position - x) / width;
		if (x > 0) queue.push(position - 1);
		if (x < width - 1) queue.push(position + 1);
		if (y > 0) queue.push(position - width);
		if (y < height - 1) queue.push(position + width);
	}
	// Background pixels become transparent; the anti-aliased rim keeps a partial alpha with the white taken out.
	const shapeGray = 110;
	for (let position = 0; position < width * height; position++) {
		if (!visited[position]) { continue; }
		const index = position * 4;
		const lightness = Math.min(data[index], data[index + 1], data[index + 2]);
		const alpha = Math.max(0, Math.min(1, (255 - lightness) / (255 - shapeGray)));
		if (alpha < 0.04) { data[index + 3] = 0; continue; }
		for (let channel = 0; channel < 3; channel++) {
			data[index + channel] = Math.max(0, Math.min(255, Math.round((data[index + channel] - (1 - alpha) * 255) / alpha)));
		}
		data[index + 3] = Math.round(alpha * 255);
	}
	context.putImageData(pixels, 0, 0);

	let minX = width, minY = height, maxX = 0, maxY = 0;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (data[(y * width + x) * 4 + 3] > 10) {
				minX = Math.min(minX, x); maxX = Math.max(maxX, x);
				minY = Math.min(minY, y); maxY = Math.max(maxY, y);
			}
		}
	}
	const side = Math.max(maxX - minX, maxY - minY) * 1.06;
	const centerX = (minX + maxX) / 2;
	const centerY = (minY + maxY) / 2;

	const outputs = {};
	for (const size of sizes) {
		const output = document.createElement('canvas');
		output.width = size;
		output.height = size;
		const outputContext = output.getContext('2d');
		outputContext.imageSmoothingQuality = 'high';
		outputContext.drawImage(canvas, centerX - side / 2, centerY - side / 2, side, side, 0, 0, size, size);
		outputs[size] = output.toDataURL('image/png').split(',')[1];
	}
	return outputs;
})
`;

/**
 * Packs PNG images into one .ico file (PNG entries are valid in .ico since Windows Vista).
 * @param {{ size: number, png: Buffer }[]} images
 * @returns {Buffer}
 */
function createIco(images) {
	const header = Buffer.alloc(6);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(images.length, 4);
	let offset = 6 + images.length * 16;
	const entries = images.map(({ size, png }) => {
		const entry = Buffer.alloc(16);
		entry[0] = size >= 256 ? 0 : size;
		entry[1] = size >= 256 ? 0 : size;
		entry.writeUInt16LE(1, 4);
		entry.writeUInt16LE(32, 6);
		entry.writeUInt32LE(png.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += png.length;
		return entry;
	});
	return Buffer.concat([header, ...entries, ...images.map(({ png }) => png)]);
}

app.whenReady().then(async () => {
	const window = new BrowserWindow({ show: false });
	await window.loadURL('about:blank');
	const sourceUrl = `data:image/webp;base64,${fs.readFileSync(sourcePath).toString('base64')}`;
	const outputs = await window.webContents.executeJavaScript(`${PAGE_SCRIPT}(${JSON.stringify(sourceUrl)}, ${JSON.stringify(ICO_SIZES)})`);
	const images = ICO_SIZES.map((size) => ({ size, png: Buffer.from(outputs[size], 'base64') }));
	fs.writeFileSync(path.join(assetsDirectory, 'icon.png'), images[images.length - 1].png);
	fs.writeFileSync(path.join(assetsDirectory, 'icon.ico'), createIco(images));
	console.log('icon.png and icon.ico written');
	app.quit();
});
