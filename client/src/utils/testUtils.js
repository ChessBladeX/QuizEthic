import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AuthProvider } from '../contexts/AuthContext';
import { AntiCheatingProvider } from '../contexts/AntiCheatingContext';

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// Custom render function with providers
export const renderWithProviders = (
  ui,
  {
    preloadedState = {},
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AntiCheatingProvider>
            {children}
          </AntiCheatingProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
};

// Mock API responses
export const mockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
});

// Mock user data
export const mockUser = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  role: 'student',
  isActive: true,
};

// Mock exam data
export const mockExam = {
  id: '1',
  title: 'Test Exam',
  description: 'A test exam',
  duration: 60,
  totalPoints: 100,
  isPublished: true,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

// Mock question data
export const mockQuestion = {
  id: '1',
  title: 'Test Question',
  type: 'multiple-choice',
  content: 'What is 2 + 2?',
  options: ['3', '4', '5', '6'],
  correctAnswer: '4',
  points: 10,
  difficulty: 'easy',
};

// Wait for async operations
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock fetch
export const mockFetch = (data, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    })
  );
};

export * from '@testing-library/react';
