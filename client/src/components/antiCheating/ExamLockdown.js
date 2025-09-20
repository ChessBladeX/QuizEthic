import React, { useEffect, useState } from 'react';
import { useAntiCheating } from '../../contexts/AntiCheatingContext';
import UILockdown from './UILockdown';
import WebcamMonitor from './WebcamMonitor';
import { AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react';

const ExamLockdown = ({ children, examId, isActive = false }) => {
  const { 
    settings, 
    startMonitoring, 
    stopMonitoring, 
    addViolation,
    violations 
  } = useAntiCheating();
  
  const [isLocked, setIsLocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  useEffect(() => {
    if (isActive) {
      setIsLocked(true);
      startMonitoring(settings);
      
      // Show warning modal
      setShowWarning(true);
      const timer = setTimeout(() => {
        setShowWarning(false);
      }, 5000);

      return () => {
        clearTimeout(timer);
        stopMonitoring();
        setIsLocked(false);
      };
    }
  }, [isActive, settings, startMonitoring, stopMonitoring]);

  useEffect(() => {
    setViolationCount(violations.length);
  }, [violations]);

  const handleAcceptTerms = () => {
    setShowWarning(false);
  };

  const handleRejectTerms = () => {
    addViolation({
      type: 'terms-rejected',
      timestamp: Date.now(),
      details: 'User rejected exam terms and conditions',
      severity: 'high'
    });
    // Redirect or handle rejection
  };

  if (!isActive) {
    return children;
  }

  return (
    <div className="exam-lockdown">
      {/* Warning Modal */}
      {showWarning && (
        <div className="warning-modal-overlay">
          <div className="warning-modal">
            <div className="warning-header">
              <Shield className="warning-icon" />
              <h2>Exam Security Notice</h2>
            </div>
            <div className="warning-content">
              <p>This exam is monitored for security purposes. By continuing, you agree to:</p>
              <ul>
                <li>✓ Keep your camera on throughout the exam</li>
                <li>✓ Not use any external resources or devices</li>
                <li>✓ Not copy, paste, or take screenshots</li>
                <li>✓ Stay focused on the exam screen</li>
                <li>✓ Not open other applications or tabs</li>
              </ul>
              <div className="warning-footer">
                <button 
                  onClick={handleRejectTerms}
                  className="btn-reject"
                >
                  I Don't Agree
                </button>
                <button 
                  onClick={handleAcceptTerms}
                  className="btn-accept"
                >
                  I Agree - Start Exam
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Violation Warning */}
      {violationCount > 0 && (
        <div className="violation-warning">
          <AlertTriangle className="warning-icon" />
          <span>
            {violationCount} violation{violationCount > 1 ? 's' : ''} detected
          </span>
        </div>
      )}

      {/* UI Lockdown Wrapper */}
      <UILockdown isActive={isLocked}>
        {children}
      </UILockdown>

      {/* Webcam Monitor */}
      <WebcamMonitor isActive={isLocked} />

      {/* Fullscreen Overlay */}
      <div className="fullscreen-overlay">
        <div className="exam-header">
          <div className="exam-info">
            <h3>Exam in Progress</h3>
            <div className="security-indicators">
              <div className="indicator">
                <Shield className="icon" />
                <span>Secure Mode</span>
              </div>
              <div className="indicator">
                <Eye className="icon" />
                <span>Monitored</span>
              </div>
            </div>
          </div>
          <div className="violation-counter">
            Violations: {violationCount}
          </div>
        </div>
      </div>

      <style jsx>{`
        .exam-lockdown {
          position: relative;
          min-height: 100vh;
          background: #f8fafc;
        }

        .warning-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .warning-modal {
          background: white;
          border-radius: 12px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .warning-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
        }

        .warning-icon {
          color: #f59e0b;
          width: 24px;
          height: 24px;
        }

        .warning-content ul {
          list-style: none;
          padding: 0;
          margin: 20px 0;
        }

        .warning-content li {
          padding: 8px 0;
          color: #374151;
        }

        .warning-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }

        .btn-reject, .btn-accept {
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-reject {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-reject:hover {
          background: #e5e7eb;
        }

        .btn-accept {
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
        }

        .btn-accept:hover {
          background: #2563eb;
        }

        .violation-warning {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px 20px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 1000;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }

        .fullscreen-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          z-index: 100;
          display: flex;
          align-items: center;
          padding: 0 20px;
        }

        .exam-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .exam-info h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .security-indicators {
          display: flex;
          gap: 20px;
          margin-top: 4px;
        }

        .indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          opacity: 0.9;
        }

        .indicator .icon {
          width: 14px;
          height: 14px;
        }

        .violation-counter {
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
        }

        /* Prevent scrolling when locked */
        body.exam-locked {
          overflow: hidden;
        }

        /* Disable text selection globally */
        body.exam-locked * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
      `}</style>
    </div>
  );
};

export default ExamLockdown;
