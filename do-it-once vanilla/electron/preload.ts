import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...data] = args
    return ipcRenderer.invoke(channel, ...data)
  },
  startLogging: () => ipcRenderer.send('start-logging'),
  stopLogging: () => ipcRenderer.send('stop-logging'),
  onNewLog: (callback: (log: any) => void) => {
    const subscription = (_event: any, value: any) => callback(value);
    ipcRenderer.on('new-log', subscription);
    return () => {
      ipcRenderer.off('new-log', subscription);
    };
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('automation', {
  run: () => ipcRenderer.send('run-automation'),
  stop: () => ipcRenderer.send('stop-automation'),
  onCaption: (callback: (event: any, message: string) => void) => {
    ipcRenderer.on('automation-caption', callback)
  },
  removeCaptionListener: (callback: (event: any, message: string) => void) => {
    ipcRenderer.removeListener('automation-caption', callback)
  },
  onAutomationStateChanged: (callback: (event: any, isRunning: boolean) => void) => {
    ipcRenderer.on('automation-state-changed', callback)
  },
  setInteractive: () => ipcRenderer.send('set-interactive'),
  setIgnoreMouseEvents: () => ipcRenderer.send('set-ignore-mouse-events'),
})

contextBridge.exposeInMainWorld('electron', {
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, func: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
