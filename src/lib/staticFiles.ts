import * as fs from 'fs';
import * as path from 'path';

/**
 *
 */
export async function copyStaticFiles(adapter: any): Promise<void> {
	const sourceDir = path.resolve(__dirname, '../../admin');

	adapter.log.debug(`[JetFrame] Static source: ${sourceDir}`);

	if (!fs.existsSync(sourceDir)) {
		adapter.log.warn(`[JetFrame] Static source fehlt: ${sourceDir}`);
		return;
	}

	await copyRecursiveToIoBrokerFiles(adapter, sourceDir, '');

	adapter.log.debug('[JetFrame] Static files copied to ioBroker files');
}

async function copyRecursiveToIoBrokerFiles(adapter: any, srcDir: string, relDir: string): Promise<void> {
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
			await copyRecursiveToIoBrokerFiles(adapter, srcPath, relPath);
			continue;
		}

		const buffer = fs.readFileSync(srcPath);

		await adapter.writeFileAsync('jetframe.admin', relPath, buffer);

		adapter.log.debug(`[JetFrame] Static written: jetframe.admin/${relPath}`);
	}
}
