import { MoveMouseAction, Position, ClickAction } from './types';
import { executeAction } from './implementation';

function main() {
    console.log('Starting actions...');

    // Define positions
    const topLeft = new Position(0, 0);
    const topRight = new Position(1, 0);
    const center = new Position(0.5, 0.5);

    // Create actions
    // const moveAction = new MoveMouseAction(Date.now(), topLeft, topRight);
    const leftClickAction = new ClickAction('leftClick', center, Date.now());
    // const rightClickAction = new ClickAction('rightClick', center, Date.now());

    // Execute actions
    // executeAction(moveAction);
    executeAction(leftClickAction);
    // executeAction(rightClickAction);

    console.log('Actions finished.');
}

main(); 