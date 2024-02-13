import React, { useState, useEffect, useRef } from "react";
import { UploadManager } from "./UploadManager";

interface RecordingProps {
  onDownloadRecording: () => void;
  onStartRecording: () => void;
}

const contactUsUrl = "https://www.smartscribe.health/request-a-demo";

const RecordingComponent: React.FC<RecordingProps> = ({
  onDownloadRecording, onStartRecording
}) => {
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingName, setRecordingName] = useState<string>("");
  const [progressTime, setProgressTime] = useState<number>(0);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string>("");
  //Upload state variables
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadResponse, setUploadResponse] = useState<any>(null);

  const progressInterval = useRef<number | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const handleStartRecording = () => {
    // Check if the recordingName is empty
    if (!recordingName.trim()) {
      return; // Prevent the recording from starting
    }
  
    if (!mediaRecorder.current) return;
    onStartRecording();
  
    setAudioChunks([]);
    setAudioUrl("");
    mediaRecorder.current.start();
    setIsRecording(true);
  
    progressInterval.current = setInterval(() => {
      setProgressTime((prevTime) => prevTime + 1);
    }, 1000);
  };

  const handleStopRecording = () => {
    if (!mediaRecorder.current || !progressInterval.current) return;

    mediaRecorder.current.stop();
    setIsRecording(false);
    if (progressInterval.current !== null) {
      clearInterval(progressInterval.current); //added to stop timer from ticking upwards after "stopping"
    }
    progressInterval.current = null;
    setProgressTime(0);
  };

  const handleUpload = () => {
    if (!audioUrl) return; // Ensure there's something to upload
  
    const audioBlob = new Blob(audioChunks, { type: "audio/webm;codecs=opus" });
    setIsUploading(true);
    setUploadSuccess(null);
    setUploadError('');
  
    UploadManager.upload(audioBlob)
      .then((response) => {
        setUploadSuccess(true);
        setUploadResponse(response);
        console.log(`Upload successful. Transcript: ${response.transcript}, Size: ${response.size} bytes`);
      })
      .catch((error) => {
        setUploadSuccess(false);
        setUploadError("Upload failed: " + error.message);
        console.error("Upload failed:", error.message);
      })
      .finally(() => {
        setIsUploading(false);
      });
  };

  useEffect(() => {
    const initMediaRecorder = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error(
          "Media Devices or getUserMedia not supported in this browser."
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1); //Grabbing audio levels

        setMicPermissionGranted(true); //so we can display the recording button appropriately
    
        microphone.connect(analyser);
        analyser.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        scriptProcessor.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
        
          let sum = 0;
        
          const length = array.length;
          for (let i = 0; i < length; i++) {
            sum += array[i];
          }
          // Calculate the average volume level
          const averageVolume = sum / length;
      
          const scaledVolume = Math.log(1 + averageVolume) * (100 / Math.log(256)); //chatGPT-grabbed scaling calculation so that volume levels are scaled to be more visually pleasing than any invidual bin max/min or average (averages show really low volume)
        
          setVolumeLevel(scaledVolume); 
        };
        mediaRecorder.current = new MediaRecorder(stream);
        mediaRecorder.current.ondataavailable = (event) => {
          setAudioChunks((currentChunks) => [...currentChunks, event.data]);
        };
      } catch (err) {
        console.error("Failed to get user media", err);
        setMicPermissionGranted(false); //so mic button doesn't show
      }
    };

    initMediaRecorder();
  }, []);

  useEffect(() => {
    if (audioChunks.length > 0 && !isRecording) {
      const audioBlob = new Blob(audioChunks, {
        type: "audio/webm;codecs=opus",
      });
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    }
  }, [audioChunks, isRecording]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-around",
        height: "70vh",
        padding: "20px",
        boxSizing: "border-box",
        border: "2px solid",
        borderRadius: "10px", 
      }}
    >
      <input
        type="text"
        value={recordingName}
        onChange={(e) => setRecordingName(e.target.value)}
        placeholder="Name your recording"
        style={{
          width: "80%",
          padding: "10px",
          marginBottom: "20px",
          borderRadius: "5px",
          border: "1px solid #ccc",
        }}
      />
       {!recordingName.trim() && (
        <div style={{
          color: '#dc3545', 
          marginBottom: '10px',
        }}>
          Please enter a name for your recording.
        </div>
        )}
            {micPermissionGranted ? (
        <button
         onClick={isRecording ? handleStopRecording : handleStartRecording}
        >
         {isRecording ? "Stop Recording" : "Start Recording"}
       </button>
      ) : (
        <div style={{
          padding: '10px',
          margin: '10px 0',
          borderRadius: '0px',
          backgroundColor: '#f8d7da', 
          color: '#721c24', 
          textAlign: 'center',
          border: '1px solid #f5c6cb', 
        }}>
          <strong>Mic permissions are required to start recording.</strong>
        </div>
      )}
      <div style={{
        marginBottom: "20px",
        padding: "10px",
        backgroundColor: "#f0f0f0", 
        borderRadius: "5px", 
        border: "1px solid #d0d0d0",
        textAlign: "center",
        maxWidth: "200px",
        margin: "20px auto",
        }}>
        <div style={{ fontWeight: "bold", fontSize: "14px", color: "#333" }}>
          Progress Time
        </div>
        <div style={{ fontSize: "16px", color: "#000" }}>
          {progressTime} seconds
        </div>
      </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '20px', 
        }}>
        <div style={{ 
          marginBottom: '5px', 
          fontWeight: "bold", 
          fontSize: "14px",
          textAlign: "center"
        }}>
          Input Volume
        </div>
        <div style={{
          width: '30px', 
          height: '100px', 
          backgroundColor: "#000000",
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column-reverse',
          alignItems: 'center',
          padding: '5px',
        }}>
        <div style={{
          width: '30px', 
          height: `${Math.min(volumeLevel, 100)}%`, // Height based on the volume level
          backgroundColor: '#007bff',
          borderRadius: '5px',
        }} />
        </div>
      </div>
      {audioUrl && (
        <div>
          <button
            onClick={() => {
              const link = document.createElement("a");
              link.href = audioUrl;
              link.download = recordingName.trim() || "name_error"; // grabs recordingName or defaults to name_error
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              onDownloadRecording();
            }}
            style={{
              width: "80%",
              padding: "10px",
              marginBottom: "20px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: "#28a745",
              color: "white",
              cursor: "pointer",
            }}
          >
            Download Recording
          </button>
        </div>
      )}
      {audioUrl && (
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleUpload}
          disabled={isUploading}
          style={{
            minWidth: "120px", 
            padding: "10px",
            marginBottom: "10px",
            borderRadius: "5px",
            border: "none",
            backgroundColor: "#007bff",
            color: "white",
            cursor: "pointer",
            whiteSpace: "nowrap", 
          }}
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        {isUploading && (
          <div>Uploading audio...</div>
        )}
        {!isUploading && uploadSuccess && (
          <div style={{ color: '#28a745' }}>
            Upload successful! Size: {uploadResponse.size} bytes
            <div style={{ color: 'white' }}>
              Transcript: {uploadResponse.transcript}
            </div>
          </div>
        )}
        {!isUploading && uploadSuccess === false && (
          <div style={{ color: '#dc3545' }}>
            {uploadError}
          </div>
        )}
      </div>
      )}
      <div style={{ marginTop: "20px", textAlign: "center" }}>
      <p>For problems and feedback,</p>
      <a
        href={contactUsUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#007bff", textDecoration: "none" }}
      >
        Contact us
      </a>
    </div>
    </div>
    
  );
  
};

export default RecordingComponent;