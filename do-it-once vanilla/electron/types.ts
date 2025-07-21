// JSON Schemas for actions
export interface ClickAction {
    action: 'leftClick' | 'rightClick';
    pos: { x: number; y: number };
    time: number;
}

export interface KeyPressAction {
    action: 'keyPress';
    key: string;
    time: number;
}

export interface ComboKeyPressAction {
    action: 'Combo Key';
    combo: string;
    time: number;
}

export interface MoveMouseAction {
    action: 'moveMouse';
    time: number;
    initial_pos: { x: number; y: number };
    final_pos: { x: number; y: number };
}

export type Action = ClickAction | KeyPressAction | ComboKeyPressAction | MoveMouseAction; 