import RobotJSActions from './implementation';

// JSON Schemas for actions
export abstract class Action<T extends string = string> {
    protected constructor(public action: T, public time: number) {}
    public doAction() {
        RobotJSActions.executeAction(this as unknown as AnyAction);
    }   
}

export class Position {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        if (x < 0 || x > 1) {
            throw new Error(`x coordinate (${x}) must be between 0 and 1.`);
        }
        if (y < 0 || y > 1) {
            throw new Error(`y coordinate (${y}) must be between 0 and 1.`);
        }
        this.x = x;
        this.y = y;
    }
}

export class ClickAction extends Action<'leftClick' | 'rightClick'> {
    constructor(
        action: 'leftClick' | 'rightClick',
        public pos: Position,
        time: number
    ) {
        super(action, time);
    }
}

export class KeyPressAction extends Action<'keyPress'> {
    constructor(
        public key: string,
        time: number
    ) {
        super('keyPress', time);
    }
}

export class ComboKeyPressAction extends Action<'Combo Key'> {
    constructor(
        public combo: string,
        time: number
    ) {
        super('Combo Key', time);
    }
}

export class MoveMouseAction extends Action<'moveMouse'> {
    constructor(
        time: number,
        public initial_pos: Position,
        public final_pos: Position
    ) {
        super('moveMouse', time);
    }
}

export type AnyAction = ClickAction | KeyPressAction | ComboKeyPressAction | MoveMouseAction; 