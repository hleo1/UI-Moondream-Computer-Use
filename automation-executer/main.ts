import { MoveMouseAction, Position, ClickAction, KeyPressAction, ComboKeyPressAction } from './actions';

import fs from 'fs';

class ActivityLogParser {

    private activityLog: any;


    public parseActivityLog(activityLogPath: string) {
        const activityLog = fs.readFileSync(activityLogPath, 'utf8');
        const activityLogJson = JSON.parse(activityLog);
        this.activityLog = activityLogJson;
    }

    public async doActions() {
        for (const action of this.activityLog) {
            await new Promise(res => setTimeout(res, 1000));
            const actionType = action.action;
            if (actionType === 'moveMouse') {
                const moveAction = new MoveMouseAction(action.time, new Position(action.initial_pos.x, action.initial_pos.y), new Position(action.final_pos.x, action.final_pos.y));
                moveAction.doAction();
            } else if (actionType === 'leftClick') {
                const leftClickAction = new ClickAction('leftClick', new Position(action.pos.x, action.pos.y), action.time);
                leftClickAction.doAction();
            } else if (actionType === 'rightClick') {
                const rightClickAction = new ClickAction('rightClick', new Position(action.pos.x, action.pos.y), action.time);
                rightClickAction.doAction();
            } else if (actionType === 'keyPress') {
                const keyPressAction = new KeyPressAction(action.key, action.time);
                keyPressAction.doAction();
            } else if (actionType === 'Combo Key') {
                const comboKeyPressAction = new ComboKeyPressAction(action.combo, action.time);
                comboKeyPressAction.doAction();
            }
        }
    }
}


function main() {
    // const activityLogParser = new ActivityLogParser();
    // activityLogParser.parseActivityLog('./moveMouseLeftClickEasy.json');
    // activityLogParser.doActions();


    // move mouse to click on center of screen
    const center = new Position(0.5, 0.5);
    const leftClickAction = new ClickAction('leftClick', center, Date.now());
    leftClickAction.doAction();

    // move mouse to click on center of screen

    const testKeyStrokesCombo = new ActivityLogParser();
    testKeyStrokesCombo.parseActivityLog('./testKeyStrokesCombo.json');
    testKeyStrokesCombo.doActions();
}

main()