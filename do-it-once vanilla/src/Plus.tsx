import React, { useState, useEffect } from 'react';
import './transparent-body.css';
import './plus.css';
import LogEntry from './LogEntry';
import { Action } from './types';

function Plus() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<Action[]>([]);

  useEffect(() => {
    const cleanup = window.ipcRenderer.onNewLog((log) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    });

    return cleanup;
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      window.ipcRenderer.stopLogging();
    } else {
      setLogs([]); // Clear logs on new recording
      window.ipcRenderer.startLogging();
    }
    setIsRecording(!isRecording);
  };

  return (
    <div className="plus-container">
      <h1>Activity Recorder</h1>
      <button
        onClick={toggleRecording}
        className="play-stop-button"
      >
        {isRecording ? '■' : '▶'}
      </button>
      <div className="logs-container">
        {logs.map((log, index) => (
          <LogEntry key={index} log={log} />
        ))}
      </div>
    </div>
  );
}

export default Plus; 