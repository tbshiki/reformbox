const AdmZip = require( 'adm-zip' );
const { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } = require( 'fs' );
const packlist = require( 'npm-packlist' ).sync;
const { dirname, join, resolve } = require( 'path' );

const pkg = require( '../package.json' );

const args = process.argv.slice( 2 );
const zip = new AdmZip();

const getArgValue = ( flag ) => {
	const inlineArg = args.find( ( arg ) => arg.startsWith( `${ flag }=` ) );
	if ( inlineArg ) {
		return inlineArg.slice( flag.length + 1 );
	}

	const index = args.indexOf( flag );
	if ( index === -1 ) {
		return undefined;
	}

	return args[ index + 1 ];
};

const noRootFolder = args.includes( '--no-root-folder' );
const rootFolderArg = getArgValue( '--root-folder' );
const svnDirArg = getArgValue( '--svn-dir' );

let zipRootFolder = `${ pkg.name }/`;

if ( noRootFolder ) {
	zipRootFolder = '';
} else if ( typeof rootFolderArg === 'string' ) {
	zipRootFolder = `${ rootFolderArg.trim() }/`;
}

const files = packlist().filter(
	( file ) => file.toLowerCase() !== 'readme.md'
);

const syncToSvnWorkingCopy = ( svnDir ) => {
	const svnRoot = resolve( svnDir );
	const trunkDir = join( svnRoot, 'trunk' );

	if ( ! existsSync( join( svnRoot, '.svn' ) ) ) {
		throw new Error(
			`SVN working copy metadata not found: ${ svnRoot }`
		);
	}

	if ( ! existsSync( trunkDir ) ) {
		throw new Error( `SVN trunk directory not found: ${ trunkDir }` );
	}

	readdirSync( trunkDir ).forEach( ( entry ) => {
		if ( '.svn' === entry ) {
			return;
		}

		rmSync( join( trunkDir, entry ), { force: true, recursive: true } );
	} );

	files.forEach( ( file ) => {
		const destination = join( trunkDir, file );
		mkdirSync( dirname( destination ), { recursive: true } );
		copyFileSync( file, destination );
	} );
};

files.forEach( ( file ) => {
	const zipDirectory = dirname( file ).replaceAll( '\\', '/' );
	zip.addLocalFile(
		file,
		zipRootFolder + ( zipDirectory !== '.' ? zipDirectory : '' )
	);
} );

zip.writeZip( `./${ pkg.name }.zip` );

if ( svnDirArg ) {
	syncToSvnWorkingCopy( svnDirArg );
}
