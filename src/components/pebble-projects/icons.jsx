import PropTypes from 'prop-types';
import React from 'react';

// Small icons for the site's pages. They take the text color, so they work in every mode.

const Icon = ({className, children}) => (
    <svg
        aria-hidden="true"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
    >
        {children}
    </svg>
);

Icon.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string
};

const UpvoteIcon = props => (
    <Icon {...props}>
        <path
            d="M12 4l8 9h-5v7H9v-7H4z"
            fill="currentColor"
        />
    </Icon>
);

const SaveIcon = props => (
    <Icon {...props}>
        <path
            d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z"
            fill="currentColor"
        />
    </Icon>
);

const ViewIcon = props => (
    <Icon {...props}>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle
            cx="12"
            cy="12"
            r="3"
        />
    </Icon>
);

const SearchIcon = props => (
    <Icon {...props}>
        <circle
            cx="10.5"
            cy="10.5"
            r="6.5"
        />
        <path d="M15.5 15.5L21 21" />
    </Icon>
);

const ArrowIcon = ({left, ...props}) => (
    <Icon {...props}>
        <path d={left ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </Icon>
);

ArrowIcon.propTypes = {
    left: PropTypes.bool
};

const CaretIcon = props => (
    <Icon {...props}>
        <path
            d="M4 8l8 8 8-8z"
            fill="currentColor"
        />
    </Icon>
);

export {
    ArrowIcon,
    CaretIcon,
    SaveIcon,
    SearchIcon,
    UpvoteIcon,
    ViewIcon
};
