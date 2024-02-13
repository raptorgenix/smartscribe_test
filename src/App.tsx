import "./App.css";
import React, { useState } from "react";
import RecordingComponent from "./Recorder";

function App() {
  const [isDownloaded, setIsDownloaded] = useState(false);

  const handleDownloadRecording = () => {
    setIsDownloaded(true);
  };

  // Function to reset the download status
  const resetDownloadStatus = () => {
    setIsDownloaded(false);
  };

  return (
    <>
      <div style={{
        padding: '10px',
        margin: '10px 0',
        borderRadius: '5px',
        backgroundColor: isDownloaded ? '#d4edda' : '#f8d7da',
        color: isDownloaded ? '#155724' : '#721c24',
        border: `1px solid ${isDownloaded ? '#c3e6cb' : '#f5c6cb'}`,
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '10px',
      }}>
        {isDownloaded ? (
          <>
            <span>✔</span> 
            <span>Recording has been downloaded.</span>
          </>
        ) : (
          <span>Recording has not been downloaded yet.</span>
        )}
      </div>
      <RecordingComponent onDownloadRecording={handleDownloadRecording} onStartRecording={resetDownloadStatus} />
    </>
  );
}

export default App;