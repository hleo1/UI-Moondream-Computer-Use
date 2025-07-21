import { GlobalKeyboardListener } from 'node-global-key-listener';
import mouseEvents from 'global-mouse-events';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { Action } from './types';

const clicksVicinityDir = path.join(process.cwd(), 'clicks_vicinity');
const screenshotFullDir = path.join(process.cwd(), 'screenshot_full');

interface Display {
    id: number;
    isPrimary: boolean;
    width: number;
    height: number;
}

export default class ActivityLogger extends EventEmitter {
    private logs: Action[] = [];
    private keyboardListener: GlobalKeyboardListener | null = null;
    private mouseMoveTimeout: NodeJS.Timeout | null = null;
    private lastScreenshotBuffer: Buffer | null = null;
    private isTakingScreenshot = false;
    private isLogging = false;

    private primaryDisplay: Display | null = null;
    private screenWidth = 0;
    private screenHeight = 0;

    private startMousePosition: { x: number, y: number } | null = null;
    private endMousePosition: { x: number, y: number } | null = null;
    
    constructor() {
        super();
        if (!fs.existsSync(clicksVicinityDir)) fs.mkdirSync(clicksVicinityDir);
        if (!fs.existsSync(screenshotFullDir)) fs.mkdirSync(screenshotFullDir);
    }

    public async startLog() {
        if (this.isLogging) {
            console.log("Logger is already running.");
            return;
        }

        const displays: Display[] = await screenshot.listDisplays();
        this.primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
        if (!this.primaryDisplay) {
            throw new Error("No primary display found.");
        }
        this.screenWidth = this.primaryDisplay.width;
        this.screenHeight = this.primaryDisplay.height;

        this.isLogging = true;
        this.keyboardListener = new GlobalKeyboardListener();

        this.setupKeyboardListener();
        this.setupMouseListeners();
        console.log("Activity logger started.");
    }

    public endLog() {
        if (!this.isLogging) {
            console.log("Logger is not running.");
            return;
        }

        this.endAndLogMouseMovement();
        
        this.keyboardListener?.kill();
        mouseEvents.removeAllListeners();
        this.isLogging = false;
        console.log("Activity logger stopped.");
    }

    public saveLog(filePath: string) {
        fs.writeFileSync(filePath, JSON.stringify(this.logs, null, 2));
        console.log(`Log saved to ${filePath}`);
    }

    private log(action: Action) {
        if (this.isLogging) {
            this.logs.push(action);
            this.emit('new-log', action);
        }
    }
    
    private endAndLogMouseMovement() {
        if (this.mouseMoveTimeout) {
            clearTimeout(this.mouseMoveTimeout);
            this.mouseMoveTimeout = null;

            if (this.startMousePosition && this.endMousePosition && (this.startMousePosition.x !== this.endMousePosition.x || this.startMousePosition.y !== this.endMousePosition.y)) {
                this.log({
                    action: 'moveMouse',
                    time: Date.now(),
                    initial_pos: this.startMousePosition,
                    final_pos: this.endMousePosition
                });
            }
            this.startMousePosition = null;
            this.endMousePosition = null;
        }
    }

    private setupKeyboardListener() {
        let ctrlDown = false;
        let ctrlUsedInCombo = false;
        const comboKeys = new Set<string>();

        this.keyboardListener?.addListener((e: { state: "DOWN" | "UP", name?: string }, down: any) => {
            if (!this.isLogging) return;
            this.endAndLogMouseMovement();

            if (e.state === "DOWN") {
                if (e.name === 'LEFT CTRL' || e.name === 'RIGHT CTRL') {
                    if (!ctrlDown) {
                        ctrlDown = true;
                        ctrlUsedInCombo = false;
                        comboKeys.clear();
                    }
                } else if (ctrlDown && e.name && !comboKeys.has(e.name)) {
                    this.log({
                        action: 'Combo Key',
                        combo: `Ctrl + ${e.name}`,
                        time: Date.now()
                    });
                    ctrlUsedInCombo = true;
                    comboKeys.add(e.name);
                }
            } else if (e.state === "UP") {
                if (e.name === 'LEFT CTRL' || e.name === 'RIGHT CTRL') {
                    if (ctrlDown && !ctrlUsedInCombo) {
                        this.log({ action: 'keyPress', key: 'Ctrl', time: Date.now() });
                    }
                    ctrlDown = false;
                    ctrlUsedInCombo = false;
                    comboKeys.clear();
                } else if (!ctrlDown && e.name && e.name !== 'MOUSE LEFT' && e.name !== 'MOUSE RIGHT') {
                    this.log({ action: 'keyPress', key: e.name, time: Date.now() });
                }
            }
        });
    }

