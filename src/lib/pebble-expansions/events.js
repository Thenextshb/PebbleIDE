/**
 * Events expansion, ported from PenguinMod-Vm's pm_eventsExpansion
 * (https://github.com/PenguinMod/PenguinMod-Vm, Mozilla Public License 2.0).
 * Its blocks are shown in the Events category.
 */

import BlockType from 'scratch-vm/src/extension-support/block-type';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import Cast from 'scratch-vm/src/util/cast';

const broadcastInput = name => `<value name="${name}"><shadow type="event_broadcast_menu"></shadow></value>`;
const textInput = (name, text) =>
    `<value name="${name}"><shadow type="text"><field name="TEXT">${text}</field></shadow></value>`;

const PALETTE = `
<block type="pmEventsExpansion_sendWithData">${broadcastInput('BROADCAST')}${textInput('DATA', 'abc')}</block>
<block type="pmEventsExpansion_recievedDataReporter"/>
<block type="pmEventsExpansion_isBroadcastReceived">${broadcastInput('BROADCAST')}</block>
<sep gap="36"/>
<block type="pmEventsExpansion_broadcastToSprite">${broadcastInput('BROADCAST')}</block>
<block type="pmEventsExpansion_broadcastFunction">${broadcastInput('BROADCAST')}</block>
<block type="pmEventsExpansion_broadcastFunctionArgs">${broadcastInput('BROADCAST')}${textInput('ARGS', 'abc')}</block>
<block type="pmEventsExpansion_returnFromBroadcastFunc">${textInput('VALUE', '1')}</block>
<sep gap="36"/>
<block type="pmEventsExpansion_whenSpriteClicked"/>
<block type="pmEventsExpansion_everyOtherFrame"/>
<block type="pmEventsExpansion_neverr"/>
<sep gap="36"/>
<block type="pmEventsExpansion_broadcastThreadCount">${broadcastInput('BROADCAST')}</block>
`;

const STAGE_VALUE = '_stage_';

class EventsExpansion {
    constructor (runtime) {
        this.runtime = runtime;

        this._otherFrame = false;
        runtime.on('BEFORE_EXECUTE', () => {
            if (this._otherFrame) {
                runtime.startHats('pmEventsExpansion_everyOtherFrame');
            }
            this._otherFrame = !this._otherFrame;
        });

        // PenguinMod starts these from its mouse and broadcast code
        const originalStartHats = runtime.startHats;
        runtime.startHats = function (requestedHat, optMatchFields, optTarget) {
            const threads = originalStartHats.call(this, requestedHat, optMatchFields, optTarget);
            if (requestedHat === 'event_whenbroadcastreceived' && optMatchFields) {
                const message = this.getTargetForStage() &&
                    this.getTargetForStage().lookupBroadcastMsg('', Cast.toString(optMatchFields.BROADCAST_OPTION));
                if (message) message.isSent = true;
            } else if (requestedHat === 'event_whenthisspriteclicked' && optTarget) {
                originalStartHats.call(this, 'pmEventsExpansion_whenSpriteClicked', {
                    SPRITE: optTarget.isStage ? STAGE_VALUE : optTarget.sprite.name
                });
            }
            return threads;
        };
    }

