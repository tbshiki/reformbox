/**
 * ReformBox - Editor extensions.
 *
 * Adds ReformBox attributes and InspectorControls to supported core blocks.
 */

import { InspectorControls } from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import { PanelBody, SelectControl, ToggleControl } from '@wordpress/components';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import './editor.css';

const CONTAINER_BLOCKS = [ 'core/group', 'core/cover' ];
const SELF_LIGHTBOX_BLOCKS = [
	'core/video',
	'core/button',
	'core/paragraph',
	'core/heading',
];
const CORE_IMAGE_BLOCK = 'core/image';
const ANIMATION_OPTIONS = [
	{ label: __( 'Fade', 'reformbox' ), value: 'fade' },
	{ label: __( 'Zoom', 'reformbox' ), value: 'zoom' },
	{ label: __( 'Slide', 'reformbox' ), value: 'slide' },
];

function sanitizeReformBoxId( value ) {
	return String( value || '' ).replace( /[^a-zA-Z0-9_-]/g, '' );
}

function generateId( seed = '' ) {
	const normalizedSeed = sanitizeReformBoxId( seed ).replace( /-/g, '' );

	if ( normalizedSeed ) {
		return `rb-${ normalizedSeed.slice( 0, 8 ) }`;
	}

	return `rb-${ Math.random().toString( 36 ).slice( 2, 10 ) }`;
}

function getImageLightboxAttributes( lightbox = {}, enabled ) {
	return {
		...lightbox,
		enabled,
	};
}

function addReformBoxAttributes( settings, name ) {
	const isContainer = CONTAINER_BLOCKS.includes( name );
	const isSelfLightbox = SELF_LIGHTBOX_BLOCKS.includes( name );

	if ( ! isContainer && ! isSelfLightbox ) {
		return settings;
	}

	const attrs = {};

	if ( isContainer || isSelfLightbox ) {
		attrs.reformboxEnabled = { type: 'boolean', default: false };
		attrs.reformboxId = { type: 'string', default: '' };
		attrs.reformboxAnimation = { type: 'string', default: 'fade' };
		attrs.reformboxOverlayClose = { type: 'boolean', default: true };
	}

	return {
		...settings,
		attributes: {
			...settings.attributes,
			...attrs,
		},
	};
}

addFilter(
	'blocks.registerBlockType',
	'reformbox/attributes',
	addReformBoxAttributes
);

const withReformBoxControls = createHigherOrderComponent( ( BlockEdit ) => {
	return function ReformBoxControls( props ) {
		const { clientId, name, attributes, setAttributes } = props;
		const isContainer = CONTAINER_BLOCKS.includes( name );
		const isSelfLightbox = SELF_LIGHTBOX_BLOCKS.includes( name );
		const isCoreImage = name === CORE_IMAGE_BLOCK;
		const isSupported = isContainer || isSelfLightbox || isCoreImage;
		const imageLightboxEnabled = !! attributes?.lightbox?.enabled;
		const isLightboxEnabledBlock = isContainer || isSelfLightbox;

		useEffect( () => {
			if (
				! isSupported ||
				! isLightboxEnabledBlock ||
				! attributes.reformboxEnabled ||
				attributes.reformboxId
			) {
				return;
			}

			setAttributes( { reformboxId: generateId( clientId ) } );
		}, [
			clientId,
			attributes.reformboxEnabled,
			attributes.reformboxId,
			isLightboxEnabledBlock,
			isSupported,
			setAttributes,
		] );

		if ( ! isSupported ) {
			return <BlockEdit { ...props } />;
		}

		const showEnableToggle = isLightboxEnabledBlock;
		const showImageLightboxToggle = isCoreImage;
		const initialOpen =
			!! attributes.reformboxEnabled || imageLightboxEnabled;

		const handleEnableToggle = ( value ) => {
			const next = { reformboxEnabled: value };

			if ( value && ! attributes.reformboxId ) {
				next.reformboxId = generateId( clientId );
			}

			setAttributes( next );
		};

		const handleCoreImageLightboxToggle = ( value ) => {
			setAttributes( {
				lightbox: getImageLightboxAttributes(
					attributes.lightbox,
					value
				),
			} );
		};

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'ReformBox', 'reformbox' ) }
						initialOpen={ initialOpen }
					>
						{ showEnableToggle && (
							<ToggleControl
								__nextHasNoMarginBottom
								label={
									isContainer
										? __(
												'Enable as Lightbox Container',
												'reformbox'
										  )
										: __(
												'Enable Lightbox on Click',
												'reformbox'
										  )
								}
								checked={ !! attributes.reformboxEnabled }
								onChange={ handleEnableToggle }
							/>
						) }

						{ showImageLightboxToggle && (
							<ToggleControl
								__nextHasNoMarginBottom
								label={ __(
									'Enable Core Image Lightbox',
									'reformbox'
								) }
								help={ __(
									'Uses the WordPress core lightbox output and behavior.',
									'reformbox'
								) }
								checked={ imageLightboxEnabled }
								onChange={ handleCoreImageLightboxToggle }
							/>
						) }

						{ attributes.reformboxEnabled &&
							( isContainer || isSelfLightbox ) && (
								<>
									<SelectControl
										__nextHasNoMarginBottom
										label={ __( 'Animation', 'reformbox' ) }
										value={ attributes.reformboxAnimation }
										options={ ANIMATION_OPTIONS }
										onChange={ ( value ) =>
											setAttributes( {
												reformboxAnimation: value,
											} )
										}
									/>
									<ToggleControl
										__nextHasNoMarginBottom
										label={ __(
											'Close on Overlay Click',
											'reformbox'
										) }
										checked={
											attributes.reformboxOverlayClose
										}
										onChange={ ( value ) =>
											setAttributes( {
												reformboxOverlayClose: value,
											} )
										}
									/>
								</>
							) }
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withReformBoxControls' );

addFilter(
	'editor.BlockEdit',
	'reformbox/inspector-controls',
	withReformBoxControls
);

const withReformBoxEditorClass = createHigherOrderComponent(
	( BlockListBlock ) => {
		return function ReformBoxEditorClass( props ) {
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
