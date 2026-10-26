import {defineMessages, FormattedMessage, intlShape, injectIntl} from 'react-intl';
import PropTypes from 'prop-types';
import React from 'react';
import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';

import styles from './extension-chooser.css';

const messages = defineMessages({
    addTitle: {
        defaultMessage: 'Add an Extension',
        description: 'Title of the modal for choosing how to add an extension',
        id: 'pebble.extensionChooser.addTitle'
    },
    replaceTitle: {
        defaultMessage: 'Replace Extension',
        description: 'Title of the modal for choosing what to replace an extension with',
        id: 'pebble.extensionChooser.replaceTitle'
    }
});

const ExtensionChooserComponent = props => (
    <Modal
        className={styles.modalContent}
        onRequestClose={props.onCancel}
        contentLabel={props.intl.formatMessage(props.replacingName ? messages.replaceTitle : messages.addTitle)}
        id="pebbleExtensionChooser"
    >
        <Box className={styles.body}>
            {props.replacingName && (
                <p className={styles.helpText}>
                    <FormattedMessage
                        // eslint-disable-next-line max-len
                        defaultMessage="Choose what to replace {name} with. Its blocks move over to the new extension."
                        description="Explains replacing an extension. {name} is the extension being replaced."
                        id="pebble.extensionChooser.replaceHelp"
                        values={{
                            name: <b>{props.replacingName}</b>
                        }}
                    />
                </p>
            )}
            <div className={styles.options}>
                <button
                    className={styles.option}
                    onClick={props.onChooseLibrary}
                >
                    <span className={styles.optionName}>
                        <FormattedMessage
                            defaultMessage="Choose an extension"
                            description="Option that opens the extension library"
                            id="pebble.extensionChooser.library"
                        />
                    </span>
                    <span className={styles.optionDescription}>
                        <FormattedMessage
                            defaultMessage="Pick one from the extension library."
                            description="Description of the option that opens the extension library"
                            id="pebble.extensionChooser.libraryHelp"
                        />
                    </span>
                </button>
                <button
                    className={styles.option}
                    onClick={props.onChooseCustom}
                >
                    <span className={styles.optionName}>
                        <FormattedMessage
                            defaultMessage="Load a custom extension"
                            description="Option that opens the custom extension modal"
                            id="pebble.extensionChooser.custom"
                        />
                    </span>
                    <span className={styles.optionDescription}>
                        <FormattedMessage
                            defaultMessage="Paste in its code, upload a .js file, or use a link."
                            description="Description of the option that opens the custom extension modal"
                            id="pebble.extensionChooser.customHelp"
                        />
                    </span>
                </button>
            </div>
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
            </Box>
        </Box>
    </Modal>
);

ExtensionChooserComponent.propTypes = {
    intl: intlShape,
    onCancel: PropTypes.func.isRequired,
    onChooseCustom: PropTypes.func.isRequired,
    onChooseLibrary: PropTypes.func.isRequired,
    replacingName: PropTypes.string
};

export default injectIntl(ExtensionChooserComponent);
