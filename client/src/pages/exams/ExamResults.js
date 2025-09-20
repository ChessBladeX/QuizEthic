import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExamResults = () => {
  const { id, attemptId } = useParams();
  const navigate = useNavigate();

  const { data: attempt, isLoading, error } = useQuery(
    ['attemptResults', attemptId],
    () => axios.get(`/api/attempts/${attemptId}/results`).then(res => res.data),
    { enabled: !!attemptId }
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
              Error loading results
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.response?.data?.message || 'Something went wrong'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGradeColor = (grade) => {
    if (['A', 'B'].includes(grade)) return 'text-green-600';
    if (grade === 'C') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/exams')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Exams
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
        <p className="mt-1 text-sm text-gray-500">
          {attempt?.exam?.title}
        </p>
      </div>

      {attempt && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Results Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(attempt.percentage)}`}>
                    {attempt.percentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Score</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getGradeColor(attempt.grade)}`}>
                    {attempt.grade}
                  </div>
                  <div className="text-sm text-gray-500">Grade</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {attempt.score}
                  </div>
                  <div className="text-sm text-gray-500">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatTime(attempt.timeSpent)}
                  </div>
                  <div className="text-sm text-gray-500">Time Taken</div>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Flags */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {attempt.status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mr-2" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1)}
                  </span>
                </div>
                
                {attempt.isFlagged && (
                  <div className="flex items-center">
                    <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-red-600">Flagged for Review</span>
                  </div>
                )}

                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500">
                    Completed on {new Date(attempt.endTime).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Violations */}
          {attempt.antiCheating?.violations?.length > 0 && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Security Violations</h3>
                <div className="space-y-2">
                  {attempt.antiCheating.violations.map((violation, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {violation.type.replace('-', ' ').toUpperCase()}
                        </p>
                        <p className="text-xs text-gray-500">{violation.details}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          violation.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          violation.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          violation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {violation.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(violation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Answer Review */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Answer Review</h3>
              <div className="space-y-4">
                {attempt.answers?.map((answer, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        Question {index + 1}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {answer.isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm text-gray-500">
                          {answer.points} points
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Your answer: {answer.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => navigate('/exams')}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Exams
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Print Results
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamResults;
