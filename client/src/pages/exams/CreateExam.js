import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CreateExam = () => {
  const navigate = useNavigate();

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
        <h1 className="text-2xl font-bold text-gray-900">Create Exam</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a new exam with questions from your question bank
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Create Exam Form</h3>
            <p className="mt-1 text-sm text-gray-500">
              This would contain a comprehensive form for creating exams with sections, questions, settings, and anti-cheating configurations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateExam;
