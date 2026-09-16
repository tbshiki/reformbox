const { readFileSync } = require( 'fs' );
const { join, resolve } = require( 'path' );

/**
 * Verify that the plugin version is declared identically everywhere.
 *
 * The release checklist requires the plugin header, REFORMBOX_VERSION,
 * package.json and readme.txt to agree; package-lock.json carries the same
 * version twice and silently drifts when only `npm version` is skipped.
 *
 * Usage: npm run check:version
 */

const rootDir = resolve( __dirname, '..' );
const read = ( file ) => readFileSync( join( rootDir, file ), 'utf8' );
const readJson = ( file ) => JSON.parse( read( file ) );

const fromPattern = ( label, file, pattern ) => {
	const match = read( file ).match( pattern );
	return { label, version: match ? match[ 1 ] : null };
};

const lock = readJson( 'package-lock.json' );

const sources = [
	fromPattern(
		'reformbox.php (plugin header)',
		'reformbox.php',
		/^\s*\*\s*Version:\s*(\S+)\s*$/m
	),
	fromPattern(
		'reformbox.php (REFORMBOX_VERSION)',
		'reformbox.php',
		/define\(\s*'REFORMBOX_VERSION',\s*'([^']+)'\s*\)/
	),
	{ label: 'package.json', version: readJson( 'package.json' ).version || null },
	{ label: 'package-lock.json (root)', version: lock.version || null },
	{
		label: 'package-lock.json (packages."")',
		version: ( lock.packages && lock.packages[ '' ] && lock.packages[ '' ].version ) || null,
	},
	fromPattern( 'readme.txt (Stable tag)', 'readme.txt', /^Stable tag:\s*(\S+)\s*$/m ),
];

const width = Math.max( ...sources.map( ( source ) => source.label.length ) );
for ( const source of sources ) {
	const value = source.version === null ? '(not found)' : source.version;
	// eslint-disable-next-line no-console
	console.log( `${ source.label.padEnd( width ) }  ${ value }` );
}

const missing = sources.filter( ( source ) => source.version === null );
const versions = [
	...new Set( sources.filter( ( source ) => source.version !== null ).map( ( source ) => source.version ) ),
];

if ( missing.length > 0 ) {
	// eslint-disable-next-line no-console
	console.error(
		`\nNo version found in: ${ missing.map( ( source ) => source.label ).join( ', ' ) }`
	);
	process.exit( 1 );
}

if ( versions.length !== 1 ) {
	// eslint-disable-next-line no-console
	console.error( `\nVersion mismatch: ${ versions.join( ', ' ) }` );
	process.exit( 1 );
}

// eslint-disable-next-line no-console
console.log( `\nAll version declarations agree: ${ versions[ 0 ] }` );
