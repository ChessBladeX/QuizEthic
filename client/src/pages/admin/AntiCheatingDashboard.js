import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import {
  Shield,
  AlertTriangle,
  Eye,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
  Activity,
  Camera,
  MousePointer,
  Keyboard,
  Focus,
  Flag,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

const AntiCheatingDashboard = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedExam, setSelectedExam] = useState('all');
  const [realTimeData, setRealTimeData] = useState({
    activeExams: 0,
    totalViolations: 0,
    flaggedAttempts: 0,
    currentUsers: 0
  });

  // Fetch violation statistics
  const { data: violationStats, isLoading: statsLoading } = useQuery(
    ['violation-stats', timeRange, selectedExam],
    () => axios.get('/api/anti-cheating/violations/stats', {
      params: { timeRange, examId: selectedExam !== 'all' ? selectedExam : undefined }
    }).then(res => res.data),
    { refetchInterval: 30000 }
  );

  // Fetch real-time alerts
  const { data: alerts, isLoading: alertsLoading } = useQuery(
    ['violation-alerts', timeRange],
    () => axios.get('/api/anti-cheating/violations/alerts', {
      params: { timeRange }
    }).then(res => res.data),
    { refetchInterval: 10000 }
  );

  // Fetch behavior analytics
  const { data: behaviorAnalytics, isLoading: behaviorLoading } = useQuery(
    ['behavior-analytics', timeRange],
    () => axios.get('/api/anti-cheating/behavior-analytics', {
      params: { timeRange }
    }).then(res => res.data),
    { refetchInterval: 60000 }
  );

  // Fetch exam list for filter
  const { data: exams } = useQuery(
    'exams-for-filter',
    () => axios.get('/api/exams?limit=100').then(res => res.data.exams)
  );

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        ...prev,
        totalViolations: prev.totalViolations + Math.floor(Math.random() * 3),
        currentUsers: prev.currentUsers + Math.floor(Math.random() * 5) - 2
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getViolationIcon = (type) => {
    switch (type) {
      case 'right-click': return MousePointer;
      case 'copy-paste': return Keyboard;
      case 'tab-switch': return Focus;
      case 'dev-tools': return Activity;
      case 'webcam-violation': return Camera;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'critical': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (statsLoading || alertsLoading || behaviorLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anti-Cheating Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time monitoring and analytics
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <select
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="all">All Exams</option>
            {exams?.map(exam => (
              <option key={exam._id} value={exam._id}>{exam.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{realTimeData.currentUsers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Exams</dt>
                  <dd className="text-lg font-medium text-gray-900">{realTimeData.activeExams}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Violations</dt>
                  <dd className="text-lg font-medium text-gray-900">{realTimeData.totalViolations}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Flag className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Flagged Attempts</dt>
                  <dd className="text-lg font-medium text-gray-900">{realTimeData.flaggedAttempts}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violation Statistics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Violation Statistics
            </h3>
            <div className="space-y-3">
              {violationStats?.map((stat, index) => {
                const Icon = getViolationIcon(stat.type);
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {stat.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{stat.count}</span>
                      <div className="flex space-x-1">
                        {stat.severityBreakdown?.low > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {stat.severityBreakdown.low} Low
                          </span>
                        )}
                        {stat.severityBreakdown?.medium > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {stat.severityBreakdown.medium} Med
                          </span>
                        )}
                        {stat.severityBreakdown?.high > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {stat.severityBreakdown.high} High
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Real-time Alerts */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Real-time Alerts
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts?.map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">
                        {alert.student?.firstName} {alert.student?.lastName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {alert.exam?.title}
                    </p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity} severity
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Behavior Analytics */}
      {behaviorAnalytics && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Behavior Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {behaviorAnalytics.averageRiskScore?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Average Risk Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {behaviorAnalytics.normalBehaviorPercentage?.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">Normal Behavior</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {behaviorAnalytics.suspiciousPatterns?.length || 0}
                </div>
                <div className="text-sm text-gray-500">Suspicious Patterns</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Violations Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Violations
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Violation Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {alerts?.slice(0, 10).map((alert, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {alert.student?.firstName} {alert.student?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.exam?.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {alert.type?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(alert.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          Review
                        </button>
                        <button className="text-green-600 hover:text-green-900">
                          Approve
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          Flag
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AntiCheatingDashboard;
