/**
 * ReformBox – Editor extensions.
 *
 * Adds ReformBox attributes and InspectorControls to supported core blocks.
 */

import { addFilter } from '@wordpress/hooks';
import { createHigherOrderComponent } from '@wordpress/compose';
import { InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	ToggleControl,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { Fragment } from '@wordpress/element';

import './editor.scss';

/* ------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------*/

/** Blocks that can act as lightbox containers (content shown inside lightbox). */
const CONTAINER_BLOCKS = [ 'core/group', 'core/cover' ];

/** Blocks that open themselves in a ReformBox lightbox on click. */
const REFORMBOX_SELF_LIGHTBOX_BLOCKS = [ 'core/video' ];

/** Block that uses WordPress core lightbox instead of ReformBox overlay. */
const CORE_IMAGE_LIGHTBOX_BLOCK = 'core/image';

/** Blocks that can trigger another lightbox. */
const TRIGGER_BLOCKS = [
	'core/button',
	'core/paragraph',
	'core/heading',
	'core/image',
	'core/video',
];

const ALL_BLOCKS = [
	...new Set( [
		...CONTAINER_BLOCKS,
		...REFORMBOX_SELF_LIGHTBOX_BLOCKS,
		...TRIGGER_BLOCKS,
	] ),
];

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function generateId() {
	return 'rb-' + Math.random().toString( 36 ).substring( 2, 10 );
}

function isCoreImageLightboxEnabled( attributes ) {
	return !! attributes?.lightbox?.enabled;
}

/* ------------------------------------------------------------------
 * 1. Register custom attributes on target blocks
 * ----------------------------------------------------------------*/

function addReformBoxAttributes( settings, name ) {
	if ( ! ALL_BLOCKS.includes( name ) ) {
		return settings;
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			reformboxEnabled: { type: 'boolean', default: false },
			reformboxId: { type: 'string', default: '' },
			reformboxTarget: { type: 'string', default: '' },
			reformboxAnimation: { type: 'string', default: 'fade' },
			reformboxOverlayClose: { type: 'boolean', default: true },
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'reformbox/attributes',
	addReformBoxAttributes
);

/* ------------------------------------------------------------------
 * 2. Add InspectorControls panel
 * ----------------------------------------------------------------*/

const withReformBoxControls = createHigherOrderComponent( ( BlockEdit ) => {
	return ( props ) => {
		const { name, attributes, setAttributes } = props;

		if ( ! ALL_BLOCKS.includes( name ) ) {
			return <BlockEdit { ...props } />;
		}

		const isContainer = CONTAINER_BLOCKS.includes( name );
		const isSelfLightbox = REFORMBOX_SELF_LIGHTBOX_BLOCKS.includes( name );
		const isCoreImage = name === CORE_IMAGE_LIGHTBOX_BLOCK;
		const isTrigger = TRIGGER_BLOCKS.includes( name );
		const coreImageLightboxEnabled =
			isCoreImageLightboxEnabled( attributes );
		const hasLegacyImageSelfLightbox =
			isCoreImage &&
			!! attributes.reformboxEnabled &&
			! coreImageLightboxEnabled;
		const imageSelfLightboxEnabled =
			coreImageLightboxEnabled || hasLegacyImageSelfLightbox;
		const hasSelfLightbox = isCoreImage
			? imageSelfLightboxEnabled
			: !! attributes.reformboxEnabled;
		const initialOpen =
			attributes.reformboxEnabled ||
			!! attributes.reformboxTarget ||
			( isCoreImage && imageSelfLightboxEnabled );
		const showEnableToggle = isContainer || isSelfLightbox || isCoreImage;
		const toggleChecked = isCoreImage
			? imageSelfLightboxEnabled
			: attributes.reformboxEnabled;

		let toggleLabel = __( 'Enable Lightbox on Click', 'reformbox' );
		if ( isContainer ) {
			toggleLabel = __( 'Enable as Lightbox Container', 'reformbox' );
		} else if ( isCoreImage ) {
			toggleLabel = __( 'Enable Core Image Lightbox', 'reformbox' );
		}

		const toggleHelp = isCoreImage
			? __(
					'Uses WordPress core Image lightbox behavior instead of ReformBox overlay.',
					'reformbox'
			  )
			: undefined;

		const handleEnableToggle = ( value ) => {
			if ( isCoreImage ) {
				let lightbox = { enabled: value };
				if (
					attributes.lightbox &&
					typeof attributes.lightbox === 'object'
				) {
					lightbox = { ...attributes.lightbox, enabled: value };
				}

				setAttributes( {
					lightbox,
					reformboxEnabled: false,
					reformboxId: '',
					reformboxTarget: value ? '' : attributes.reformboxTarget,
				} );
				return;
			}

			const next = { reformboxEnabled: value };
			if ( value && ! attributes.reformboxId ) {
				next.reformboxId = generateId();
			}
			if ( value && isTrigger ) {
				next.reformboxTarget = '';
			}
			setAttributes( next );
		};

		return (
			<Fragment>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'ReformBox', 'reformbox' ) }
						initialOpen={ initialOpen }
					>
						{ /* --- Container / Self-lightbox toggle --- */ }
						{ showEnableToggle && (
							<ToggleControl
								label={ toggleLabel }
								checked={ toggleChecked }
								onChange={ handleEnableToggle }
								help={ toggleHelp }
							/>
						) }

						{ /* --- ID field (shown when enabled) --- */ }
						{ attributes.reformboxEnabled &&
							( isContainer || isSelfLightbox ) && (
								<TextControl
									label={ __( 'ReformBox ID', 'reformbox' ) }
									value={ attributes.reformboxId }
									onChange={ ( value ) =>
										setAttributes( {
											reformboxId: value,
										} )
									}
									help={ __(
										'Unique ID for this lightbox. Use this ID as the target in trigger blocks.',
										'reformbox'
									) }
								/>
							) }

						{ /* --- Container-specific settings --- */ }
						{ attributes.reformboxEnabled && isContainer && (
							<>
								<SelectControl
									label={ __( 'Animation', 'reformbox' ) }
									value={ attributes.reformboxAnimation }
									options={ [
										{
											label: __( 'Fade', 'reformbox' ),
											value: 'fade',
										},
										{
											label: __( 'Zoom', 'reformbox' ),
											value: 'zoom',
										},
										{
											label: __( 'Slide', 'reformbox' ),
											value: 'slide',
										},
									] }
									onChange={ ( value ) =>
										setAttributes( {
											reformboxAnimation: value,
										} )
									}
								/>
								<ToggleControl
									label={ __(
										'Close on Overlay Click',
										'reformbox'
									) }
									checked={ attributes.reformboxOverlayClose }
									onChange={ ( value ) =>
										setAttributes( {
											reformboxOverlayClose: value,
										} )
									}
								/>
							</>
						) }

						{ /* --- Trigger target --- */ }
						{ isTrigger && ! hasSelfLightbox && (
							<TextControl
								label={ __(
									'Lightbox Target ID',
									'reformbox'
								) }
								value={ attributes.reformboxTarget }
								onChange={ ( value ) =>
									setAttributes( {
										reformboxTarget: value,
									} )
								}
								help={ __(
									'Enter the ReformBox ID of the lightbox to open on click.',
									'reformbox'
								) }
							/>
						) }
					</PanelBody>
				</InspectorControls>
			</Fragment>
		);
	};
}, 'withReformBoxControls' );

addFilter(
	'editor.BlockEdit',
	'reformbox/inspector-controls',
	withReformBoxControls
);

/* ------------------------------------------------------------------
 * 3. Visual indicator in editor for lightbox containers
 * ----------------------------------------------------------------*/

const withReformBoxEditorClass = createHigherOrderComponent(
	( BlockListBlock ) => {
		return ( props ) => {
			if (
				CONTAINER_BLOCKS.includes( props.name ) &&
				props.attributes?.reformboxEnabled
			) {
				return (
					<BlockListBlock
						{ ...props }
						className="is-reformbox-container"
					/>
				);
			}
			return <BlockListBlock { ...props } />;
		};
	},
	'withReformBoxEditorClass'
);

addFilter(
	'editor.BlockListBlock',
	'reformbox/editor-class',
	withReformBoxEditorClass
);
