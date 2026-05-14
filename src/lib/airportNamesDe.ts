import * as https from 'https';

const IATA_WIKI_DE_BASE =
	'https://de.wikipedia.org/wiki/Liste_der_IATA-Codes/';

export async function loadGermanIataNames(
	logDebug?: (msg: string, level?: number) => void,
): Promise<Record<string, string>> {
	const result: Record<string, string> = {};

	const letters =
		'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

	for (const letter of letters) {
		try {
			const url =
				IATA_WIKI_DE_BASE + letter;

			logDebug?.(
				`Lade IATA-DE Namen ${letter}...`,
				2,
			);

			const html = await downloadText(url);

			const parsed =
				parseGermanIataPage(html);

			for (const [iata, city] of Object.entries(parsed)) {
				if (!result[iata] && city) {
					result[iata] = city;
				}
			}
		} catch {
			// ignore single page
		}
	}

	return result;
}

function parseGermanIataPage(
	html: string,
): Record<string, string> {
	const result: Record<string, string> = {};

	const rows =
		String(html || '').match(
			/<tr[\s\S]*?<\/tr>/gi,
		) || [];

	for (const row of rows) {
		const cells =
			row.match(
				/<t[dh][\s\S]*?<\/t[dh]>/gi,
			) || [];

		if (cells.length < 4) {
			continue;
		}

		const texts = cells
			.map(cleanWikiText)
			.filter(Boolean);

		const iata =
			texts.find(t =>
				/^[A-Z]{3}$/.test(t),
			);

		if (!iata) {
			continue;
		}

		// Typischer Aufbau:
		// IATA | ICAO | Flughafen | Ort | Land

		const city =
			normalizeGermanCity(
				texts[3] || '',
			);

		if (city) {
			result[iata] = city;
		}
	}

	return result;
}

function cleanWikiText(
	html: string,
): string {
	return decodeHtml(
		String(html || '')
			.replace(
				/<style[\s\S]*?<\/style>/gi,
				' ',
			)
			.replace(
				/<script[\s\S]*?<\/script>/gi,
				' ',
			)
			.replace(
				/<sup[\s\S]*?<\/sup>/gi,
				' ',
			)
			.replace(
				/<br\s*\/?>/gi,
				' ',
			)
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
	);
}

function normalizeGermanCity(
	value: string,
): string {
	return String(value || '')
		.replace(/\s*\[[^\]]+\]/g, '')
		.replace(/\s+/g, ' ')
		.replace(/^–$/, '')
		.trim();
}

function decodeHtml(
	s: string,
): string {
	return String(s || '')
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&uuml;/g, 'ü')
		.replace(/&Uuml;/g, 'Ü')
		.replace(/&ouml;/g, 'ö')
		.replace(/&Ouml;/g, 'Ö')
		.replace(/&auml;/g, 'ä')
		.replace(/&Auml;/g, 'Ä')
		.replace(/&szlig;/g, 'ß');
}

function downloadText(
	url: string,
	redirects = 0,
): Promise<string> {
	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				timeout: 20000,
				headers: {
					'User-Agent':
						'Mozilla/5.0 JetFrame',
					'Accept':
						'text/html,text/plain,*/*',
				},
			},
			res => {
				if (
					res.statusCode &&
					res.statusCode >= 300 &&
					res.statusCode < 400 &&
					res.headers.location
				) {
					if (redirects >= 5) {
						reject(
							new Error(
								'Zu viele Redirects',
							),
						);

						return;
					}

					const nextUrl =
						res.headers.location.startsWith(
							'http',
						)
							? res.headers.location
							: new URL(
									res.headers.location,
									url,
								).toString();

					resolve(
						downloadText(
							nextUrl,
							redirects + 1,
						),
					);

					return;
				}

				if (
					res.statusCode &&
					res.statusCode >= 400
				) {
					reject(
						new Error(
							`HTTP ${res.statusCode}`,
						),
					);

					return;
				}

				let body = '';

				res.setEncoding('utf8');

				res.on('data', chunk => {
					body += chunk;
				});

				res.on('end', () => {
					resolve(
						String(body || '').trim(),
					);
				});
			},
		);

		req.on('timeout', () => {
			req.destroy(
				new Error('Download Timeout'),
			);
		});

		req.on('error', reject);
	});
}
