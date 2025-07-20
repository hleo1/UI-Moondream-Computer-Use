import { useState, useEffect } from 'react'
import './App.css'
import { FaPlay, FaStop, FaBars, FaPlus } from 'react-icons/fa'

function App() {
  const [selectedProgram, setSelectedProgram] = useState('powerpoint.py')
  const [caption, setCaption] = useState(`'Ctrl + Space' to start "${selectedProgram}" program`)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    window.electron.receive('program-selected', (file: string) => {
      setSelectedProgram(file)
      setCaption(`'Ctrl + Space' to start "${file}" program`)
    })
  }, [])

  const handlePlusClick = () => {
    window.electron.send('open-plus-window');
  };

  useEffect(() => {
    const handleCaption = (event: any, message: string) => {
      setCaption(message)
    }

    window.automation.onCaption(handleCaption)

    return () => {
      window.automation.removeCaptionListener(handleCaption)
    }
  }, [])

  useEffect(() => {
    window.automation.onAutomationStateChanged((event, newIsRunning) => {
      setIsRunning(newIsRunning)
    })
  }, [])

  return (
    <div className="App">
      <div className="caption-area">
        <p>{caption}</p>
      </div>
      <div className="controls">
        <button>
          {isRunning ? <FaStop /> : <FaPlay />}
        </button>
        <button>
          <FaBars />
        </button>
        <button onClick={handlePlusClick}>
          <FaPlus />
        </button>
      </div>
    </div>
  )
}

export default App
