/**
 * ReformBox - Frontend lightbox behaviour.
 *
 * Vanilla JS (no WP dependencies) for minimal bundle size.
 * Handles trigger clicks, overlay close, ESC key, focus trap, and
 * core-style lightbox positioning variables.
 */

import './style.css';

( () => {
	'use strict';

	let activeOverlay = null;
	let activeTrigger = null;
	let previousFocus = null;
	let resizeFrame = null;
	const closeTimers = new WeakMap();
	const reducedMotionQuery = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	);

	function getElementTarget( target ) {
		return target && target.nodeType === 1 ? target : null;
	}

	function getTriggerFromTarget( target ) {
		const element = getElementTarget( target );
		return element ? element.closest( '[data-reformbox-trigger]' ) : null;
	}

	function getOverlayFromTrigger( trigger ) {
		const targetId = trigger
			? trigger.getAttribute( 'data-reformbox-trigger' )
			: null;
		const overlay = targetId ? document.getElementById( targetId ) : null;
		return overlay?.classList.contains( 'reformbox-overlay' )
			? overlay
			: null;
	}

	function isMediaOverlay( overlay ) {
		return overlay?.dataset.reformboxDialogType === 'media';
	}

	function moveOverlayToBody( overlay ) {
		const ownerDocument = overlay.ownerDocument || document;
		if (
			ownerDocument.body &&
			overlay.parentElement !== ownerDocument.body
		) {
			ownerDocument.body.appendChild( overlay );
		}
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

	function clearCloseTimer( overlay ) {
		const timer = closeTimers.get( overlay );
		if ( timer ) {
			window.clearTimeout( timer );
			closeTimers.delete( overlay );
		}
	}

	function clamp( value, min, max ) {
		return Math.min( Math.max( value, min ), max );
	}

	function getViewportPadding() {
		if ( window.innerWidth <= 480 ) {
			return 32;
		}

		if ( window.innerWidth > 1920 ) {
			return 160;
		}

		return 80;
	}

	function getPrimaryMedia( overlay ) {
		return overlay.querySelector(
			'.reformbox-content img, .reformbox-content video'
		);
	}

	function getIntrinsicMediaSize( media ) {
		if ( ! media ) {
			return null;
		}

		if ( media.tagName === 'IMG' ) {
			if ( media.naturalWidth > 0 && media.naturalHeight > 0 ) {
				return {
					width: media.naturalWidth,
					height: media.naturalHeight,
				};
			}
			return null;
		}

		if (
			media.tagName === 'VIDEO' &&
			media.videoWidth > 0 &&
			media.videoHeight > 0
		) {
			return {
				width: media.videoWidth,
				height: media.videoHeight,
			};
		}

		return null;
	}

	function getLightboxTargetSize( overlay, triggerRect ) {
		const content = overlay.querySelector( '.reformbox-content' );
		const intrinsicMedia = getIntrinsicMediaSize(
			getPrimaryMedia( overlay )
		);
		const maxWidth = Math.max(
			1,
			window.innerWidth - getViewportPadding()
		);
		const maxHeight = Math.max( 1, window.innerHeight - 80 );
		let width =
			intrinsicMedia?.width ||
			content?.scrollWidth ||
			content?.offsetWidth;
		let height =
			intrinsicMedia?.height ||
			content?.scrollHeight ||
			content?.offsetHeight;

		if ( ! width || ! height ) {
			if ( triggerRect?.width && triggerRect?.height ) {
				width = triggerRect.width;
				height = triggerRect.height;
			} else {
				width = maxWidth;
				height = maxHeight;
			}
		}

		const ratio = width / height || 1;
		const maxRatio = maxWidth / maxHeight;

		if ( ratio > maxRatio ) {
			width = maxWidth;
			height = width / ratio;
		} else {
			height = maxHeight;
			width = height * ratio;
		}

		return {
			width: clamp( width, 1, maxWidth ),
			height: clamp( height, 1, maxHeight ),
		};
	}

	function setOverlayStyles( overlay, trigger = null ) {
		const lightboxContainer = overlay.querySelector(
			'.reformbox-lightbox-container'
		);
		const mediaOverlay = isMediaOverlay( overlay );

		if ( lightboxContainer ) {
			lightboxContainer.style.setProperty(
				'position',
				'absolute',
				'important'
			);
			lightboxContainer.style.setProperty( 'left', '50%', 'important' );
			lightboxContainer.style.setProperty( 'top', '50%', 'important' );
			lightboxContainer.style.setProperty(
				'transform',
				'translate(-50%, -50%)',
				'important'
			);
			lightboxContainer.style.setProperty(
				'transform-origin',
				'top left',
				'important'
			);
		}

		if ( ! mediaOverlay ) {
			overlay.style.removeProperty(
				'--wp--lightbox-initial-top-position'
			);
			overlay.style.removeProperty(
				'--wp--lightbox-initial-left-position'
			);
			overlay.style.removeProperty( '--wp--lightbox-container-width' );
			overlay.style.removeProperty( '--wp--lightbox-container-height' );
			overlay.style.removeProperty( '--wp--lightbox-image-width' );
			overlay.style.removeProperty( '--wp--lightbox-image-height' );
			overlay.style.removeProperty( '--wp--lightbox-scale' );
			overlay.style.removeProperty( '--wp--lightbox-scrollbar-width' );

			if ( lightboxContainer ) {
				lightboxContainer.style.setProperty(
					'width',
					'auto',
					'important'
				);
				lightboxContainer.style.setProperty(
					'height',
					'auto',
					'important'
				);
				lightboxContainer.style.setProperty(
					'max-width',
					'min(90vw, 960px)',
					'important'
				);
				lightboxContainer.style.setProperty(
					'max-height',
					'90vh',
					'important'
				);
			}

			return;
		}

		const triggerRect =
			trigger && typeof trigger.getBoundingClientRect === 'function'
				? trigger.getBoundingClientRect()
				: null;
		const target = getLightboxTargetSize( overlay, triggerRect );
		const initialTop = triggerRect
			? triggerRect.y
			: ( window.innerHeight - target.height ) / 2;
		const initialLeft = triggerRect
			? triggerRect.x
			: ( window.innerWidth - target.width ) / 2;
		const initialWidth = triggerRect?.width || target.width;
		const initialHeight = triggerRect?.height || target.height;
		const scale = Math.min(
			initialWidth / target.width,
			initialHeight / target.height,
			1
		);
		const safeScale = Number.isFinite( scale ) && scale > 0 ? scale : 1;

		overlay.style.setProperty(
			'--wp--lightbox-initial-top-position',
			`${ initialTop }px`
		);
		overlay.style.setProperty(
			'--wp--lightbox-initial-left-position',
			`${ initialLeft }px`
		);
		overlay.style.setProperty(
			'--wp--lightbox-container-width',
			`${ target.width + 1 }px`
		);
		overlay.style.setProperty(
			'--wp--lightbox-container-height',
			`${ target.height + 1 }px`
		);
		overlay.style.setProperty(
			'--wp--lightbox-image-width',
			`${ target.width }px`
		);
		overlay.style.setProperty(
			'--wp--lightbox-image-height',
			`${ target.height }px`
		);
		overlay.style.setProperty( '--wp--lightbox-scale', `${ safeScale }` );
		overlay.style.setProperty(
			'--wp--lightbox-scrollbar-width',
			`${ window.innerWidth - document.documentElement.clientWidth }px`
		);

		// Keep media overlays centered/sized even when theme CSS overrides layout.
		if ( lightboxContainer ) {
			lightboxContainer.style.setProperty(
				'width',
				`${ target.width + 1 }px`,
				'important'
			);
			lightboxContainer.style.setProperty(
				'height',
				`${ target.height + 1 }px`,
				'important'
			);
			lightboxContainer.style.setProperty(
				'max-width',
				'calc(100vw - 32px)',
				'important'
			);
			lightboxContainer.style.setProperty(
				'max-height',
				'calc(100vh - 80px)',
				'important'
			);
		}
	}

	function refreshOverlayStylesOnMediaReady( overlay, trigger ) {
		if ( ! isMediaOverlay( overlay ) ) {
			return;
		}

		const media = getPrimaryMedia( overlay );
		if ( ! media ) {
			return;
		}

		const refreshStyles = () => {
			if ( activeOverlay === overlay ) {
				setOverlayStyles( overlay, trigger );
			}
		};

		if ( media.tagName === 'IMG' && ! media.complete ) {
			media.addEventListener( 'load', refreshStyles, { once: true } );
			return;
		}

		if ( media.tagName === 'VIDEO' && media.readyState < 1 ) {
			media.addEventListener( 'loadedmetadata', refreshStyles, {
				once: true,
			} );
		}
	}

	function openLightbox( overlay, trigger = null ) {
		if ( ! overlay || activeOverlay === overlay ) {
			return;
		}

		moveOverlayToBody( overlay );

		if ( activeOverlay ) {
			closeLightbox( activeOverlay, false, true );
		}

		const ownerDocument = overlay.ownerDocument || document;
		previousFocus =
			trigger && typeof trigger.focus === 'function'
				? trigger
				: ownerDocument.activeElement;
		activeOverlay = overlay;
		activeTrigger = trigger;
		clearCloseTimer( overlay );

		setOverlayStyles( overlay, trigger );
		setTriggerExpanded( activeTrigger, true );
		overlay.setAttribute( 'aria-hidden', 'false' );
		overlay.classList.remove( 'show-closing-animation' );
		overlay.classList.add( 'reformbox-active' );
		overlay.classList.add( 'active' );
		ownerDocument.body?.classList.add( 'reformbox-open' );
		prepareOverlayMedia( overlay );
		refreshOverlayStylesOnMediaReady( overlay, trigger );

		const focusTarget =
			overlay.querySelector( '.reformbox-close' ) || overlay;
		if ( typeof focusTarget.focus === 'function' ) {
			focusTarget.focus();
		}
	}

	function closeLightbox( overlay, restoreFocus = true, immediate = false ) {
		if ( ! overlay ) {
			return;
		}

		const ownerDocument = overlay.ownerDocument || document;
		const closingTrigger = activeTrigger;
		const shouldAnimateClose = ! immediate && ! reducedMotionQuery.matches;

		clearCloseTimer( overlay );

		overlay.querySelectorAll( 'video, audio' ).forEach( ( media ) => {
			if ( typeof media.pause === 'function' && ! media.paused ) {
				media.pause();
			}
		} );

		overlay.classList.remove( 'reformbox-active' );
		overlay.classList.remove( 'active' );
		overlay.setAttribute( 'aria-hidden', 'true' );

		if ( shouldAnimateClose ) {
			overlay.classList.add( 'show-closing-animation' );
			const timer = window.setTimeout( () => {
				overlay.classList.remove( 'show-closing-animation' );
				closeTimers.delete( overlay );
			}, 420 );
			closeTimers.set( overlay, timer );
		} else {
			overlay.classList.remove( 'show-closing-animation' );
		}

		setTriggerExpanded( closingTrigger, false );

		if ( activeOverlay === overlay ) {
			activeOverlay = null;
			activeTrigger = null;
			ownerDocument.body?.classList.remove( 'reformbox-open' );
		}

		if ( ! restoreFocus ) {
			previousFocus = null;
			return;
		}

		if ( previousFocus && typeof previousFocus.focus === 'function' ) {
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
			const overlay = getOverlayFromTrigger( trigger );
			if ( overlay ) {
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

		const overlay = target.closest( '.reformbox-overlay' );
		if (
			overlay &&
			overlay.dataset.reformboxOverlayClose !== 'false' &&
			! target.closest( '.reformbox-lightbox-container' )
		) {
			closeLightbox( overlay );
		}
	} );

	document.addEventListener( 'keydown', ( event ) => {
		const trigger = getTriggerFromTarget( event.target );

		if ( trigger && ( event.key === 'Enter' || event.key === ' ' ) ) {
			event.preventDefault();
			const overlay = getOverlayFromTrigger( trigger );
			if ( overlay ) {
				openLightbox( overlay, trigger );
			}
			return;
		}

		if ( event.key === 'Escape' && activeOverlay ) {
			closeLightbox( activeOverlay );
			return;
		}

		handleTabKey( event );
	} );

	window.addEventListener( 'resize', () => {
		if ( ! activeOverlay ) {
			return;
		}

		if ( resizeFrame ) {
			window.cancelAnimationFrame( resizeFrame );
		}

		resizeFrame = window.requestAnimationFrame( () => {
			resizeFrame = null;
			setOverlayStyles( activeOverlay, activeTrigger );
		} );
	} );
} )();
