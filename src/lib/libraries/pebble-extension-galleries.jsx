import React from 'react';
import {FormattedMessage} from 'react-intl';

import galleryIcon from './extensions/gallery/pebble-gallery.svg';
import galleryExtensions from './pebble-gallery-extensions.json';

// Brand names, so they aren't translated. The extension list is made by scripts/update-extension-galleries.mjs.
const GALLERIES = [
    {id: 'penguinmod', name: 'PenguinMod', site: 'https://extensions.penguinmod.com/'},
    {id: 'snailide', name: 'Snail IDE', site: 'https://snail-ide-extensions-gallery.vercel.app/'}
];

const galleryCard = gallery => ({
    name: `${gallery.name} Extension Gallery`,
    href: gallery.site,
    extensionId: `gallery-${gallery.id}`,
    iconURL: galleryIcon,
    description: (
        <FormattedMessage
            defaultMessage="Extensions made by the {GALLERY} community. Learn more at {SITE}."
            description="Card for another editor's extension gallery in the extension library"
            id="pebble.extensionGallery.more"
            values={{
                GALLERY: gallery.name,
                SITE: new URL(gallery.site).hostname
            }}
        />
    ),
    tags: [gallery.id],
    featured: true
});

const toLibraryItem = extension => ({
    key: extension.extensionURL,
    name: extension.name,
    description: extension.description,
    // The editor finds the ID by loading the extension when the list doesn't have it
    extensionId: extension.extensionId || extension.extensionURL,
    extensionURL: extension.extensionURL,
    iconURL: extension.iconURL || galleryIcon,
    tags: [extension.gallery],
    credits: extension.creator ? [extension.creator] : [],
    docsURI: extension.docsURI,
    incompatibleWithScratch: true,
    featured: true
});

/**
 * @returns {Array} Library items for the PenguinMod and Snail IDE galleries, each after a separator.
 */
const getPebbleGalleryItems = () => {
    const items = [];
    for (const gallery of GALLERIES) {
        const extensions = galleryExtensions.filter(extension => extension.gallery === gallery.id);
        if (extensions.length === 0) continue;
        items.push('---', galleryCard(gallery), ...extensions.map(toLibraryItem));
    }
    return items;
};

export default getPebbleGalleryItems;
