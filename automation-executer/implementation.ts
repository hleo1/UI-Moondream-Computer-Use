// Compatible with both Mac and Windows
import * as robot from 'robotjs';
import { MoveMouseAction, AnyAction, Position, ClickAction } from './types';

function dragMouse(initialPos: Position, finalPos: Position) {
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

function clickMouse(action: ClickAction) {
    const { width, height } = robot.getScreenSize();
    const x = Math.round(action.pos.x * width);
    const y = Math.round(action.pos.y * height);

    robot.moveMouse(x,y);

    const button = action.action === 'leftClick' ? 'left' : 'right';
    robot.mouseClick(button);
    console.log(`${action.action} at (${x}, ${y})`);
}

export function executeAction(action: AnyAction) {
    if (action instanceof MoveMouseAction) {
        dragMouse(action.initial_pos, action.final_pos);
    } else if (action instanceof ClickAction) {
        clickMouse(action);
    }
    // TODO: Implement other actions
} 