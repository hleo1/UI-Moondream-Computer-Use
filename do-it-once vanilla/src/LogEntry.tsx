import React from 'react';
import { Action, ClickAction, KeyPressAction, ComboKeyPressAction, MoveMouseAction } from '../electron/types';
import './LogEntry.css';

interface LogEntryProps {
  log: Action;
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const renderActionDetails = (log: Action) => {
  switch (log.action) {
    case 'leftClick':
    case 'rightClick':
      const clickLog = log as ClickAction;
      return <p>Position: ({clickLog.pos.x.toFixed(2)}, {clickLog.pos.y.toFixed(2)})</p>;
    case 'keyPress':
      const keyLog = log as KeyPressAction;
      return <p>Key: {keyLog.key}</p>;
    case 'Combo Key':
      const comboLog = log as ComboKeyPressAction;
      return <p>Combination: {comboLog.combo}</p>;
    case 'moveMouse':
      const moveLog = log as MoveMouseAction;
      return (
        <>
          <p>From: ({moveLog.initial_pos.x.toFixed(2)}, {moveLog.initial_pos.y.toFixed(2)})</p>
          <p>To: ({moveLog.final_pos.x.toFixed(2)}, {moveLog.final_pos.y.toFixed(2)})</p>
        </>
      );
    default:
      return null;
  }
};

const LogEntry: React.FC<LogEntryProps> = ({ log }) => {
  return (
    <div className="log-entry-card">
      <div className="log-header">
        <strong>{log.action}</strong>
        <span>{formatTime(log.time)}</span>
      </div>
      <div className="log-body">
        {renderActionDetails(log)}
      </div>
    </div>
  );
};

export default LogEntry; 