/**
 * Copyright (C) 2021 Thomas Weber
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React from 'react';
import PropTypes from 'prop-types';
import render from '../app-target';
import styles from './credits.css';

import {APP_NAME} from '../../lib/brand';
import {applyGuiColors} from '../../lib/themes/guiHelpers';
import {detectTheme} from '../../lib/themes/themePersistance';

/* eslint-disable react/jsx-no-literals */

applyGuiColors(detectTheme());
document.documentElement.lang = 'en';

// Pictures are in static/credits. Small pixel art is scaled up without blurring.
const DEVELOPERS = [
    {name: 'Thenextshb', image: 'credits/thenextshb.webp'},
    {name: 'Larrex', image: 'credits/larrex.gif', pixelated: true},
    {name: 'Jaxdev', image: 'credits/jaxdev.png', pixelated: true}
];

const User = ({image, text, pixelated}) => (
    <div className={styles.user}>
        <img
            alt=""
            className={pixelated ? `${styles.userImage} ${styles.pixelated}` : styles.userImage}
            src={image}
            width="60"
            height="60"
        />
        <div className={styles.userInfo}>
            {text}
        </div>
    </div>
);
User.propTypes = {
    image: PropTypes.string.isRequired,
    pixelated: PropTypes.bool,
    text: PropTypes.string.isRequired
};

const Credits = () => (
    <main className={styles.main}>
        <header className={styles.headerContainer}>
            <h1 className={styles.headerText}>
                {APP_NAME} Credits
            </h1>
        </header>
        <section>
            <h2>Developers</h2>
            <div className={styles.users}>
                {DEVELOPERS.map(developer => (
                    <User
                        key={developer.name}
                        image={developer.image}
                        pixelated={developer.pixelated}
                        text={developer.name}
                    />
                ))}
            </div>
        </section>
        <section>
            <h2>TurboWarp</h2>
            <p>
                {APP_NAME} is built on <a href="https://turbowarp.org/">TurboWarp</a>.
            </p>
        </section>
        <section>
            <h2>Scratch</h2>
            <p>
                {APP_NAME} is built on <a href="https://scratch.mit.edu/">Scratch</a>, the work of
                the <a href="https://scratch.mit.edu/credits">Scratch contributors</a>, but is not endorsed by
                Scratch in any way.
            </p>
            <p>
                <a href="https://scratch.mit.edu/donate">
                    Donate to support Scratch.
                </a>
            </p>
        </section>
        <section>
            <h2>PenguinMod</h2>
            <p>
                {APP_NAME} is inspired by <a href="https://penguinmod.com/">PenguinMod</a>, which some of its extra
                blocks also come from.
            </p>
        </section>
    </main>
);

render(<Credits />);
