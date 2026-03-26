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
	 * Cached editor asset manifest (false = build file missing).
	 *
	 * @var array|false|null
	 */
	private $editor_asset_cache = null;

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

		// Overlay opacity settings.
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_menu', array( $this, 'register_settings_page' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'output_overlay_css' ), 20 );
	}

	// Asset loading.

	/**
	 * Load and cache the editor asset manifest.
	 *
	 * @return array|false False when the build file is missing.
	 */
	private function get_editor_asset() {
		if ( null !== $this->editor_asset_cache ) {
			return $this->editor_asset_cache;
		}

		$asset_file               = REFORMBOX_PLUGIN_DIR . 'build/editor.asset.php';
		$this->editor_asset_cache = file_exists( $asset_file ) ? require $asset_file : false;

		return $this->editor_asset_cache;
	}

	/**
	 * Enqueue editor script and style.
	 */
	public function enqueue_editor_assets() {
		$asset = $this->get_editor_asset();
		if ( false === $asset ) {
			return;
		}

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

		// Limit to block editor screens only (e.g. exclude plugins/settings pages).
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! $screen->is_block_editor() ) {
			return;
		}

		$css_file = REFORMBOX_PLUGIN_DIR . 'build/editor.css';
		if ( ! file_exists( $css_file ) ) {
			return;
		}

		$cached = $this->get_editor_asset();
		$asset  = false !== $cached
			? $cached
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

		// Fallback: If the wrapper cannot be safely detected, return the original HTML
		// to avoid breaking the layout by removing necessary container tags.
		return $group_html;
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
			if ( $is_group ) {
				$slot = $this->get_reformbox_slot( $inner_block['attrs'] ?? array() );
				if ( 'modal' === $slot ) {
					$modal_blocks[] = $inner_block;
					continue;
				}

				if ( 'none' === $slot ) {
					$preview_blocks[] = $inner_block;
					$modal_blocks[]   = $inner_block;
					continue;
				}
			}

			// Non-group blocks and preview slot groups are treated as preview.
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
	 * Extract the poster URL from a rendered video block.
	 *
	 * @param string $block_content Rendered video block HTML.
	 * @param array  $attrs         Block attributes.
	 * @return string
	 */
	private function get_video_poster_url( $block_content, $attrs ) {
		if ( ! empty( $attrs['poster'] ) ) {
			return (string) $attrs['poster'];
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );
		if ( $processor->next_tag( 'video' ) ) {
			return (string) $processor->get_attribute( 'poster' );
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
		$poster = $this->get_video_poster_url( $block_content, $attrs );
		if ( '' === $poster ) {
			return $block_content;
		}

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

		return sprintf(
			'<%1$s%2$s><span class="reformbox-video-trigger__frame"><img src="%3$s" alt="" class="reformbox-video-trigger__poster" loading="lazy" decoding="async" /><span class="reformbox-video-trigger__play" aria-hidden="true">&#9654;</span></span>%4$s</%1$s>',
			tag_escape( $wrapper_tag ),
			$this->build_html_attributes( $wrapper_attrs ),
			esc_url( $poster ),
			$caption_html
		);
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
			if ( '' === $this->get_video_poster_url( $block_content, $block['attrs'] ?? array() ) ) {
				return $block_content;
			}

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

	// Settings.

	/**
	 * Register the ReformBox settings page under Settings.
	 */
	public function register_settings_page() {
		add_options_page(
			__( 'ReformBox', 'reformbox' ),
			__( 'ReformBox', 'reformbox' ),
			'manage_options',
			'reformbox',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Render the ReformBox settings page.
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'ReformBox Settings', 'reformbox' ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'reformbox' );
				do_settings_sections( 'reformbox' );
				submit_button();
				?>
			</form>
		</div>
		<?php
	}

	/**
	 * Register lightbox overlay opacity settings on the ReformBox settings page.
	 */
	public function register_settings() {
		$opacity_settings = array(
			'reformbox_core_overlay_opacity' => array(
				'default' => 90,
				'label'   => __( 'WordPress Core Lightbox Opacity', 'reformbox' ),
				'desc'    => __( 'Background opacity of the WordPress core image lightbox.', 'reformbox' ),
			),
			'reformbox_overlay_opacity'      => array(
				'default' => 90,
				'label'   => __( 'ReformBox Overlay Opacity', 'reformbox' ),
				'desc'    => __( 'Background opacity for all ReformBox lightbox overlays.', 'reformbox' ),
			),
		);
		$color_settings   = array(
			'reformbox_core_overlay_color' => array(
				'default' => '#ffffff',
				'label'   => __( 'WordPress Core Lightbox Background', 'reformbox' ),
				'desc'    => __( 'Background color of the WordPress core image lightbox.', 'reformbox' ),
			),
			'reformbox_overlay_color'      => array(
				'default' => '#ffffff',
				'label'   => __( 'ReformBox Overlay Background', 'reformbox' ),
				'desc'    => __( 'Background color for all ReformBox lightbox overlays.', 'reformbox' ),
			),
		);

		add_settings_section(
			'reformbox_overlay_settings',
			__( 'ReformBox Lightbox', 'reformbox' ),
			array( $this, 'render_settings_section' ),
			'reformbox'
		);

		foreach ( $opacity_settings as $option_name => $config ) {
			register_setting(
				'reformbox',
				$option_name,
				array(
					'type'              => 'integer',
					'default'           => $config['default'],
					'sanitize_callback' => array( $this, 'sanitize_opacity' ),
				)
			);

			add_settings_field(
				$option_name,
				$config['label'],
				array( $this, 'render_opacity_field' ),
				'reformbox',
				'reformbox_overlay_settings',
				array(
					'label_for'   => $option_name,
					'option_name' => $option_name,
					'default'     => $config['default'],
					'description' => $config['desc'],
				)
			);
		}

		foreach ( $color_settings as $option_name => $config ) {
			register_setting(
				'reformbox',
				$option_name,
				array(
					'type'              => 'string',
					'default'           => $config['default'],
					'sanitize_callback' => array( $this, 'sanitize_overlay_color' ),
				)
			);

			add_settings_field(
				$option_name,
				$config['label'],
				array( $this, 'render_color_field' ),
				'reformbox',
				'reformbox_overlay_settings',
				array(
					'label_for'   => $option_name,
					'option_name' => $option_name,
					'default'     => $config['default'],
					'description' => $config['desc'],
				)
			);
		}
	}

	/**
	 * Render the description for the overlay settings section.
	 */
	public function render_settings_section() {
		echo '<p>' . esc_html__( 'Configure lightbox overlay background color and opacity. Opacity: 0 = fully transparent, 100 = fully opaque.', 'reformbox' ) . '</p>';
	}

	/**
	 * Render a range input field for opacity settings.
	 *
	 * @param array $args Field arguments.
	 */
	public function render_opacity_field( $args ) {
		$option_name = $args['option_name'];
		$default     = $args['default'];
		$value       = $this->sanitize_opacity( get_option( $option_name, $default ) );
		$description = isset( $args['description'] ) ? $args['description'] : '';

		printf(
			'<input type="range" id="%1$s" name="%1$s" min="0" max="100" step="1" value="%2$d" '
			. 'oninput="document.getElementById(\'%1$s_val\').textContent=this.value" style="vertical-align:middle" /> '
			. '<output id="%1$s_val" style="min-width:2.5em;display:inline-block;text-align:right">%2$d</output>%%',
			esc_attr( $option_name ),
			absint( $value )
		);

		if ( '' !== $description ) {
			printf( '<p class="description">%s</p>', esc_html( $description ) );
		}
	}

	/**
	 * Render a color input field for overlay background settings.
	 *
	 * @param array $args Field arguments.
	 */
	public function render_color_field( $args ) {
		$option_name = $args['option_name'];
		$default     = $this->normalize_hex_color( $args['default'], '#ffffff' );
		$value       = $this->sanitize_overlay_color( get_option( $option_name, $default ) );
		$description = isset( $args['description'] ) ? $args['description'] : '';

		printf(
			'<input type="color" id="%1$s" name="%1$s" value="%2$s" /> <code>%2$s</code>',
			esc_attr( $option_name ),
			esc_attr( $value )
		);

		if ( '' !== $description ) {
			printf( '<p class="description">%s</p>', esc_html( $description ) );
		}
	}

	/**
	 * Sanitize an opacity value to 0-100 integer range.
	 *
	 * @param mixed $value Raw input.
	 * @return int
	 */
	public function sanitize_opacity( $value ) {
		return max( 0, min( 100, (int) $value ) );
	}

	/**
	 * Sanitize an overlay color to a normalized 6-digit hex value.
	 *
	 * @param mixed $value Raw input.
	 * @return string
	 */
	public function sanitize_overlay_color( $value ) {
		return $this->normalize_hex_color( $value, '#ffffff' );
	}

	/**
	 * Normalize a color string to a lower-case 6-digit hex color.
	 *
	 * @param mixed  $value    Raw color candidate.
	 * @param string $fallback Fallback color.
	 * @return string
	 */
	private function normalize_hex_color( $value, $fallback ) {
		$sanitized = sanitize_hex_color( (string) $value );
		if ( ! $sanitized ) {
			$sanitized = sanitize_hex_color( $fallback );
		}
		if ( ! $sanitized ) {
			$sanitized = '#ffffff';
		}

		if ( 4 === strlen( $sanitized ) ) {
			$sanitized = sprintf(
				'#%1$s%1$s%2$s%2$s%3$s%3$s',
				$sanitized[1],
				$sanitized[2],
				$sanitized[3]
			);
		}

		return strtolower( $sanitized );
	}

	/**
	 * Convert a hex color to comma-separated RGB values.
	 *
	 * @param string $hex Hex color value.
	 * @return string
	 */
	private function get_color_rgb( $hex ) {
		$normalized = $this->normalize_hex_color( $hex, '#ffffff' );
		$hex_value  = ltrim( $normalized, '#' );

		return sprintf(
			'%d, %d, %d',
			hexdec( substr( $hex_value, 0, 2 ) ),
			hexdec( substr( $hex_value, 2, 2 ) ),
			hexdec( substr( $hex_value, 4, 2 ) )
		);
	}

	/**
	 * Convert an opacity percentage to a CSS alpha value string.
	 *
	 * @param int $opacity Opacity percentage.
	 * @return string
	 */
	private function get_opacity_alpha( $opacity ) {
		return number_format( $this->sanitize_opacity( $opacity ) / 100, 2, '.', '' );
	}

	/**
	 * Output custom overlay opacity CSS on the frontend.
	 */
	public function output_overlay_css() {
		$default_core_opacity    = 90;
		$default_overlay_opacity = 90;
		$default_core_color      = '#ffffff';
		$default_overlay_color   = '#ffffff';

		$core_opacity    = $this->sanitize_opacity( get_option( 'reformbox_core_overlay_opacity', $default_core_opacity ) );
		$core_color      = $this->sanitize_overlay_color( get_option( 'reformbox_core_overlay_color', $default_core_color ) );
		$overlay_opacity = $this->sanitize_opacity( get_option( 'reformbox_overlay_opacity', $default_overlay_opacity ) );
		$overlay_color   = $this->sanitize_overlay_color( get_option( 'reformbox_overlay_color', $default_overlay_color ) );

		$rules = array();

		if ( $default_core_opacity !== $core_opacity || $default_core_color !== $core_color ) {
			$rules[] = sprintf(
				'.wp-lightbox-overlay:not(.reformbox-overlay) .scrim{background-color:rgba(%1$s,%2$s)!important}',
				$this->get_color_rgb( $core_color ),
				$this->get_opacity_alpha( $core_opacity )
			);
		}

		if ( $default_overlay_opacity !== $overlay_opacity || $default_overlay_color !== $overlay_color ) {
			$overlay_rgb   = $this->get_color_rgb( $overlay_color );
			$overlay_alpha = $this->get_opacity_alpha( $overlay_opacity );

			$rules[] = sprintf(
				'.reformbox-overlay .scrim{--reformbox-overlay-rgb:%1$s;--reformbox-overlay-alpha:%2$s;background-color:rgba(%1$s,%2$s)!important}',
				$overlay_rgb,
				$overlay_alpha
			);
			$rules[] = sprintf(
				'.reformbox-overlay[data-reformbox-dialog-type="content"] .scrim{background-color:rgba(%1$s,%2$s)!important}',
				$overlay_rgb,
				$overlay_alpha
			);
		}

		if ( ! empty( $rules ) ) {
			$handle = 'reformbox-overlay-inline';
			if ( ! wp_style_is( $handle, 'registered' ) ) {
				wp_register_style( $handle, false, array(), REFORMBOX_VERSION );
			}

			wp_enqueue_style( $handle );
			wp_add_inline_style( $handle, implode( '', $rules ) );
		}
	}
}
