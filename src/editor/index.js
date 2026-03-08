/**
 * ReformBox - Editor extensions.
 *
 * Adds ReformBox attributes and InspectorControls to supported core blocks.
 */

import { InspectorControls } from '@wordpress/block-editor';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	Button,
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import './editor.css';

const CONTAINER_BLOCKS = [ 'core/group' ];
const SELF_LIGHTBOX_BLOCKS = [ 'core/video', 'core/paragraph' ];
const CORE_IMAGE_BLOCK = 'core/image';
const ANIMATION_OPTIONS = [
	{ label: __( 'Zoom', 'reformbox' ), value: 'zoom' },
	{ label: __( 'Fade', 'reformbox' ), value: 'fade' },
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
		attrs.reformboxAnimation = { type: 'string', default: 'zoom' };
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
		const { selectBlock } = useDispatch( 'core/block-editor' );
		const parentContainerInfo = useSelect(
			( select ) => {
				const { getBlock, getBlockParents } =
					select( 'core/block-editor' );
				const parentClientIds = getBlockParents( clientId );
				const matchedParentClientId = parentClientIds.find(
					( parentClientId ) => {
						const parentBlock = getBlock( parentClientId );

						return (
							!! parentBlock &&
							CONTAINER_BLOCKS.includes( parentBlock.name ) &&
							!! parentBlock.attributes?.reformboxEnabled
						);
					}
				);

				if ( ! matchedParentClientId ) {
					return null;
				}

				return {
					clientId: matchedParentClientId,
				};
			},
			[ clientId ]
		);
		const isInheritedFromParentContainer = !! parentContainerInfo;

		useEffect( () => {
			if (
				! isSupported ||
				! isLightboxEnabledBlock ||
				isInheritedFromParentContainer ||
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
			isInheritedFromParentContainer,
			isLightboxEnabledBlock,
			isSupported,
			setAttributes,
		] );

		useEffect( () => {
			if ( ! isSupported || ! isInheritedFromParentContainer ) {
				return;
			}

			const next = {};
			let hasUpdate = false;

			if ( attributes.reformboxEnabled ) {
				next.reformboxEnabled = false;
				hasUpdate = true;
			}

			if ( isCoreImage && imageLightboxEnabled ) {
				next.lightbox = getImageLightboxAttributes(
					attributes.lightbox,
					false
				);
				hasUpdate = true;
			}

			if ( hasUpdate ) {
				setAttributes( next );
			}
		}, [
			attributes.lightbox,
			attributes.reformboxEnabled,
			imageLightboxEnabled,
			isCoreImage,
			isInheritedFromParentContainer,
			isSupported,
			setAttributes,
		] );

		if ( ! isSupported ) {
			return <BlockEdit { ...props } />;
		}

		const showEnableToggle = isLightboxEnabledBlock;
		const showImageLightboxToggle = isCoreImage;
		const initialOpen =
			isInheritedFromParentContainer ||
			!! attributes.reformboxEnabled ||
			imageLightboxEnabled;

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
		const handleSelectParentContainer = () => {
			if ( parentContainerInfo?.clientId ) {
				selectBlock( parentContainerInfo.clientId );
			}
		};
		const inheritedNoticeText = __(
			'ReformBox is enabled on the parent Group block. Settings here follow the parent.',
			'reformbox'
		);

		return (
			<>
				<BlockEdit { ...props } />
				<InspectorControls>
					<PanelBody
						title={ __( 'ReformBox', 'reformbox' ) }
						initialOpen={ initialOpen }
					>
						{ isInheritedFromParentContainer && (
							<p>
								{ inheritedNoticeText }{ ' ' }
								<Button
									variant="link"
									onClick={ handleSelectParentContainer }
								>
									{ __( 'Select parent block', 'reformbox' ) }
								</Button>
							</p>
						) }

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
								disabled={ isInheritedFromParentContainer }
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
								disabled={ isInheritedFromParentContainer }
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
										disabled={
											isInheritedFromParentContainer
										}
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
										disabled={
											isInheritedFromParentContainer
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
