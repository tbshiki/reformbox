[English](README.md) | [日本語](README.ja.md)

# ReformBox – Universal Lightbox

A WordPress plugin that extends the Lightbox concept beyond images. Display **any block content** - images, videos, text, groups, and more - in a lightbox modal, all configured through the native Block Editor UI.

> **Status:** v0.1.0 - Initial implementation

## What is ReformBox?

Traditional lightbox plugins only enlarge images. ReformBox redefines the lightbox as a **Universal Content Container** - a modal overlay that can display any Gutenberg block content.

### Use Cases

- **Image zoom** - Click a thumbnail to view the full-size image
- **Video player** - Open a video in an overlay without leaving the page
- **Detail popups** - Show additional text, descriptions, or FAQ answers
- **CTA modals** - Display a call-to-action form or message
- **Content previews** - Preview grouped content (text + images + buttons) in a modal
- **Inline galleries** - *(planned)* Navigate multiple items with prev/next

## Features

| Feature | Status |
|---|---|
| Image Block -> Lightbox (WordPress Core) | ✅ |
| Video Block -> Lightbox | ✅ |
| Group Block as Lightbox Container | ✅ |
| Cover Block as Lightbox Container | ✅ |
| Button / Paragraph / Heading / Image / Video as Trigger | ✅ |
| Fade / Zoom / Slide animation | ✅ |
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
| **Container** | Group, Cover | Content displayed inside the lightbox |
| **Self-Lightbox** | Image (Core), Video (ReformBox) | Clicks itself to open in a lightbox |
| **Trigger** | Button, Paragraph, Heading, Image, Video | Clicks to open a linked lightbox |

### Workflow

1. **Create a container** - Add a Group block, enable "ReformBox" in the sidebar, and place any content inside it. A unique **ReformBox ID** is auto-generated.
2. **Create a trigger** - Add a Button (or any trigger block), and set its **Lightbox Target ID** to match the container's ReformBox ID.
3. **Done** - Visitors click the trigger and the container content appears in a modal overlay.

For **Video** blocks, simply toggle "Enable Lightbox on Click" in the ReformBox panel and optionally choose the animation / overlay-click behavior.
For **Image** blocks, ReformBox delegates to the WordPress core lightbox via "Enable Core Image Lightbox".

### Settings

| Setting | Available On | Options |
|---|---|---|
| Enable ReformBox | Container, Video (Self-Lightbox) | On / Off |
| Enable Core Image Lightbox | Image | On / Off |
| ReformBox ID | Container, Video (Self-Lightbox) | Auto-generated or custom |
| Lightbox Target ID | Trigger | ID of the target lightbox |
| Animation | Container, Video (Self-Lightbox) | Fade, Zoom, Slide |
| Close on Overlay Click | Container, Video (Self-Lightbox) | On / Off |

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
- **Non-destructive** - No `save()` modifications, so blocks remain valid with or without the plugin active
- **Lazy loading** - CSS/JS only enqueued when a page contains lightbox-enabled blocks
- **Deferred video loading** - Self-lightbox videos avoid eager preload/autoplay until the overlay is opened
- **Lightweight frontend** - Vanilla JS with no WordPress dependencies (~2.3 KB minified)

### HTML Output

```html
<!-- Trigger -->
<button
  data-reformbox-trigger="rb-abc123"
  aria-controls="rb-abc123"
  aria-expanded="false"
  aria-haspopup="dialog"
  role="button"
  tabindex="0">
  Open Modal
</button>

<!-- Lightbox Overlay -->
<div class="reformbox-overlay wp-lightbox-overlay reformbox-animation-fade"
     id="rb-abc123"
     data-reformbox-dialog-type="content"
     data-reformbox-overlay-close="true"
     aria-hidden="true"
     role="dialog"
     aria-modal="true"
     aria-label="Lightbox dialog"
     tabindex="-1">
  <div class="reformbox-container">
    <button class="reformbox-close close-button" type="button" aria-label="Close">&times;</button>
    <div class="reformbox-content">
      <!-- Block content here -->
    </div>
  </div>
</div>
```

### CSS Customization

Override these classes in your theme:

```css
.reformbox-overlay { }          /* Full-screen backdrop */
.reformbox-container { }        /* Modal box */
.reformbox-content { }          /* Inner content wrapper */
.reformbox-close { }            /* Close button */
.reformbox-overlay--media { }   /* Image/Video variant */
```

## License

GPL-2.0-or-later
