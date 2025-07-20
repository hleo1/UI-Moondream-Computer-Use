var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, screen, BrowserWindow, app, globalShortcut } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import fs$1, { promises } from "node:fs";
import require$$0, { EventEmitter } from "events";
import require$$1 from "child_process";
import require$$2 from "os";
import path from "path";
import require$$4 from "stream";
import fs from "fs";
import require$$6 from "util";
import { GlobalKeyboardListener } from "node-global-key-listener";
import mouseEvents from "global-mouse-events";
import screenshot from "screenshot-desktop";
import sharp from "sharp";
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
var pythonShell = {};
var __awaiter = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
Object.defineProperty(pythonShell, "__esModule", { value: true });
var PythonShell_1 = pythonShell.PythonShell = pythonShell.NewlineTransformer = pythonShell.PythonShellErrorWithLogs = pythonShell.PythonShellError = void 0;
const events_1 = require$$0;
const child_process_1 = require$$1;
const os_1 = require$$2;
const path_1 = path;
const stream_1 = require$$4;
const fs_1 = fs;
const util_1 = require$$6;
function toArray(source) {
  if (typeof source === "undefined" || source === null) {
    return [];
  } else if (!Array.isArray(source)) {
    return [source];
  }
  return source;
}
function extend(obj, ...args) {
  Array.prototype.slice.call(arguments, 1).forEach(function(source) {
    if (source) {
      for (let key in source) {
        obj[key] = source[key];
      }
    }
  });
  return obj;
}
function getRandomInt() {
  return Math.floor(Math.random() * 1e10);
}
const execPromise = (0, util_1.promisify)(child_process_1.exec);
class PythonShellError extends Error {
}
pythonShell.PythonShellError = PythonShellError;
class PythonShellErrorWithLogs extends PythonShellError {
}
pythonShell.PythonShellErrorWithLogs = PythonShellErrorWithLogs;
class NewlineTransformer extends stream_1.Transform {
  _transform(chunk, encoding, callback) {
    let data = chunk.toString();
    if (this._lastLineData)
      data = this._lastLineData + data;
    const lines = data.split(os_1.EOL);
    this._lastLineData = lines.pop();
    lines.forEach(this.push.bind(this));
    callback();
  }
  _flush(done) {
    if (this._lastLineData)
      this.push(this._lastLineData);
    this._lastLineData = null;
    done();
  }
}
pythonShell.NewlineTransformer = NewlineTransformer;
class PythonShell extends events_1.EventEmitter {
  /**
   * spawns a python process
   * @param scriptPath path to script. Relative to current directory or options.scriptFolder if specified
   * @param options
   * @param stdoutSplitter Optional. Splits stdout into chunks, defaulting to splitting into newline-seperated lines
   * @param stderrSplitter Optional. splits stderr into chunks, defaulting to splitting into newline-seperated lines
   */
  constructor(scriptPath, options, stdoutSplitter = null, stderrSplitter = null) {
    super();
    function resolve(type, val) {
      if (typeof val === "string") {
        return PythonShell[type][val];
      } else if (typeof val === "function") {
        return val;
      }
    }
    if (scriptPath.trim().length == 0)
      throw Error("scriptPath cannot be empty! You must give a script for python to run");
    let self2 = this;
    let errorData = "";
    events_1.EventEmitter.call(this);
    options = extend({}, PythonShell.defaultOptions, options);
    let pythonPath;
    if (!options.pythonPath) {
      pythonPath = PythonShell.defaultPythonPath;
    } else
      pythonPath = options.pythonPath;
    let pythonOptions = toArray(options.pythonOptions);
    let scriptArgs = toArray(options.args);
    this.scriptPath = (0, path_1.join)(options.scriptPath || "", scriptPath);
    this.command = pythonOptions.concat(this.scriptPath, scriptArgs);
    this.mode = options.mode || "text";
    this.formatter = resolve("format", options.formatter || this.mode);
    this.parser = resolve("parse", options.parser || this.mode);
    this.stderrParser = resolve("parse", options.stderrParser || "text");
    this.terminated = false;
    this.childProcess = (0, child_process_1.spawn)(pythonPath, this.command, options);
    ["stdout", "stdin", "stderr"].forEach(function(name) {
      self2[name] = self2.childProcess[name];
      self2.parser && self2[name] && self2[name].setEncoding(options.encoding || "utf8");
    });
    if (this.parser && this.stdout) {
      if (!stdoutSplitter)
        stdoutSplitter = new NewlineTransformer();
      stdoutSplitter.setEncoding(options.encoding || "utf8");
      this.stdout.pipe(stdoutSplitter).on("data", (chunk) => {
        this.emit("message", self2.parser(chunk));
      });
    }
    if (this.stderrParser && this.stderr) {
      if (!stderrSplitter)
        stderrSplitter = new NewlineTransformer();
      stderrSplitter.setEncoding(options.encoding || "utf8");
      this.stderr.pipe(stderrSplitter).on("data", (chunk) => {
        this.emit("stderr", self2.stderrParser(chunk));
      });
    }
    if (this.stderr) {
      this.stderr.on("data", function(data) {
        errorData += "" + data;
      });
      this.stderr.on("end", function() {
        self2.stderrHasEnded = true;
        terminateIfNeeded();
      });
    } else {
      self2.stderrHasEnded = true;
    }
    if (this.stdout) {
      this.stdout.on("end", function() {
        self2.stdoutHasEnded = true;
        terminateIfNeeded();
      });
    } else {
      self2.stdoutHasEnded = true;
    }
    this.childProcess.on("error", function(err) {
      self2.emit("error", err);
    });
    this.childProcess.on("exit", function(code, signal) {
      self2.exitCode = code;
      self2.exitSignal = signal;
      terminateIfNeeded();
    });
    function terminateIfNeeded() {
      if (!self2.stderrHasEnded || !self2.stdoutHasEnded || self2.exitCode == null && self2.exitSignal == null)
        return;
      let err;
      if (self2.exitCode && self2.exitCode !== 0) {
        if (errorData) {
          err = self2.parseError(errorData);
        } else {
          err = new PythonShellError("process exited with code " + self2.exitCode);
        }
        err = extend(err, {
          executable: pythonPath,
          options: pythonOptions.length ? pythonOptions : null,
          script: self2.scriptPath,
          args: scriptArgs.length ? scriptArgs : null,
          exitCode: self2.exitCode
        });
        if (self2.listeners("pythonError").length || !self2._endCallback) {
          self2.emit("pythonError", err);
        }
      }
      self2.terminated = true;
      self2.emit("close");
      self2._endCallback && self2._endCallback(err, self2.exitCode, self2.exitSignal);
    }
  }
  /**
   * checks syntax without executing code
   * @returns rejects promise w/ string error output if syntax failure
   */
  static checkSyntax(code) {
    return __awaiter(this, void 0, void 0, function* () {
      const randomInt = getRandomInt();
      const filePath = (0, os_1.tmpdir)() + path_1.sep + `pythonShellSyntaxCheck${randomInt}.py`;
      const writeFilePromise = (0, util_1.promisify)(fs_1.writeFile);
      return writeFilePromise(filePath, code).then(() => {
        return this.checkSyntaxFile(filePath);
      });
    });
  }
  static getPythonPath() {
    return this.defaultOptions.pythonPath ? this.defaultOptions.pythonPath : this.defaultPythonPath;
  }
  /**
   * checks syntax without executing code
   * @returns {Promise} rejects w/ stderr if syntax failure
   */
  static checkSyntaxFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
      const pythonPath = this.getPythonPath();
      let compileCommand = `${pythonPath} -m py_compile ${filePath}`;
      return execPromise(compileCommand);
    });
  }
  /**
   * Runs a Python script and returns collected messages as a promise.
   * If the promise is rejected, the err will probably be of type PythonShellErrorWithLogs
   * @param scriptPath   The path to the script to execute
   * @param options  The execution options
   */
  static run(scriptPath, options) {
    return new Promise((resolve, reject) => {
      let pyshell = new PythonShell(scriptPath, options);
      let output = [];
      pyshell.on("message", function(message) {
        output.push(message);
      }).end(function(err) {
        if (err) {
          err.logs = output;
          reject(err);
        } else
          resolve(output);
      });
    });
  }
  /**
   * Runs the inputted string of python code and returns collected messages as a promise. DO NOT ALLOW UNTRUSTED USER INPUT HERE!
   * @param code   The python code to execute
   * @param options  The execution options
   * @return a promise with the output from the python script
   */
  static runString(code, options) {
    const randomInt = getRandomInt();
    const filePath = os_1.tmpdir + path_1.sep + `pythonShellFile${randomInt}.py`;
    (0, fs_1.writeFileSync)(filePath, code);
    return PythonShell.run(filePath, options);
  }
  static getVersion(pythonPath) {
    if (!pythonPath)
      pythonPath = this.getPythonPath();
    return execPromise(pythonPath + " --version");
  }
  static getVersionSync(pythonPath) {
    if (!pythonPath)
      pythonPath = this.getPythonPath();
    return (0, child_process_1.execSync)(pythonPath + " --version").toString();
  }
  /**
   * Parses an error thrown from the Python process through stderr
   * @param  {string|Buffer} data The stderr contents to parse
   * @return {Error} The parsed error with extended stack trace when traceback is available
   */
  parseError(data) {
    let text = "" + data;
    let error;
    if (/^Traceback/.test(text)) {
      let lines = text.trim().split(os_1.EOL);
      let exception = lines.pop();
      error = new PythonShellError(exception);
      error.traceback = data;
      error.stack += os_1.EOL + "    ----- Python Traceback -----" + os_1.EOL + "  ";
      error.stack += lines.slice(1).join(os_1.EOL + "  ");
    } else {
      error = new PythonShellError(text);
    }
    return error;
  }
  /**
   * Sends a message to the Python shell through stdin
   * Override this method to format data to be sent to the Python process
   * @returns {PythonShell} The same instance for chaining calls
   */
  send(message) {
    if (!this.stdin)
      throw new Error("stdin not open for writing");
    let data = this.formatter ? this.formatter(message) : message;
    if (this.mode !== "binary")
      data += os_1.EOL;
    this.stdin.write(data);
    return this;
  }
  /**
   * Closes the stdin stream. Unless python is listening for stdin in a loop
   * this should cause the process to finish its work and close.
   * @returns {PythonShell} The same instance for chaining calls
   */
  end(callback) {
    if (this.childProcess.stdin) {
      this.childProcess.stdin.end();
    }
    this._endCallback = callback;
    return this;
  }
  /**
   * Sends a kill signal to the process
   * @returns {PythonShell} The same instance for chaining calls
   */
  kill(signal) {
    this.terminated = this.childProcess.kill(signal);
    return this;
  }
  /**
   * Alias for kill.
   * @deprecated
   */
  terminate(signal) {
    return this.kill(signal);
  }
}
PythonShell_1 = pythonShell.PythonShell = PythonShell;
PythonShell.defaultPythonPath = process.platform != "win32" ? "python3" : "python";
PythonShell.defaultOptions = {};
PythonShell.format = {
  text: function toText(data) {
    if (!data)
      return "";
    else if (typeof data !== "string")
      return data.toString();
    return data;
  },
  json: function toJson(data) {
    return JSON.stringify(data);
  }
};
PythonShell.parse = {
  text: function asText(data) {
    return data;
  },
  json: function asJson(data) {
    return JSON.parse(data);
  }
};
const clicksVicinityDir$1 = path.join(process.cwd(), "clicks_vicinity");
const screenshotFullDir$1 = path.join(process.cwd(), "screenshot_full");
class ActivityLogger extends EventEmitter {
  constructor() {
    super();
    __publicField(this, "logs", []);
    __publicField(this, "keyboardListener", null);
    __publicField(this, "mouseMoveTimeout", null);
    __publicField(this, "lastScreenshotBuffer", null);
    __publicField(this, "isTakingScreenshot", false);
    __publicField(this, "isLogging", false);
    __publicField(this, "primaryDisplay", null);
    __publicField(this, "screenWidth", 0);
    __publicField(this, "screenHeight", 0);
    __publicField(this, "startMousePosition", null);
    __publicField(this, "endMousePosition", null);
    if (!fs.existsSync(clicksVicinityDir$1)) fs.mkdirSync(clicksVicinityDir$1);
    if (!fs.existsSync(screenshotFullDir$1)) fs.mkdirSync(screenshotFullDir$1);
  }
  async startLog() {
    if (this.isLogging) {
      console.log("Logger is already running.");
      return;
    }
    const displays = await screenshot.listDisplays();
    this.primaryDisplay = displays.find((d) => d.isPrimary) || displays[0];
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
  endLog() {
    var _a;
    if (!this.isLogging) {
      console.log("Logger is not running.");
      return;
    }
    this.endAndLogMouseMovement();
    (_a = this.keyboardListener) == null ? void 0 : _a.kill();
    mouseEvents.removeAllListeners();
    this.isLogging = false;
    console.log("Activity logger stopped.");
  }
  saveLog(filePath) {
    fs.writeFileSync(filePath, JSON.stringify(this.logs, null, 2));
    console.log(`Log saved to ${filePath}`);
  }
  log(action) {
    if (this.isLogging) {
      this.logs.push(action);
      this.emit("new-log", action);
    }
  }
  endAndLogMouseMovement() {
    if (this.mouseMoveTimeout) {
      clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = null;
      if (this.startMousePosition && this.endMousePosition && (this.startMousePosition.x !== this.endMousePosition.x || this.startMousePosition.y !== this.endMousePosition.y)) {
        this.log({
          action: "moveMouse",
          time: Date.now(),
          initial_pos: this.startMousePosition,
          final_pos: this.endMousePosition
        });
      }
      this.startMousePosition = null;
      this.endMousePosition = null;
    }
  }
  setupKeyboardListener() {
    var _a;
    let ctrlDown = false;
    let ctrlUsedInCombo = false;
    const comboKeys = /* @__PURE__ */ new Set();
    (_a = this.keyboardListener) == null ? void 0 : _a.addListener((e, down) => {
      if (!this.isLogging) return;
      this.endAndLogMouseMovement();
      if (e.state === "DOWN") {
        if (e.name === "LEFT CTRL" || e.name === "RIGHT CTRL") {
          if (!ctrlDown) {
            ctrlDown = true;
            ctrlUsedInCombo = false;
            comboKeys.clear();
          }
        } else if (ctrlDown && e.name && !comboKeys.has(e.name)) {
          this.log({
            action: "Combo Key",
            combo: `Ctrl + ${e.name}`,
            time: Date.now()
          });
          ctrlUsedInCombo = true;
          comboKeys.add(e.name);
        }
      } else if (e.state === "UP") {
        if (e.name === "LEFT CTRL" || e.name === "RIGHT CTRL") {
          if (ctrlDown && !ctrlUsedInCombo) {
            this.log({ action: "keyPress", key: "Ctrl", time: Date.now() });
          }
          ctrlDown = false;
          ctrlUsedInCombo = false;
          comboKeys.clear();
        } else if (!ctrlDown && e.name && e.name !== "MOUSE LEFT" && e.name !== "MOUSE RIGHT") {
          this.log({ action: "keyPress", key: e.name, time: Date.now() });
        }
      }
    });
  }
  setupMouseListeners() {
    mouseEvents.on("mousemove", (event) => {
      if (!this.isLogging) return;
      if (!this.isTakingScreenshot) {
        this.isTakingScreenshot = true;
        screenshot({ format: "png", screen: this.primaryDisplay.id }).then((buffer) => {
          this.lastScreenshotBuffer = buffer;
          setTimeout(() => {
            this.isTakingScreenshot = false;
          }, 100);
        }).catch((err) => {
          console.error("Failed to capture continuous screenshot:", err);
          this.isTakingScreenshot = false;
        });
      }
      const normalizedX = Math.max(0, event.x) / this.screenWidth;
      const normalizedY = Math.max(0, event.y) / this.screenHeight;
      if (!this.startMousePosition) this.startMousePosition = { x: normalizedX, y: normalizedY };
      this.endMousePosition = { x: normalizedX, y: normalizedY };
      if (this.mouseMoveTimeout) clearTimeout(this.mouseMoveTimeout);
      this.mouseMoveTimeout = setTimeout(() => this.endAndLogMouseMovement(), 1e3);
    });
    mouseEvents.on("mousedown", async (event) => {
      if (!this.isLogging) return;
      this.endAndLogMouseMovement();
      const clickX = event.x;
      const clickY = event.y;
      if (event.button === 1 || event.button === 2) {
        const clickType = event.button === 1 ? "leftClick" : "rightClick";
        const timestamp = Date.now();
        this.log({
          action: clickType,
          pos: {
            x: Math.max(0, clickX) / this.screenWidth,
            y: Math.max(0, clickY) / this.screenHeight
          },
          time: timestamp
        });
        const vicinityPath = path.join(clicksVicinityDir$1, `vicinity-${timestamp}.png`);
        const fullScreenshotPath = path.join(screenshotFullDir$1, `full-${timestamp}.png`);
        try {
          const imgBuffer = this.lastScreenshotBuffer ?? await screenshot({ format: "png", screen: this.primaryDisplay.id });
          let left = Math.max(0, clickX - 200);
          let top = Math.max(0, clickY - 100);
          let right = Math.min(clickX + 200, this.screenWidth);
          let bottom = Math.min(clickY + 100, this.screenHeight);
          if (this.screenWidth < clickX + 200) {
            left = this.screenWidth - 2 * (this.screenWidth - clickX);
          } else if (clickX - 200 < 0) {
            right = 2 * clickX;
          }
          if (this.screenHeight < clickY + 100) {
            top = this.screenHeight - 2 * (this.screenHeight - clickY);
          } else if (clickY - 100 < 0) {
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
createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
process.env.APP_ROOT = join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const clicksVicinityDir = join(process.cwd(), "clicks_vicinity");
const screenshotFullDir = join(process.cwd(), "screenshot_full");
async function clearDirectory(directoryPath) {
  try {
    const files = await promises.readdir(directoryPath);
    for (const file of files) {
      await promises.unlink(join(directoryPath, file));
    }
    console.log(`Cleared directory: ${directoryPath}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error clearing directory ${directoryPath}:`, error);
    }
  }
}
let win;
let pyShell;
let isRunning = false;
let mainMenu;
let plusMenu;
let selectedProgram = "powerpoint.py";
const activityLogger = new ActivityLogger();
activityLogger.on("new-log", (log) => {
  plusMenu == null ? void 0 : plusMenu.webContents.send("new-log", log);
});
ipcMain.on("close-main-menu", () => {
  mainMenu == null ? void 0 : mainMenu.close();
});
ipcMain.on("select-program", (event, file) => {
  selectedProgram = file;
  win == null ? void 0 : win.webContents.send("program-selected", file);
  mainMenu == null ? void 0 : mainMenu.close();
});
ipcMain.on("open-plus-window", () => {
  togglePlusWindow();
  mainMenu == null ? void 0 : mainMenu.close();
});
function togglePlusWindow() {
  if (plusMenu) {
    plusMenu.close();
    return;
  }
  createPlusWindow();
}
function createPlusWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  plusMenu = new BrowserWindow({
    width: Math.round(width * 0.2),
    height: Math.round(height * 0.7),
    x: 0,
    y: Math.round(height * 0.15),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    type: "toolbar",
    webPreferences: {
      preload: join(__dirname, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    plusMenu.loadURL(`${VITE_DEV_SERVER_URL}plus.html`);
  } else {
    plusMenu.loadFile(join(RENDERER_DIST, "plus.html"));
  }
  plusMenu.on("blur", () => {
    plusMenu == null ? void 0 : plusMenu.setAlwaysOnTop(true, "screen-saver");
  });
  plusMenu.on("closed", () => {
    plusMenu = null;
  });
}
ipcMain.on("start-logging", () => {
  activityLogger.startLog();
});
ipcMain.on("stop-logging", () => {
  activityLogger.endLog();
  activityLogger.saveLog("activity-log.json");
});
function createMainMenu() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  mainMenu = new BrowserWindow({
    width: Math.round(width * 0.5),
    height: Math.round(height * 0.4),
    frame: false,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, "preload.mjs")
    }
  });
  if (VITE_DEV_SERVER_URL) {
    mainMenu.loadURL(`${VITE_DEV_SERVER_URL}main-menu.html`);
  } else {
    mainMenu.loadFile(join(RENDERER_DIST, "main-menu.html"));
  }
  mainMenu.webContents.on("did-finish-load", () => {
    if (!process.env.APP_ROOT) {
      console.error("APP_ROOT is not defined");
      return;
    }
    const scriptPath = join(process.env.APP_ROOT, "scripts");
    fs$1.readdir(scriptPath, (err, files) => {
      if (err) {
        console.error("Failed to read scripts directory:", err);
        return;
      }
      const pythonFiles = files.filter((file) => file.endsWith(".py"));
      mainMenu == null ? void 0 : mainMenu.webContents.send("python-files", pythonFiles);
    });
  });
  mainMenu.on("closed", () => {
    mainMenu = null;
  });
}
function toggleMainMenu() {
  if (mainMenu) {
    mainMenu.close();
  } else {
    createMainMenu();
  }
}
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  win = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    type: "toolbar",
    webPreferences: {
      preload: join(__dirname, "preload.mjs")
    }
  });
  win.setBounds({ x: 0, y: 0, width, height });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(join(RENDERER_DIST, "index.html"));
  }
  win.setIgnoreMouseEvents(true, { forward: true });
  win.on("blur", () => {
    win == null ? void 0 : win.setAlwaysOnTop(true, "screen-saver");
    win == null ? void 0 : win.focus();
  });
}
ipcMain.on("run-automation", () => {
  if (!process.env.APP_ROOT) {
    console.error("APP_ROOT environment variable is not set.");
    return;
  }
  isRunning = true;
  win == null ? void 0 : win.webContents.send("automation-state-changed", isRunning);
  const scriptPath = join(process.env.APP_ROOT, "scripts", selectedProgram);
  pyShell = new PythonShell_1(scriptPath);
  setTimeout(() => {
    win == null ? void 0 : win.setAlwaysOnTop(true, "screen-saver");
  }, 1e3);
  pyShell.on("message", (message) => {
    win == null ? void 0 : win.webContents.send("automation-caption", message);
  });
  pyShell.end((err) => {
    if (err) {
      console.error(err);
      win == null ? void 0 : win.webContents.send("automation-caption", "An error occurred.");
    } else {
      win == null ? void 0 : win.webContents.send("automation-caption", "Automation finished.");
    }
    pyShell = null;
    isRunning = false;
    win == null ? void 0 : win.webContents.send("automation-state-changed", isRunning);
  });
});
ipcMain.on("stop-automation", () => {
  if (pyShell) {
    pyShell.kill();
    pyShell = null;
    isRunning = false;
    win == null ? void 0 : win.webContents.send("automation-state-changed", isRunning);
    win == null ? void 0 : win.webContents.send("automation-caption", "Automation stopped.");
  }
});
function toggleAutomation() {
  if (isRunning) {
    ipcMain.emit("stop-automation");
  } else {
    ipcMain.emit("run-automation");
  }
}
app.on("will-quit", async () => {
  await Promise.all([
    clearDirectory(clicksVicinityDir),
    clearDirectory(screenshotFullDir)
  ]);
  globalShortcut.unregisterAll();
});
["SIGINT", "SIGTERM"].forEach((signal) => {
  process.on(signal, async () => {
    await Promise.all([
      clearDirectory(clicksVicinityDir),
      clearDirectory(screenshotFullDir)
    ]);
    app.quit();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  createWindow();
  globalShortcut.register("CommandOrControl+Space", toggleAutomation);
  globalShortcut.register("CommandOrControl+M", toggleMainMenu);
  globalShortcut.register("CommandOrControl+=", togglePlusWindow);
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
