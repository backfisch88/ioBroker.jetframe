// ioBroker eslint template configuration file for js and ts files
// Please note that esm or react based modules need additional modules loaded.
import config from '@iobroker/eslint-config';

export default [
	...config,
	{
		// specify files to exclude from linting here
		ignores: [
			'admin/src/**',
			'build/**',
			'.dev-server/',
			'.vscode/',
			'*.test.js',
			'test/**/*.js',
			'*.config.mjs',
			'dist',
			'admin/words.js',
			'admin/admin.d.ts',
			'admin/blockly.js',
			'**/adapter-config.d.ts',
			'widgets/**/*.js',
		],
	},
	{
		// you may disable some 'jsdoc' warnings - but using jsdoc is highly recommended
		// as this improves maintainability. jsdoc warnings will not block build process.
		rules: {
			'jsdoc/require-jsdoc': 'off',
			'jsdoc/require-param': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/require-returns': 'off',
			'jsdoc/require-returns-description': 'off',
			'jsdoc/require-description': 'off',
			'jsdoc/no-blank-blocks': 'off',
		},
	},
];
