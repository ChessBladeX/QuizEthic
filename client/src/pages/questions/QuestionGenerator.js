import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Brain,
  Zap,
  Settings,
  Shuffle,
  Target,
  Clock,
  Star,
  Plus,
  Save,
  Download,
  Eye,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Layers,
  BookOpen,
  Code,
  FileText,
  Image,
  CheckCircle,
  Calculator,
  Target as TargetIcon
} from 'lucide-react';

const QuestionGenerator = () => {
  const [generatorSettings, setGeneratorSettings] = useState({
    topic: '',
    difficulty: 'medium',
    questionTypes: ['mcq', 'short-answer'],
    count: 5,
    adaptiveDifficulty: false,
    randomization: {
      shuffleOptions: true,
      shuffleOrder: true,
      randomizeValues: true,
      useSeed: false,
      seed: ''
    },
    constraints: {
      timeLimit: 30,
      pointsRange: { min: 1, max: 5 },
      complexityLevel: 'medium'
    }
  });

  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Load available topics and user profile
  const { data: topics } = useQuery('topics', () => 
    axios.get('/api/questions/metadata/topics').then(res => res.data)
  );

  const { data: userProfileData } = useQuery('userProfile', () =>
    axios.get('/api/user/profile').then(res => res.data)
  );

  // Generate questions mutation
  const generateQuestionsMutation = useMutation(
    (settings) => axios.post('/api/questions/generate', settings),
    {
      onSuccess: (response) => {
        setGeneratedQuestions(response.data.questions);
        toast.success(`${response.data.questions.length} questions generated successfully!`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to generate questions');
      }
    }
  );

  // Save generated questions mutation
  const saveQuestionsMutation = useMutation(
    (questions) => axios.post('/api/questions/bulk', { questions }),
    {
      onSuccess: () => {
        toast.success('Questions saved to question bank!');
        setGeneratedQuestions([]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to save questions');
      }
    }
  );

  useEffect(() => {
    if (userProfileData) {
      setUserProfile(userProfileData);
      // Set adaptive difficulty based on user performance
      if (userProfileData.averageScore) {
        setGeneratorSettings(prev => ({
          ...prev,
          adaptiveDifficulty: userProfileData.averageScore < 70
        }));
      }
    }
  }, [userProfileData]);

  const handleSettingChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setGeneratorSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setGeneratorSettings(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleQuestionTypeToggle = (type) => {
    setGeneratorSettings(prev => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(type)
        ? prev.questionTypes.filter(t => t !== type)
        : [...prev.questionTypes, type]
    }));
  };

  const generateQuestions = async () => {
    if (!generatorSettings.topic) {
      toast.error('Please select a topic');
      return;
    }

    if (generatorSettings.questionTypes.length === 0) {
      toast.error('Please select at least one question type');
      return;
    }

    setIsGenerating(true);
    try {
      await generateQuestionsMutation.mutateAsync(generatorSettings);
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateQuestion = async (index) => {
    const questionSettings = {
      ...generatorSettings,
      count: 1,
      replaceIndex: index
    };
    
    try {
      const response = await axios.post('/api/questions/generate', questionSettings);
      const newQuestions = [...generatedQuestions];
      newQuestions[index] = response.data.questions[0];
      setGeneratedQuestions(newQuestions);
      toast.success('Question regenerated!');
    } catch (error) {
      toast.error('Failed to regenerate question');
    }
  };

  const getQuestionIcon = (type) => {
    switch (type) {
      case 'mcq': return BookOpen;
      case 'short-answer': return FileText;
      case 'code': return Code;
      case 'image-based': return Image;
      case 'true-false': return CheckCircle;
      case 'numerical': return Calculator;
      case 'matching': return Layers;
      case 'drag-drop': return TargetIcon;
      default: return BookOpen;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Question Generator</h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered question generation with adaptive difficulty
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generator Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Brain className="h-5 w-5 inline mr-2" />
                Generator Settings
              </h3>

              <div className="space-y-6">
                {/* Topic Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Topic *
                  </label>
                  <select
                    value={generatorSettings.topic}
                    onChange={(e) => handleSettingChange('topic', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="">Select a topic</option>
                    {topics?.map(topic => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={generatorSettings.difficulty}
                    onChange={(e) => handleSettingChange('difficulty', e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Question Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Types
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'mcq', label: 'Multiple Choice', icon: BookOpen },
                      { value: 'short-answer', label: 'Short Answer', icon: FileText },
                      { value: 'code', label: 'Code', icon: Code },
                      { value: 'true-false', label: 'True/False', icon: CheckCircle },
                      { value: 'numerical', label: 'Numerical', icon: Calculator },
                      { value: 'matching', label: 'Matching', icon: Layers }
                    ].map(type => {
                      const Icon = type.icon;
                      return (
                        <label key={type.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={generatorSettings.questionTypes.includes(type.value)}
                            onChange={() => handleQuestionTypeToggle(type.value)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <Icon className="h-4 w-4 ml-2 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-700">{type.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Question Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Questions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={generatorSettings.count}
                    onChange={(e) => handleSettingChange('count', parseInt(e.target.value))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Advanced Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Settings</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generatorSettings.adaptiveDifficulty}
                        onChange={(e) => handleSettingChange('adaptiveDifficulty', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Adaptive Difficulty</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generatorSettings.randomization.shuffleOptions}
                        onChange={(e) => handleSettingChange('randomization.shuffleOptions', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Shuffle Options</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={generatorSettings.randomization.useSeed}
                        onChange={(e) => handleSettingChange('randomization.useSeed', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">Use Custom Seed</span>
                    </label>

                    {generatorSettings.randomization.useSeed && (
                      <input
                        type="text"
                        placeholder="Enter seed value"
                        value={generatorSettings.randomization.seed}
                        onChange={(e) => handleSettingChange('randomization.seed', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    )}
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateQuestions}
                  disabled={isGenerating || !generatorSettings.topic || generatorSettings.questionTypes.length === 0}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Questions
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Generated Questions */}
        <div className="lg:col-span-2">
          {generatedQuestions.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Generated Questions ({generatedQuestions.length})
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => saveQuestionsMutation.mutate(generatedQuestions)}
                    disabled={saveQuestionsMutation.isLoading}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save All
                  </button>
                  <button
                    onClick={() => setGeneratedQuestions([])}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((question, index) => {
                  const QuestionIcon = getQuestionIcon(question.type);
                  return (
                    <div key={index} className="bg-white shadow rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <QuestionIcon className="h-5 w-5 text-gray-400" />
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(question.metadata.difficulty)}`}>
                              {question.metadata.difficulty}
                            </span>
                            <span className="text-xs text-gray-500">
                              {question.metadata.points} points
                            </span>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            {question.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            {question.content}
                          </p>
                          {question.type === 'mcq' && question.options && (
                            <div className="space-y-1">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center text-sm">
                                  <span className="w-6 text-gray-500">{String.fromCharCode(65 + optIndex)}.</span>
                                  <span className={option.isCorrect ? 'text-green-600 font-medium' : 'text-gray-700'}>
                                    {option.text}
                                  </span>
                                  {option.isCorrect && <CheckCircle className="h-4 w-4 ml-2 text-green-500" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex space-x-2">
                          <button
                            onClick={() => regenerateQuestion(index)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Regenerate this question"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No questions generated yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure your settings and click "Generate Questions" to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionGenerator;
