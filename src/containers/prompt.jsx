import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import PromptComponent from '../components/prompt/prompt.jsx';

class Prompt extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleOk',
            'handleScopeOptionSelection',
            'handleCancel',
            'handleChange',
            'handleKeyPress'
        ]);
        this.state = {
            inputValue: '',
            globalSelected: true
        };
    }
    handleKeyPress (event) {
        if (event.key === 'Enter') this.handleOk();
    }
    handleFocus (event) {
        event.target.select();
    }
    handleOk () {
        this.props.onOk(this.state.inputValue, {
            scope: this.state.globalSelected ? 'global' : 'local',
            isCloud: false
        });
    }
    handleCancel () {
        this.props.onCancel();
    }
    handleChange (e) {
        this.setState({inputValue: e.target.value});
    }
    handleScopeOptionSelection (e) {
        this.setState({globalSelected: (e.target.value === 'global')});
    }
    render () {
        return (
            <PromptComponent
                defaultValue={this.props.defaultValue}
                globalSelected={this.state.globalSelected}
                isStage={this.props.isStage}
                showListMessage={this.props.showListMessage}
                label={this.props.label}
                showVariableOptions={this.props.showVariableOptions}
                title={this.props.title}
                onCancel={this.handleCancel}
                onChange={this.handleChange}
                onFocus={this.handleFocus}
                onKeyPress={this.handleKeyPress}
                onOk={this.handleOk}
                onScopeOptionSelection={this.handleScopeOptionSelection}
            />
        );
    }
}

Prompt.propTypes = {
    defaultValue: PropTypes.string,
    isStage: PropTypes.bool.isRequired,
    showListMessage: PropTypes.bool.isRequired,
    label: PropTypes.string.isRequired,
    onCancel: PropTypes.func.isRequired,
    onOk: PropTypes.func.isRequired,
    showVariableOptions: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired
};

export default Prompt;
