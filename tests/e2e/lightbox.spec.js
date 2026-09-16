const { test, expect } = require( '@playwright/test' );

/**
 * Behaviour that lives in src/view.js, exercised against the demo page created
 * by playground/blueprint.with-content.json.
 *
 * The demo page gives every lightbox a stable id, and the trigger points at it
 * through aria-controls, so the ids below are the contract these tests rely on.
 */

const overlayFor = ( page, id ) => page.locator( `#${ id }` );
const triggerFor = ( page, id ) =>
	page.locator( `[data-reformbox-trigger][aria-controls="${ id }"]` );

test.beforeEach( async ( { page } ) => {
	// The first request auto-logs the admin in and redirects back to '/'.
	await page.goto( '/' );
	await expect( overlayFor( page, 'demo-group-same' ) ).toHaveCount( 1 );
} );

test( 'Group(same): トリガーで開き、ESC で閉じる', async ( { page } ) => {
	const overlay = overlayFor( page, 'demo-group-same' );
	const trigger = triggerFor( page, 'demo-group-same' );
	const body = page.locator( 'body' );

	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'true' );
	await expect( body ).not.toHaveClass( /reformbox-open/ );

	await trigger.click();

	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'false' );
	await expect( overlay ).toHaveClass( /reformbox-active/ );
	// Scroll lock.
	await expect( body ).toHaveClass( /reformbox-open/ );

	await page.keyboard.press( 'Escape' );

	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'true' );
	await expect( overlay ).not.toHaveClass( /reformbox-active/ );
	await expect( body ).not.toHaveClass( /reformbox-open/ );
} );

test( 'Group(same): 閉じるボタンでも閉じる', async ( { page } ) => {
	const overlay = overlayFor( page, 'demo-group-same' );

	await triggerFor( page, 'demo-group-same' ).click();
	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'false' );

	await overlay.locator( '.reformbox-close' ).click();

	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'true' );
} );

test( 'Video: 開くまで動画をロードしない', async ( { page } ) => {
	const overlay = overlayFor( page, 'demo-video' );
	const video = overlay.locator( 'video[data-reformbox-video="true"]' );

	// The PHP filter rewrites preload so the poster alone is fetched up front.
	await expect( video ).toHaveAttribute( 'preload', 'none' );
	await expect( video ).not.toHaveAttribute( 'data-reformbox-loaded', 'true' );

	await triggerFor( page, 'demo-video' ).click();

	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'false' );
	// view.js calls load() only once the overlay is open.
	await expect( video ).toHaveAttribute( 'data-reformbox-loaded', 'true' );
} );

test( 'フォーカストラップ: Tab がオーバーレイ内に留まり、閉じるとトリガーへ戻る', async ( {
	page,
} ) => {
	const overlay = overlayFor( page, 'demo-group-same' );
	const trigger = triggerFor( page, 'demo-group-same' );

	await trigger.click();
	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'false' );

	for ( let press = 1; press <= 5; press++ ) {
		await page.keyboard.press( 'Tab' );
		const staysInside = await overlay.evaluate( ( element ) =>
			element.contains( document.activeElement )
		);
		expect(
			staysInside,
			`Tab を ${ press } 回押した時点でフォーカスがオーバーレイの外に出た`
		).toBe( true );
	}

	await page.keyboard.press( 'Escape' );

	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'true' );
	await expect( trigger ).toBeFocused();
} );
