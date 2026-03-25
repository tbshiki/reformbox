const { execFileSync } = require( 'child_process' );
const { join, resolve } = require( 'path' );

const rootDir = resolve( __dirname, '..' );
const nodeBinary = process.execPath;
const args = process.argv.slice( 2 );

const runNodeScript = ( scriptPath, scriptArgs = [] ) => {
	execFileSync( nodeBinary, [ scriptPath, ...scriptArgs ], {
		cwd: rootDir,
		stdio: 'inherit',
	} );
};

runNodeScript(
	join( rootDir, 'node_modules', '@wordpress', 'scripts', 'bin', 'wp-scripts.js' ),
	[ 'build' ]
);
runNodeScript( join( rootDir, 'scripts', 'plugin-zip.js' ), args );
