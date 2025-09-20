import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  FileText, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Plus,
  Eye
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      name: 'Total Exams',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: FileText,
    },
    {
      name: 'Completed',
      value: '8',
      change: '+1',
      changeType: 'positive',
      icon: CheckCircle,
    },
    {
      name: 'In Progress',
      value: '2',
      change: '0',
      changeType: 'neutral',
      icon: Clock,
    },
    {
      name: 'Average Score',
      value: '87%',
      change: '+5%',
      changeType: 'positive',
      icon: BarChart3,
    },
  ];

  const recentExams = [
    {
      id: 1,
      title: 'JavaScript Fundamentals',
      status: 'completed',
      score: 92,
      completedAt: '2024-01-15',
    },
    {
      id: 2,
      title: 'React Components',
      status: 'in-progress',
      score: null,
      dueDate: '2024-01-20',
    },
    {
      id: 3,
      title: 'Node.js Backend',
      status: 'pending',
      score: null,
      startDate: '2024-01-18',
    },
  ];

  const upcomingExams = [
    {
      id: 4,
      title: 'Database Design',
      startDate: '2024-01-22',
      duration: '60 minutes',
      totalQuestions: 25,
    },
    {
      id: 5,
      title: 'System Architecture',
      startDate: '2024-01-25',
      duration: '90 minutes',
      totalQuestions: 30,
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return CheckCircle;
      case 'in-progress':
        return Clock;
      case 'pending':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your exams today.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 
                        stat.changeType === 'negative' ? 'text-red-600' : 
                        'text-gray-500'
                      }`}>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Exams */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Recent Exams
              </h3>
              <Link
                to="/exams"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all
              </Link>
            </div>
            <div className="mt-5">
              <div className="space-y-3">
                {recentExams.map((exam) => {
                  const StatusIcon = getStatusIcon(exam.status);
                  return (
                    <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <StatusIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {exam.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {exam.status === 'completed' && exam.score && `Score: ${exam.score}%`}
                            {exam.status === 'in-progress' && `Due: ${exam.dueDate}`}
                            {exam.status === 'pending' && `Starts: ${exam.startDate}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exam.status)}`}>
                          {exam.status.replace('-', ' ')}
                        </span>
                        {exam.status === 'completed' && (
                          <Link
                            to={`/exams/${exam.id}/results`}
                            className="text-indigo-600 hover:text-indigo-500"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Exams */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Upcoming Exams
              </h3>
              <Link
                to="/exams"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                View all
              </Link>
            </div>
            <div className="mt-5">
              <div className="space-y-3">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {exam.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {exam.duration} • {exam.totalQuestions} questions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {exam.startDate}
                      </p>
                      <Link
                        to={`/exams/${exam.id}/preview`}
                        className="text-xs text-indigo-600 hover:text-indigo-500"
                      >
                        Preview
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {(user?.role === 'instructor' || user?.role === 'admin') && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                to="/questions/create"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                    <Plus className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Create Question
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add a new question to your question bank.
                  </p>
                </div>
              </Link>

              <Link
                to="/exams/create"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                    <FileText className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Create Exam
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Create a new exam with questions from your bank.
                  </p>
                </div>
              </Link>

              <Link
                to="/questions"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 rounded-lg border border-gray-300 hover:border-gray-400"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-indigo-50 text-indigo-700 ring-4 ring-white">
                    <BookOpen className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Question Bank
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Manage your question collection.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