    getInfo () {
        return {
            id: 'pmEventsExpansion',
            name: 'Events Expansion',
            color1: '#FFBF00',
            color2: '#E6AC00',
            color3: '#CC9900',
            blocks: [
                {
                    blockType: BlockType.XML,
                    xml: PALETTE
                },
                {
                    opcode: 'everyOtherFrame',
                    text: 'every other frame',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    hideFromPalette: true
                },
                {
                    opcode: 'neverr',
                    text: 'never',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    hideFromPalette: true
                },
                {
                    opcode: 'whenSpriteClicked',
                    text: 'when [SPRITE] clicked',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    hideFromPalette: true,
                    arguments: {
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: 'spriteName'
                        }
                    }
                },
                {
                    opcode: 'sendWithData',
                    text: 'broadcast [BROADCAST] with data [DATA]',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING},
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: 'abc'
                        }
                    }
                },
                {
                    // Kept so PenguinMod projects that have it still load
                    opcode: 'receivedData',
                    text: 'when I receive [BROADCAST] with data',
                    blockType: BlockType.EVENT,
                    isEdgeActivated: false,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {
                            type: ArgumentType.STRING,
                            menu: 'broadcastMenu'
                        }
                    }
                },
                {
                    opcode: 'isBroadcastReceived',
                    text: 'is message [BROADCAST] received?',
                    blockType: BlockType.BOOLEAN,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING}
                    }
                },
                {
                    opcode: 'recievedDataReporter',
                    text: 'received data',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true,
                    hideFromPalette: true
                },
                {
                    opcode: 'broadcastToSprite',
                    text: 'broadcast [BROADCAST] to [SPRITE]',
                    blockType: BlockType.COMMAND,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING},
                        SPRITE: {
                            type: ArgumentType.STRING,
                            menu: 'spriteName'
                        }
                    }
                },
                {
                    opcode: 'broadcastFunction',
                    text: 'broadcast [BROADCAST] and wait',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING}
                    }
                },
                {
                    opcode: 'returnFromBroadcastFunc',
                    text: 'return [VALUE]',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    hideFromPalette: true,
                    arguments: {
                        VALUE: {
                            type: ArgumentType.STRING,
                            defaultValue: '1'
                        }
                    }
                },
                {
                    opcode: 'broadcastThreadCount',
                    text: 'broadcast [BROADCAST] and get # of blocks started',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING}
                    }
                },
                {
                    opcode: 'broadcastFunctionArgs',
                    text: 'broadcast [BROADCAST] with data [ARGS] and wait',
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    allowDropAnywhere: true,
                    hideFromPalette: true,
                    arguments: {
                        BROADCAST: {type: ArgumentType.STRING},
                        ARGS: {
                            type: ArgumentType.STRING,
                            defaultValue: 'abc'
                        }
                    }
                }
            ],
            menus: {
                spriteName: '_spriteNameMenu',
                broadcastMenu: '_broadcastMenu'
            }
        };
    }

    _spriteNameMenu () {
        const menu = [];
        for (const target of this.runtime.targets) {
            if (!target.isOriginal) continue;
            menu.push(target.isStage ?
                {text: 'stage', value: STAGE_VALUE} :
                {text: target.sprite.name, value: target.sprite.name});
        }
        return menu.length ? menu : [{text: '', value: ''}];
    }

    _broadcastMenu () {
        const stage = this.runtime.getTargetForStage();
        const names = stage ? Object.values(stage.variables)
            .filter(variable => variable.type === 'broadcast_msg')
            .map(variable => variable.name) : [];
        return names.length ? names : [''];
    }

    _broadcast (name, util, data, optTarget) {
        const message = this.runtime.getTargetForStage().lookupBroadcastMsg('', name);
        if (message) message.isSent = true;
        const threads = util.startHats('event_whenbroadcastreceived', {
            BROADCAST_OPTION: name
        }, optTarget);
        for (const thread of threads) {
            thread.pmBroadcastData = data;
        }
        return threads;
    }

    // Resolves with the first value given to "return" once every started script has finished
    _waitForReturn (threads) {
        if (threads.length === 0) return '';
        return new Promise(resolve => {
            const check = () => {
                const running = threads.some(thread => thread.status !== 4 && this.runtime.threads.includes(thread));
                if (running) return;
                this.runtime.removeListener('AFTER_EXECUTE', check);
                const returned = threads.find(thread => typeof thread.pmBroadcastReturn !== 'undefined');
                resolve(returned ? returned.pmBroadcastReturn : '');
            };
            this.runtime.on('AFTER_EXECUTE', check);
        });
    }

    sendWithData (args, util) {
        this._broadcast(Cast.toString(args.BROADCAST), util, Cast.toString(args.DATA));
    }

    broadcastToSprite (args, util) {
        const sprite = Cast.toString(args.SPRITE);
        const target = sprite === STAGE_VALUE ?
            this.runtime.getTargetForStage() :
            this.runtime.getSpriteTargetByName(sprite);
        if (!target) return;
        this._broadcast(Cast.toString(args.BROADCAST), util, '', target);
    }

    broadcastThreadCount (args, util) {
        return this._broadcast(Cast.toString(args.BROADCAST), util, '').length;
    }

    broadcastFunction (args, util) {
        return this._waitForReturn(this._broadcast(Cast.toString(args.BROADCAST), util, ''));
    }

    broadcastFunctionArgs (args, util) {
        const threads = this._broadcast(Cast.toString(args.BROADCAST), util, Cast.toString(args.ARGS));
        return this._waitForReturn(threads);
    }

    returnFromBroadcastFunc (args, util) {
        util.thread.pmBroadcastReturn = args.VALUE;
    }

    recievedDataReporter (args, util) {
        const data = util.thread.pmBroadcastData;
        return typeof data === 'undefined' ? '' : data;
    }

    isBroadcastReceived (args) {
        const message = this.runtime.getTargetForStage().lookupBroadcastMsg('', Cast.toString(args.BROADCAST));
        return !!(message && message.isSent);
    }
}

export default EventsExpansion;
