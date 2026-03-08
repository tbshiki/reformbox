<?php
/**
 * Plugin Name: ReformBox – Universal Lightbox
 * Plugin URI:  https://github.com/tbshiki/reformbox
 * Description: Universal Lightbox for WordPress – display any block content in a lightbox modal.
 * Version:     0.2.0
 * Requires at least: 6.4
 * Requires PHP: 7.4
 * Author:      tbshiki
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: reformbox
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'REFORMBOX_VERSION', '0.2.0' );
define( 'REFORMBOX_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'REFORMBOX_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'REFORMBOX_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );

require_once REFORMBOX_PLUGIN_DIR . 'includes/class-reformbox.php';

add_action( 'plugins_loaded', array( 'ReformBox', 'init' ) );
