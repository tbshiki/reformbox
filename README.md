[English](README.md) | [日本語](docs/README.ja.md)

# ReformBox – Universal Lightbox

A WordPress plugin that extends the Lightbox concept beyond images. It adds lightbox support for **Group, Paragraph, and Video blocks with poster images**, while delegating **Image** behavior to WordPress core, all configured through the native Block Editor UI.

[![WordPress Plugin Version](https://img.shields.io/wordpress/plugin/v/reformbox?logo=wordpress)](https://wordpress.org/plugins/reformbox/)
[![WordPress Tested](https://img.shields.io/wordpress/plugin/tested/reformbox?logo=wordpress)](https://wordpress.org/plugins/reformbox/)
![GitHub License](https://img.shields.io/github/license/tbshiki/reformbox)

> **Status:** v0.3.2 - Close animation and interaction behavior fixes

## What is ReformBox?

Traditional lightbox plugins only enlarge images. ReformBox redefines the lightbox as a **Universal Content Container** for the blocks it currently supports, letting you reuse Gutenberg content in a modal overlay.

### Use Cases

- **Image zoom (Core integration)** - Click the image link to open the WordPress core lightbox (ReformBox only provides the sidebar toggle linkage)
- **Video player (poster required)** - Click the poster image to play video content in a lightbox overlay
- **Detail popups** - Show additional text, descriptions, or FAQ answers
- **CTA modals** - Display a call-to-action form or message
- **Content previews** - Preview grouped content (text + images + buttons) in a modal
- **Inline galleries** - *(planned)* Navigate multiple items with prev/next

## Features

| Feature | Status |
|---|---|
| Image Block -> Lightbox (WordPress Core) | ✅ |
| Video Block -> Lightbox (poster required) | ✅ |
| Group Block as Lightbox Container | ✅ |
| Group Split Mode (Preview/Modal slots) | ✅ |
| Paragraph Block as Self-Lightbox | ✅ |
| Zoom animation (core-aligned) | ✅ |
| ESC key close | ✅ |
| Overlay click close (optional) | ✅ |
| Focus trap & keyboard navigation | ✅ |
| ARIA dialog attributes | ✅ |
| Lazy-loaded assets | ✅ |
| RTL support | ✅ |
| Gallery navigation (prev/next) | 🔜 Planned |
| Embed Block support | 🔜 Planned |
| Custom animation hooks | 🔜 Planned |

## How It Works

ReformBox adds a **"ReformBox" panel** to the Block Editor sidebar for supported blocks. No custom blocks to learn - it extends the blocks you already use.

### Block Roles

| Role | Blocks | Description |
|---|---|---|
| **Container** | Group | Supports `same` mode (same content in page + modal) and `split` mode (separate Preview/Modal direct child groups) |
| **Self-Lightbox** | Paragraph, Video with poster image | Clicks itself to open in a lightbox (video uses poster image as the trigger) |
| **Core Image Integration** | Image (`core/image`) | ReformBox panel toggles core lightbox setting (`lightbox.enabled`), while rendering/click behavior remains WordPress core |

### Workflow

1. **Add a supported block** - Group/Paragraph/Image, or a Video block with a poster image.
2. **Enable lightbox** - Toggle ReformBox in the sidebar (for Image, toggle Core Image Lightbox).
3. **Done** - Visitors click the block and its content appears in a modal overlay.

For **Video** blocks, first set a poster image in the block settings, then toggle "Enable Lightbox on Click" in the ReformBox panel. If no poster is set, the toggle stays disabled.
For **Image** blocks, "Enable Core Image Lightbox" in the ReformBox panel only toggles the core setting. ReformBox does not replace image overlay rendering; the open behavior remains WordPress core.
For **Group** blocks, you can choose `Display Mode`: `Same` (legacy behavior) or `Split` (assign direct child Group blocks to `Preview` / `Modal` slots).
In `Split` mode, direct child Groups set to `Preview` render in-page, `Modal` groups render inside the overlay, and unassigned child Groups (`none`) are rendered in both. If modal content is still empty, ReformBox falls back to the Preview content.
`Slot Type` controls appear only on direct child Group blocks inside the split parent.
When a parent Group already has ReformBox enabled, nested blocks inherit the parent behavior and their ReformBox controls are disabled.

### Settings

| Setting | Available On | Options |
|---|---|---|
| Enable ReformBox | Group, Paragraph, Video with poster image | On / Off |
| Enable Core Image Lightbox | Image | On / Off (syncs `core/image` `lightbox.enabled`) |
| Display Mode | Group (when ReformBox enabled) | Same / Split |
| Slot Type | Direct child Group inside Split parent | Preview / Modal / Preview + Modal (Both) |
| Close on Overlay Click | Group, Paragraph, Video with poster image | On / Off |

Global overlay background color and opacity are configured in **WP Admin -> Settings -> ReformBox**.

## Requirements

- WordPress 6.4+
- PHP 7.4+
- Block Editor (Gutenberg)

## Installation

1. Download or clone this repository into `wp-content/plugins/reformbox/`
2. Run `npm install && npm run build`
3. Activate **ReformBox - Universal Lightbox** in WP Admin -> Plugins

## Development

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run start

# Production build
npm run build

# Create distributable plugin ZIP (reformbox.zip)
npm run release:zip
```

### Distributable ZIP

Run this before publishing a release:

```bash
npm install
npm run lint:js
npm run lint:css
npm run release:zip
```

This generates `reformbox.zip` at the project root, ready to upload in **WP Admin -> Plugins -> Add New Plugin -> Upload Plugin**.

The ZIP intentionally includes both compiled assets and the original `src/`, `package.json`, and `webpack.config.js` files so WordPress.org reviewers can inspect the human-readable source that produced the build output.

### WordPress.org Release

For a plugin-directory release:

```bash
npm install
npm run lint:js
npm run lint:css
npm run build
npm run release:zip
```

Then:

1. Run the **Plugin Check** plugin with the `Plugin Repo` ruleset.
2. Verify the plugin on the latest stable WordPress release before updating `Tested up to`.
3. Copy the plugin to WordPress.org SVN `trunk/`, including the built `build/` assets.
4. Confirm the assigned plugin-directory slug is `reformbox` so it matches the plugin Text Domain before the first SVN import.
5. Copy the same release to `tags/<version>/` and keep `readme.txt` `Stable tag` aligned with the released version.

### Project Structure

```text
reformbox/
├── reformbox.php              # Plugin bootstrap
├── includes/
│   └── class-reformbox.php    # Core class (assets + render_block filters)
├── src/
│   ├── editor/
│   │   ├── index.js           # Block Editor extensions (filters + UI)
│   │   └── editor.css         # Editor-only styles
│   ├── view.js                # Frontend lightbox (vanilla JS)
│   └── style.css              # Frontend styles
├── build/                     # Compiled assets (git-ignored)
├── package.json
└── webpack.config.js
```

### Architecture

- **No custom blocks** - Extends core blocks via `blocks.registerBlockType`, `editor.BlockEdit`, and `editor.BlockListBlock` WordPress JS filters
- **Core-first image lightbox** - `core/image` self-lightbox behavior is delegated to WordPress core lightbox
- **Core-aligned custom overlays** - ReformBox reuses core lightbox class conventions where practical (`wp-lightbox-overlay`, `close-button`, `wp-lightbox-container`)
- **Server-side rendering** - PHP `render_block_core/{name}` filters inject lightbox markup on the frontend
- **Split group rendering** - In `split` mode, child `core/group` blocks are mapped into preview/modal output with safe modal fallback
- **Non-destructive** - No `save()` modifications, so blocks remain valid with or without the plugin active
- **Lazy loading** - CSS/JS only enqueued when a page contains lightbox-enabled blocks
- **Deferred video loading** - Self-lightbox videos avoid eager preload/autoplay until the overlay is opened
- **Lightweight frontend** - Vanilla JS with no WordPress dependencies (~2.3 KB minified)

### Core Layout Reference

For future core-layout follow-up work, see:

- `docs/CORE_LIGHTBOX_LAYOUT_REFERENCE.md`
- `docs/GROUP_SPLIT_LIGHTBOX_DESIGN.ja.md` (group split design for display/modal slots)

### HTML Output

```html
<!-- Trigger -->
<div
  data-reformbox-trigger="rb-abc123"
  aria-controls="rb-abc123"
  aria-expanded="false"
  aria-haspopup="dialog"
  role="button"
  tabindex="0">
  Open Modal
</div>

<!-- Lightbox Overlay -->
<div class="reformbox-overlay wp-lightbox-overlay reformbox-animation-zoom"
     id="rb-abc123"
     data-reformbox-dialog-type="content"
     data-reformbox-overlay-close="true"
     aria-hidden="true"
     role="dialog"
     aria-modal="true"
     aria-label="Lightbox dialog"
     tabindex="-1">
  <button class="reformbox-close close-button" type="button" aria-label="Close">
    ...
  </button>
  <div class="reformbox-lightbox-container lightbox-image-container">
    <div class="reformbox-content">
      <!-- Block content here -->
    </div>
  </div>
  <div class="scrim" aria-hidden="true"></div>
</div>
```

### CSS Customization

Override these classes in your theme:

```css
.reformbox-overlay { }          /* Full-screen backdrop */
.reformbox-lightbox-container { }/* Modal box */
.reformbox-content { }          /* Inner content wrapper */
.reformbox-close { }            /* Close button */
.reformbox-overlay--media { }   /* Image/Video variant */
```

## Changelog

### 0.3.2

- Scoped ReformBox lightbox styles to ReformBox overlay selectors to avoid unintended styling effects on core lightbox instances
- Prevented click-through during close animation so background links are not triggered while the overlay is fading out
- Updated trigger activation handling to call `preventDefault` only when a valid overlay target exists
- Fixed close animation end-frame flicker by retaining the final keyframe state until the overlay cleanup runs

### 0.3.1

- Clarified that Image lightbox behavior is delegated to WordPress core and ReformBox syncs the core toggle only
- Clarified Video self-lightbox behavior: poster image is required and used as the visible trigger
- Synced README/README.ja/readme.txt wording with current plugin behavior

### 0.3.0

- PHPCS cleanup for plugin bootstrap and core class documentation
- Added project-level `phpcs.xml.dist` (WordPress standard) for consistent linting
- Documentation/version metadata synced for release

### 0.2.0

- Initial implementation completed
- Core-aligned lightbox behavior refinements
- Content and media overlay UX fixes (layout, animation, scroll lock)
- Group split mode (Preview/Modal slots) for `core/group`

### 0.1.0

- Initial release
- Group block as lightbox container
- Image/Video block self-lightbox
- Paragraph block as self-lightbox
- Core-aligned zoom animation
- Keyboard and accessibility support

## License

GPL-2.0-or-later
