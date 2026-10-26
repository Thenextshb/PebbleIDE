/*
These values control branding strings throughout the app.

APP_NAME is the name of the app. It is included in packaged projects.

WEBSITE is the address of the packager. It is worked out from the page's own address, so it is correct
wherever the site is deployed. It is included in packaged projects.

COPYRIGHT_NOTICE is included in packaged projects.

ACCENT_COLOR is the default accent color of packaged projects. It must be a 6-character hex color (#123abc).
*/

const getWebsite = () => {
  if (typeof location === 'undefined' || !/^https?:$/.test(location.protocol)) {
    return '';
  }
  return new URL('./', location.href).href;
};

module.exports = {
  APP_NAME: 'PebbleIDE Packager',
  WEBSITE: getWebsite(),
  COPYRIGHT_NOTICE: `Copyright (C) 2021-2024 Thomas Weber
Modified for PebbleIDE.

The Source Code Form of this program is available under the terms of the
Mozilla Public License, v. 2.0. You can obtain a copy of the license at
https://www.mozilla.org/en-US/MPL/2.0/.`,
  ACCENT_COLOR: '#7d7d7d'
};