    private setupMouseListeners() {
        mouseEvents.on('mousemove', (event: { x: number, y: number }) => {
            if (!this.isLogging) return;

            if (!this.isTakingScreenshot) {
                this.isTakingScreenshot = true;
                screenshot({ format: 'png', screen: this.primaryDisplay!.id })
                    .then((buffer: Buffer) => {
                        this.lastScreenshotBuffer = buffer;
                        setTimeout(() => { this.isTakingScreenshot = false; }, 100);
                    })
                    .catch((err: Error) => {
                        console.error("Failed to capture continuous screenshot:", err);
                        this.isTakingScreenshot = false;
                    });
            }

            const normalizedX = Math.max(0, event.x) / this.screenWidth;
            const normalizedY = Math.max(0, event.y) / this.screenHeight;

            if (!this.startMousePosition) this.startMousePosition = { x: normalizedX, y: normalizedY };
            this.endMousePosition = { x: normalizedX, y: normalizedY };

            if (this.mouseMoveTimeout) clearTimeout(this.mouseMoveTimeout);
            this.mouseMoveTimeout = setTimeout(() => this.endAndLogMouseMovement(), 1000);
        });

        mouseEvents.on('mousedown', async (event: { x: number, y: number, button: number }) => {
            if (!this.isLogging) return;
            this.endAndLogMouseMovement();

            const clickX = event.x;
            const clickY = event.y;

            if (event.button === 1 || event.button === 2) {
                const clickType = event.button === 1 ? 'leftClick' : 'rightClick';
                const timestamp = Date.now();
                
                this.log({
                    action: clickType,
                    pos: {
                        x: Math.max(0, clickX) / this.screenWidth,
                        y: Math.max(0, clickY) / this.screenHeight
                    },
                    time: timestamp
                });
                
                const vicinityPath = path.join(clicksVicinityDir, `vicinity-${timestamp}.png`);
                const fullScreenshotPath = path.join(screenshotFullDir, `full-${timestamp}.png`);

                try {
                    const imgBuffer = this.lastScreenshotBuffer ?? await screenshot({ format: 'png', screen: this.primaryDisplay!.id });

                    let left = Math.max(0, clickX - 200);
                    let top = Math.max(0, clickY - 100);

                    let right = Math.min(clickX + 200, this.screenWidth);
                    let bottom = Math.min(clickY + 100, this.screenHeight);


                    if (this.screenWidth < clickX + 200) {
                        //right overflow
                        left = this.screenWidth - 2 * (this.screenWidth - clickX);
                    } else if (clickX - 200 < 0) {
                        //left overflow
                        right = 2 * clickX;
                    }

                    if (this.screenHeight < clickY + 100) {
                        //bottom overflow
                        top = this.screenHeight - 2 * (this.screenHeight - clickY);
                    } else if (clickY - 100 < 0) {
                        //top overflow
                        bottom = 2 * clickY;
                    } 

                   let width = right - left;
                   let height = bottom - top;



                

                    await sharp(imgBuffer).extract({ left, top, width, height }).toFile(vicinityPath);

                    const borderSvg = `<svg width="${this.screenWidth}" height="${this.screenHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="${left}" y="${top}" width="${width}" height="${height}" stroke="red" stroke-width="5" fill="none" /></svg>`;
                    await sharp(imgBuffer).composite([{ input: Buffer.from(borderSvg) }]).toFile(fullScreenshotPath);

                } catch (error) {
                    console.error(`Failed to process screenshot for ${clickType}:`, error);
                }
            }
        });
    }
} 