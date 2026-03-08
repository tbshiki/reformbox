=== ReformBox – Universal Lightbox ===
Contributors: tbshiki
Tags: lightbox, modal, gutenberg, blocks, popup
Requires at least: 6.4
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Universal Lightbox for WordPress – display any block content in a lightbox modal.

== Description ==

ReformBox extends WordPress Lightbox functionality beyond images. Display any block content – images, videos, text, groups, and more – in a beautiful lightbox modal.

Development source: https://github.com/tbshiki/reformbox

**Supported Blocks:**

* Image Block – Uses WordPress core lightbox behavior
* Video Block – Click to open itself in a lightbox
* Group Block – Shows normally and also opens its content in a lightbox
* Cover Block – Shows normally and also opens its content in a lightbox
* Button Block – Click to open itself in a lightbox
* Paragraph Block – Click to open itself in a lightbox
* Heading Block – Click to open itself in a lightbox

**Features:**

* No-code lightbox creation via block editor controls
* Core-first image lightbox integration (`core/image`)
* Core-aligned overlay markup for custom lightboxes
* Fade, zoom, and slide animations
* ESC key and overlay click to close
* Accessible (ARIA attributes, focus management, keyboard navigation)
* Lazy-loaded assets (CSS/JS only loaded when needed)
* Self-lightbox videos defer preload/autoplay until opened
* Lightweight and performant

== Installation ==

1. Upload the `reformbox` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Open the block editor and select any supported block
4. Enable ReformBox in the block's settings panel

== Frequently Asked Questions ==

= Does ReformBox replace the core image lightbox? =

No. `core/image` self-lightbox behavior is delegated to the WordPress core lightbox. ReformBox extends the surrounding workflow so images, videos, and container content can share a common modal workflow.

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
4. Commit the build assets to your WordPress.org SVN `trunk/` and copy the release to `tags/0.1.0/`

== Changelog ==

= 0.1.0 =
* Initial release
* Group/Cover block as lightbox container
* Image/Video block self-lightbox
* Button/Paragraph/Heading block as self-lightbox
* Fade, zoom, slide animations
* Keyboard and accessibility support
