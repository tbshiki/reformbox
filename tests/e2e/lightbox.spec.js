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

test( '背景の不活性化: 開いている間だけ背景が inert になり、閉じると付与分を解除する', async ( {
	page,
} ) => {
	const overlay = overlayFor( page, 'demo-group-same' );
	const trigger = triggerFor( page, 'demo-group-same' );

	expect( await page.locator( '[inert]' ).count() ).toBe( 0 );

	await trigger.click();
	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'false' );

	const whileOpen = await page.evaluate( () => ( {
		inertCount: document.querySelectorAll( '[inert]' ).length,
		// The background must be inert...
		backgroundLeftOut: [
			...document.querySelectorAll(
				'body > :not(.wp-lightbox-overlay)'
			),
		]
			.filter( ( element ) => ! element.hasAttribute( 'inert' ) )
			.map( ( element ) => element.tagName.toLowerCase() ),
		// ...and the overlay itself must not be.
		overlayInert: document
			.querySelector( '#demo-group-same' )
			.hasAttribute( 'inert' ),
	} ) );

	expect( whileOpen.inertCount ).toBeGreaterThan( 0 );
	expect(
		whileOpen.backgroundLeftOut,
		'inert が付いていない body 直下の要素が残っている'
	).toEqual( [] );
	expect( whileOpen.overlayInert, 'オーバーレイ自身が inert になっている' ).toBe(
		false
	);

	await page.keyboard.press( 'Escape' );
	await expect( overlay ).toHaveAttribute( 'aria-hidden', 'true' );

	// The roadmap's acceptance criterion: nothing is left inert.
	await expect( page.locator( '[inert]' ) ).toHaveCount( 0 );
	// And the page is operable again.
	await expect( trigger ).toBeFocused();
} );

test( '背景の不活性化: ページ側が元から指定した inert を閉じた後も保つ', async ( {
	page,
} ) => {
	const preexistingInert = page.locator( '#preexisting-inert' );

	await page.evaluate( () => {
		const element = document.createElement( 'div' );
		element.id = 'preexisting-inert';
		element.setAttribute( 'inert', '' );
		document.body.appendChild( element );
	} );

	await expect( preexistingInert ).toHaveAttribute( 'inert', '' );
	await triggerFor( page, 'demo-group-same' ).click();
	await expect( overlayFor( page, 'demo-group-same' ) ).toHaveAttribute(
		'aria-hidden',
		'false'
	);

	await page.keyboard.press( 'Escape' );

	await expect( overlayFor( page, 'demo-group-same' ) ).toHaveAttribute(
		'aria-hidden',
		'true'
	);
	await expect( preexistingInert ).toHaveAttribute( 'inert', '' );
} );

test( '背景の不活性化: 別のライトボックスへ入れ替えても解除漏れが起きない', async ( {
	page,
} ) => {
	await triggerFor( page, 'demo-group-same' ).click();
	await expect( overlayFor( page, 'demo-group-same' ) ).toHaveAttribute(
		'aria-hidden',
		'false'
	);

	// Opening another lightbox closes the first one with the "immediate" path.
	await page.keyboard.press( 'Escape' );
	await triggerFor( page, 'demo-paragraph' ).click();
	await expect( overlayFor( page, 'demo-paragraph' ) ).toHaveAttribute(
		'aria-hidden',
		'false'
	);
	expect( await page.locator( '[inert]' ).count() ).toBeGreaterThan( 0 );

	await page.keyboard.press( 'Escape' );
	await expect( overlayFor( page, 'demo-paragraph' ) ).toHaveAttribute(
		'aria-hidden',
		'true'
	);
	await expect( page.locator( '[inert]' ) ).toHaveCount( 0 );
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

test( 'フォーカストラップ: 無効・非表示要素を飛ばして video と閉じるボタンを循環する', async ( {
	page,
} ) => {
	const overlay = overlayFor( page, 'demo-video' );
	const closeButton = overlay.locator( '.reformbox-close' );
	const video = overlay.locator( 'video[controls]' );

	await overlay.evaluate( ( element ) => {
		const disabledButton = document.createElement( 'button' );
		disabledButton.disabled = true;
		element.appendChild( disabledButton );

		const hiddenInput = document.createElement( 'input' );
		hiddenInput.type = 'hidden';
		element.appendChild( hiddenInput );

		const negativeTabIndex = document.createElement( 'button' );
		negativeTabIndex.tabIndex = -2;
		element.appendChild( negativeTabIndex );

		const displayNoneButton = document.createElement( 'button' );
		displayNoneButton.style.display = 'none';
		element.appendChild( displayNoneButton );
	} );

	await triggerFor( page, 'demo-video' ).click();
	await expect( closeButton ).toBeFocused();

	await page.keyboard.press( 'Tab' );
	await expect( video ).toBeFocused();
	await video.evaluate( ( media ) => {
		media.addEventListener(
			'play',
			() => {
				media.dataset.reformboxKeyboardPlayed = 'true';
			},
			{ once: true }
		);
	} );
	await page.keyboard.press( 'Space' );
	await expect( video ).toHaveAttribute(
		'data-reformbox-keyboard-played',
		'true'
	);
	await video.evaluate( ( media ) => media.pause() );

	await page.keyboard.press( 'Tab' );
	await expect( closeButton ).toBeFocused();
} );

/*
 * RB-24. The demo page also holds a core image lightbox, so core's block styles
 * are printed on it — after this plugin's stylesheet. Core styles the same
 * `.wp-lightbox-overlay .scrim` with an opaque background and `opacity: .9`, so
 * at equal specificity it used to win: media overlays lost their alpha entirely
 * and content dialogs ended up at 0.9 x 0.9 once the fade animation was out of
 * the way. Reduced motion is what removes that animation, which is why these
 * run with it forced on.
 */
test.describe( 'scrim の不透明度', () => {
	test.use( { reducedMotion: 'reduce' } );

	const scrimStyles = async ( page, id ) =>
		page.evaluate( ( overlayId ) => {
			const scrim = document.querySelector( `#${ overlayId } .scrim` );
			const styles = getComputedStyle( scrim );
			const channels = styles.backgroundColor.match( /[\d.]+/g ) || [];
			return {
				alpha: channels.length === 4 ? Number( channels[ 3 ] ) : 1,
				opacity: Number( styles.opacity ),
			};
		}, id );

	for ( const id of [ 'demo-group-same', 'demo-video' ] ) {
		test( `${ id }: 不透明度が rgba の alpha 側だけで決まる`, async ( {
			page,
		} ) => {
			await triggerFor( page, id ).click();
			await expect( overlayFor( page, id ) ).toHaveAttribute(
				'aria-hidden',
				'false'
			);

			const styles = await scrimStyles( page, id );

			/*
			 * Asserting the product alone would not catch the regression: core's
			 * opaque background at `opacity: .9` lands on the same 0.9 as the
			 * default setting. The invariant is where the opacity comes from.
			 */
			expect( styles.alpha, 'rgba の alpha が設定値である' ).toBe( 0.9 );
			expect( styles.opacity, '要素の opacity は 1 に固定' ).toBe( 1 );
		} );
	}
} );
