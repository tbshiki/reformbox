const { request } = require( '@playwright/test' );

/**
 * Wait until WordPress serves the pages the suite needs.
 *
 * The webServer probe targets a static asset, because every PHP route answers
 * the first request with Playground's auto-login redirect. Static files start
 * being served a moment before page requests resolve, so without this the first
 * test can hit a 404.
 */
module.exports = async ( config ) => {
	const { baseURL } = config.projects[ 0 ].use;
	const pages = [
		{ path: '/', marker: 'demo-group-same' },
		{ path: '/reformbox-fixtures/', marker: 'fixture-dup' },
	];
	const deadline = Date.now() + 120 * 1000;

	// A context keeps the auto-login cookie, so the redirect resolves once.
	const context = await request.newContext( { baseURL } );

	try {
		for ( const { path, marker } of pages ) {
			let lastStatus = 'no response';

			for (;;) {
				try {
					const response = await context.get( path );
					lastStatus = response.status();
					if ( response.ok() && ( await response.text() ).includes( marker ) ) {
						break;
					}
				} catch ( error ) {
					lastStatus = error.message;
				}

				if ( Date.now() > deadline ) {
					throw new Error(
						`WordPress did not serve ${ path } with "${ marker }" in time (last: ${ lastStatus }). ` +
							'Is the Playground blueprint up to date? Restart the server to pick up blueprint changes.'
					);
				}

				await new Promise( ( resolve ) => setTimeout( resolve, 1000 ) );
			}
		}
	} finally {
		await context.dispose();
	}
};
