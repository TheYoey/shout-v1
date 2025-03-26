import React, { useRef, useState } from "react";
import api from "./utils/api";
import Button from "./components/Button";
import { Card } from "./components/Card";
import { Upload, Loader2, Mic } from "lucide-react";
import "./styles/App.css";

function App() {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const pollTranscription = async (transcriptId) => {
    try {
      const response = await api.get(`/transcript/${transcriptId}`);
      if (response.data.status === "completed") {
        setTranscript(response.data.text);
        setStatus(null);
        setProgress(100);
        setIsUploading(false);
      } else if (response.data.status === "error") {
        setError(response.data.error || "Transcription failed. Please try again.");
        setStatus(null);
        setProgress(0);
        setIsUploading(false);
      } else {
        setStatus(`Transcribing... ${response.data.progress}%`);
        setProgress(response.data.progress);
        setTimeout(() => pollTranscription(transcriptId), 2000);
      }
    } catch (error) {
      setError(error.response?.data?.details || "Failed to check transcription status. Please try again.");
      setStatus(null);
      setProgress(0);
      setIsUploading(false);
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsUploading(true);
      setError(null);
      setTranscript(null);
      setProgress(0);
      setStatus("Uploading...");

      const formData = new FormData();
      formData.append('audio', file);
      
      try {
        const response = await api.post('/process', formData);
        if (response.data.transcript_id) {
          pollTranscription(response.data.transcript_id);
        }
      } catch (error) {
        setError(error.response?.data?.details || 'Upload failed. Please try again.');
        setStatus(null);
        setProgress(0);
        setIsUploading(false);
        console.error('Upload failed:', error);
      }
    }
  };

  return (
    <div className="app flex justify-center items-center min-h-screen bg-gray-100">
      <main className="main-content">
        <Card title="Audio Upload" description="Upload your audio file for processing.">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />
          <Button onClick={handleUploadClick} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 size={20} className="mr-2 animate-spin" />
                {status || "Processing..."}
              </>
            ) : (
              <>
                <Upload size={20} className="mr-2" />
                Upload Audio
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {status && (
            <div className="mt-4">
              <div className="p-4 bg-blue-50 text-blue-700 rounded-md flex items-center">
                <Mic size={20} className="mr-2" />
                {status}
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {transcript && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Transcription Result:</h3>
              <div className="p-4 bg-white rounded-md shadow-sm border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{transcript}</p>
              </div>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}

export default App;
