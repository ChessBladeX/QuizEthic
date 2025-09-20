import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAntiCheating } from '../../contexts/AntiCheatingContext';
import { 
  Clock, 
  Save, 
  Submit, 
  AlertTriangle, 
  Camera,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import Webcam from 'react-webcam';

const TakeExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    addViolation, 
    getBehaviorData,
    getViolations,
    deviceFingerprint 
  } = useAntiCheating();

  // Get exam data
  const { data: exam, isLoading: examLoading } = useQuery(
    ['exam', id],
    () => axios.get(`/api/exams/${id}`).then(res => res.data),
    { enabled: !!id }
  );

  // Get exam preview
  const { data: examPreview } = useQuery(
    ['examPreview', id],
    () => axios.get(`/api/exams/${id}/preview`).then(res => res.data),
    { enabled: !!id }
  );

  // Start exam attempt
  const startAttemptMutation = useMutation(
    (attemptData) => axios.post('/api/attempts/start', attemptData),
    {
      onSuccess: (response) => {
        const { attemptId, exam: examData, timeLimit } = response.data;
        setTimeRemaining(timeLimit * 60); // Convert to seconds
        startMonitoring(examData.antiCheating);
        navigate(`/exams/${id}/take/${attemptId}`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to start exam');
      }
    }
  );

  // Submit answer
  const submitAnswerMutation = useMutation(
    ({ attemptId, questionId, answer, timeSpent }) =>
      axios.post(`/api/attempts/${attemptId}/answer`, {
        questionId,
        answer,
        timeSpent
      }),
    {
      onSuccess: () => {
        toast.success('Answer saved');
      },
      onError: (error) => {
        toast.error('Failed to save answer');
      }
    }
  );

  // Submit violation
  const submitViolationMutation = useMutation(
    ({ attemptId, type, details, severity }) =>
      axios.post(`/api/attempts/${attemptId}/violation`, {
        type,
        details,
        severity
      }),
    {
      onSuccess: () => {
        setViolationCount(prev => prev + 1);
      }
    }
  );

  // Submit webcam snapshot
  const submitWebcamMutation = useMutation(
    ({ attemptId, imageData, timestamp }) =>
      axios.post(`/api/attempts/${attemptId}/webcam`, {
        imageData,
        timestamp
      })
  );

  // Submit behavior data
  const submitBehaviorMutation = useMutation(
    ({ attemptId, behaviorData }) =>
      axios.post(`/api/attempts/${attemptId}/behavior`, behaviorData)
  );

  // Finish exam
  const finishExamMutation = useMutation(
    (attemptId) => axios.post(`/api/attempts/${attemptId}/finish`),
    {
      onSuccess: (response) => {
        stopMonitoring();
        toast.success('Exam submitted successfully!');
        navigate(`/exams/${id}/results/${response.data.attemptId}`);
      },
      onError: (error) => {
        toast.error('Failed to submit exam');
      }
    }
  );

  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0 && !isSubmitting) {
      handleSubmitExam();
    }
  }, [timeRemaining]);

  // Anti-cheating monitoring
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        // Submit behavior data every 30 seconds
        const behaviorData = getBehaviorData();
        if (Object.keys(behaviorData).length > 0) {
          submitBehaviorMutation.mutate({
            attemptId: id,
            behaviorData
          });
        }

        // Take webcam snapshot if enabled
        if (exam?.antiCheating?.webcamMonitoring?.enabled && webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            submitWebcamMutation.mutate({
              attemptId: id,
              imageData: imageSrc,
              timestamp: new Date().toISOString()
            });
          }
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring, exam]);

  // Focus/blur detection
  useEffect(() => {
    const handleBlur = () => {
      if (isMonitoring) {
        addViolation({
          type: 'focus-loss',
          timestamp: Date.now(),
          details: 'User switched away from exam window',
          severity: 'medium'
        });
        setShowWarning(true);
      }
    };

    const handleFocus = () => {
      setShowWarning(false);
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isMonitoring, addViolation]);

  // Fullscreen detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleStartExam = () => {
    if (!deviceFingerprint) {
      toast.error('Device fingerprint not available. Please refresh the page.');
      return;
    }

    startAttemptMutation.mutate({
      examId: id,
      deviceFingerprint,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      location: {} // This would be populated with actual location data
    });
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSaveAnswer = (questionId) => {
    const answer = answers[questionId];
    if (answer !== undefined) {
      submitAnswerMutation.mutate({
        attemptId: id,
        questionId,
        answer,
        timeSpent: 0 // This would be calculated based on time spent on question
      });
    }
  };

  const handleNextQuestion = () => {
    const currentQ = getCurrentQuestion();
    if (currentQ) {
      handleSaveAnswer(currentQ.question._id);
    }

    if (currentQuestion < getCurrentSection().questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (currentSection < exam.sections.length - 1) {
      setCurrentSection(prev => prev + 1);
      setCurrentQuestion(0);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    } else if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      setCurrentQuestion(getCurrentSection().questions.length - 1);
    }
  };

  const handleSubmitExam = () => {
    setIsSubmitting(true);
    finishExamMutation.mutate(id);
  };

  const getCurrentSection = () => {
    return exam?.sections[currentSection] || {};
  };

  const getCurrentQuestion = () => {
    const section = getCurrentSection();
    return section.questions?.[currentQuestion];
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const totalQuestions = exam?.sections.reduce((total, section) => total + section.questions.length, 0) || 0;
    const answeredQuestions = Object.keys(answers).length;
    return (answeredQuestions / totalQuestions) * 100;
  };

  if (examLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Exam not found</h3>
        <p className="mt-1 text-sm text-gray-500">
          The exam you're looking for doesn't exist or you don't have access to it.
        </p>
      </div>
    );
  }

  // Show exam preview if not started
  if (!isMonitoring) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{exam.title}</h1>
            <p className="text-gray-600 mb-6">{exam.description}</p>
            
            {exam.instructions && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Instructions</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{exam.instructions}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Exam Details</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>Duration: {exam.settings.totalTimeLimit || 'No limit'} minutes</li>
                  <li>Questions: {exam.sections.reduce((total, section) => total + section.questions.length, 0)}</li>
                  <li>Points: {exam.totalPoints}</li>
                  <li>Attempts: {exam.settings.maxAttempts}</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Anti-Cheating Measures</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {exam.antiCheating?.webcamMonitoring?.enabled && (
                    <li className="flex items-center">
                      <Camera className="h-4 w-4 mr-2" />
                      Webcam monitoring enabled
                    </li>
                  )}
                  {exam.antiCheating?.browserLock?.enabled && (
                    <li className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Browser lockdown enabled
                    </li>
                  )}
                  {exam.antiCheating?.focusDetection?.enabled && (
                    <li className="flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      Focus detection enabled
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => navigate('/exams')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExam}
                disabled={startAttemptMutation.isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {startAttemptMutation.isLoading ? 'Starting...' : 'Start Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = getCurrentQuestion();
  if (!currentQ) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-gray-900">{exam.title}</h1>
              <p className="text-sm text-gray-500">
                Section {currentSection + 1} of {exam.sections.length} - Question {currentQuestion + 1} of {getCurrentSection().questions.length}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Progress */}
              <div className="text-sm text-gray-600">
                Progress: {Math.round(getProgress())}%
              </div>
              
              {/* Timer */}
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className={`text-sm font-medium ${timeRemaining < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              
              {/* Violations */}
              {violationCount > 0 && (
                <div className="flex items-center space-x-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{violationCount}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Warning</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              You have switched away from the exam window. This has been recorded as a violation.
              Please return to the exam immediately.
            </p>
            <button
              onClick={() => setShowWarning(false)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Question Panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900 mb-2">
                  Question {currentQuestion + 1}
                </h2>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Type: {currentQ.question.type}</span>
                  <span>Points: {currentQ.points}</span>
                  <span>Difficulty: {currentQ.question.metadata.difficulty}</span>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 whitespace-pre-wrap">{currentQ.question.content}</p>
              </div>

              {/* Question Type Specific Rendering */}
              {currentQ.question.type === 'mcq' && (
                <div className="space-y-3">
                  {currentQ.question.options.map((option, index) => (
                    <label key={index} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name={`question-${currentQ.question._id}`}
                        value={option.text}
                        checked={answers[currentQ.question._id] === option.text}
                        onChange={(e) => handleAnswerChange(currentQ.question._id, e.target.value)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      />
                      <span className="text-gray-700">{option.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQ.question.type === 'short-answer' && (
                <textarea
                  value={answers[currentQ.question._id] || ''}
                  onChange={(e) => handleAnswerChange(currentQ.question._id, e.target.value)}
                  className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your answer here..."
                />
              )}

              {currentQ.question.type === 'code' && (
                <div>
                  <div className="mb-2">
                    <span className="text-sm text-gray-600">
                      Language: {currentQ.question.codeTemplate.language}
                    </span>
                  </div>
                  <textarea
                    value={answers[currentQ.question._id] || currentQ.question.codeTemplate.template}
                    onChange={(e) => handleAnswerChange(currentQ.question._id, e.target.value)}
                    className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                    placeholder="Write your code here..."
                  />
                </div>
              )}

              {currentQ.question.type === 'image-based' && currentQ.question.images.length > 0 && (
                <div className="space-y-4">
                  {currentQ.question.images.map((image, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <img
                        src={image.url}
                        alt={image.alt}
                        className="max-w-full h-auto rounded"
                      />
                      {image.caption && (
                        <p className="mt-2 text-sm text-gray-600">{image.caption}</p>
                      )}
                    </div>
                  ))}
                  <textarea
                    value={answers[currentQ.question._id] || ''}
                    onChange={(e) => handleAnswerChange(currentQ.question._id, e.target.value)}
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your answer here..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Navigation</h3>
            
            {/* Question Navigation */}
            <div className="space-y-2 mb-6">
              {exam.sections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Section {sectionIndex + 1}: {section.name}
                  </h4>
                  <div className="grid grid-cols-5 gap-1">
                    {section.questions.map((q, questionIndex) => (
                      <button
                        key={questionIndex}
                        onClick={() => {
                          setCurrentSection(sectionIndex);
                          setCurrentQuestion(questionIndex);
                        }}
                        className={`w-8 h-8 text-xs rounded ${
                          sectionIndex === currentSection && questionIndex === currentQuestion
                            ? 'bg-indigo-600 text-white'
                            : answers[q.question._id]
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {questionIndex + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={() => handleSaveAnswer(currentQ.question._id)}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Answer
              </button>
              
              <div className="flex space-x-2">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentSection === 0 && currentQuestion === 0}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={handleNextQuestion}
                  disabled={currentSection === exam.sections.length - 1 && currentQuestion === getCurrentSection().questions.length - 1}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              
              <button
                onClick={handleSubmitExam}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <Submit className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Webcam (hidden) */}
      {exam.antiCheating?.webcamMonitoring?.enabled && (
        <div className="hidden">
          <Webcam
            ref={webcamRef}
            width={320}
            height={240}
            screenshotFormat="image/jpeg"
          />
        </div>
      )}
    </div>
  );
};

export default TakeExam;
