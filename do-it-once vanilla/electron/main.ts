import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import { PythonShell } from 'python-shell'
import ActivityLogger from './activity-logger';

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const clicksVicinityDir = join(process.cwd(), 'clicks_vicinity');
const screenshotFullDir = join(process.cwd(), 'screenshot_full');

async function clearDirectory(directoryPath: string) {
  try {
    const files = await fsPromises.readdir(directoryPath);
    for (const file of files) {
      await fsPromises.unlink(join(directoryPath, file));
    }
    console.log(`Cleared directory: ${directoryPath}`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') { // Ignore error if directory doesn't exist
      console.error(`Error clearing directory ${directoryPath}:`, error);
    }
  }
}

let win: BrowserWindow | null
let pyShell: PythonShell | null
let isRunning = false
let mainMenu: BrowserWindow | null
let plusMenu: BrowserWindow | null
let selectedProgram = 'powerpoint.py' // Default program
const activityLogger = new ActivityLogger();

activityLogger.on('new-log', (log) => {
  plusMenu?.webContents.send('new-log', log);
});

ipcMain.on('close-main-menu', () => {
  mainMenu?.close()
})

ipcMain.on('select-program', (event, file) => {
  selectedProgram = file
  win?.webContents.send('program-selected', file)
  mainMenu?.close()
})

ipcMain.on('open-plus-window', () => {
  togglePlusWindow()
  mainMenu?.close()
})

function togglePlusWindow() {
  if (plusMenu) {
    plusMenu.close()
    return
  }
  createPlusWindow()
}

function createPlusWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  plusMenu = new BrowserWindow({
    width: Math.round(width * 0.2),
    height: Math.round(height * 0.7),
    x: 0,
    y: Math.round(height * 0.15),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    type: 'toolbar',
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    plusMenu.loadURL(`${VITE_DEV_SERVER_URL}plus.html`)
  } else {
    plusMenu.loadFile(join(RENDERER_DIST, 'plus.html'))
  }

  // plusMenu.webContents.openDevTools()

  // plusMenu.setIgnoreMouseEvents(true, { forward: true })

  plusMenu.on('blur', () => {
    plusMenu?.setAlwaysOnTop(true, 'screen-saver')
  })

  plusMenu.on('closed', () => {
    plusMenu = null
  })
}

ipcMain.on('start-logging', () => {
  activityLogger.startLog();
});

ipcMain.on('stop-logging', () => {
  activityLogger.endLog();
  activityLogger.saveLog('activity-log.json');
});

function createMainMenu() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  mainMenu = new BrowserWindow({
    width: Math.round(width * 0.5),
    height: Math.round(height * 0.4),
    frame: false,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    mainMenu.loadURL(`${VITE_DEV_SERVER_URL}main-menu.html`)
  } else {
    mainMenu.loadFile(join(RENDERER_DIST, 'main-menu.html'))
  }

  mainMenu.webContents.on('did-finish-load', () => {
    if (!process.env.APP_ROOT) {
      console.error('APP_ROOT is not defined');
      return;
    }
    const scriptPath = join(process.env.APP_ROOT, 'scripts')
    fs.readdir(scriptPath, (err, files) => {
      if (err) {
        console.error('Failed to read scripts directory:', err)
        return
      }
      const pythonFiles = files.filter(file => file.endsWith('.py'))
      mainMenu?.webContents.send('python-files', pythonFiles)
    })
  })

  mainMenu.on('closed', () => {
    mainMenu = null
  })
}

function toggleMainMenu() {
  if (mainMenu) {
    mainMenu.close()
  } else {
    createMainMenu()
  }
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  win = new BrowserWindow({
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    type: 'toolbar',
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
    },
  })

  win.setBounds({ x: 0, y: 0, width, height })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(join(RENDERER_DIST, 'index.html'))
  }

  win.setIgnoreMouseEvents(true, { forward: true })

  win.on('blur', () => {
    win?.setAlwaysOnTop(true, 'screen-saver')
    win?.focus()
  })
}

ipcMain.on('run-automation', () => {
  if (!process.env.APP_ROOT) {
    console.error('APP_ROOT environment variable is not set.');
    return;
  }
  isRunning = true
  win?.webContents.send('automation-state-changed', isRunning)
  const scriptPath = join(process.env.APP_ROOT, 'scripts', selectedProgram);
  pyShell = new PythonShell(scriptPath);

  setTimeout(() => {
    win?.setAlwaysOnTop(true, 'screen-saver');
  }, 1000);

  pyShell.on('message', (message) => {
    win?.webContents.send('automation-caption', message);
  });

  pyShell.end((err) => {
    if (err) {
      console.error(err);
      win?.webContents.send('automation-caption', 'An error occurred.');
    } else {
      win?.webContents.send('automation-caption', 'Automation finished.');
    }
    pyShell = null;
    isRunning = false;
    win?.webContents.send('automation-state-changed', isRunning)
  });
});

ipcMain.on('stop-automation', () => {
  if (pyShell) {
    pyShell.kill();
    pyShell = null;
    isRunning = false;
    win?.webContents.send('automation-state-changed', isRunning)
    win?.webContents.send('automation-caption', 'Automation stopped.');
  }
});

function toggleAutomation() {
  if (isRunning) {
    ipcMain.emit('stop-automation');
  } else {
    ipcMain.emit('run-automation');
  }
}

app.on('will-quit', async () => {
  await Promise.all([
    clearDirectory(clicksVicinityDir),
    clearDirectory(screenshotFullDir)
  ]);
  globalShortcut.unregisterAll()
});

['SIGINT', 'SIGTERM'].forEach((signal) => {
  process.on(signal, async () => {
    await Promise.all([
      clearDirectory(clicksVicinityDir),
      clearDirectory(screenshotFullDir)
    ]);
    app.quit();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q. 
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  globalShortcut.register('CommandOrControl+Space', toggleAutomation)
  globalShortcut.register('CommandOrControl+M', toggleMainMenu)
  globalShortcut.register('CommandOrControl+=', togglePlusWindow)
})
