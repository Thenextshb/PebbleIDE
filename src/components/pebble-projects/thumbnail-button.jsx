import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';

import {PROJECTS_ENABLED, chosenThumbnail, makeThumbnail} from '../../lib/pebble-projects';
import styles from './thumbnail-button.css';

// A picture: a frame with a mountain and a sun
const PICTURE_ICON = 'M4 3h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v7.6l3.3-3.3' +
    'a1 1 0 0 1 1.4 0l3.3 3.3 1.3-1.3a1 1 0 0 1 1.4 0L16 12.6V5H4zm9.5 1.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z';

/**
 * "Set thumbnail" above the stage: pick a picture to show for the project when it's shared.
 */
class ThumbnailButton extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClick',
            'handleFileChosen',
            'handleThumbnailChange',
            'setFileInput'
        ]);
        this.state = {
            previewURL: null,
            error: null
        };
    }
    componentDidMount () {
        this.stopListening = chosenThumbnail.listen(this.handleThumbnailChange);
        this.handleThumbnailChange(chosenThumbnail.get());
    }
    componentWillUnmount () {
        this.stopListening();
        if (this.state.previewURL) URL.revokeObjectURL(this.state.previewURL);
    }
    setFileInput (element) {
        this.fileInput = element;
    }
    handleThumbnailChange (thumbnail) {
        if (this.state.previewURL) URL.revokeObjectURL(this.state.previewURL);
        this.setState({previewURL: thumbnail ? URL.createObjectURL(thumbnail) : null});
    }
    handleClick () {
        this.fileInput.click();
    }
    async handleFileChosen (e) {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
            chosenThumbnail.set(await makeThumbnail(file));
            this.setState({error: null});
        } catch (error) {
            this.setState({error: error.message});
        }
    }
    render () {
        if (!PROJECTS_ENABLED) return null;
        const {previewURL, error} = this.state;
        let title = 'Pick a picture to show for this project when you upload it';
        if (error) title = error;
        else if (previewURL) title = 'Thumbnail set. Click to pick another one.';
        return (
            <React.Fragment>
                <button
                    className={styles.button}
                    title={title}
                    type="button"
                    onClick={this.handleClick}
                >
                    {previewURL ? (
                        <img
                            alt=""
                            className={styles.preview}
                            src={previewURL}
                        />
                    ) : (
                        <svg
                            aria-hidden="true"
                            className={styles.icon}
                            viewBox="0 0 20 20"
                        >
                            <path
                                d={PICTURE_ICON}
                                fill="currentColor"
                            />
                        </svg>
                    )}
                    {!this.props.compact && <span>{'Set thumbnail'}</span>}
                </button>
                <input
                    accept="image/*"
                    className={styles.fileInput}
                    ref={this.setFileInput}
                    type="file"
                    onChange={this.handleFileChosen}
                />
            </React.Fragment>
        );
    }
}

ThumbnailButton.propTypes = {
    // Just the picture, for the small stage
    compact: PropTypes.bool
};

export default ThumbnailButton;
