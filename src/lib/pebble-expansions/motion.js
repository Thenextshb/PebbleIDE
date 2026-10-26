/**
 * Motion expansion, ported from PenguinMod-Vm's pm_motionExpansion
 * (https://github.com/PenguinMod/PenguinMod-Vm, Mozilla Public License 2.0).
 * Most of its blocks come from More Motion by NexusKitten. They are shown in the Motion category.
 */

import BlockType from 'scratch-vm/src/extension-support/block-type';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import Cast from 'scratch-vm/src/util/cast';

const number = (name, value) =>
    `<value name="${name}"><shadow type="math_number"><field name="NUM">${value}</field></shadow></value>`;

const PALETTE = `
<block type="pmMotionExpansion_setHome"/>
<block type="pmMotionExpansion_gotoHome"/>
<block type="pmMotionExpansion_steptowards">${number('STEPS', 10)}${number('X', 0)}${number('Y', 0)}</block>
<block type="pmMotionExpansion_tweentowards">${number('PERCENT', 10)}${number('X', 0)}${number('Y', 0)}</block>
<sep gap="36"/>
<block type="motion_turnrightaroundxy">${number('DEGREES', 15)}${number('X', 0)}${number('Y', 0)}</block>
<block type="motion_turnleftaroundxy">${number('DEGREES', 15)}${number('X', 0)}${number('Y', 0)}</block>
<block type="motion_ifonxybounce">${number('X', 10)}${number('Y', 10)}</block>
<block type="pmMotionExpansion_fence"/>
<sep gap="36"/>
<block type="pmMotionExpansion_rotationStyle"/>
<block type="pmMotionExpansion_touchingxy">${number('X', 0)}${number('Y', 0)}</block>
<block type="pmMotionExpansion_touchingrect">
    ${number('X1', -100)}${number('Y1', -100)}${number('X2', 100)}${number('Y2', 100)}
</block>
`;

const numberArg = defaultValue => ({
    type: ArgumentType.NUMBER,
    defaultValue
});

class MotionExpansion {
    constructor (runtime) {
        this.runtime = runtime;
        // Clones aren't saved, so their homes only live while the project runs
        this.cloneHomes = {};
    }

    // Sprite homes are saved with the project
    get spriteHomes () {
        const storage = this.runtime.extensionStorage;
        if (!storage.pmMotionExpansion) storage.pmMotionExpansion = {};
        if (!storage.pmMotionExpansion.homes) storage.pmMotionExpansion.homes = {};
        return storage.pmMotionExpansion.homes;
    }

    getInfo () {
        return {
            id: 'pmMotionExpansion',
            name: 'Motion Expansion',
            color1: '#4C97FF',
            color2: '#4280D7',
            color3: '#3373CC',
            blocks: [
                {
                    blockType: BlockType.XML,
                    xml: PALETTE
                },
                {
                    opcode: 'rotationStyle',
                    blockType: BlockType.REPORTER,
                    text: 'rotation style',
                    disableMonitor: true,
                    hideFromPalette: true
                },
                {
                    opcode: 'fence',
                    blockType: BlockType.COMMAND,
                    text: 'manually fence',
                    hideFromPalette: true
                },
                {
                    opcode: 'steptowards',
                    blockType: BlockType.COMMAND,
                    text: 'move [STEPS] steps towards x: [X] y: [Y]',
                    hideFromPalette: true,
                    arguments: {
                        STEPS: numberArg('10'),
                        X: numberArg('0'),
                        Y: numberArg('0')
                    }
                },
                {
                    opcode: 'tweentowards',
                    blockType: BlockType.COMMAND,
                    text: 'move [PERCENT]% of the way to x: [X] y: [Y]',
                    hideFromPalette: true,
                    arguments: {
                        PERCENT: numberArg('10'),
                        X: numberArg('0'),
                        Y: numberArg('0')
                    }
                },
                {
                    opcode: 'touchingxy',
                    blockType: BlockType.BOOLEAN,
                    text: 'touching x: [X] y: [Y]?',
                    hideFromPalette: true,
                    arguments: {
                        X: numberArg('0'),
                        Y: numberArg('0')
                    }
                },
                {
                    opcode: 'touchingrect',
                    blockType: BlockType.BOOLEAN,
                    text: 'touching rectangle x1: [X1] y1: [Y1] x2: [X2] y2: [Y2]?',
                    hideFromPalette: true,
                    arguments: {
                        X1: numberArg('-100'),
                        Y1: numberArg('-100'),
                        X2: numberArg('100'),
                        Y2: numberArg('100')
                    }
                },
                {
                    opcode: 'setHome',
                    blockType: BlockType.COMMAND,
                    text: 'set my home',
                    hideFromPalette: true
                },
                {
                    opcode: 'gotoHome',
                    blockType: BlockType.COMMAND,
                    text: 'go to home',
                    hideFromPalette: true
                }
            ]
        };
    }

