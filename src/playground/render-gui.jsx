import React from 'react';
import GUI from '../containers/gui.jsx';

const RenderGUI = props => (
    <GUI
        canSave={false}
        basePath={process.env.ROOT}
        canEditTitle
        enableCommunity
        {...props}
    />
);

export default RenderGUI;
