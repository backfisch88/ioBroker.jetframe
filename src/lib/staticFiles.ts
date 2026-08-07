import type { AdapterLike } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';

// The 'img' directory tree is created and managed entirely at runtime by
// images.ts (aircraft/airline logo caches) and is never part of the
// admin/ source folder. It must never be touched by the cleanup below.
const RUNTIME_MANAGED_TOP_LEVEL_DIRS = ['img'];

/**
 *
 */
export async function copyStaticFiles(adapter: AdapterLike): Promise<void> {
	const sourceDir = path.resolve(__dirname, '../../admin');

	adapter.log.debug(`[JetFrame] Static source: ${sourceDir}`);

	if (!fs.existsSync(sourceDir)) {
		adapter.log.warn(`[JetFrame] Static source directory missing: ${sourceDir}`);
		return;
	}

	const writtenPaths = new Set<string>();

	await copyRecursiveToIoBrokerFiles(adapter, sourceDir, '', writtenPaths);

	adapter.log.debug('[JetFrame] Static files copied to ioBroker files');

	await removeOrphanedFiles(adapter, writtenPaths);
}

async function copyRecursiveToIoBrokerFiles(
	adapter: AdapterLike,
	srcDir: string,
	relDir: string,
	writtenPaths: Set<string>,
): Promise<void> {
	const entries = fs.readdirSync(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === 'src') {
			continue;
		}
		if (entry.name.endsWith('.ts')) {
			continue;
		}
		if (entry.name === 'tsconfig.json') {
			continue;
		}

		const srcPath = path.join(srcDir, entry.name);
		const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;

		if (entry.isDirectory()) {
			await copyRecursiveToIoBrokerFiles(adapter, srcPath, relPath, writtenPaths);
			continue;
		}

		const buffer = fs.readFileSync(srcPath);

		await adapter.writeFileAsync('jetframe.admin', relPath, buffer);
		writtenPaths.add(relPath);

		adapter.log.debug(`[JetFrame] Static written: jetframe.admin/${relPath}`);
	}
}

/**
 * Removes files from ioBroker's file storage that were copied there by a
 * previous version of the adapter but no longer exist in the current
 * admin/ source folder (e.g. after a file was renamed or removed).
 *
 * Without this, stale files accumulate in storage forever and keep being
 * served indefinitely on existing installations, while a fresh install
 * never gets them at all - exactly how an already-removed
 * admin/index_m.html kept "working" on upgraded instances while causing a
 * 404 on brand-new ones.
 */
async function removeOrphanedFiles(adapter: AdapterLike, writtenPaths: Set<string>): Promise<void> {
	await removeOrphanedFilesInDir(adapter, '', writtenPaths);
}

async function removeOrphanedFilesInDir(adapter: AdapterLike, dir: string, writtenPaths: Set<string>): Promise<void> {
	let entries: any[];

	try {
		entries = await adapter.readDirAsync('jetframe.admin', dir);
	} catch {
		// directory may not exist yet - nothing to clean up
		return;
	}

	for (const entry of entries || []) {
		if (!entry?.file) {
			continue;
		}

		if (!dir && RUNTIME_MANAGED_TOP_LEVEL_DIRS.includes(entry.file)) {
			continue;
		}

		const relPath = dir ? `${dir}/${entry.file}` : entry.file;

		if (entry.isDir) {
			await removeOrphanedFilesInDir(adapter, relPath, writtenPaths);
			continue;
		}

		if (!writtenPaths.has(relPath)) {
			try {
				await adapter.unlinkAsync('jetframe.admin', relPath);
				adapter.log.debug(`[JetFrame] Removed orphaned static file: jetframe.admin/${relPath}`);
			} catch (e) {
				adapter.log.warn(
					`[JetFrame] Could not remove orphaned file ${relPath}: ${e instanceof Error ? e.message : String(e)}`,
				);
			}
		}
	}
}
