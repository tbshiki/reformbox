# Core Lightbox Layout Reference

This document lists the canonical files to follow when keeping ReformBox lightbox layout aligned with WordPress core.

## Canonical Upstream (WordPress Core)

Use these as the source of truth for layout and motion behavior:

- `wp-includes/blocks/image/style.min.css`
  - Overlay layout (`.wp-lightbox-overlay`)
  - Container sizing (`.lightbox-image-container`)
  - Scrim and close button visuals
  - Keyframes (`lightbox-zoom-in`, `lightbox-zoom-out`, visibility transitions)
- `wp-includes/blocks/image/view.min.js`
  - Runtime computation of `--wp--lightbox-*` CSS variables
  - Open/close class flow (`active`, `show-closing-animation`)
  - Resize/scroll/focus behavior tied to layout
- `wp-includes/blocks/image.php`
  - Overlay markup shape and generated attributes
  - Functions:
    - `render_block_core_image()`
    - `block_core_image_render_lightbox()`
    - `block_core_image_print_lightbox_overlay()` (WP 6.5+)

## ReformBox Mapping (Files to Update)

When following core layout changes, update these files together:

- `includes/class-reformbox.php`
  - Overlay DOM output (`get_lightbox_overlay()`)
  - Class names/attributes used by CSS and JS
- `src/style.css`
  - Core-aligned lightbox visuals and keyframes
- `src/view.js`
  - CSS variable calculations and class toggling

## Repository Snapshots (Reference Only)

These files are useful snapshots, but not canonical:

- `style.min.css` (copied stylesheet snapshot)
- `view-source_https___sashiki.blog_2024_10_22_hello-world_.html` (captured frontend HTML)

Treat them as comparison material; prioritize current WordPress core files above.

## Practical Update Procedure

1. Fix the target WordPress version first (for example, 6.9.1).
2. Check core diffs in:
   - `wp-includes/blocks/image/style.min.css`
   - `wp-includes/blocks/image/view.min.js`
   - `wp-includes/blocks/image.php`
3. Reflect markup changes in `includes/class-reformbox.php`.
4. Reflect style/keyframe changes in `src/style.css`.
5. Reflect variable/class timing changes in `src/view.js`.
6. Verify:
   - `npm run lint:js`
   - `npm run lint:css`
   - `npm run build`

## Notes

- Keep `core/image` behavior delegated to WordPress core as the primary rule.
- Avoid introducing editor-side `save()` serialization changes for this alignment work.
- Keep accessibility invariants (ESC close, focus trap, focus return, dialog semantics).
