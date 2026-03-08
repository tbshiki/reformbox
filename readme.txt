=== ReformBox – Universal Lightbox ===
Contributors: tbshiki
Tags: lightbox, modal, gutenberg, blocks, popup
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.3.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Universal Lightbox for WordPress – lightbox support for Group, Paragraph, Video blocks with poster images, and core Image workflows.

== Description ==

ReformBox extends WordPress Lightbox functionality beyond images. It currently supports Group, Paragraph, and Video blocks with poster images directly, while delegating Image lightbox behavior to WordPress core.

Development source: https://github.com/tbshiki/reformbox

**Supported Blocks:**

* Image Block – Uses WordPress core lightbox behavior
* Video Block – Opens in a lightbox when a poster image is set
* Group Block – Supports both `same` mode (same content in page + modal) and `split` mode (separate Preview/Modal child Group slots)
* Paragraph Block – Click to open itself in a lightbox

**Features:**

* No-code lightbox creation via block editor controls
* Core-first image lightbox integration (`core/image`)
* Core-aligned overlay markup for custom lightboxes
* Core-aligned zoom animation
* ESC key and overlay click to close
* Accessible (ARIA attributes, focus management, keyboard navigation)
* Group split mode with Preview/Modal slot mapping
* Safe split fallback: if no Modal slot is assigned, Preview content is used
* Lazy-loaded assets (CSS/JS only loaded when needed)
* Self-lightbox videos defer preload/autoplay until opened
* Lightweight and performant

== Installation ==

1. Upload the `reformbox` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Open the block editor and select any supported block
4. Enable ReformBox in the block's settings panel

For Video blocks, add a poster image in the block settings before enabling ReformBox.

== Frequently Asked Questions ==

= Does ReformBox replace the core image lightbox? =

No. `core/image` self-lightbox behavior is delegated to the WordPress core lightbox. ReformBox extends the surrounding workflow so images, videos, and container content can share a common modal workflow.

= How does Group split mode work? =

Enable ReformBox on a Group block, then switch `Display Mode` to `Split`. Inside that parent Group, set child Group blocks to `Preview` or `Modal` slots in the sidebar.

`Preview` content is rendered in-page, `Modal` content is rendered inside the lightbox overlay. If no `Modal` slot is defined, ReformBox automatically falls back to `Preview` content for the modal.

= Where is the development source? =

The canonical development repository is:

https://github.com/tbshiki/reformbox

The distributable ZIP also includes the original `src/`, `package.json`, and `webpack.config.js` files so build steps remain auditable.

== Development ==

To build and create a distributable ZIP:

1. `npm install`
2. `npm run lint:js`
3. `npm run lint:css`
4. `npm run release:zip`

This creates `reformbox.zip` in the project root.

Before submitting a new plugin to WordPress.org, also:

1. Enable WordPress.org account 2FA
2. Run the Plugin Check plugin with the `Plugin Repo` ruleset
3. Verify the plugin on the latest stable WordPress release
4. Confirm the assigned plugin-directory slug is `reformbox` so it stays aligned with the plugin Text Domain
5. Commit the build assets to your WordPress.org SVN `trunk/` and copy the release to `tags/<version>/`

== Changelog ==

= 0.3.0 =
* PHPCS cleanup for plugin bootstrap and core class documentation
* Added project-level `phpcs.xml.dist` (WordPress standard) for consistent linting
* Documentation/version metadata synced for release

= 0.2.0 =
* Initial implementation completed
* Core-aligned lightbox behavior refinements
* Content and media overlay UX fixes (layout, animation, scroll lock)
* Group split mode (Preview/Modal slots) for `core/group`

= 0.1.0 =
* Initial release
* Group block as lightbox container
* Image/Video block self-lightbox
* Paragraph block as self-lightbox
* Core-aligned zoom animation
* Keyboard and accessibility support
