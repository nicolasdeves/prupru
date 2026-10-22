import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Data folder used while the app was called "Zap Hub". */
const LEGACY_USER_DATA_FOLDER = 'Zap Hub';
const STORE_FILE = 'accounts.json';
/** Chromium caches and locks: rebuilt on demand, and the lock belongs to a running old instance. */
const SKIPPED_ENTRIES = new Set(['lockfile', 'Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'Crashpad']);

export type LegacyDataMigrationResult = 'not-needed' | 'migrated' | 'failed';

/**
 * Copies the accounts, folders, preferences and logins saved under "Zap Hub" into the Prupru data folder,
 * once. Must run before the app is ready, so no session has opened the files yet. The store file is copied
 * last: when it exists, the migration is complete, and a failed attempt is retried on the next start.
 * @returns What happened; "failed" usually means the old app is still open and holds its files.
 */
export function migrateLegacyUserData(): LegacyDataMigrationResult {
	const userDataPath = app.getPath('userData');
	const legacyPath = path.join(app.getPath('appData'), LEGACY_USER_DATA_FOLDER);
	const legacyStorePath = path.join(legacyPath, STORE_FILE);
	if (fs.existsSync(path.join(userDataPath, STORE_FILE)) || !fs.existsSync(legacyStorePath)) {
		return 'not-needed';
	}
	try {
		fs.cpSync(legacyPath, userDataPath, {
			recursive: true,
			force: true,
			filter: (source) => source !== legacyStorePath && !SKIPPED_ENTRIES.has(path.basename(source)),
		});
		fs.copyFileSync(legacyStorePath, path.join(userDataPath, STORE_FILE));
		return 'migrated';
	} catch (error) {
		console.error('Could not copy the Zap Hub data folder', error);
		return 'failed';
	}
}
