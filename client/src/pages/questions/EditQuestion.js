import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EditQuestion = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: question, isLoading, error } = useQuery(
    ['question', id],
    () => axios.get(`/api/questions/${id}`).then(res => res.data),
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
              Error loading question
            </h3>
            <div className="mt-2 text-sm text-red-700">
              {error.response?.data?.message || 'Something went wrong'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/questions')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Questions
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
        <p className="mt-1 text-sm text-gray-500">
          Modify your question details
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900">Edit Question Form</h3>
            <p className="mt-1 text-sm text-gray-500">
              This would contain the same form as CreateQuestion but pre-populated with existing data.
            </p>
            <p className="mt-2 text-sm text-gray-400">
              Question ID: {id}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuestion;
