const net = require( 'node:net' );
const { spawn } = require( 'node:child_process' );
const { resolve } = require( 'node:path' );

function isAvailable( port ) {
	return new Promise( ( done, reject ) => {
		const server = net.createServer();
		server.once( 'error', ( error ) => {
			if ( error.code === 'EADDRINUSE' ) {
				done( false );
			} else {
				reject( error );
			}
		} );
		server.listen( port, () => server.close( () => done( true ) ) );
	} );
}

async function main() {
	const args = process.argv.slice( 2 );
	const forwarded = [];
	let explicitPort;
	for ( let index = 0; index < args.length; index++ ) {
		const arg = args[ index ];
		if ( arg === '--port' || arg.startsWith( '--port=' ) ) {
			const value = arg === '--port' ? args[ ++index ] : arg.slice( 7 );
			if ( explicitPort !== undefined || ! /^\d+$/.test( value || '' ) || Number( value ) < 1 || Number( value ) > 65535 ) {
				throw new Error( 'Specify --port once, with an integer from 1 to 65535.' );
			}
			explicitPort = Number( value );
		} else {
			forwarded.push( arg );
		}
	}
	let port = explicitPort ?? 9400;
	const lastPort = explicitPort ?? 9499;
	while ( ! await isAvailable( port ) ) {
		if ( port === lastPort ) {
			throw new Error( `Port ${ port } is in use. Stop the corresponding task or choose another --port.` );
		}
		console.log( `Port ${ port } is in use; trying ${ port + 1 }.` );
		port++;
	}
	if ( ! process.env.npm_execpath ) {
		throw new Error( 'Start Playground with npm run wp:start or npm run wp:start:content.' );
	}
	console.log( `Playground URL (available after startup): http://127.0.0.1:${ port }/` );
	// Use npm's JS entry point so Windows does not need a shell to launch npm.cmd.
	const child = spawn( process.execPath, [
		process.env.npm_execpath, 'exec', '--yes', '--', '@wp-playground/cli@3.1.54',
		'server', ...forwarded, `--port=${ port }`,
	], { cwd: resolve( __dirname, '..' ), stdio: 'inherit' } );
	child.once( 'error', ( error ) => {
		console.error( error.message );
		process.exitCode = 1;
	} );
	child.once( 'exit', ( code ) => {
		process.exitCode = code ?? 1;
	} );
}

main().catch( ( error ) => {
	console.error( error.message );
	process.exitCode = 1;
} );
