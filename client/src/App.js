import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AntiCheatingProvider } from './contexts/AntiCheatingContext';

// Components
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import QuestionBank from './pages/questions/QuestionBank';
import CreateQuestion from './pages/questions/CreateQuestion';
import EditQuestion from './pages/questions/EditQuestion';
import QuestionGenerator from './pages/questions/QuestionGenerator';
import ExamList from './pages/exams/ExamList';
import CreateExam from './pages/exams/CreateExam';
import EditExam from './pages/exams/EditExam';
import ExamPreview from './pages/exams/ExamPreview';
import TakeExam from './pages/exams/TakeExam';
import ExamResults from './pages/exams/ExamResults';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ViolationMonitoring from './pages/admin/ViolationMonitoring';
import FlaggedAttempts from './pages/admin/FlaggedAttempts';
import Analytics from './pages/admin/Analytics';
import Profile from './pages/Profile';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AntiCheatingProvider>
          <Router>
            <ErrorBoundary>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <main className="container mx-auto px-4 py-8">
                  <Routes>
                  {/* Public Routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Question Management */}
                  <Route path="/questions" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <QuestionBank />
                    </ProtectedRoute>
                  } />
                  <Route path="/questions/create" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <CreateQuestion />
                    </ProtectedRoute>
                  } />
                  <Route path="/questions/:id/edit" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <EditQuestion />
                    </ProtectedRoute>
                  } />
                  <Route path="/questions/generator" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <QuestionGenerator />
                    </ProtectedRoute>
                  } />
                  
                  {/* Exam Management */}
                  <Route path="/exams" element={
                    <ProtectedRoute>
                      <ExamList />
                    </ProtectedRoute>
                  } />
                  <Route path="/exams/create" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <CreateExam />
                    </ProtectedRoute>
                  } />
                  <Route path="/exams/:id/edit" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <EditExam />
                    </ProtectedRoute>
                  } />
                  <Route path="/exams/:id/preview" element={
                    <ProtectedRoute>
                      <ExamPreview />
                    </ProtectedRoute>
                  } />
                  <Route path="/exams/:id/take" element={
                    <ProtectedRoute>
                      <TakeExam />
                    </ProtectedRoute>
                  } />
                  <Route path="/exams/:id/results/:attemptId" element={
                    <ProtectedRoute>
                      <ExamResults />
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/users" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <UserManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/violations" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <ViolationMonitoring />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/flagged" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <FlaggedAttempts />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin/analytics" element={
                    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
                      <Analytics />
                    </ProtectedRoute>
                  } />
                  
                  {/* Profile */}
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </main>
                <Toaster
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </div>
            </ErrorBoundary>
          </Router>
        </AntiCheatingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
