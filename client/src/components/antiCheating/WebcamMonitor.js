import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useAntiCheating } from '../../contexts/AntiCheatingContext';

const WebcamMonitor = ({ isActive = false }) => {
  const { settings, addViolation } = useAntiCheating();
  const webcamRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isActive && settings.webcamMonitoring?.enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isActive, settings.webcamMonitoring?.enabled]);

  const startMonitoring = async () => {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      setIsStreaming(true);
      setError(null);

      // Start taking snapshots at specified frequency
      const frequency = settings.webcamMonitoring?.frequency || 30; // seconds
      intervalRef.current = setInterval(() => {
        takeSnapshot();
      }, frequency * 1000);

      // Clean up stream when component unmounts
      return () => {
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Camera access denied or not available');
      addViolation({
        type: 'camera-access-denied',
        timestamp: Date.now(),
        details: 'User denied camera access or camera not available',
        severity: 'high'
      });
    }
  };

  const stopMonitoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsStreaming(false);
  };

  const takeSnapshot = () => {
    if (webcamRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = webcamRef.current.video;
      
      if (video) {
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const snapshot = {
              id: Date.now(),
              timestamp: new Date().toISOString(),
              blob: blob,
              size: blob.size,
              type: blob.type
            };

            // Store snapshot
            setSnapshots(prev => [...prev.slice(-9), snapshot]); // Keep last 10 snapshots

            // Analyze snapshot for suspicious activity
            analyzeSnapshot(snapshot);

            // Send to server
            sendSnapshotToServer(snapshot);
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  const analyzeSnapshot = (snapshot) => {
    // Basic analysis - in production, use more sophisticated image analysis
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Check for sudden changes in brightness (possible phone screen)
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // Check for unusual patterns
    if (avgBrightness > 200) {
      addViolation({
        type: 'suspicious-brightness',
        timestamp: Date.now(),
        details: 'Unusually bright area detected in webcam feed',
        severity: 'medium'
      });
    }

    // Check for face detection (simplified)
    const faceDetected = detectFace(imageData);
    if (!faceDetected && snapshots.length > 2) {
      addViolation({
        type: 'face-not-detected',
        timestamp: Date.now(),
        details: 'Face not detected in webcam feed',
        severity: 'high'
      });
    }
  };

  const detectFace = (imageData) => {
    // Simplified face detection - in production, use proper face detection library
    // This is a placeholder implementation
    const data = imageData.data;
    let skinPixels = 0;
    let totalPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Simple skin tone detection
      if (r > 95 && g > 40 && b > 20 && 
          Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
          Math.abs(r - g) > 15 && r > g && r > b) {
        skinPixels++;
      }
      totalPixels++;
    }

    const skinRatio = skinPixels / totalPixels;
    return skinRatio > 0.1; // If more than 10% of pixels are skin-colored
  };

  const sendSnapshotToServer = async (snapshot) => {
    try {
      const formData = new FormData();
      formData.append('snapshot', snapshot.blob);
      formData.append('timestamp', snapshot.timestamp);
      formData.append('examId', 'current-exam-id'); // This should come from props
      formData.append('userId', 'current-user-id'); // This should come from props

      await fetch('/api/anti-cheating/webcam-snapshot', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
    } catch (error) {
      console.error('Error sending snapshot to server:', error);
    }
  };

  const videoConstraints = {
    width: 640,
    height: 480,
    facingMode: 'user'
  };

  if (!isActive || !settings.webcamMonitoring?.enabled) {
    return null;
  }

  return (
    <div className="webcam-monitor">
      <div className="webcam-container">
        <Webcam
          ref={webcamRef}
          audio={false}
          width={320}
          height={240}
          videoConstraints={videoConstraints}
          onUserMedia={() => setIsStreaming(true)}
          onUserMediaError={(error) => {
            console.error('Webcam error:', error);
            setError('Camera error: ' + error.message);
            addViolation({
              type: 'camera-error',
              timestamp: Date.now(),
              details: 'Camera error: ' + error.message,
              severity: 'medium'
            });
          }}
        />
        
        {/* Hidden canvas for image processing */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        
        <div className="webcam-status">
          {isStreaming ? (
            <div className="status-indicator streaming">
              <div className="status-dot"></div>
              <span>Recording</span>
            </div>
          ) : (
            <div className="status-indicator error">
              <div className="status-dot"></div>
              <span>Camera Off</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="webcam-error">
          <p>⚠️ {error}</p>
        </div>
      )}

      <style jsx>{`
        .webcam-monitor {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1000;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 8px;
          padding: 10px;
          color: white;
        }

        .webcam-container {
          position: relative;
          border-radius: 4px;
          overflow: hidden;
        }

        .webcam-status {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .streaming .status-dot {
          background-color: #4ade80;
        }

        .error .status-dot {
          background-color: #ef4444;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        .webcam-error {
          margin-top: 10px;
          padding: 8px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          border-radius: 4px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};

export default WebcamMonitor;
