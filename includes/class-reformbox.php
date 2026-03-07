<?php
/**
 * ReformBox core class.
 *
 * Registers editor extensions and modifies block output
 * to add lightbox functionality.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ReformBox {

	/** @var self|null */
	private static $instance = null;

	/** @var bool Whether the current page has lightbox content. */
	private $has_lightbox = false;

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

		// Frontend assets (register early, enqueue lazily).
		add_action( 'wp_enqueue_scripts', array( $this, 'register_frontend_assets' ) );

		// Container blocks (content displayed in lightbox).
		add_filter( 'render_block_core/group', array( $this, 'render_container_block' ), 10, 2 );
		add_filter( 'render_block_core/cover', array( $this, 'render_container_block' ), 10, 2 );

		// Image (core lightbox + optional ReformBox trigger) / self-lightbox blocks.
		add_filter( 'render_block_core/image', array( $this, 'render_image_block' ), 10, 2 );
		add_filter( 'render_block_core/video', array( $this, 'render_video_block' ), 10, 2 );

		// Trigger-only blocks (click to open another lightbox).
		add_filter( 'render_block_core/button', array( $this, 'render_trigger_block' ), 10, 2 );
		add_filter( 'render_block_core/paragraph', array( $this, 'render_trigger_block' ), 10, 2 );
		add_filter( 'render_block_core/heading', array( $this, 'render_trigger_block' ), 10, 2 );
	}

	/* ------------------------------------------------------------------
	 * Asset loading
	 * ----------------------------------------------------------------*/

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
			$asset['version']
		);

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
	 * Register frontend assets without enqueueing.
	 * They will be enqueued lazily when a lightbox block is rendered.
	 */
	public function register_frontend_assets() {
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
			array( 'in_footer' => true, 'strategy' => 'defer' )
		);

		$css_file = file_exists( REFORMBOX_PLUGIN_DIR . 'build/style-view.css' )
			? 'build/style-view.css'
			: 'build/view.css';

		if ( file_exists( REFORMBOX_PLUGIN_DIR . $css_file ) ) {
			wp_register_style(
				'reformbox-view',
				REFORMBOX_PLUGIN_URL . $css_file,
				array(),
				$asset['version']
			);
			wp_style_add_data( 'reformbox-view', 'rtl', 'replace' );
		}
	}

	/**
	 * Enqueue frontend CSS + JS (called once per page load).
	 */
	private function enqueue_frontend() {
		if ( $this->has_lightbox ) {
			return;
		}

		// Defensive registration for render contexts where wp_enqueue_scripts may not have fired yet.
		if ( ! wp_script_is( 'reformbox-view', 'registered' ) || ! wp_style_is( 'reformbox-view', 'registered' ) ) {
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

	/* ------------------------------------------------------------------
	 * Helpers
	 * ----------------------------------------------------------------*/

	/**
	 * Sanitize a ReformBox ID to safe HTML id characters.
	 */
	private function sanitize_reformbox_id( $id ) {
		return preg_replace( '/[^a-zA-Z0-9_-]/', '', (string) $id );
	}

	/**
	 * Get or generate a ReformBox ID from block attributes.
	 */
	private function get_reformbox_id( $attrs ) {
		$id = isset( $attrs['reformboxId'] )
			? $this->sanitize_reformbox_id( $attrs['reformboxId'] )
			: '';
		if ( '' === $id ) {
			$id = wp_unique_id( 'rb-' );
		}
		return $id;
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
		$animation     = isset( $attrs['reformboxAnimation'] ) ? sanitize_key( $attrs['reformboxAnimation'] ) : 'fade';
		$animation     = in_array( $animation, array( 'fade', 'zoom', 'slide' ), true ) ? $animation : 'fade';
		$overlay_close = isset( $attrs['reformboxOverlayClose'] ) ? (bool) $attrs['reformboxOverlayClose'] : true;

		$overlay_class = 'reformbox-overlay reformbox-animation-' . $animation;
		if ( 'media' === $type ) {
			$overlay_class .= ' reformbox-overlay--media';
		}

		return sprintf(
			'<div class="%s" id="%s" data-reformbox-overlay-close="%s" aria-hidden="true" role="dialog" aria-modal="true" aria-label="%s">'
			. '<div class="reformbox-container">'
			. '<button class="reformbox-close" type="button" aria-label="%s">&times;</button>'
			. '<div class="reformbox-content">%s</div>'
			. '</div></div>',
			esc_attr( $overlay_class ),
			esc_attr( $id ),
			esc_attr( $overlay_close ? 'true' : 'false' ),
			esc_attr__( 'Content', 'reformbox' ),
			esc_attr__( 'Close', 'reformbox' ),
			$content // Already rendered block HTML – escaped by core.
		);
	}

	/**
	 * Add a trigger data-attribute to the first tag in block HTML.
	 *
	 * For Button blocks the outer wrapper is a <div> but the clickable
	 * element is the inner <a>. This method handles that case by
	 * targeting the inner interactive element when appropriate.
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
		$classes  = (string) $processor->get_attribute( 'class' );

		// Button block: outer <div class="wp-block-button"> wraps the
		// clickable <a class="wp-block-button__link">. Put the trigger
		// on the inner <a> so click delegation works correctly.
		if ( 'div' === $tag_name && false !== strpos( $classes, 'wp-block-button' ) ) {
			if ( $processor->next_tag( 'a' ) ) {
				$processor->set_attribute( 'data-reformbox-trigger', $target_id );
				return $processor->get_updated_html();
			}
			// Fallback: no inner <a> found, use the wrapper.
			$processor = new WP_HTML_Tag_Processor( $html );
			$processor->next_tag();
		}

		$processor->set_attribute( 'data-reformbox-trigger', $target_id );

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
			$trigger_html = sprintf(
				'<div class="reformbox-video-trigger" data-reformbox-trigger="%s" role="button" tabindex="0">'
				. '<img src="%s" alt="%s" class="reformbox-video-trigger__poster" />'
				. '<span class="reformbox-video-trigger__play" aria-hidden="true">&#9654;</span>'
				. '</div>',
				esc_attr( $id ),
				esc_url( $poster ),
				esc_attr__( 'Play video', 'reformbox' ),
			);
		} else {
			// No poster available — fall back to adding trigger on original block.
			$trigger_html = $this->add_trigger_attribute( $block_content, $id );
		}

		return $trigger_html;
	}

	/* ------------------------------------------------------------------
	 * render_block callbacks
	 * ----------------------------------------------------------------*/

	/**
	 * Group / Cover → lightbox container.
	 */
	public function render_container_block( $block_content, $block ) {
		if ( empty( $block['attrs']['reformboxEnabled'] ) ) {
			return $block_content;
		}

		$this->enqueue_frontend();
		$id = $this->get_reformbox_id( $block['attrs'] );

		return $this->get_lightbox_overlay( $block_content, $id, $block['attrs'] );
	}

	/**
	 * Image → core lightbox (if enabled) or ReformBox trigger.
	 */
	public function render_image_block( $block_content, $block ) {
		// Respect WordPress core lightbox when enabled for Image block.
		if ( ! empty( $block['attrs']['lightbox']['enabled'] ) ) {
			return $block_content;
		}

		// Legacy fallback for posts saved before core-image delegation.
		if ( ! empty( $block['attrs']['reformboxEnabled'] ) ) {
			$this->enqueue_frontend();
			$id = $this->get_reformbox_id( $block['attrs'] );

			// Resolve full-size URL.
			$image_url = '';
			if ( ! empty( $block['attrs']['id'] ) ) {
				$full_src  = wp_get_attachment_image_src( (int) $block['attrs']['id'], 'full' );
				$image_url = $full_src ? $full_src[0] : '';
			}
			if ( empty( $image_url ) && ! empty( $block['attrs']['url'] ) ) {
				$image_url = $block['attrs']['url'];
			}
			if ( empty( $image_url ) ) {
				return $block_content;
			}

			$alt             = ! empty( $block['attrs']['alt'] ) ? $block['attrs']['alt'] : '';
			$lightbox_html   = sprintf(
				'<img src="%s" alt="%s" />',
				esc_url( $image_url ),
				esc_attr( $alt )
			);
			$trigger_content = $this->add_trigger_attribute( $block_content, $id );

			return $trigger_content . $this->get_lightbox_overlay( $lightbox_html, $id, $block['attrs'], 'media' );
		}

		// Trigger for another lightbox.
		if ( ! empty( $block['attrs']['reformboxTarget'] ) ) {
			$target_id = $this->sanitize_reformbox_id( $block['attrs']['reformboxTarget'] );
			if ( $target_id ) {
				$this->enqueue_frontend();
				return $this->add_trigger_attribute( $block_content, $target_id );
			}
		}

		return $block_content;
	}

	/**
	 * Video → self-lightbox or trigger.
	 */
	public function render_video_block( $block_content, $block ) {
		if ( ! empty( $block['attrs']['reformboxEnabled'] ) ) {
			$this->enqueue_frontend();
			$id = $this->get_reformbox_id( $block['attrs'] );

			// Build a placeholder trigger that shows a play icon overlay.
			// The actual video is only inside the lightbox overlay.
			$trigger_content = $this->build_video_trigger( $block_content, $id, $block['attrs'] );
			$lightbox_html   = $this->get_lightbox_overlay( $block_content, $id, $block['attrs'], 'media' );

			return $trigger_content . $lightbox_html;
		}

		if ( ! empty( $block['attrs']['reformboxTarget'] ) ) {
			$target_id = $this->sanitize_reformbox_id( $block['attrs']['reformboxTarget'] );
			if ( $target_id ) {
				$this->enqueue_frontend();
				return $this->add_trigger_attribute( $block_content, $target_id );
			}
		}

		return $block_content;
	}

	/**
	 * Button / Paragraph / Heading → trigger.
	 */
	public function render_trigger_block( $block_content, $block ) {
		if ( empty( $block['attrs']['reformboxTarget'] ) ) {
			return $block_content;
		}

		$target_id = $this->sanitize_reformbox_id( $block['attrs']['reformboxTarget'] );
		if ( empty( $target_id ) ) {
			return $block_content;
		}

		$this->enqueue_frontend();
		return $this->add_trigger_attribute( $block_content, $target_id );
	}
}
