const { test, expect } = require( '@playwright/test' );

/**
 * Markup the PHP render_block filters produce, exercised against the fixture
 * page created by playground/blueprint.with-content.json.
 *
 * These cases cannot be built from the demo page: they need blocks that are
 * deliberately misconfigured (a repeated ReformBox id, a split Group with no
 * modal slot), which would only confuse someone checking the demo by hand.
 */

test.beforeEach( async ( { page } ) => {
	await page.goto( '/reformbox-fixtures/' );
} );

test( '同じ ReformBox ID を 2 ブロックに指定しても、出力の id は重複しない', async ( {
	page,
} ) => {
	const overlayIds = await page
		.locator( '.reformbox-overlay[id]' )
		.evaluateAll( ( overlays ) => overlays.map( ( overlay ) => overlay.id ) );

	expect( overlayIds.length ).toBeGreaterThanOrEqual( 2 );
	expect(
		new Set( overlayIds ).size,
		`オーバーレイの id が重複している: ${ overlayIds.join( ', ' ) }`
	).toBe( overlayIds.length );

	// Both triggers must still point at an overlay that exists.
	const controlled = await page
		.locator( '[data-reformbox-trigger][aria-controls]' )
		.evaluateAll( ( triggers ) =>
			triggers.map( ( trigger ) => trigger.getAttribute( 'aria-controls' ) )
		);

	for ( const id of controlled ) {
		await expect(
			page.locator( `#${ id }` ),
			`aria-controls="${ id }" の参照先が無い`
		).toHaveCount( 1 );
	}
} );

test( 'split で Modal 未割り当てなら、モーダルは Preview の内容へフォールバックする', async ( {
	page,
} ) => {
	const trigger = page.locator(
		'[data-reformbox-trigger][aria-controls^="fixture-split-fallback"]'
	);
	await expect( trigger ).toHaveCount( 1 );

	const overlayId = await trigger.getAttribute( 'aria-controls' );
	const overlay = page.locator( `#${ overlayId }` );

	// The modal is not empty; it repeats what the preview slot renders.
	await expect( overlay ).toContainText( 'preview-only-content' );

	await trigger.click();
	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'false' );
	await expect( overlay ).toContainText( 'preview-only-content' );
} );
