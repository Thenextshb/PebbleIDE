/**
 * Control expansion, ported from PenguinMod-Vm's pm_controlsExpansion
 * (https://github.com/PenguinMod/PenguinMod-Vm, Mozilla Public License 2.0).
 * Its blocks are shown in the Control category.
 */

import BlockType from 'scratch-vm/src/extension-support/block-type';
import ArgumentType from 'scratch-vm/src/extension-support/argument-type';
import Cast from 'scratch-vm/src/util/cast';

// eslint-disable-next-line max-len
const ASYNC_ICON = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZlcnNpb249IjEuMSIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHByZXNlcnZlQXNwZWN0UmF0aW89Im5vbmUiIHg9IjBweCIgeT0iMHB4IiB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiPgo8ZGVmcz4KPGcgaWQ9IkxheWVyMV8wX0ZJTEwiPgo8cGF0aCBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjAuNDQ3MDU4ODIzNTI5NDExOCIgc3Ryb2tlPSJub25lIiBkPSIKTSAxMi4xIDEuNTUKUSAxMS41MTU0Mjk2ODc1IDEuNDk5NjA5Mzc1IDEwLjk1IDIuMTUKTCA3LjMgNi4xClEgNi42ODcxMDkzNzUgNi41NjI1IDYuNyA3LjIgNi43MjUgOC43NzUxOTUzMTI1IDguMyA4Ljc1CkwgOS4yNSA4Ljc1ClEgOS42MTA1NDY4NzUgMTIuMjU2MDU0Njg3NSA5LjI1IDE1LjMKTCA4LjEgMTUuMjUKUSA3LjE1MzkwNjI1IDE1LjI3MTY3OTY4NzUgNi44IDE2IDYuNjc2MzY3MTg3NSAxNi4yNjY3OTY4NzUgNi42NSAxNi42NSA2LjYxMjY5NTMxMjUgMTcuMTY3MTg3NSA3LjIgMTcuODUKTCAxMC45NSAyMS45ClEgMTEuNDQxMjEwOTM3NSAyMi42NTE5NTMxMjUgMTIuMSAyMi41NSAxMi42MDkxNzk2ODc1IDIyLjY0NDcyNjU2MjUgMTMuMiAyMi4wNQpMIDEzLjIgMjIuMDUgMTcuMDUgMTcuOQpRIDE3LjU1ODc4OTA2MjUgMTcuNDY4OTQ1MzEyNSAxNy41IDE2LjkgMTcuNTI1IDE1LjMyNDgwNDY4NzUgMTUuOTUgMTUuMwpMIDE0LjggMTUuMwpRIDE0LjUyODMyMDMxMjUgMTIuMTIxNjc5Njg3NSAxNC44NSA4LjgKTCAxNi4xNSA4LjgKUSAxNy4xOTg0Mzc1IDguODI4NzEwOTM3NSAxNy40NSA3LjkgMTcuNTIzNjMyODEyNSA3Ljc1MTE3MTg3NSAxNy41IDcuNiAxNy41MjUgNy41NSAxNy41IDcuNDUgMTcuNTQ3NDYwOTM3NSA2Ljg0NDUzMTI1IDE3LjA1IDYuMjUKTCAxMy4yIDIuMgpRIDEyLjc1NTA3ODEyNSAxLjQ5ODI0MjE4NzUgMTIuMSAxLjU1IFoiLz4KPC9nPgoKPGcgaWQ9IkxheWVyMF8wX0ZJTEwiPgo8cGF0aCBmaWxsPSIjRkZGRkZGIiBzdHJva2U9Im5vbmUiIGQ9IgpNIDE2LjM1IDYuODUKTCAxMi40NSAyLjc1ClEgMTIuMyAyLjUgMTIuMSAyLjUgMTEuOSAyLjUgMTEuNyAyLjc1CkwgNy44NSA2Ljg1ClEgNy42NSA3IDcuNjUgNy4yIDcuNjUgNy44NSA4LjMgNy44NQpMIDEwLjEgNy44NQpRIDEwLjY1IDEyLjQgMTAuMSAxNi4yNQpMIDguMSAxNi4yClEgNy43NSAxNi4yIDcuNjUgMTYuNSA3LjYgMTYuNTUgNy42IDE2LjY1IDcuNiAxNi45IDcuOSAxNy4yNQpMIDExLjc1IDIxLjQKUSAxMS45IDIxLjY1IDEyLjEgMjEuNjUgMTIuMyAyMS42NSAxMi41NSAyMS40CkwgMTYuNCAxNy4yNQpRIDE2LjYgMTcuMSAxNi42IDE2LjkgMTYuNiAxNi4yNSAxNS45NSAxNi4yNQpMIDE0IDE2LjI1ClEgMTMuNSAxMi4xNSAxNCA3LjkKTCAxNi4xNSA3LjkKUSAxNi41IDcuOSAxNi42IDcuNiAxNi42IDcuNTUgMTYuNiA3LjQ1IDE2LjYgNy4xNSAxNi4zNSA2Ljg1IFoiLz4KPC9nPgo8L2RlZnM+Cgo8ZyBpZD0iTGF5ZXJfMyI+CjxnIHRyYW5zZm9ybT0ibWF0cml4KCAxLCAwLCAwLCAxLCAwLDApICI+Cjx1c2UgeGxpbms6aHJlZj0iI0xheWVyMV8wX0ZJTEwiLz4KPC9nPgo8L2c+Cgo8ZyBpZD0iYXN5bmNfc3ZnIj4KPGcgdHJhbnNmb3JtPSJtYXRyaXgoIDEsIDAsIDAsIDEsIDAsMCkgIj4KPHVzZSB4bGluazpocmVmPSIjTGF5ZXIwXzBfRklMTCIvPgo8L2c+CjwvZz4KPC9zdmc+Cg==';

