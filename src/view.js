/**
 * ReformBox – Frontend lightbox behaviour.
 *
 * Vanilla JS (no WP dependencies) for minimal bundle size.
 * Handles trigger clicks, overlay close, ESC key, and focus management.
 */

import './style.scss';

(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * State
   * ----------------------------------------------------------------*/

  let activeOverlay = null;
  let previousFocus = null;

  /* ------------------------------------------------------------------
   * Open / Close
   * ----------------------------------------------------------------*/

  function openLightbox(overlay) {
    if (!overlay || activeOverlay) {
      return;
    }

    previousFocus = document.activeElement;
    activeOverlay = overlay;

    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('reformbox-active');
    document.body.classList.add('reformbox-open');

    // Focus the close button.
    const closeBtn = overlay.querySelector('.reformbox-close');
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  function closeLightbox(overlay) {
    if (!overlay) {
      return;
    }

    overlay.classList.remove('reformbox-active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('reformbox-open');
    activeOverlay = null;

    // Return focus to the trigger.
    if (previousFocus) {
      previousFocus.focus();
      previousFocus = null;
    }
  }

  /* ------------------------------------------------------------------
   * Focus trap
   * ----------------------------------------------------------------*/

  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function handleTabKey(e) {
    if (!activeOverlay || e.key !== 'Tab') {
      return;
    }

    const focusable = Array.from(
      activeOverlay.querySelectorAll(FOCUSABLE)
    );
    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ------------------------------------------------------------------
   * Event delegation (works with late-injected DOM)
   * ----------------------------------------------------------------*/

  document.addEventListener('click', function (e) {
    // --- Trigger click ---
    const trigger = e.target.closest('[data-reformbox-trigger]');
    if (trigger) {
      e.preventDefault();
      const targetId = trigger.getAttribute('data-reformbox-trigger');
      const overlay = document.getElementById(targetId);
      if (overlay) {
        openLightbox(overlay);
      }
      return;
    }

    // --- Close button ---
    if (e.target.closest('.reformbox-close')) {
      closeLightbox(activeOverlay);
      return;
    }

    // --- Overlay background click ---
    if (
      e.target.classList.contains('reformbox-overlay') &&
      e.target.dataset.reformboxOverlayClose !== 'false'
    ) {
      closeLightbox(activeOverlay);
    }
  });

  // Keyboard: open trigger via Enter/Space, close via ESC, trap Tab.
  document.addEventListener('keydown', function (e) {
    // Enter / Space on trigger.
    if (
      (e.key === 'Enter' || e.key === ' ') &&
      e.target.hasAttribute('data-reformbox-trigger')
    ) {
      e.preventDefault();
      e.target.click();
      return;
    }

    // ESC close.
    if (e.key === 'Escape' && activeOverlay) {
      closeLightbox(activeOverlay);
      return;
    }

    // Focus trap.
    handleTabKey(e);
  });
})();
