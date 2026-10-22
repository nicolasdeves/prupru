// Copies the sidebar's static files (page, styles, header icon) next to the compiled sidebar.js.
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = join(projectRoot, 'src', 'renderer');
const targetDirectory = join(projectRoot, 'dist', 'renderer');

mkdirSync(targetDirectory, { recursive: true });
for (const fileName of ['index.html', 'styles.css']) {
	copyFileSync(join(sourceDirectory, fileName), join(targetDirectory, fileName));
}
// The pigeon shown when there is no service yet.
copyFileSync(join(projectRoot, 'assets', 'icon.png'), join(targetDirectory, 'brand.png'));
