import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { 
  Clock, 
  Users, 
  FileText, 
  Play, 
  ArrowLeft,
  Calendar,
  Shield,
  Camera,
  Eye,
  Lock
} from 'lucide-react';

const ExamPreview = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: exam, isLoading, error } = useQuery(
    ['examPreview', id],
    () => axios.get(`/api/exams/${id}/preview`).then(res => res.data),
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading exam
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.response?.data?.message || 'Something went wrong'}
            </div>
          </div>
        </div>
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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalQuestions = () => {
    return exam.sections.reduce((total, section) => total + section.questionCount, 0);
  };

  const getStatusColor = () => {
    const now = new Date();
    if (exam.startDate && new Date(exam.startDate) > now) return 'bg-blue-100 text-blue-800';
    if (exam.endDate && new Date(exam.endDate) < now) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getStatusText = () => {
    const now = new Date();
    if (exam.startDate && new Date(exam.startDate) > now) return 'Scheduled';
    if (exam.endDate && new Date(exam.endDate) < now) return 'Completed';
    return 'Active';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/exams')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Exams
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="mt-1 text-lg text-gray-600">{exam.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
            <button
              onClick={() => navigate(`/exams/${id}/take`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Exam
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Instructions */}
          {exam.instructions && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Instructions</h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{exam.instructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Sections</h3>
              <div className="space-y-4">
                {exam.sections.map((section, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-md font-medium text-gray-900">
                        Section {index + 1}: {section.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {section.timeLimit && (
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {section.timeLimit} min
                          </span>
                        )}
                        <span className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {section.questionCount} questions
                        </span>
                      </div>
                    </div>
                    {section.description && (
                      <p className="text-sm text-gray-600">{section.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {section.randomizeQuestions && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Randomize Questions
                        </span>
                      )}
                      {section.randomizeOptions && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Randomize Options
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Exam Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Exam Details</h3>
              <dl className="space-y-3">
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-gray-500">Duration</dt>
                  <dd className="text-sm text-gray-900">
                    {exam.settings.totalTimeLimit ? `${exam.settings.totalTimeLimit} minutes` : 'No limit'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-gray-500">Questions</dt>
                  <dd className="text-sm text-gray-900">{getTotalQuestions()}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-gray-500">Points</dt>
                  <dd className="text-sm text-gray-900">{exam.totalPoints}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-gray-500">Max Attempts</dt>
                  <dd className="text-sm text-gray-900">{exam.settings.maxAttempts}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-gray-500">Review Allowed</dt>
                  <dd className="text-sm text-gray-900">
                    {exam.settings.allowReview ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm font-medium text-gray-500">Skip Allowed</dt>
                  <dd className="text-sm text-gray-900">
                    {exam.settings.allowSkip ? 'Yes' : 'No'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Schedule</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                  <dd className="text-sm text-gray-900 flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(exam.startDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">End Date</dt>
                  <dd className="text-sm text-gray-900 flex items-center mt-1">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(exam.endDate)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Anti-Cheating Measures */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Measures</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Shield className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">Browser Lockdown</span>
                </div>
                <div className="flex items-center">
                  <Eye className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">Focus Detection</span>
                </div>
                <div className="flex items-center">
                  <Camera className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">Webcam Monitoring</span>
                </div>
                <div className="flex items-center">
                  <Lock className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-700">Behavior Analysis</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/exams/${id}/take`)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Start Exam
                </button>
                <button
                  onClick={() => navigate('/exams')}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Exams
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamPreview;
