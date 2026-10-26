import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';

import styles from './save-modal.css';

const messages = defineMessages({
    title: {
        defaultMessage: 'Save to your computer',
        description: 'Title of the modal for choosing what format to save the project in',
        id: 'pebble.saveModal.title'
    }
});

// Names of other editors aren't translated
const FORMAT_NAMES = {
    pebbleide: 'PebbleIDE',
    penguinmod: 'PenguinMod',
    snailide: 'Snail IDE',
    scratch3: 'Scratch 3'
};

const FormatDescription = ({id}) => {
    switch (id) {
    case 'pebbleide':
        return (
            <FormattedMessage
                defaultMessage="For opening in PebbleIDE."
                description="Description of saving a project in PebbleIDE's format"
                id="pebble.saveModal.pebbleide"
            />
        );
    case 'penguinmod':
        return (
            <FormattedMessage
                defaultMessage="For opening in PenguinMod."
                description="Description of saving a project in PenguinMod's format"
                id="pebble.saveModal.penguinmod"
            />
        );
    case 'snailide':
        return (
            <FormattedMessage
                defaultMessage="For opening in Snail IDE."
                description="Description of saving a project in Snail IDE's format"
                id="pebble.saveModal.snailide"
            />
        );
    case 'scratch3':
        return (
            <FormattedMessage
                defaultMessage="For uploading to Scratch or opening in other Scratch editors."
                description="Description of saving a project in Scratch 3's format"
                id="pebble.saveModal.scratch3"
            />
        );
    default:
        return null;
    }
};

FormatDescription.propTypes = {
    id: PropTypes.string
};

const ScratchCheck = ({problems}) => {
    const hasProblems = problems.extensions.length > 0 || problems.stageSize || problems.customReporters;
    return (
        <div className={styles.scratchCheck}>
            {hasProblems ? (
                <React.Fragment>
                    <FormattedMessage
                        defaultMessage="Some parts of this project won't work in Scratch:"
                        description="Heading for the list of things in a project that Scratch doesn't support"
                        id="pebble.saveModal.scratchProblems"
                    />
                    <ul>
                        {problems.extensions.length > 0 && (
                            <li>
                                <FormattedMessage
                                    // eslint-disable-next-line max-len
                                    defaultMessage="Extensions Scratch doesn't have, so the project won't open there: {extensions}"
                                    description="Lists extensions a project uses that Scratch doesn't have"
                                    id="pebble.saveModal.scratchExtensions"
                                    values={{
                                        extensions: problems.extensions.join(', ')
                                    }}
                                />
                            </li>
                        )}
                        {problems.stageSize && (
                            <li>
                                <FormattedMessage
                                    // eslint-disable-next-line max-len
                                    defaultMessage="The stage is {size}, but Scratch's stage is always 480×360."
                                    description="Warns that a project's custom stage size won't carry over to Scratch"
                                    id="pebble.saveModal.scratchStageSize"
                                    values={{
                                        size: problems.stageSize
                                    }}
                                />
                            </li>
                        )}
                        {problems.customReporters && (
                            <li>
                                <FormattedMessage
                                    defaultMessage="Scratch doesn't have custom reporter blocks."
                                    description="Warns that custom blocks that report values won't work in Scratch"
                                    id="pebble.saveModal.scratchCustomReporters"
                                />
                            </li>
                        )}
                    </ul>
                </React.Fragment>
            ) : (
                <FormattedMessage
                    defaultMessage="This project only uses things Scratch has, so it should work there."
                    description="Shown when a project is compatible with Scratch"
                    id="pebble.saveModal.scratchOk"
                />
            )}
        </div>
    );
};

ScratchCheck.propTypes = {
    problems: PropTypes.shape({
        extensions: PropTypes.arrayOf(PropTypes.string),
        stageSize: PropTypes.string,
        customReporters: PropTypes.bool
    })
};

const SaveModalComponent = props => (
    <Modal
        className={styles.modalContent}
        onRequestClose={props.onCancel}
        contentLabel={props.intl.formatMessage(messages.title)}
        id="pebbleSaveModal"
    >
        <Box className={styles.body}>
            <p className={styles.helpText}>
                <FormattedMessage
                    defaultMessage="Choose what to save your project as:"
                    description="Text above the list of formats in the save modal"
                    id="pebble.saveModal.choose"
                />
            </p>
            <div
                className={styles.formats}
                role="radiogroup"
            >
                {props.formats.map(format => (
                    <label
                        key={format.id}
                        className={classNames(styles.format, {
                            [styles.selected]: props.selected === format.id
                        })}
                    >
                        <input
                            type="radio"
                            name="pebbleSaveFormat"
                            value={format.id}
                            checked={props.selected === format.id}
                            onChange={props.onSelect}
                        />
                        <span>
                            <span className={styles.formatName}>
                                {FORMAT_NAMES[format.id]}
                                <span className={styles.formatExtension}>{`.${format.extension}`}</span>
                            </span>
                            <span className={styles.formatDescription}>
                                <FormatDescription id={format.id} />
                            </span>
                        </span>
                    </label>
                ))}
            </div>
            {props.selected === 'scratch3' && props.scratchProblems && (
                <ScratchCheck problems={props.scratchProblems} />
            )}
            <Box className={styles.buttonRow}>
                <button
                    className={styles.cancelButton}
                    onClick={props.onCancel}
                >
                    <FormattedMessage
                        defaultMessage="Cancel"
                        description="Button in prompt for cancelling the dialog"
                        id="gui.prompt.cancel"
                    />
                </button>
                <button
                    className={styles.okButton}
                    onClick={props.onSave}
                >
                    <FormattedMessage
                        defaultMessage="Save"
                        description="Button in the save modal that saves the project in the chosen format"
                        id="pebble.saveModal.save"
                    />
                </button>
            </Box>
        </Box>
    </Modal>
);

SaveModalComponent.propTypes = {
    formats: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        extension: PropTypes.string
    })).isRequired,
    intl: intlShape,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    scratchProblems: ScratchCheck.propTypes.problems,
    selected: PropTypes.string.isRequired
};

export default injectIntl(SaveModalComponent);
