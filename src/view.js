/**
 * ReformBox - Frontend lightbox behaviour.
 *
 * Vanilla JS (no WP dependencies) for minimal bundle size.
 * Handles trigger clicks, overlay close, ESC key, and focus management.
 */

import './style.css';

( () => {
	'use strict';

	let activeOverlay = null;
	let activeTrigger = null;
	let previousFocus = null;

	function getElementTarget( target ) {
		return target && target.nodeType === 1 ? target : null;
	}

	function getTriggerFromTarget( target ) {
		const element = getElementTarget( target );
		return element ? element.closest( '[data-reformbox-trigger]' ) : null;
	}

	function setTriggerExpanded( trigger, isExpanded ) {
		if ( trigger ) {
			trigger.setAttribute(
				'aria-expanded',
				isExpanded ? 'true' : 'false'
			);
		}
	}

	function prepareOverlayMedia( overlay ) {
		overlay
			.querySelectorAll( 'video[data-reformbox-video="true"]' )
			.forEach( ( media ) => {
				if (
					media.dataset.reformboxLoaded !== 'true' &&
					typeof media.load === 'function'
				) {
					media.load();
					media.dataset.reformboxLoaded = 'true';
				}

				if (
					media.dataset.reformboxAutoplay === 'true' &&
					typeof media.play === 'function'
				) {
					const playResult = media.play();
					if ( typeof playResult?.catch === 'function' ) {
						playResult.catch( () => {} );
					}
				}
			} );
	}

	function openLightbox( overlay, trigger = null ) {
		if ( ! overlay || activeOverlay === overlay ) {
			return;
		}

		if ( activeOverlay ) {
			closeLightbox( activeOverlay, false );
		}

		const ownerDocument = overlay.ownerDocument || document;
		previousFocus =
			trigger && typeof trigger.focus === 'function'
				? trigger
				: ownerDocument.activeElement;
		activeOverlay = overlay;
		activeTrigger = trigger;

		setTriggerExpanded( activeTrigger, true );
		overlay.setAttribute( 'aria-hidden', 'false' );
		overlay.classList.add( 'reformbox-active' );
		overlay.classList.add( 'active' );
		ownerDocument.body?.classList.add( 'reformbox-open' );
		prepareOverlayMedia( overlay );

		const focusTarget =
			overlay.querySelector( '.reformbox-close' ) || overlay;
		if ( typeof focusTarget.focus === 'function' ) {
			focusTarget.focus();
		}
	}

	function closeLightbox( overlay, restoreFocus = true ) {
		if ( ! overlay ) {
			return;
		}

		const ownerDocument = overlay.ownerDocument || document;

		overlay.querySelectorAll( 'video, audio' ).forEach( ( media ) => {
			if ( typeof media.pause === 'function' && ! media.paused ) {
				media.pause();
			}
		} );

		overlay.classList.remove( 'reformbox-active' );
		overlay.classList.remove( 'active' );
		overlay.setAttribute( 'aria-hidden', 'true' );
		ownerDocument.body?.classList.remove( 'reformbox-open' );
		setTriggerExpanded( activeTrigger, false );

		activeOverlay = null;
		activeTrigger = null;

		if (
			restoreFocus &&
			previousFocus &&
			typeof previousFocus.focus === 'function'
		) {
			try {
				previousFocus.focus();
			} catch ( error ) {
				// Ignore focus restoration errors for detached elements.
			}
		}

		previousFocus = null;
	}

	const FOCUSABLE =
		'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

	function handleTabKey( event ) {
		if ( ! activeOverlay || event.key !== 'Tab' ) {
			return;
		}

		const focusable = Array.from(
			activeOverlay.querySelectorAll( FOCUSABLE )
		);
		if ( ! focusable.length ) {
			event.preventDefault();
			activeOverlay.focus();
			return;
		}

		const first = focusable[ 0 ];
		const last = focusable[ focusable.length - 1 ];
		const ownerDocument = activeOverlay.ownerDocument || document;
		const activeElement = ownerDocument.activeElement;

		if ( focusable.length === 1 ) {
			event.preventDefault();
			first.focus();
			return;
		}

		if ( ! activeOverlay.contains( activeElement ) ) {
			event.preventDefault();
			( event.shiftKey ? last : first ).focus();
			return;
		}

		if ( event.shiftKey ) {
			if ( activeElement === first || activeElement === activeOverlay ) {
				event.preventDefault();
				last.focus();
			}
		} else if (
			activeElement === last ||
			activeElement === activeOverlay
		) {
			event.preventDefault();
			first.focus();
		}
	}

	document.addEventListener( 'click', ( event ) => {
		const trigger = getTriggerFromTarget( event.target );
		if ( trigger ) {
			event.preventDefault();
			const targetId = trigger.getAttribute( 'data-reformbox-trigger' );
			const overlay = targetId
				? document.getElementById( targetId )
				: null;

			if ( overlay?.classList.contains( 'reformbox-overlay' ) ) {
				openLightbox( overlay, trigger );
			}
			return;
		}

		const target = getElementTarget( event.target );
		if ( ! target ) {
			return;
		}

		const closeButton = target.closest( '.reformbox-close' );
		if ( closeButton ) {
			closeLightbox(
				closeButton.closest( '.reformbox-overlay' ) || activeOverlay
			);
			return;
		}

		if (
			target.classList.contains( 'reformbox-overlay' ) &&
			target.dataset.reformboxOverlayClose !== 'false'
		) {
			closeLightbox( target );
		}
	} );

	document.addEventListener( 'keydown', ( event ) => {
		const trigger = getTriggerFromTarget( event.target );

		if ( trigger && ( event.key === 'Enter' || event.key === ' ' ) ) {
			event.preventDefault();
			trigger.click();
			return;
		}

		if ( event.key === 'Escape' && activeOverlay ) {
			closeLightbox( activeOverlay );
			return;
		}

		handleTabKey( event );
	} );
} )();
