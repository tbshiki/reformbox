<?php
/**
 * ReformBox core class.
 *
 * Registers editor extensions and modifies block output
 * to add lightbox functionality.
 *
 * @package ReformBox
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * ReformBox plugin runtime.
 */
class ReformBox {

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static $instance = null;

	/**
	 * Whether the current page has lightbox content.
	 *
	 * @var bool
	 */
	private $has_lightbox = false;

	/**
	 * Whether frontend assets have been registered for the request.
	 *
	 * @var bool
	 */
	private $frontend_assets_registered = false;

	/**
	 * ReformBox IDs reserved during the current request.
	 *
	 * @var array<string,bool>
	 */
	private $reserved_reformbox_ids = array();

	/**
	 * Initialize the singleton instance.
	 */
	public static function init() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Constructor – registers all hooks.
	 */
	private function __construct() {
		// Editor assets.
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_assets' ) );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_editor_canvas_assets' ) );

		// Frontend assets (register early, enqueue lazily).
		add_action( 'wp_enqueue_scripts', array( $this, 'register_frontend_assets' ) );

		// Container block (content displayed in lightbox).
		add_filter( 'render_block_core/group', array( $this, 'render_container_block' ), 10, 2 );

		// Self-lightbox media block.
		add_filter( 'render_block_core/video', array( $this, 'render_video_block' ), 10, 2 );

		// Paragraph block (self-lightbox).
		add_filter( 'render_block_core/paragraph', array( $this, 'render_trigger_block' ), 10, 2 );
	}

	// Asset loading.

	/**
	 * Enqueue editor script and style.
	 */
	public function enqueue_editor_assets() {
		$asset_file = REFORMBOX_PLUGIN_DIR . 'build/editor.asset.php';
		if ( ! file_exists( $asset_file ) ) {
			return;
		}
		$asset = require $asset_file;

		wp_enqueue_script(
			'reformbox-editor',
			REFORMBOX_PLUGIN_URL . 'build/editor.js',
			$asset['dependencies'],
			$asset['version'],
			array( 'in_footer' => true )
		);

		wp_set_script_translations( 'reformbox-editor', 'reformbox' );

		if ( file_exists( REFORMBOX_PLUGIN_DIR . 'build/editor.css' ) ) {
			wp_enqueue_style(
				'reformbox-editor',
				REFORMBOX_PLUGIN_URL . 'build/editor.css',
				array(),
				$asset['version']
			);
			wp_style_add_data( 'reformbox-editor', 'rtl', 'replace' );
		}
	}

	/**
	 * Enqueue editor canvas stylesheet for iframe-based block editors.
	 *
	 * In modern WordPress, post content is often rendered inside an iframe.
	 * Styles enqueued only via enqueue_block_editor_assets may not reach that canvas.
	 */
	public function enqueue_editor_canvas_assets() {
		if ( ! is_admin() ) {
			return;
		}

		$css_file = REFORMBOX_PLUGIN_DIR . 'build/editor.css';
		if ( ! file_exists( $css_file ) ) {
			return;
		}

		$asset_file = REFORMBOX_PLUGIN_DIR . 'build/editor.asset.php';
		$asset      = file_exists( $asset_file )
			? require $asset_file
			: array(
				'version' => REFORMBOX_VERSION,
			);

		wp_enqueue_style(
			'reformbox-editor-canvas',
			REFORMBOX_PLUGIN_URL . 'build/editor.css',
			array(),
			$asset['version']
		);
		wp_style_add_data( 'reformbox-editor-canvas', 'rtl', 'replace' );
	}

	/**
	 * Register frontend assets without enqueueing.
	 * They will be enqueued lazily when a lightbox block is rendered.
	 */
	public function register_frontend_assets() {
		if ( $this->frontend_assets_registered ) {
			return;
		}

		$asset_file = REFORMBOX_PLUGIN_DIR . 'build/view.asset.php';
		$asset      = file_exists( $asset_file )
			? require $asset_file
			: array(
				'dependencies' => array(),
				'version'      => REFORMBOX_VERSION,
			);

		wp_register_script(
			'reformbox-view',
			REFORMBOX_PLUGIN_URL . 'build/view.js',
			$asset['dependencies'],
			$asset['version'],
			array(
				'in_footer' => true,
				'strategy'  => 'defer',
			)
		);

		if ( file_exists( REFORMBOX_PLUGIN_DIR . 'build/style-view.css' ) ) {
			wp_register_style(
				'reformbox-view',
				REFORMBOX_PLUGIN_URL . 'build/style-view.css',
				array(),
				$asset['version']
			);
			wp_style_add_data( 'reformbox-view', 'rtl', 'replace' );
		}

		$this->frontend_assets_registered = true;
	}

	/**
	 * Enqueue frontend CSS + JS (called once per page load).
	 */
	private function enqueue_frontend() {
		if ( $this->has_lightbox ) {
			return;
		}

		// Defensive registration for render contexts where wp_enqueue_scripts may not have fired yet.
		if ( ! $this->frontend_assets_registered || ! wp_script_is( 'reformbox-view', 'registered' ) ) {
			$this->register_frontend_assets();
		}

		$this->has_lightbox = true;

		if ( wp_style_is( 'reformbox-view', 'registered' ) ) {
			wp_enqueue_style( 'reformbox-view' );
		}
		if ( wp_script_is( 'reformbox-view', 'registered' ) ) {
			wp_enqueue_script( 'reformbox-view' );
		}
	}

	// Helpers.

	/**
	 * Sanitize a ReformBox ID to safe HTML id characters.
	 *
	 * @param string $id ReformBox ID candidate.
	 * @return string
	 */
	private function sanitize_reformbox_id( $id ) {
		return preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $id );
	}

	/**
	 * Reserve a unique ReformBox ID for the current request.
	 *
	 * @param string $preferred_id Sanitized preferred ID.
	 * @return string
	 */
	private function reserve_reformbox_id( $preferred_id ) {
		$base_id   = '' !== $preferred_id ? $preferred_id : wp_unique_id( 'rb-' );
		$candidate = $base_id;
		$suffix    = 2;

		while ( isset( $this->reserved_reformbox_ids[ $candidate ] ) ) {
			$candidate = sprintf( '%1$s-%2$d', $base_id, $suffix );
			++$suffix;
		}

		$this->reserved_reformbox_ids[ $candidate ] = true;

		return $candidate;
	}

	/**
	 * Resolve a unique ReformBox ID from block attributes.
	 *
	 * @param array $attrs Block attributes.
	 * @return string
	 */
	private function get_reformbox_id( $attrs ) {
		$preferred_id = isset( $attrs['reformboxId'] )
			? $this->sanitize_reformbox_id( $attrs['reformboxId'] )
			: '';

		return $this->reserve_reformbox_id( $preferred_id );
	}

	/**
	 * Get Group lightbox mode.
	 *
	 * @param array $attrs Block attributes.
	 * @return string 'same' or 'split'.
	 */
	private function get_reformbox_mode( $attrs ) {
		return ( isset( $attrs['reformboxMode'] ) && 'split' === $attrs['reformboxMode'] )
			? 'split'
			: 'same';
	}

	/**
	 * Get slot type for Group blocks used in split mode.
	 *
	 * @param array $attrs Block attributes.
	 * @return string 'none'|'preview'|'modal'.
	 */
	private function get_reformbox_slot( $attrs ) {
		if ( ! isset( $attrs['reformboxSlot'] ) ) {
			return 'none';
		}

		$slot = (string) $attrs['reformboxSlot'];
		if ( 'preview' === $slot || 'modal' === $slot ) {
			return $slot;
		}

		return 'none';
	}

	/**
	 * Render a list of parsed blocks into HTML.
	 *
	 * @param array $blocks Parsed block array list.
	 * @return string
	 */
	private function render_blocks_html( $blocks ) {
		if ( ! is_array( $blocks ) || empty( $blocks ) ) {
			return '';
		}

		$html = '';
		foreach ( $blocks as $parsed_block ) {
			if ( ! is_array( $parsed_block ) ) {
				continue;
			}

			$html .= render_block( $parsed_block );
		}

		return $html;
	}

	/**
	 * Replace the root Group wrapper inner HTML while keeping wrapper attributes.
	 *
	 * @param string $group_html Original rendered Group block HTML.
	 * @param string $inner_html New inner HTML.
	 * @return string
	 */
	private function replace_group_inner_html( $group_html, $inner_html ) {
		if (
			preg_match(
				'/^\s*(<([a-z][a-z0-9:-]*)\b[^>]*>).*(<\/\2>)\s*$/is',
				$group_html,
				$matches
			)
		) {
			return $matches[1] . $inner_html . $matches[3];
		}

		return $inner_html;
	}

	/**
	 * Build preview/modal HTML for split Group mode.
	 *
	 * @param string $block_content Original rendered Group HTML.
	 * @param array  $block         Parsed Group block.
	 * @return array{preview:string,modal:string}
	 */
	private function build_split_group_content( $block_content, $block ) {
		$inner_blocks   = isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] )
			? $block['innerBlocks']
			: array();
		$preview_blocks = array();
		$modal_blocks   = array();

		foreach ( $inner_blocks as $inner_block ) {
			if ( ! is_array( $inner_block ) ) {
				continue;
			}

			$is_group = isset( $inner_block['blockName'] ) && 'core/group' === $inner_block['blockName'];
			if ( $is_group && 'modal' === $this->get_reformbox_slot( $inner_block['attrs'] ?? array() ) ) {
				$modal_blocks[] = $inner_block;
				continue;
			}

			// Non-group blocks and "none" slot groups are treated as preview.
			$preview_blocks[] = $inner_block;
		}

		$preview_inner = $this->render_blocks_html( $preview_blocks );
		$modal_inner   = $this->render_blocks_html( $modal_blocks );

		$preview_source = '' !== trim( $preview_inner )
			? $preview_inner
			: $block_content;
		$modal_source   = '' !== trim( $modal_inner )
			? $modal_inner
			: $preview_source;

		return array(
			'preview' => $this->replace_group_inner_html( $block_content, $preview_source ),
			'modal'   => $this->replace_group_inner_html( $block_content, $modal_source ),
		);
	}

	/**
	 * Build the lightbox overlay HTML that wraps content.
	 *
	 * @param string $content   Inner HTML.
	 * @param string $id        Unique overlay ID.
	 * @param array  $attrs     Block attributes.
	 * @param string $type      'content' or 'media'.
	 * @return string
	 */
	private function get_lightbox_overlay( $content, $id, $attrs, $type = 'content' ) {
		$overlay_close = isset( $attrs['reformboxOverlayClose'] ) ? (bool) $attrs['reformboxOverlayClose'] : true;
		$dialog_label  = 'media' === $type
			? __( 'Video lightbox dialog', 'reformbox' )
			: __( 'Lightbox dialog', 'reformbox' );

		$overlay_class = 'reformbox-overlay wp-lightbox-overlay reformbox-animation-zoom';
		if ( 'media' === $type ) {
			$overlay_class .= ' reformbox-overlay--media';
		}

		return sprintf(
			'<div class="%1$s" id="%2$s" data-reformbox-dialog-type="%3$s" data-reformbox-overlay-close="%4$s" aria-hidden="true" role="dialog" aria-modal="true" aria-label="%5$s" tabindex="-1">'
			. '<button class="reformbox-close close-button" type="button" aria-label="%6$s" style="fill: var(--wp--preset--color--contrast, currentColor)">'
			. '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="m13.06 12 6.47-6.47-1.06-1.06L12 10.94 5.53 4.47 4.47 5.53 10.94 12l-6.47 6.47 1.06 1.06L12 13.06l6.47 6.47 1.06-1.06L13.06 12Z"></path></svg>'
			. '</button>'
			. '<div class="reformbox-lightbox-container lightbox-image-container"><div class="reformbox-content">%7$s</div></div>'
			. '<div class="scrim" aria-hidden="true"></div>'
			. '</div>',
			esc_attr( $overlay_class ),
			esc_attr( $id ),
			esc_attr( $type ),
			esc_attr( $overlay_close ? 'true' : 'false' ),
			esc_attr( $dialog_label ),
			esc_attr__( 'Close', 'reformbox' ),
			$content // Already rendered block HTML – escaped by core.
		);
	}

	/**
	 * Add a trigger data-attribute to the first tag in block HTML.
	 *
	 * @param string $html      Block HTML.
	 * @param string $target_id Target lightbox ID.
	 * @return string Modified HTML.
	 */
	private function add_trigger_attribute( $html, $target_id ) {
		$processor = new WP_HTML_Tag_Processor( $html );
		if ( ! $processor->next_tag() ) {
			return $html;
		}

		$tag_name = strtolower( (string) $processor->get_tag() );

		$processor->set_attribute( 'data-reformbox-trigger', $target_id );
		$processor->set_attribute( 'aria-controls', $target_id );
		$processor->set_attribute( 'aria-expanded', 'false' );
		$processor->set_attribute( 'aria-haspopup', 'dialog' );

		$interactive_tags = array( 'a', 'button', 'input', 'select', 'textarea', 'summary' );
		if ( ! in_array( $tag_name, $interactive_tags, true ) ) {
			if ( null === $processor->get_attribute( 'role' ) ) {
				$processor->set_attribute( 'role', 'button' );
			}
			if ( null === $processor->get_attribute( 'tabindex' ) ) {
				$processor->set_attribute( 'tabindex', '0' );
			}
		}

		return $processor->get_updated_html();
	}

	/**
	 * Extract wrapper tag attributes used for the lightweight video trigger.
	 *
	 * @param string $block_content Original video block HTML.
	 * @return array{tag:string,class:string,style:string}
	 */
	private function get_video_trigger_wrapper( $block_content ) {
		$processor = new WP_HTML_Tag_Processor( $block_content );
		if ( ! $processor->next_tag() ) {
			return array(
				'tag'   => 'div',
				'class' => '',
				'style' => '',
			);
		}

		$tag_name = strtolower( (string) $processor->get_tag() );
		if ( ! in_array( $tag_name, array( 'figure', 'div' ), true ) ) {
			$tag_name = 'div';
		}

		return array(
			'tag'   => $tag_name,
			'class' => (string) $processor->get_attribute( 'class' ),
			'style' => (string) $processor->get_attribute( 'style' ),
		);
	}

	/**
	 * Extract the figcaption HTML from a block, when present.
	 *
	 * @param string $block_content Original block HTML.
	 * @return string
	 */
	private function get_figcaption_html( $block_content ) {
		if ( preg_match( '/<figcaption\b[^>]*>.*?<\/figcaption>/is', $block_content, $matches ) ) {
			return $matches[0];
		}

		return '';
	}

	/**
	 * Convert an associative array into escaped HTML attributes.
	 *
	 * @param array<string,string> $attributes Attribute map.
	 * @return string
	 */
	private function build_html_attributes( $attributes ) {
		$parts = array();

		foreach ( $attributes as $name => $value ) {
			if ( '' === $value ) {
				continue;
			}

			$parts[] = sprintf(
				' %s="%s"',
				esc_attr( $name ),
				esc_attr( $value )
			);
		}

		return implode( '', $parts );
	}

	/**
	 * Prepare video markup for lazy loading inside the lightbox overlay.
	 *
	 * The overlay stays hidden until opened, so prevent eager preload/autoplay
	 * and restore playback in the frontend script only when needed.
	 *
	 * @param string $block_content Original video block HTML.
	 * @return string
	 */
	private function prepare_video_lightbox_content( $block_content ) {
		$processor = new WP_HTML_Tag_Processor( $block_content );
		if ( ! $processor->next_tag( 'video' ) ) {
			return $block_content;
		}

		$processor->set_attribute( 'preload', 'none' );
		$processor->set_attribute( 'data-reformbox-video', 'true' );

		if ( null !== $processor->get_attribute( 'autoplay' ) ) {
			$processor->remove_attribute( 'autoplay' );
			$processor->set_attribute( 'data-reformbox-autoplay', 'true' );
		}

		return $processor->get_updated_html();
	}

	/**
	 * Build a video trigger element: shows the video poster as a
	 * thumbnail with a play icon, rather than duplicating the
	 * full <video> element in the page.
	 *
	 * @param string $block_content Original video block HTML.
	 * @param string $id            Target lightbox ID.
	 * @param array  $attrs         Block attributes.
	 * @return string Trigger HTML.
	 */
	private function build_video_trigger( $block_content, $id, $attrs ) {
		$poster = '';
		if ( ! empty( $attrs['poster'] ) ) {
			$poster = $attrs['poster'];
		} else {
			// Try to extract poster from <video> tag.
			$processor = new WP_HTML_Tag_Processor( $block_content );
			if ( $processor->next_tag( 'video' ) ) {
				$poster = (string) $processor->get_attribute( 'poster' );
			}
		}

		if ( $poster ) {
			$wrapper         = $this->get_video_trigger_wrapper( $block_content );
			$wrapper_tag     = $wrapper['tag'];
			$wrapper_classes = trim( $wrapper['class'] . ' reformbox-video-trigger wp-lightbox-container' );
			$wrapper_style   = $wrapper['style'];
			$caption_html    = $this->get_figcaption_html( $block_content );
			$wrapper_attrs   = array(
				'class'                  => $wrapper_classes,
				'data-reformbox-trigger' => $id,
				'aria-controls'          => $id,
				'aria-expanded'          => 'false',
				'aria-haspopup'          => 'dialog',
				'aria-label'             => __( 'Play video', 'reformbox' ),
				'role'                   => 'button',
				'tabindex'               => '0',
			);

			if ( $wrapper_style ) {
				$wrapper_attrs['style'] = $wrapper_style;
			}

			$trigger_html = sprintf(
				'<%1$s%2$s><span class="reformbox-video-trigger__frame"><img src="%3$s" alt="" class="reformbox-video-trigger__poster" loading="lazy" decoding="async" /><span class="reformbox-video-trigger__play" aria-hidden="true">&#9654;</span></span>%4$s</%1$s>',
				tag_escape( $wrapper_tag ),
				$this->build_html_attributes( $wrapper_attrs ),
				esc_url( $poster ),
				$caption_html
			);
		} else {
			// No poster available — fall back to adding trigger on original block.
			$trigger_html = $this->add_trigger_attribute( $block_content, $id );
		}

		return $trigger_html;
	}

	// render_block callbacks.

	/**
	 * Group → lightbox container.
	 *
	 * @param string $block_content Rendered block content.
	 * @param array  $block         Parsed block data.
	 * @return string
	 */
	public function render_container_block( $block_content, $block ) {
		if ( empty( $block['attrs']['reformboxEnabled'] ) ) {
			return $block_content;
		}

		$id = $this->get_reformbox_id( $block['attrs'] );
		if ( '' === $id ) {
			return $block_content;
		}

		$this->enqueue_frontend();

		$mode           = $this->get_reformbox_mode( $block['attrs'] );
		$trigger_source = $block_content;
		$overlay_source = $block_content;

		if ( 'split' === $mode ) {
			$split_content  = $this->build_split_group_content( $block_content, $block );
			$trigger_source = $split_content['preview'];
			$overlay_source = $split_content['modal'];
		}

		$trigger_content = $this->add_trigger_attribute( $trigger_source, $id );
		$overlay_content = $this->get_lightbox_overlay( $overlay_source, $id, $block['attrs'] );

		return $trigger_content . $overlay_content;
	}

	/**
	 * Video → self-lightbox.
	 *
	 * @param string $block_content Rendered block content.
	 * @param array  $block         Parsed block data.
	 * @return string
	 */
	public function render_video_block( $block_content, $block ) {
		if ( ! empty( $block['attrs']['reformboxEnabled'] ) ) {
			$id = $this->get_reformbox_id( $block['attrs'] );
			if ( '' === $id ) {
				return $block_content;
			}

			$this->enqueue_frontend();

			// Build a placeholder trigger that shows a play icon overlay.
			// The actual video is only inside the lightbox overlay.
			$trigger_content = $this->build_video_trigger( $block_content, $id, $block['attrs'] );
			$lightbox_html   = $this->get_lightbox_overlay(
				$this->prepare_video_lightbox_content( $block_content ),
				$id,
				$block['attrs'],
				'media'
			);

			return $trigger_content . $lightbox_html;
		}

		return $block_content;
	}

	/**
	 * Paragraph → self-lightbox.
	 *
	 * @param string $block_content Rendered block content.
	 * @param array  $block         Parsed block data.
	 * @return string
	 */
	public function render_trigger_block( $block_content, $block ) {
		if ( ! empty( $block['attrs']['reformboxEnabled'] ) ) {
			$id = $this->get_reformbox_id( $block['attrs'] );
			if ( '' === $id ) {
				return $block_content;
			}

			$this->enqueue_frontend();

			$trigger_content = $this->add_trigger_attribute( $block_content, $id );
			$overlay_content = $this->get_lightbox_overlay( $block_content, $id, $block['attrs'] );

			return $trigger_content . $overlay_content;
		}

		return $block_content;
	}
}
