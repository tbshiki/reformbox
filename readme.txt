=== ReformBox – Universal Lightbox ===
Contributors: tbshiki
Tags: lightbox, modal, gutenberg, blocks, popup
Requires at least: 6.4
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Universal Lightbox for WordPress – display any block content in a lightbox modal.

== Description ==

ReformBox extends WordPress Lightbox functionality beyond images. Display any block content – images, videos, text, groups, and more – in a beautiful lightbox modal.

**Supported Blocks:**

* Image Block – Uses WordPress core lightbox behavior or acts as a trigger for another ReformBox target
* Video Block – Click to open video in lightbox or acts as a trigger for another ReformBox target
* Group Block – Use as a lightbox container for any content
* Cover Block – Use as a lightbox container
* Button Block – Use as a lightbox trigger
* Paragraph Block – Use as a lightbox trigger
* Heading Block – Use as a lightbox trigger

**Features:**

* No-code lightbox creation via block editor controls
* Core-first image lightbox integration (`core/image`)
* Fade, zoom, and slide animations
* ESC key and overlay click to close
* Accessible (ARIA attributes, focus management, keyboard navigation)
* Lazy-loaded assets (CSS/JS only loaded when needed)
* Lightweight and performant

== Installation ==

1. Upload the `reformbox` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Open the block editor and select any supported block
4. Enable ReformBox in the block's settings panel

== Development ==

To build and create a distributable ZIP:

1. `npm install`
2. `npm run lint:js`
3. `npm run lint:css`
4. `npm run release:zip`

This creates `reformbox.zip` in the project root.

== Changelog ==

= 0.1.0 =
* Initial release
* Group/Cover block as lightbox container
* Image/Video block self-lightbox
* Button/Paragraph/Heading/Image/Video block as trigger
* Fade, zoom, slide animations
* Keyboard and accessibility support
