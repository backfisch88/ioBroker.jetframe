export async function writeVisConfig(
	adapter: any,
	config: any,
	logDebug: (msg: string, level?: number) => void,
	logWarn: (msg: string) => void,
): Promise<void> {
	try {
		const visualSource = String(
			config.visualSource || 'current',
		).toLowerCase();

		const safeSource = [
			'current',
			'airport',
			'overflight',
		].includes(visualSource)
			? visualSource
			: 'current';

		const data = {
			simpleApiHost: String(config.simpleApiHost || '').trim(),
			simpleApiPort: Number(config.simpleApiPort || 8087),
			visualSource: safeSource,
			instance: adapter.instance,
			dpRoot: config.dpRoot || `jetframe.${adapter.instance}`,
			updated: new Date().toISOString(),
		};

		await adapter.writeFileAsync(
			'jetframe.admin',
			'vis-config.json',
			Buffer.from(
				JSON.stringify(data, null, 2),
				'utf8',
			),
		);

		logDebug(
			`VIS Config geschrieben: source=${data.visualSource}, apiHost=${data.simpleApiHost || 'auto'}, apiPort=${data.simpleApiPort}`,
		);
	} catch (e) {
		logWarn(
			`VIS Config konnte nicht geschrieben werden: ${e instanceof Error ? e.message : String(e)}`,
		);
	}
}