const PALETTE = `
<block type="control_repeatForSeconds">
    <value name="TIMES"><shadow type="math_number"><field name="NUM">1</field></shadow></value>
</block>
<block type="control_waittick"/>
<block type="pmControlsExpansion_asNewBroadcast"/>
<sep gap="36"/>
<block type="pmControlsExpansion_restartFromTheTop"/>
<block type="pmControlsExpansion_asNewBroadcastArgs">
    <value name="DATA"><shadow type="text"><field name="TEXT">abc</field></shadow></value>
</block>
<block type="pmControlsExpansion_asNewBroadcastArgBlock"/>
<sep gap="36"/>
<block type="control_get_counter"/>
<block type="control_incr_counter"/>
<block type="control_decr_counter"/>
<block type="control_set_counter">
    <value name="VALUE"><shadow type="math_whole_number"><field name="NUM">10</field></shadow></value>
</block>
<block type="control_clear_counter"/>
<sep gap="36"/>
<block type="pmControlsExpansion_ifElseIf"/>
<block type="pmControlsExpansion_ifElseIfElse"/>
`;

class ControlExpansion {
    constructor (runtime) {
        this.runtime = runtime;
    }

    getInfo () {
        return {
            id: 'pmControlsExpansion',
            name: 'Controls Expansion',
            color1: '#FFAB19',
            color2: '#EC9C13',
            color3: '#CF8B17',
            blocks: [
                {
                    blockType: BlockType.XML,
                    xml: PALETTE
                },
                {
                    opcode: 'ifElseIf',
                    text: [
                        'if [CONDITION1] then',
                        'else if [CONDITION2] then'
                    ],
                    branchCount: 2,
                    blockType: BlockType.CONDITIONAL,
                    hideFromPalette: true,
                    arguments: {
                        CONDITION1: {type: ArgumentType.BOOLEAN},
                        CONDITION2: {type: ArgumentType.BOOLEAN}
                    }
                },
                {
                    opcode: 'ifElseIfElse',
                    text: [
                        'if [CONDITION1] then',
                        'else if [CONDITION2] then',
                        'else'
                    ],
                    branchCount: 3,
                    blockType: BlockType.CONDITIONAL,
                    hideFromPalette: true,
                    arguments: {
                        CONDITION1: {type: ArgumentType.BOOLEAN},
                        CONDITION2: {type: ArgumentType.BOOLEAN}
                    }
                },
                {
                    opcode: 'asNewBroadcast',
                    text: [
                        'new thread',
                        '[ICON]'
                    ],
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    hideFromPalette: true,
                    arguments: {
                        ICON: {
                            type: ArgumentType.IMAGE,
                            dataURI: ASYNC_ICON
                        }
                    }
                },
                {
                    opcode: 'restartFromTheTop',
                    text: 'restart from the top',
                    blockType: BlockType.COMMAND,
                    isTerminal: true,
                    hideFromPalette: true
                },
                {
                    opcode: 'asNewBroadcastArgs',
                    text: [
                        'new thread with data [DATA]',
                        '[ICON]'
                    ],
                    branchCount: 1,
                    blockType: BlockType.CONDITIONAL,
                    hideFromPalette: true,
                    arguments: {
                        DATA: {
                            type: ArgumentType.STRING,
                            defaultValue: 'abc'
                        },
                        ICON: {
                            type: ArgumentType.IMAGE,
                            dataURI: ASYNC_ICON
                        }
                    }
                },
                {
                    opcode: 'asNewBroadcastArgBlock',
                    text: 'thread data',
                    blockType: BlockType.REPORTER,
                    allowDropAnywhere: true,
                    disableMonitor: true,
                    hideFromPalette: true
                }
            ]
        };
    }

    ifElseIf (args, util) {
        if (Cast.toBoolean(args.CONDITION1)) {
            util.startBranch(1, false);
        } else if (Cast.toBoolean(args.CONDITION2)) {
            util.startBranch(2, false);
        }
    }

    ifElseIfElse (args, util) {
        if (Cast.toBoolean(args.CONDITION1)) {
            util.startBranch(1, false);
        } else if (Cast.toBoolean(args.CONDITION2)) {
            util.startBranch(2, false);
        } else {
            util.startBranch(3, false);
        }
    }

    restartFromTheTop (args, util) {
        this.runtime._restartThread(util.thread);
        util.stopThisScript();
    }

    _startBranchAsThread (util) {
        const branch = util.thread.target.blocks.getBranch(util.thread.peekStack(), 1);
        if (!branch) return null;
        return this.runtime._pushThread(branch, util.target, {});
    }

    asNewBroadcast (args, util) {
        this._startBranchAsThread(util);
    }

    asNewBroadcastArgs (args, util) {
        const thread = this._startBranchAsThread(util);
        if (thread) {
            thread.pmThreadData = args.DATA;
        }
    }

    asNewBroadcastArgBlock (args, util) {
        const data = util.thread.pmThreadData;
        return typeof data === 'undefined' ? '' : data;
    }
}

export default ControlExpansion;
