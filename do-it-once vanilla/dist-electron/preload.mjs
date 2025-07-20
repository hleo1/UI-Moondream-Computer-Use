"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...data] = args;
    return electron.ipcRenderer.invoke(channel, ...data);
  },
  startLogging: () => electron.ipcRenderer.send("start-logging"),
  stopLogging: () => electron.ipcRenderer.send("stop-logging"),
  onNewLog: (callback) => {
    const subscription = (_event, value) => callback(value);
    electron.ipcRenderer.on("new-log", subscription);
    return () => {
      electron.ipcRenderer.off("new-log", subscription);
    };
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("automation", {
  run: () => electron.ipcRenderer.send("run-automation"),
  stop: () => electron.ipcRenderer.send("stop-automation"),
  onCaption: (callback) => {
    electron.ipcRenderer.on("automation-caption", callback);
  },
  removeCaptionListener: (callback) => {
    electron.ipcRenderer.removeListener("automation-caption", callback);
  },
  onAutomationStateChanged: (callback) => {
    electron.ipcRenderer.on("automation-state-changed", callback);
  },
  setInteractive: () => electron.ipcRenderer.send("set-interactive"),
  setIgnoreMouseEvents: () => electron.ipcRenderer.send("set-ignore-mouse-events")
});
electron.contextBridge.exposeInMainWorld("electron", {
  send: (channel, data) => {
    electron.ipcRenderer.send(channel, data);
  },
  receive: (channel, func) => {
    electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
