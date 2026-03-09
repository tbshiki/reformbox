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
	let lockedScrollX = 0;
	let lockedScrollY = 0;
	let isRestoringScroll = false;
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

	// Interactive elements nested inside a trigger should not activate the lightbox.
	// This ensures links, buttons, and form controls work as expected.
	const NESTED_INTERACTIVE_SELECTOR = [
		'a[href]',
		'button',
		'input',
		'select',
		'textarea',
		'summary',
		'details',
		'iframe',
		'audio[controls]',
		'video[controls]',
		'[contenteditable="true"]',
		'[role="button"]',
		'[role="link"]',
		'[role="checkbox"]',
		'[role="menuitem"]',
		'[role="option"]',
		'[role="radio"]',
		'[role="switch"]',
		'[tabindex]:not([tabindex="-1"])',
	].join( ', ' );

	function shouldIgnoreTriggerActivation( trigger, target ) {
		const element = getElementTarget( target );
		if ( ! trigger || ! element || element === trigger ) {
			return false;
		}

		const interactiveAncestor = element.closest(
			NESTED_INTERACTIVE_SELECTOR
		);

		return (
			!! interactiveAncestor &&
			interactiveAncestor !== trigger &&
			trigger.contains( interactiveAncestor )
		);
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

	function getOwnerWindow( ownerDocument ) {
		return ownerDocument?.defaultView || window;
	}

	function lockDocumentScroll( ownerDocument ) {
		const ownerWindow = getOwnerWindow( ownerDocument );
		lockedScrollX = ownerWindow.scrollX;
		lockedScrollY = ownerWindow.scrollY;
		ownerDocument.body?.classList.add( 'reformbox-open' );
	}

	function unlockDocumentScroll( ownerDocument ) {
		const ownerWindow = getOwnerWindow( ownerDocument );
		ownerDocument.body?.classList.remove( 'reformbox-open' );
		isRestoringScroll = true;
		ownerWindow.scrollTo( lockedScrollX, lockedScrollY );
		isRestoringScroll = false;
	}

	function keepDocumentScrollLocked() {
		if ( ! activeOverlay || isRestoringScroll ) {
			return;
		}

		const ownerDocument = activeOverlay.ownerDocument || document;
		const ownerWindow = getOwnerWindow( ownerDocument );
		if (
			ownerWindow.scrollX === lockedScrollX &&
			ownerWindow.scrollY === lockedScrollY
		) {
			return;
		}

		isRestoringScroll = true;
		ownerWindow.scrollTo( lockedScrollX, lockedScrollY );
		isRestoringScroll = false;
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

	function getTriggerRect( trigger, sourceElement = null ) {
		const source = getElementTarget( sourceElement );
		const candidates = [];

		if ( source && trigger?.contains?.( source ) ) {
			candidates.push( source );
		}

		if ( trigger ) {
			const mediaInTrigger = trigger.matches( 'img, video' )
				? trigger
				: trigger.querySelector( 'img, video' );
			if ( mediaInTrigger ) {
				candidates.push( mediaInTrigger );
			}
			candidates.push( trigger );
		}

		for ( const candidate of candidates ) {
			if (
				candidate &&
				typeof candidate.getBoundingClientRect === 'function'
			) {
				const rect = candidate.getBoundingClientRect();
				if ( rect.width > 0 && rect.height > 0 ) {
					return rect;
				}
			}
		}

		return null;
	}

	function getLightboxTargetSize( overlay, triggerRect, mediaOverlay ) {
		const content = overlay.querySelector( '.reformbox-content' );
		let maxWidth = Math.max( 1, window.innerWidth - getViewportPadding() );
		let maxHeight = Math.max( 1, window.innerHeight - 80 );

		if ( ! mediaOverlay ) {
			maxWidth = Math.min( maxWidth, 960 );
			maxHeight = Math.min(
				maxHeight,
				Math.max( 1, window.innerHeight * 0.9 )
			);

			// Content dialogs should keep their natural box size (with viewport caps),
			// instead of image-style aspect-ratio fitting.
			const width =
				content?.scrollWidth ||
				content?.offsetWidth ||
				triggerRect?.width ||
				maxWidth;
			const height =
				content?.scrollHeight ||
				content?.offsetHeight ||
				triggerRect?.height ||
				maxHeight;

			return {
				width: clamp( width, 1, maxWidth ),
				height: clamp( height, 1, maxHeight ),
			};
		}

		const intrinsicMedia = getIntrinsicMediaSize(
			getPrimaryMedia( overlay )
		);
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

	function setOverlayStyles( overlay, trigger = null, sourceElement = null ) {
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
				'translate(-50%, -50%)'
			);
			lightboxContainer.style.setProperty(
				'transform-origin',
				'top left'
			);
		}

		// Content dialogs should rely on CSS auto sizing to avoid forced wraps
		// and clipped corners caused by media-oriented JS sizing.
		if ( ! mediaOverlay ) {
			const triggerRect = getTriggerRect( trigger, sourceElement );
			const target = getLightboxTargetSize( overlay, triggerRect, false );
			const initialTop = triggerRect
				? triggerRect.top
				: ( window.innerHeight - target.height ) / 2;
			const initialLeft = triggerRect
				? triggerRect.left
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
				'--wp--lightbox-scale',
				`${ safeScale }`
			);
			overlay.style.setProperty(
				'--wp--lightbox-scrollbar-width',
				`${
					window.innerWidth - document.documentElement.clientWidth
				}px`
			);
			overlay.style.removeProperty( '--wp--lightbox-container-width' );
			overlay.style.removeProperty( '--wp--lightbox-container-height' );
			overlay.style.removeProperty( '--wp--lightbox-image-width' );
			overlay.style.removeProperty( '--wp--lightbox-image-height' );

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
				lightboxContainer.style.setProperty(
					'overflow',
					'visible',
					'important'
				);
			}

			return;
		}

		const zoomAnimation = overlay.classList.contains(
			'reformbox-animation-zoom'
		);
		const triggerRect = getTriggerRect( trigger, sourceElement );
		const animationStartRect = zoomAnimation ? triggerRect : null;
		const target = getLightboxTargetSize(
			overlay,
			triggerRect,
			mediaOverlay
		);
		const initialTop = animationStartRect
			? animationStartRect.top
			: ( window.innerHeight - target.height ) / 2;
		const initialLeft = animationStartRect
			? animationStartRect.left
			: ( window.innerWidth - target.width ) / 2;
		const initialWidth = animationStartRect?.width || target.width;
		const initialHeight = animationStartRect?.height || target.height;
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

		// Keep overlays centered/sized even when theme CSS overrides layout.
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
				mediaOverlay ? 'calc(100vw - 32px)' : 'min(90vw, 960px)',
				'important'
			);
			lightboxContainer.style.setProperty(
				'max-height',
				mediaOverlay ? 'calc(100vh - 80px)' : '90vh',
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

	function openLightbox( overlay, trigger = null, sourceElement = null ) {
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

		setOverlayStyles( overlay, trigger, sourceElement );
		setTriggerExpanded( activeTrigger, true );
		overlay.setAttribute( 'aria-hidden', 'false' );
		overlay.classList.remove( 'show-closing-animation' );
		overlay.classList.add( 'reformbox-active' );
		overlay.classList.add( 'active' );
		lockDocumentScroll( ownerDocument );
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
		const shouldAnimateClose =
			! immediate &&
			! reducedMotionQuery.matches &&
			isMediaOverlay( overlay );

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
			}, 450 );
			closeTimers.set( overlay, timer );
		} else {
			overlay.classList.remove( 'show-closing-animation' );
		}

		setTriggerExpanded( closingTrigger, false );

		if ( activeOverlay === overlay ) {
			activeOverlay = null;
			activeTrigger = null;
			unlockDocumentScroll( ownerDocument );
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
			if ( shouldIgnoreTriggerActivation( trigger, event.target ) ) {
				return;
			}

			event.preventDefault();
			const overlay = getOverlayFromTrigger( trigger );
			if ( overlay ) {
				openLightbox( overlay, trigger, event.target );
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
			if ( shouldIgnoreTriggerActivation( trigger, event.target ) ) {
				return;
			}

			event.preventDefault();
			const overlay = getOverlayFromTrigger( trigger );
			if ( overlay ) {
				openLightbox( overlay, trigger, trigger );
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

	window.addEventListener( 'scroll', keepDocumentScrollLocked, {
		passive: true,
	} );
} )();
