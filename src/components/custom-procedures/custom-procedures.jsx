import bindAll from 'lodash.bindall';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import Modal from '../../containers/modal.jsx';
import Box from '../box/box.jsx';
import {defineMessages, injectIntl, intlShape, FormattedMessage} from 'react-intl';

import booleanInputIcon from './icon--boolean-input.svg';
import textInputIcon from './icon--text-input.svg';
import labelIcon from './icon--label.svg';
import {CUSTOM_BLOCK_SWATCHES} from '../../lib/pebble-custom-block-colors';

import styles from './custom-procedures.css';

const messages = defineMessages({
    myblockModalTitle: {
        defaultMessage: 'Make a Block',
        description: 'Title for the modal where you create a custom block.',
        id: 'gui.customProcedures.myblockModalTitle'
    },
    blockColor: {
        defaultMessage: 'Block color',
        description: 'Label for the row of colors to choose from for a custom block',
        id: 'pebble.customProcedures.blockColor'
    },
    customColor: {
        defaultMessage: 'Custom color',
        description: 'Button that opens a color picker to choose any color for a custom block',
        id: 'pebble.customProcedures.customColor'
    }
});

const colorNames = defineMessages({
    red: {
        defaultMessage: 'Red',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.red'
    },
    orange: {
        defaultMessage: 'Orange',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.orange'
    },
    yellow: {
        defaultMessage: 'Yellow',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.yellow'
    },
    green: {
        defaultMessage: 'Green',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.green'
    },
    teal: {
        defaultMessage: 'Teal',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.teal'
    },
    blue: {
        defaultMessage: 'Blue',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.blue'
    },
    indigo: {
        defaultMessage: 'Indigo',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.indigo'
    },
    purple: {
        defaultMessage: 'Purple',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.purple'
    },
    pink: {
        defaultMessage: 'Pink',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.pink'
    },
    grey: {
        defaultMessage: 'Grey',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.grey'
    },
    charcoal: {
        defaultMessage: 'Charcoal',
        description: 'Name of a custom block color',
        id: 'pebble.customProcedures.color.charcoal'
    }
});

const sameColor = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

class ColorPicker extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleCustomChange',
            'handleSwatchClick'
        ]);
    }
    handleSwatchClick (e) {
        // The default option has no color
        this.props.onSelectColor(e.currentTarget.dataset.color || null);
    }
    handleCustomChange (e) {
        this.props.onSelectColor(e.target.value);
    }
    render () {
        const {color, defaultColor, intl} = this.props;
        const swatchSelected = CUSTOM_BLOCK_SWATCHES.some(swatch => sameColor(swatch.color, color));
        const customSelected = !!color && !swatchSelected;
        return (
            <div className={styles.colorRow}>
                <div
                    className={styles.colorLabel}
                    id="pebbleCustomBlockColorLabel"
                >
                    {intl.formatMessage(messages.blockColor)}
                </div>
                <div
                    aria-labelledby="pebbleCustomBlockColorLabel"
                    className={styles.swatches}
                    role="radiogroup"
                >
                    <button
                        aria-checked={!color}
                        className={classNames(styles.defaultSwatch, {
                            [styles.selected]: !color
                        })}
                        role="radio"
                        onClick={this.handleSwatchClick}
                    >
                        <span
                            className={styles.defaultDot}
                            style={{background: defaultColor}}
                        />
                        <FormattedMessage
                            defaultMessage="Default"
                            description="Option to use the normal My Blocks color for a custom block"
                            id="pebble.customProcedures.defaultColor"
                        />
                    </button>
                    {CUSTOM_BLOCK_SWATCHES.map(swatch => {
                        const name = intl.formatMessage(colorNames[swatch.id]);
                        const selected = sameColor(swatch.color, color);
                        return (
                            <button
                                aria-checked={selected}
                                aria-label={name}
                                className={classNames(styles.swatch, {
                                    [styles.selected]: selected
                                })}
                                data-color={swatch.color}
                                key={swatch.id}
                                role="radio"
                                style={{background: swatch.color}}
                                title={name}
                                onClick={this.handleSwatchClick}
                            />
                        );
                    })}
                    <label
                        className={classNames(styles.swatch, styles.customSwatch, {
                            [styles.selected]: customSelected
                        })}
                        style={customSelected ? {background: color} : null}
                        title={intl.formatMessage(messages.customColor)}
                    >
                        <input
                            aria-label={intl.formatMessage(messages.customColor)}
                            className={styles.colorInput}
                            type="color"
                            value={(color || defaultColor || '#ff6680').toLowerCase()}
                            onChange={this.handleCustomChange}
                        />
                    </label>
                </div>
            </div>
        );
    }
}

