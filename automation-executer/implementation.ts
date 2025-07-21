// Compatible with both Mac and Windows
import * as robot from 'robotjs';
import { MoveMouseAction, AnyAction, Position, ClickAction, KeyPressAction, ComboKeyPressAction } from './actions';

export default class RobotJSActions {
    public static dragMouse(initialPos: Position, finalPos: Position) {
        // Get screen dimensions to scale coordinates
        const { width, height } = robot.getScreenSize();
    
        // Scale normalized coordinates to screen pixels
        const startX = Math.round(initialPos.x * width);
        const startY = Math.round(initialPos.y * height);
        const endX = Math.round(finalPos.x * width);
        const endY = Math.round(finalPos.y * height);
    
        // Perform the drag
        robot.moveMouse(startX, startY);
        robot.mouseToggle('down');
        robot.dragMouse(endX, endY);
        robot.mouseToggle('up');
    
        console.log(`Mouse dragged from (${startX}, ${startY}) to (${endX}, ${endY})`);
    }
    
    public static clickMouse(action: ClickAction) {
        const { width, height } = robot.getScreenSize();
        const x = Math.round(action.pos.x * width);
        const y = Math.round(action.pos.y * height);
    
        robot.moveMouse(x,y);
    
        const button = action.action === 'leftClick' ? 'left' : 'right';
        robot.mouseClick(button);
        console.log(`${action.action} at (${x}, ${y})`);
    }
    
    public static pressKey(action: KeyPressAction) {
        robot.keyTap(action.key);
        console.log(`Key pressed: ${action.key}`);
    }
    
    public static pressComboKey(action: ComboKeyPressAction) {
        const keys = action.combo.split('+').map(k => k.trim().toLowerCase());
        const mainKey = keys.pop();
    
        if (!mainKey) {
            console.error('Invalid combo key press: no main key specified.');
            return;
        }
        
        const modifiers = keys.map(key => {
            if (key === 'ctrl') {
                return 'control';
            }
            return key;
        });

        robot.keyTap(mainKey, modifiers);
        console.log(`Combo key pressed: ${action.combo}`);
    }
    
    public static executeAction(action: AnyAction) {
        if (action instanceof MoveMouseAction) {
            this.dragMouse(action.initial_pos, action.final_pos);
        } else if (action instanceof ClickAction) {
            this.clickMouse(action);
        } else if (action instanceof KeyPressAction) {
            this.pressKey(action);
        } else if (action instanceof ComboKeyPressAction) {
            this.pressComboKey(action);
        }
    } 

}


