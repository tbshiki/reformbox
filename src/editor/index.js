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
const REFORMBOX_MODE_SAME = 'same';
const REFORMBOX_MODE_SPLIT = 'split';
const REFORMBOX_SLOT_NONE = 'none';
const REFORMBOX_SLOT_PREVIEW = 'preview';
const REFORMBOX_SLOT_MODAL = 'modal';

function getGroupModeFromAttributes( attributes = {} ) {
	if ( attributes.reformboxMode === REFORMBOX_MODE_SPLIT ) {
		return REFORMBOX_MODE_SPLIT;
	}

	return REFORMBOX_MODE_SAME;
}

function getGroupSlotFromAttributes( attributes = {} ) {
	const slot = attributes.reformboxSlot;

	if ( slot === REFORMBOX_SLOT_PREVIEW || slot === REFORMBOX_SLOT_MODAL ) {
		return slot;
	}

	return REFORMBOX_SLOT_NONE;
}

function findParentContainerInfo( select, clientId ) {
	const { getBlock, getBlockParents } = select( 'core/block-editor' );
	const parentClientIds = getBlockParents( clientId );
	const matchedParentClientId = parentClientIds.find( ( parentClientId ) => {
		const parentBlock = getBlock( parentClientId );

		return (
			!! parentBlock &&
			CONTAINER_BLOCKS.includes( parentBlock.name ) &&
			!! parentBlock.attributes?.reformboxEnabled
		);
	} );

	if ( ! matchedParentClientId ) {
		return null;
	}

	const matchedParentBlock = getBlock( matchedParentClientId );

	return {
		clientId: matchedParentClientId,
		mode: getGroupModeFromAttributes( matchedParentBlock?.attributes ),
	};
}

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
		attrs.reformboxOverlayClose = { type: 'boolean', default: true };
	}

	if ( isContainer ) {
		attrs.reformboxMode = {
			type: 'string',
			default: REFORMBOX_MODE_SAME,
		};
		attrs.reformboxSlot = {
			type: 'string',
			default: REFORMBOX_SLOT_NONE,
		};
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
		const containerMode = getGroupModeFromAttributes( attributes );
		const containerSlot = getGroupSlotFromAttributes( attributes );
		const { selectBlock } = useDispatch( 'core/block-editor' );
		const parentContainerInfo = useSelect(
			( select ) => findParentContainerInfo( select, clientId ),
			[ clientId ]
		);
		const isInheritedFromParentContainer = !! parentContainerInfo;
		const parentIsSplitContainer =
			parentContainerInfo?.mode === REFORMBOX_MODE_SPLIT;
		const showModeControl =
			isContainer &&
			!! attributes.reformboxEnabled &&
			! isInheritedFromParentContainer;
		const showSlotControl =
			isContainer &&
			isInheritedFromParentContainer &&
			parentIsSplitContainer;
		const splitContainerHasModalSlot = useSelect(
			( select ) => {
				if (
					! isContainer ||
					! attributes.reformboxEnabled ||
					containerMode !== REFORMBOX_MODE_SPLIT
				) {
					return true;
				}

				const { getBlock } = select( 'core/block-editor' );
				const currentBlock = getBlock( clientId );

				if ( ! currentBlock ) {
					return true;
				}

				return currentBlock.innerBlocks.some(
					( innerBlock ) =>
						innerBlock.name === 'core/group' &&
						getGroupSlotFromAttributes( innerBlock.attributes ) ===
							REFORMBOX_SLOT_MODAL
				);
			},
			[
				attributes.reformboxEnabled,
				clientId,
				containerMode,
				isContainer,
			]
		);
		const showSplitModalWarning =
			showModeControl &&
			containerMode === REFORMBOX_MODE_SPLIT &&
			! splitContainerHasModalSlot;

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
			showModeControl ||
			showSlotControl ||
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
		const handleContainerModeChange = ( value ) => {
			setAttributes( {
				reformboxMode:
					value === REFORMBOX_MODE_SPLIT
						? REFORMBOX_MODE_SPLIT
						: REFORMBOX_MODE_SAME,
			} );
		};
		const handleContainerSlotChange = ( value ) => {
			setAttributes( {
				reformboxSlot:
					value === REFORMBOX_SLOT_PREVIEW ||
					value === REFORMBOX_SLOT_MODAL
						? value
						: REFORMBOX_SLOT_NONE,
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

						{ showModeControl && (
							<SelectControl
								__nextHasNoMarginBottom
								label={ __( 'Display Mode', 'reformbox' ) }
								value={ containerMode }
								options={ [
									{
										label: __(
											'Same (preview and modal use the same content)',
											'reformbox'
										),
										value: REFORMBOX_MODE_SAME,
									},
									{
										label: __(
											'Split (separate preview and modal content)',
											'reformbox'
										),
										value: REFORMBOX_MODE_SPLIT,
									},
								] }
								onChange={ handleContainerModeChange }
							/>
						) }

						{ showSplitModalWarning && (
							<p className="reformbox-editor-warning">
								{ __(
									'No child Group is assigned to "Modal". Preview content will be used as fallback until you assign one.',
									'reformbox'
								) }
							</p>
						) }

						{ showSlotControl && (
							<SelectControl
								__nextHasNoMarginBottom
								label={ __( 'Slot Type', 'reformbox' ) }
								value={ containerSlot }
								options={ [
									{
										label: __( 'Both (None)', 'reformbox' ),
										value: REFORMBOX_SLOT_NONE,
									},
									{
										label: __( 'Preview', 'reformbox' ),
										value: REFORMBOX_SLOT_PREVIEW,
									},
									{
										label: __( 'Modal', 'reformbox' ),
										value: REFORMBOX_SLOT_MODAL,
									},
								] }
								onChange={ handleContainerSlotChange }
							/>
						) }

						{ attributes.reformboxEnabled &&
							( isContainer || isSelfLightbox ) && (
								<>
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
			const isGroupBlock = CONTAINER_BLOCKS.includes( props.name );
			const parentContainerInfo = useSelect(
				( select ) => {
					if ( ! isGroupBlock ) {
						return null;
					}

					return findParentContainerInfo( select, props.clientId );
				},
				[ isGroupBlock, props.clientId ]
			);

			if ( ! isGroupBlock ) {
				return <BlockListBlock { ...props } />;
			}

			const parentIsSplitContainer =
				parentContainerInfo?.mode === REFORMBOX_MODE_SPLIT;
			const blockMode = getGroupModeFromAttributes( props.attributes );
			const blockSlot = getGroupSlotFromAttributes( props.attributes );
			const classNames = [];

			if ( props.attributes?.reformboxEnabled ) {
				classNames.push( 'is-reformbox-container' );

				if ( blockMode === REFORMBOX_MODE_SPLIT ) {
					classNames.push( 'reformbox-mode-split' );
				}
			}

			if ( parentIsSplitContainer ) {
				if ( blockSlot === REFORMBOX_SLOT_PREVIEW ) {
					classNames.push( 'reformbox-slot-preview' );
				}

				if ( blockSlot === REFORMBOX_SLOT_MODAL ) {
					classNames.push( 'reformbox-slot-modal' );
				}

				if ( blockSlot === REFORMBOX_SLOT_NONE ) {
					classNames.push( 'reformbox-slot-none' );
				}
			}

			if ( classNames.length === 0 ) {
				return <BlockListBlock { ...props } />;
			}

			const mergedClassName = [ props.className, ...classNames ]
				.filter( Boolean )
				.join( ' ' );

			return (
				<BlockListBlock { ...props } className={ mergedClassName } />
			);
		};
	},
	'withReformBoxEditorClass'
);

addFilter(
	'editor.BlockListBlock',
	'reformbox/editor-class',
	withReformBoxEditorClass
);