ColorPicker.propTypes = {
    color: PropTypes.string,
    defaultColor: PropTypes.string,
    intl: intlShape,
    onSelectColor: PropTypes.func.isRequired
};

const CustomProcedures = props => (
    <Modal
        className={styles.modalContent}
        contentLabel={props.intl.formatMessage(messages.myblockModalTitle)}
        onRequestClose={props.onCancel}
        id="customProceduresModal"
    >
        <Box
            className={styles.workspace}
            componentRef={props.componentRef}
        />
        <Box className={styles.body}>
            <div className={styles.optionsRow}>
                <div
                    className={styles.optionCard}
                    role="button"
                    tabIndex="0"
                    onClick={props.onAddTextNumber}
                >
                    <img
                        className={styles.optionIcon}
                        src={textInputIcon}
                        draggable={false}
                    />
                    <div className={styles.optionTitle}>
                        <FormattedMessage
                            defaultMessage="Add an input"
                            description="Label for button to add a number/text input"
                            id="gui.customProcedures.addAnInputNumberText"
                        />
                    </div>
                    <div className={styles.optionDescription}>
                        <FormattedMessage
                            defaultMessage="number or text"
                            description="Description of the number/text input type"
                            id="gui.customProcedures.numberTextType"
                        />
                    </div>
                </div>
                <div
                    className={styles.optionCard}
                    role="button"
                    tabIndex="0"
                    onClick={props.onAddBoolean}
                >
                    <img
                        className={styles.optionIcon}
                        src={booleanInputIcon}
                        draggable={false}
                    />
                    <div className={styles.optionTitle}>
                        <FormattedMessage
                            defaultMessage="Add an input"
                            description="Label for button to add a boolean input"
                            id="gui.customProcedures.addAnInputBoolean"
                        />
                    </div>
                    <div className={styles.optionDescription}>
                        <FormattedMessage
                            defaultMessage="boolean"
                            description="Description of the boolean input type"
                            id="gui.customProcedures.booleanType"
                        />
                    </div>
                </div>
                <div
                    className={styles.optionCard}
                    role="button"
                    tabIndex="0"
                    onClick={props.onAddLabel}
                >
                    <img
                        className={styles.optionIcon}
                        src={labelIcon}
                        draggable={false}
                    />
                    <div className={styles.optionTitle}>
                        <FormattedMessage
                            defaultMessage="Add a label"
                            description="Label for button to add a label"
                            id="gui.customProcedures.addALabel"
                        />
                    </div>
                </div>
            </div>
            <ColorPicker
                color={props.color}
                defaultColor={props.defaultColor}
                intl={props.intl}
                onSelectColor={props.onSelectColor}
            />
            <div className={styles.checkboxRow}>
                <label>
                    <input
                        checked={props.warp}
                        type="checkbox"
                        onChange={props.onToggleWarp}
                    />
                    <FormattedMessage
                        defaultMessage="Run without screen refresh"
                        description="Label for checkbox to run without screen refresh"
                        id="gui.customProcedures.runWithoutScreenRefresh"
                    />
                </label>
            </div>
            <Box className={styles.buttonRow}>
                <button
                    className={styles.cancelButton}
                    onClick={props.onCancel}
                >
                    <FormattedMessage
                        defaultMessage="Cancel"
                        description="Label for button to cancel custom procedure edits"
                        id="gui.customProcedures.cancel"
                    />
                </button>
                <button
                    className={styles.okButton}
                    onClick={props.onOk}
                >
                    <FormattedMessage
                        defaultMessage="OK"
                        description="Label for button to save new custom procedure"
                        id="gui.customProcedures.ok"
                    />
                </button>
            </Box>
        </Box>
    </Modal>
);

CustomProcedures.propTypes = {
    color: PropTypes.string,
    componentRef: PropTypes.func.isRequired,
    defaultColor: PropTypes.string,
    intl: intlShape,
    onAddBoolean: PropTypes.func.isRequired,
    onAddLabel: PropTypes.func.isRequired,
    onAddTextNumber: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onOk: PropTypes.func.isRequired,
    onSelectColor: PropTypes.func.isRequired,
    onToggleWarp: PropTypes.func.isRequired,
    warp: PropTypes.bool.isRequired
};

export default injectIntl(CustomProcedures);
