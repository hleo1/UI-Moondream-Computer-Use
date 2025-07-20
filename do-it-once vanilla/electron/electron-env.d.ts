/// <reference types="vite/client" />

interface IpcRenderer {
  send(channel: string, ...args: any[]): void;
  on(channel: string, listener: (event: any, ...args: any[]) => void): this;
  removeListener(channel: string, listener: (...args: any[]) => void): this;
  startLogging: () => void;
  stopLogging: () => void;
  onNewLog: (callback: (log: any) => void) => () => void;
}

declare global {
  interface Window {
    ipcRenderer: IpcRenderer;
    automation: {
      run: () => void;
      stop: () => void;
      onCaption: (callback: (event: any, message: string) => void) => void;
      removeCaptionListener: (callback: (event: any, message:string) => void) => void;
      onAutomationStateChanged: (callback: (event: any, isRunning: boolean) => void) => void;
    };
    electron: {
      send: (channel: string, data?: any) => void;
      receive: (channel: string, func: (...args: any[]) => void) => void;
    };
  }
}

export {};
