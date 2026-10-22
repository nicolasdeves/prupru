import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Above this size the log is moved to prupru.old.log and a new one starts. */
const MAX_LOG_BYTES = 1024 * 1024;

/**
 * Returns the path of the log file, next to the account data.
 * @returns Absolute path of prupru.log.
 */
export function getLogPath(): string {
	return path.join(app.getPath('userData'), 'prupru.log');
}

/**
 * Turns anything thrown into readable text.
 * @param error Value caught.
 * @returns Message and stack, when there is one.
 */
function describeError(error: unknown): string {
	if (error instanceof Error) {
		return error.stack ?? `${error.name}: ${error.message}`;
	}
	return String(error);
}

/**
 * Appends a line to prupru.log. Logging must never break the app, so its own failures are ignored.
 * @param level Severity.
 * @param message What happened.
 * @param error Error that caused it, if any.
 */
export function writeLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, error?: unknown): void {
	try {
		const logPath = getLogPath();
		fs.mkdirSync(path.dirname(logPath), { recursive: true });
		if (fs.existsSync(logPath) && fs.statSync(logPath).size > MAX_LOG_BYTES) {
			fs.renameSync(logPath, logPath.replace(/\.log$/, '.old.log'));
		}
		const details = error === undefined ? '' : `\n${describeError(error)}`;
		fs.appendFileSync(logPath, `${new Date().toISOString()} [${level}] ${message}${details}\n`, 'utf8');
	} catch {
		// Nothing else to do: there is nowhere left to report it.
	}
}