    rotationStyle (args, util) {
        return util.target.rotationStyle;
    }

    fence (args, util) {
        const fenced = util.target.keepInFence(util.target.x, util.target.y);
        util.target.setXY(fenced[0], fenced[1]);
    }

    steptowards (args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const steps = Cast.toNumber(args.STEPS);
        const fraction = steps / Math.sqrt(((x - util.target.x) ** 2) + ((y - util.target.y) ** 2));
        if (fraction >= 1) {
            util.target.setXY(x, y);
        } else {
            util.target.setXY(
                ((x - util.target.x) * fraction) + util.target.x,
                ((y - util.target.y) * fraction) + util.target.y
            );
        }
    }

    tweentowards (args, util) {
        const x = Cast.toNumber(args.X);
        const y = Cast.toNumber(args.Y);
        const fraction = Cast.toNumber(args.PERCENT) / 100;
        util.target.setXY(
            ((x - util.target.x) * fraction) + util.target.x,
            ((y - util.target.y) * fraction) + util.target.y
        );
    }

    touchingrect (args, util) {
        const renderer = this.runtime.renderer;
        if (!renderer) return false;
        const left = Math.min(Cast.toNumber(args.X1), Cast.toNumber(args.X2));
        const right = Math.max(Cast.toNumber(args.X1), Cast.toNumber(args.X2));
        const bottom = Math.min(Cast.toNumber(args.Y1), Cast.toNumber(args.Y2));
        const top = Math.max(Cast.toNumber(args.Y1), Cast.toNumber(args.Y2));

        const drawable = renderer._allDrawables[util.target.drawableID];
        if (!drawable) return false;

        const drawableBounds = drawable.getFastBounds();
        drawableBounds.snapToInt();
        const Rectangle = renderer.exports.Rectangle;
        const rectangle = new Rectangle();
        rectangle.initFromBounds(left, right, bottom, top);
        rectangle.snapToInt();
        if (!rectangle.intersects(drawableBounds)) return false;

        drawable.updateCPURenderAttributes();
        const overlap = Rectangle.intersect(drawableBounds, rectangle);
        for (let x = overlap.left; x < overlap.right; x++) {
            for (let y = overlap.bottom; y < overlap.top; y++) {
                if (drawable.isTouching([x, y])) return true;
            }
        }
        return false;
    }

    touchingxy (args, util) {
        const renderer = this.runtime.renderer;
        const drawable = renderer && renderer._allDrawables[util.target.drawableID];
        if (!drawable) return false;
        drawable.updateCPURenderAttributes();
        return drawable.isTouching([Cast.toNumber(args.X), Cast.toNumber(args.Y)]);
    }

    setHome (args, util) {
        const target = util.target;
        if (target.isStage) return;
        const home = {
            x: target.x,
            y: target.y,
            size: target.size,
            direction: target.direction,
            rotationStyle: target.rotationStyle,
            visible: target.visible,
            effects: Object.assign({}, target.effects),
            draggable: target.draggable,
            currentCostume: target.currentCostume,
            volume: target.volume
        };
        if (target.isOriginal) {
            this.spriteHomes[target.getName()] = home;
        } else {
            this.cloneHomes[target.id] = home;
        }
    }

    gotoHome (args, util) {
        const target = util.target;
        if (target.isStage) return;
        const home = target.isOriginal ? this.spriteHomes[target.getName()] : this.cloneHomes[target.id];
        if (!home) return;
        target.setXY(home.x, home.y);
        target.setSize(home.size);
        target.setDirection(home.direction);
        target.setRotationStyle(home.rotationStyle);
        target.setVisible(home.visible);
        for (const effect in home.effects) {
            target.setEffect(effect, home.effects[effect]);
        }
        target.setDraggable(home.draggable);
        target.setCostume(home.currentCostume);
        target.volume = home.volume;
        this.runtime.requestRedraw();
    }
}

export default MotionExpansion;
