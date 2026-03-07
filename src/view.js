/**
 * ReformBox – Frontend lightbox behaviour.
 *
 * Vanilla JS (no WP dependencies) for minimal bundle size.
 * Handles trigger clicks, overlay close, ESC key, and focus management.
 */

import './style.scss';

( function () {
	'use strict';

	/* ------------------------------------------------------------------
	 * State
	 * ----------------------------------------------------------------*/

	let activeOverlay = null;
	let previousFocus = null;

	function getElementTarget( target ) {
		return target && target.nodeType === 1 ? target : null;
	}

	function getTriggerFromTarget( target ) {
		const element = getElementTarget( target );
		return element ? element.closest( '[data-reformbox-trigger]' ) : null;
	}

	/* ------------------------------------------------------------------
	 * Open / Close
	 * ----------------------------------------------------------------*/

	function openLightbox( overlay ) {
		if ( ! overlay ) {
			return;
		}

		if ( activeOverlay === overlay ) {
			return;
		}

		if ( activeOverlay ) {
			closeLightbox( activeOverlay, false );
		}

		const ownerDocument = overlay.ownerDocument || document;
		previousFocus = ownerDocument.activeElement;
		activeOverlay = overlay;

		overlay.setAttribute( 'aria-hidden', 'false' );
		overlay.classList.add( 'reformbox-active' );
		ownerDocument.body.classList.add( 'reformbox-open' );

		// Focus the close button.
		const closeBtn = overlay.querySelector( '.reformbox-close' );
		if ( closeBtn ) {
			closeBtn.focus();
		}
	}

	function closeLightbox( overlay, restoreFocus = true ) {
		if ( ! overlay ) {
			return;
		}

		const ownerDocument = overlay.ownerDocument || document;

		overlay.classList.remove( 'reformbox-active' );
		overlay.setAttribute( 'aria-hidden', 'true' );
		ownerDocument.body.classList.remove( 'reformbox-open' );
		activeOverlay = null;

		// Return focus to the trigger.
		if (
			restoreFocus &&
			previousFocus &&
			typeof previousFocus.focus === 'function'
		) {
			previousFocus.focus();
		}
		previousFocus = null;
	}

	/* ------------------------------------------------------------------
	 * Focus trap
	 * ----------------------------------------------------------------*/

	const FOCUSABLE =
		'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

	function handleTabKey( e ) {
		if ( ! activeOverlay || e.key !== 'Tab' ) {
			return;
		}

		const focusable = Array.from(
			activeOverlay.querySelectorAll( FOCUSABLE )
		);
		if ( ! focusable.length ) {
			return;
		}

		const first = focusable[ 0 ];
		const last = focusable[ focusable.length - 1 ];
		const ownerDocument = activeOverlay.ownerDocument || document;
		const activeElement = ownerDocument.activeElement;

		if ( e.shiftKey ) {
			if ( activeElement === first ) {
				e.preventDefault();
				last.focus();
			}
		} else if ( activeElement === last ) {
			e.preventDefault();
			first.focus();
		}
	}

	/* ------------------------------------------------------------------
	 * Event delegation (works with late-injected DOM)
	 * ----------------------------------------------------------------*/

	document.addEventListener( 'click', function ( e ) {
		// --- Trigger click ---
		const trigger = getTriggerFromTarget( e.target );
		if ( trigger ) {
			e.preventDefault();
			const targetId = trigger.getAttribute( 'data-reformbox-trigger' );
			const overlay = document.getElementById( targetId );
			if ( overlay ) {
				openLightbox( overlay );
			}
			return;
		}

		const target = getElementTarget( e.target );
		if ( ! target ) {
			return;
		}

		// --- Close button ---
		if ( target.closest( '.reformbox-close' ) ) {
			closeLightbox( activeOverlay );
			return;
		}

		// --- Overlay background click ---
		if (
			target.classList.contains( 'reformbox-overlay' ) &&
			target.dataset.reformboxOverlayClose !== 'false'
		) {
			closeLightbox( activeOverlay );
		}
	} );

	// Keyboard: open trigger via Enter/Space, close via ESC, trap Tab.
	document.addEventListener( 'keydown', function ( e ) {
		const trigger = getTriggerFromTarget( e.target );

		// Enter / Space on trigger.
		if (
			trigger &&
			( e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar' )
		) {
			e.preventDefault();
			trigger.click();
			return;
		}

		// ESC close.
		if ( e.key === 'Escape' && activeOverlay ) {
			closeLightbox( activeOverlay );
			return;
		}

		// Focus trap.
		handleTabKey( e );
	} );
} )();
