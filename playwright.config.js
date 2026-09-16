const { defineConfig, devices } = require( '@playwright/test' );

// Override to run the suite against a second instance while a manual
// Playground stays up on the default port.
const PORT = Number( process.env.REFORMBOX_E2E_PORT || 9400 );
if ( ! Number.isInteger( PORT ) || PORT < 1 || PORT > 65535 ) {
	throw new Error( 'REFORMBOX_E2E_PORT must be an integer from 1 to 65535.' );
}
const baseURL = `http://127.0.0.1:${ PORT }`;

/**
 * Which browser binary to drive.
 *
 * CI installs Playwright's bundled Chromium the usual way. Locally we default
 * to the already-installed Chrome, because the bundled download is not always
 * reachable from a developer machine. Override with PLAYWRIGHT_CHANNEL.
 */
const channel =
	process.env.PLAYWRIGHT_CHANNEL || ( process.env.CI ? undefined : 'chrome' );

module.exports = defineConfig( {
	testDir: './tests/e2e',
	/*
	 * Static files start being served slightly before WordPress answers page
	 * requests, so the webServer probe alone is not enough. This waits for the
	 * demo page itself.
	 */
	globalSetup: require.resolve( './tests/e2e/global-setup.js' ),
	// One WordPress instance is shared by every test, so keep the run serial.
	fullyParallel: false,
	workers: 1,
	forbidOnly: !! process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// On CI also write the HTML report, which the workflow uploads on failure.
	reporter: process.env.CI
		? [ [ 'github' ], [ 'html', { open: 'never' } ] ]
		: 'list',
	use: {
		baseURL,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ], channel },
		},
	],
	webServer: {
		command: `npm run wp:start:content -- --port=${ PORT }`,
		/*
		 * Must be a static file, not a PHP-handled path.
		 *
		 * Playground auto-logs the admin in by answering the first request to
		 * any PHP route with a 302 back to the same URL. The readiness probe
		 * does not keep cookies, so it would follow that redirect forever and
		 * the run would hang before the first test. Static assets are served
		 * without the redirect, and a 200 here still proves the blueprint
		 * finished and WordPress is serving.
		 */
		url: `${ baseURL }/wp-includes/js/wp-emoji-release.min.js`,
		// A Playground instance may already be running for manual checks.
		reuseExistingServer: ! process.env.CI,
		// A cold boot downloads WordPress and the PHP runtime.
		timeout: 5 * 60 * 1000,
		stdout: 'ignore',
		stderr: 'pipe',
	},
} );
