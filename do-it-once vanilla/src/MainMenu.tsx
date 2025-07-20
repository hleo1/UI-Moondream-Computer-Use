import React, { useState, useEffect } from 'react';
import './main-menu.css';
import { FaTimes } from 'react-icons/fa';

function MainMenu() {
  const [pythonFiles, setPythonFiles] = useState<string[]>([]);

  useEffect(() => {
    window.electron.receive('python-files', (files: string[]) => {
      setPythonFiles(files);
    });
  }, []);

  const handleSelectProgram = (file: string) => {
    window.electron.send('select-program', file);
  };

  const handleClose = () => {
    window.electron.send('close-main-menu');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Choose your program</h1>
        <button className="close-btn" onClick={handleClose}>
          <FaTimes />
        </button>
      </div>
      <div className="grid-container">
        {pythonFiles.map(file => (
          <div key={file} className="grid-item" onClick={() => handleSelectProgram(file)}>
            {file}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MainMenu; 