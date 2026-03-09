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

function isReformBoxManagedBlock( blockName ) {
	return (
		CONTAINER_BLOCKS.includes( blockName ) ||
		SELF_LIGHTBOX_BLOCKS.includes( blockName )
	);
}

function flattenBlocks( blocks = [] ) {
	const result = [];
	for ( const block of blocks ) {
		result.push( block );
		if ( block?.innerBlocks?.length ) {
			result.push( ...flattenBlocks( block.innerBlocks ) );
		}
	}
	return result;
}

function getDuplicateReformBoxOwnerClientId( select, reformboxId ) {
	if ( ! reformboxId ) {
		return null;
	}

	const { getBlocks } = select( 'core/block-editor' );
	const matchingBlocks = flattenBlocks( getBlocks() ).filter(
		( block ) =>
			isReformBoxManagedBlock( block?.name ) &&
			!! block?.attributes?.reformboxEnabled &&
			sanitizeReformBoxId( block?.attributes?.reformboxId ) ===
				reformboxId
	);

	return matchingBlocks.length > 1
		? matchingBlocks[ 0 ]?.clientId || null
		: null;
}

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

function findDirectParentClientId( select, clientId ) {
	const { getBlockRootClientId } = select( 'core/block-editor' );

	if ( typeof getBlockRootClientId !== 'function' ) {
		return null;
	}

	return getBlockRootClientId( clientId );
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

function getVideoPosterUrl( attributes = {} ) {
	return typeof attributes?.poster === 'string'
		? attributes.poster.trim()
		: '';
}

function hasVideoPoster( attributes = {} ) {
	return !! getVideoPosterUrl( attributes );
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
		const isVideoBlock = name === 'core/video';
		const isSupported = isContainer || isSelfLightbox || isCoreImage;
		const imageLightboxEnabled = !! attributes?.lightbox?.enabled;
		const videoHasPoster = isVideoBlock && hasVideoPoster( attributes );
		const videoRequiresPoster = isVideoBlock && ! videoHasPoster;
		const isLightboxEnabledBlock = isContainer || isSelfLightbox;
		const normalizedReformboxId = sanitizeReformBoxId(
			attributes?.reformboxId
		);
		const containerMode = getGroupModeFromAttributes( attributes );
		const containerSlot = getGroupSlotFromAttributes( attributes );
		const { selectBlock } = useDispatch( 'core/block-editor' );
		const parentContainerInfo = useSelect(
			( select ) => findParentContainerInfo( select, clientId ),
			[ clientId ]
		);
		const directParentClientId = useSelect(
			( select ) => findDirectParentClientId( select, clientId ),
			[ clientId ]
		);
		const isInheritedFromParentContainer = !! parentContainerInfo;
		const parentIsSplitContainer =
			parentContainerInfo?.mode === REFORMBOX_MODE_SPLIT;
		const isDirectChildOfParentContainer =
			!! parentContainerInfo?.clientId &&
			directParentClientId === parentContainerInfo.clientId;
		const showModeControl =
			isContainer &&
			!! attributes.reformboxEnabled &&
			! isInheritedFromParentContainer;
		const showSlotControl =
			isContainer &&
			isDirectChildOfParentContainer &&
			parentIsSplitContainer;
		const showSlotDirectChildNotice =
			isContainer &&
			isInheritedFromParentContainer &&
			parentIsSplitContainer &&
			! isDirectChildOfParentContainer;
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

				return currentBlock.innerBlocks.some( ( innerBlock ) => {
					if ( innerBlock.name !== 'core/group' ) {
						return false;
					}

					const innerSlot = getGroupSlotFromAttributes(
						innerBlock.attributes
					);

					return (
						innerSlot === REFORMBOX_SLOT_MODAL ||
						innerSlot === REFORMBOX_SLOT_NONE
					);
				} );
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
		const duplicateReformBoxOwnerClientId = useSelect(
			( select ) => {
				if (
					! isLightboxEnabledBlock ||
					! attributes.reformboxEnabled ||
					! normalizedReformboxId
				) {
					return null;
				}

				return getDuplicateReformBoxOwnerClientId(
					select,
					normalizedReformboxId
				);
			},
			[
				attributes.reformboxEnabled,
				isLightboxEnabledBlock,
				normalizedReformboxId,
			]
		);
		const hasDuplicateReformboxId =
			!! duplicateReformBoxOwnerClientId &&
			duplicateReformBoxOwnerClientId !== clientId;

		useEffect( () => {
			if (
				! isSupported ||
				! isLightboxEnabledBlock ||
				isInheritedFromParentContainer ||
				! attributes.reformboxEnabled
			) {
				return;
			}

			const nextReformboxId =
				hasDuplicateReformboxId || ! normalizedReformboxId
					? generateId( clientId )
					: normalizedReformboxId;

			if ( nextReformboxId !== attributes.reformboxId ) {
				setAttributes( { reformboxId: nextReformboxId } );
			}
		}, [
			clientId,
			attributes.reformboxEnabled,
			attributes.reformboxId,
			hasDuplicateReformboxId,
			isInheritedFromParentContainer,
			isLightboxEnabledBlock,
			isSupported,
			normalizedReformboxId,
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

		useEffect( () => {
			if (
				! isVideoBlock ||
				! attributes.reformboxEnabled ||
				videoHasPoster
			) {
				return;
			}

			setAttributes( { reformboxEnabled: false } );
		}, [
			attributes.reformboxEnabled,
			isVideoBlock,
			setAttributes,
			videoHasPoster,
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
			showSlotDirectChildNotice ||
			!! attributes.reformboxEnabled ||
			imageLightboxEnabled ||
			videoRequiresPoster;

		const handleEnableToggle = ( value ) => {
			const next = { reformboxEnabled: value };
			const sanitizedId = sanitizeReformBoxId( attributes.reformboxId );

			if ( value ) {
				next.reformboxId = sanitizedId || generateId( clientId );
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
					value === REFORMBOX_SLOT_MODAL ||
					value === REFORMBOX_SLOT_NONE
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
								help={
									videoRequiresPoster
										? __(
												'Video lightbox requires a poster image. Add a poster in the Video block settings first.',
												'reformbox'
										  )
										: undefined
								}
								checked={ !! attributes.reformboxEnabled }
								disabled={
									isInheritedFromParentContainer ||
									videoRequiresPoster
								}
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
									'No child Group is assigned to "Modal". Unassigned child Groups (None) and Preview content will be used in the modal.',
									'reformbox'
								) }
							</p>
						) }

						{ showSlotDirectChildNotice && (
							<p className="reformbox-editor-note">
								{ __(
									'Slot Type is available only on direct child Group blocks of the split parent.',
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
										label: __( 'Preview', 'reformbox' ),
										value: REFORMBOX_SLOT_PREVIEW,
									},
									{
										label: __( 'Modal', 'reformbox' ),
										value: REFORMBOX_SLOT_MODAL,
									},
									{
										label: __(
											'Preview + Modal (Both)',
											'reformbox'
										),
										value: REFORMBOX_SLOT_NONE,
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
			const directParentClientId = useSelect(
				( select ) => {
					if ( ! isGroupBlock ) {
						return null;
					}

					return findDirectParentClientId( select, props.clientId );
				},
				[ isGroupBlock, props.clientId ]
			);

			if ( ! isGroupBlock ) {
				return <BlockListBlock { ...props } />;
			}

			const parentIsSplitContainer =
				parentContainerInfo?.mode === REFORMBOX_MODE_SPLIT;
			const isDirectChildOfParentContainer =
				!! parentContainerInfo?.clientId &&
				directParentClientId === parentContainerInfo.clientId;
			const blockMode = getGroupModeFromAttributes( props.attributes );
			const blockSlot = getGroupSlotFromAttributes( props.attributes );
			const classNames = [];

			if ( props.attributes?.reformboxEnabled ) {
				classNames.push( 'is-reformbox-container' );

				if ( blockMode === REFORMBOX_MODE_SPLIT ) {
					classNames.push( 'reformbox-mode-split' );
				}
			}

			if ( parentIsSplitContainer && isDirectChildOfParentContainer ) {
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
