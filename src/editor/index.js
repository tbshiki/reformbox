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

import './editor.scss';

/* ------------------------------------------------------------------
 * Constants
 * ----------------------------------------------------------------*/

/** Blocks that can act as lightbox containers (content shown inside lightbox). */
const CONTAINER_BLOCKS = ['core/group', 'core/cover'];

/** Blocks that open themselves in a ReformBox lightbox on click. */
const SELF_LIGHTBOX_BLOCKS = ['core/video'];

/** Blocks that can trigger another lightbox. */
const TRIGGER_BLOCKS = [
	'core/button',
	'core/paragraph',
	'core/heading',
	'core/image',
	'core/video',
];

/* ------------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------*/

function generateId() {
	return 'rb-' + Math.random().toString(36).substring(2, 10);
}

/* ------------------------------------------------------------------
 * 1. Register custom attributes on target blocks
 * ----------------------------------------------------------------*/

function addReformBoxAttributes(settings, name) {
	const isContainer = CONTAINER_BLOCKS.includes(name);
	const isSelfLightbox = SELF_LIGHTBOX_BLOCKS.includes(name);
	const isTrigger = TRIGGER_BLOCKS.includes(name);

	if (!isContainer && !isSelfLightbox && !isTrigger) {
		return settings;
	}

	const attrs = {};

	if (isContainer || isSelfLightbox) {
		attrs.reformboxEnabled = { type: 'boolean', default: false };
		attrs.reformboxId = { type: 'string', default: '' };
	}

	if (isContainer) {
		attrs.reformboxAnimation = { type: 'string', default: 'fade' };
		attrs.reformboxOverlayClose = { type: 'boolean', default: true };
	}

	if (isTrigger) {
		attrs.reformboxTarget = { type: 'string', default: '' };
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

/* ------------------------------------------------------------------
 * 2. Add InspectorControls panel
 * ----------------------------------------------------------------*/

const withReformBoxControls = createHigherOrderComponent((BlockEdit) => {
	return (props) => {
		const { name, attributes, setAttributes } = props;

		const isContainer = CONTAINER_BLOCKS.includes(name);
		const isSelfLightbox = SELF_LIGHTBOX_BLOCKS.includes(name);
		const isTrigger = TRIGGER_BLOCKS.includes(name);

		if (!isContainer && !isSelfLightbox && !isTrigger) {
			return <BlockEdit {...props} />;
		}

		const showEnableToggle = isContainer || isSelfLightbox;
		const showTriggerField =
			isTrigger &&
			!attributes.reformboxEnabled &&
			!(name === 'core/image' && attributes?.lightbox?.enabled);

		const initialOpen =
			!!attributes.reformboxEnabled || !!attributes.reformboxTarget;

		const handleEnableToggle = (value) => {
			const next = { reformboxEnabled: value };
			if (value && !attributes.reformboxId) {
				next.reformboxId = generateId();
			}
			if (value && isTrigger) {
				next.reformboxTarget = '';
			}
			setAttributes(next);
		};

		return (
			<>
				<BlockEdit {...props} />
				<InspectorControls>
					<PanelBody
						title={__('ReformBox', 'reformbox')}
						initialOpen={initialOpen}
					>
						{showEnableToggle && (
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
								checked={!!attributes.reformboxEnabled}
								onChange={handleEnableToggle}
							/>
						)}

						{attributes.reformboxEnabled &&
							(isContainer || isSelfLightbox) && (
								<TextControl
									__nextHasNoMarginBottom
									label={__('ReformBox ID', 'reformbox')}
									value={attributes.reformboxId}
									onChange={(value) =>
										setAttributes({
											reformboxId: value,
										})
									}
									help={__(
										'Unique ID for this lightbox. Use this ID as the target in trigger blocks.',
										'reformbox'
									)}
								/>
							)}

						{attributes.reformboxEnabled && isContainer && (
							<>
								<SelectControl
									__nextHasNoMarginBottom
									label={__('Animation', 'reformbox')}
									value={attributes.reformboxAnimation}
									options={[
										{
											label: __('Fade', 'reformbox'),
											value: 'fade',
										},
										{
											label: __('Zoom', 'reformbox'),
											value: 'zoom',
										},
										{
											label: __('Slide', 'reformbox'),
											value: 'slide',
										},
									]}
									onChange={(value) =>
										setAttributes({
											reformboxAnimation: value,
										})
									}
								/>
								<ToggleControl
									__nextHasNoMarginBottom
									label={__(
										'Close on Overlay Click',
										'reformbox'
									)}
									checked={attributes.reformboxOverlayClose}
									onChange={(value) =>
										setAttributes({
											reformboxOverlayClose: value,
										})
									}
								/>
							</>
						)}

						{showTriggerField && (
							<TextControl
								__nextHasNoMarginBottom
								label={__(
									'Lightbox Target ID',
									'reformbox'
								)}
								value={attributes.reformboxTarget}
								onChange={(value) =>
									setAttributes({
										reformboxTarget: value,
									})
								}
								help={__(
									'Enter the ReformBox ID of the lightbox to open on click.',
									'reformbox'
								)}
							/>
						)}
					</PanelBody>
				</InspectorControls>
			</>
		);
	};
}, 'withReformBoxControls');

addFilter(
	'editor.BlockEdit',
	'reformbox/inspector-controls',
	withReformBoxControls
);

/* ------------------------------------------------------------------
 * 3. Visual indicator in editor for lightbox containers
 * ----------------------------------------------------------------*/

const withReformBoxEditorClass = createHigherOrderComponent(
	(BlockListBlock) => {
		return (props) => {
			if (
				CONTAINER_BLOCKS.includes(props.name) &&
				props.attributes?.reformboxEnabled
			) {
				return (
					<BlockListBlock
						{...props}
						className="is-reformbox-container"
					/>
				);
			}
			return <BlockListBlock {...props} />;
		};
	},
	'withReformBoxEditorClass'
);

addFilter(
	'editor.BlockListBlock',
	'reformbox/editor-class',
	withReformBoxEditorClass
);
