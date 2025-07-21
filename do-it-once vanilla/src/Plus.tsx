import React, { useState, useEffect } from 'react';
import './transparent-body.css';
import './plus.css';
import LogEntry from './LogEntry';
import { Action } from '../electron/types';

function Plus() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<Action[]>([]);
  const [postProcessingState, setPostProcessingState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [pythonCode, setPythonCode] = useState('');

  useEffect(() => {
    const cleanup = window.ipcRenderer.onNewLog((log) => {
      setLogs((prevLogs) => [...prevLogs, log]);
    });

    return cleanup;
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      window.ipcRenderer.stopLogging();
      postProcessing();
    } else {
      setLogs([]); // Clear logs on new recording
      setPostProcessingState('idle');
      setPythonCode('');
      window.ipcRenderer.startLogging();
    }
    setIsRecording(!isRecording);
  };

  const postProcessing = async () => {

    
    setPostProcessingState('loading');

    try {
      console.log("1")
      const response = await fetch('https://646c40cd318a.ngrok-free.app/process', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ data: {} })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("2")

      const result = await response.json();
      console.log('Response:', result);
      setPostProcessingState('done');
      return result;
    } catch (error) {
      console.error('Error:', error);
      setPostProcessingState('done');
      throw error;
    }
    // fetch('https://646c40cd318a.ngrok-free.app/process', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ data: {} })
    // })
    //   .then(res => res.json())
    //   .then(data => {
    //     setPythonCode(data?.result?.code || '');
    //     setPostProcessingState('done');
    //   })
    //   .catch((err) => {
    //     console.error('Error fetching code:', err);
    //     setPythonCode(`# Error fetching code\n${err?.message || err}`);
    //     setPostProcessingState('done');
    //   });
    // setTimeout(() => {
    //   const fetchedCode = 'print("hello world")';
    //   setPythonCode(fetchedCode);
    //   setPostProcessingState('done');
    // }, 2000);
  };

  const renderContent = () => {
    switch (postProcessingState) {
      case 'loading':
        return <div className="loading-spinner"></div>;
      case 'done':
        return (
          <div className="code-display">
            <pre><code>{pythonCode}</code></pre>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="logs-container">
            {logs.map((log, index) => (
              <LogEntry key={index} log={log} />
            ))}
          </div>
        );
    }
  };

  return (
    <div className="plus-container">
      <h1>Skill Training</h1>
      <button
        onClick={toggleRecording}
        className="play-stop-button"
        disabled={postProcessingState === 'loading'}
      >
        {isRecording ? '■' : '▶'}
      </button>
      {renderContent()}
    </div>
  );
}

export default Plus; 