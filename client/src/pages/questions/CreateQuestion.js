import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { 
  Plus, 
  Trash2, 
  Upload, 
  Code, 
  Image as ImageIcon,
  BookOpen,
  FileText,
  Save,
  Download,
  FileImport,
  Calculator,
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Shuffle,
  Settings,
  Target,
  Layers,
  Hash
} from 'lucide-react';
import {
  MathExpressionInput,
  CodeEditor,
  ImageUpload,
  DragDropComponent,
  HotspotComponent,
  MatchingPairsComponent,
  FillBlankComponent
} from '../../components/questions/QuestionTypeComponents';

const CreateQuestion = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'mcq',
    content: '',
    options: [
      { text: '', isCorrect: false, explanation: '' },
      { text: '', isCorrect: false, explanation: '' }
    ],
    correctAnswer: '',
    codeTemplate: {
      language: 'javascript',
      template: '',
      testCases: [
        { input: '', expectedOutput: '', isHidden: false }
      ]
    },
    images: [],
    metadata: {
      topic: '',
      difficulty: 'medium',
      tags: [],
      estimatedTime: 5,
      points: 1
    },
    // Enhanced question features
    hints: [],
    explanation: '',
    references: [],
    adaptiveSettings: {
      difficultyAdjustment: false,
      personalizedHints: false,
      timeBasedScoring: false
    },
    randomization: {
      shuffleOptions: false,
      shuffleOrder: false,
      randomizeValues: false,
      seed: null
    },
    // Additional question type specific fields
    trueFalseAnswer: true,
    fillBlankAnswers: [],
    matchingPairs: [],
    numericalAnswer: {
      value: 0,
      tolerance: 0,
      unit: ''
    },
    dragDropItems: [],
    hotspotAreas: [],
    mathematicalExpression: '',
    essayRubric: {
      criteria: [],
      maxLength: 1000,
      minLength: 100
    }
  });

  const [newTag, setNewTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState('csv');
  const [importFile, setImportFile] = useState(null);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('basic');

  const createQuestionMutation = useMutation(
    (questionData) => axios.post('/api/questions', questionData),
    {
      onSuccess: () => {
        toast.success('Question created successfully!');
        navigate('/questions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create question');
      }
    }
  );

  const importQuestionsMutation = useMutation(
    (importData) => axios.post('/api/questions/import', importData),
    {
      onSuccess: (response) => {
        toast.success(`${response.data.count} questions imported successfully!`);
        setShowImportModal(false);
        setPreviewQuestions([]);
        navigate('/questions');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to import questions');
      }
    }
  );

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const questions = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const question = {};
        
        headers.forEach((header, index) => {
          question[header] = values[index] || '';
        });
        
        questions.push(question);
      }
    }
    
    return questions;
  };

  const parseJSON = (jsonText) => {
    return JSON.parse(jsonText);
  };

  const handleFileImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let questions = [];
        if (importType === 'csv') {
          questions = parseCSV(e.target.result);
        } else if (importType === 'json') {
          questions = parseJSON(e.target.result);
        }
        setPreviewQuestions(questions);
        toast.success(`Parsed ${questions.length} questions from file`);
      } catch (error) {
        toast.error('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setImportFile(acceptedFiles[0]);
        handleFileImport(acceptedFiles[0]);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json']
    }
  });

  const handleChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false, explanation: '' }]
    }));
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, options: newOptions }));
    }
  };

  const addTestCase = () => {
    setFormData(prev => ({
      ...prev,
      codeTemplate: {
        ...prev.codeTemplate,
        testCases: [...prev.codeTemplate.testCases, { input: '', expectedOutput: '', isHidden: false }]
      }
    }));
  };

  const removeTestCase = (index) => {
    const newTestCases = formData.codeTemplate.testCases.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      codeTemplate: {
        ...prev.codeTemplate,
        testCases: newTestCases
      }
    }));
  };

  const handleTestCaseChange = (index, field, value) => {
    const newTestCases = [...formData.codeTemplate.testCases];
    newTestCases[index] = { ...newTestCases[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      codeTemplate: {
        ...prev.codeTemplate,
        testCases: newTestCases
      }
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.metadata.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        metadata: {
          ...prev.metadata,
          tags: [...prev.metadata.tags, newTag.trim()]
        }
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        tags: prev.metadata.tags.filter(tag => tag !== tagToRemove)
      }
    }));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('alt', 'Question image');
      formData.append('caption', '');

      const response = await axios.post('/api/questions/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, {
          url: response.data.imageUrl,
          alt: 'Question image',
          caption: ''
        }]
      }));

      toast.success('Image uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required');
      return;
    }
    if (!formData.metadata.topic.trim()) {
      toast.error('Topic is required');
      return;
    }

    if (formData.type === 'mcq') {
      const hasCorrectOption = formData.options.some(opt => opt.isCorrect);
      if (!hasCorrectOption) {
        toast.error('At least one option must be marked as correct');
        return;
      }
    }

    if (formData.type === 'short-answer' && !formData.correctAnswer.trim()) {
      toast.error('Correct answer is required for short answer questions');
      return;
    }

    if (formData.type === 'code' && !formData.codeTemplate.template.trim()) {
      toast.error('Code template is required for code questions');
      return;
    }

    createQuestionMutation.mutate(formData);
  };

  const getQuestionIcon = (type) => {
    switch (type) {
      case 'mcq':
        return BookOpen;
      case 'short-answer':
        return FileText;
      case 'code':
        return Code;
      case 'image-based':
        return ImageIcon;
      default:
        return BookOpen;
    }
  };

  const QuestionIcon = getQuestionIcon(formData.type);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Question</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new question to your question bank
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FileImport className="h-4 w-4 mr-2" />
            Import Questions
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'basic', name: 'Basic Info', icon: BookOpen },
            { id: 'content', name: 'Content', icon: FileText },
            { id: 'advanced', name: 'Advanced', icon: Settings },
            { id: 'preview', name: 'Preview', icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Question Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter question title"
                />
              </div>

              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Question Type *
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="short-answer">Short Answer</option>
                  <option value="code">Code</option>
                  <option value="image-based">Image Based</option>
                  <option value="true-false">True/False</option>
                  <option value="fill-blank">Fill in the Blank</option>
                  <option value="matching">Matching</option>
                  <option value="essay">Essay</option>
                  <option value="numerical">Numerical</option>
                  <option value="drag-drop">Drag & Drop</option>
                  <option value="hotspot">Hotspot</option>
                </select>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  Question Content *
                </label>
                <textarea
                  id="content"
                  rows={4}
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter the question content"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question Type Specific Fields */}
        {formData.type === 'mcq' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <BookOpen className="h-5 w-5 inline mr-2" />
                Multiple Choice Options
              </h3>
              
              <div className="space-y-4">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={option.isCorrect}
                        onChange={(e) => handleOptionChange(index, 'isCorrect', e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder={`Option ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={option.explanation}
                        onChange={(e) => handleOptionChange(index, 'explanation', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Explanation (optional)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="flex-shrink-0 text-red-600 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addOption}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </button>
              </div>
            </div>
          </div>
        )}

        {formData.type === 'true-false' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <CheckCircle className="h-5 w-5 inline mr-2" />
                True/False Answer
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="trueFalseAnswer"
                      checked={formData.trueFalseAnswer === true}
                      onChange={() => handleChange('trueFalseAnswer', true)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">True</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="trueFalseAnswer"
                      checked={formData.trueFalseAnswer === false}
                      onChange={() => handleChange('trueFalseAnswer', false)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">False</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.type === 'numerical' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Calculator className="h-5 w-5 inline mr-2" />
                Numerical Answer
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Correct Value
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.numericalAnswer.value}
                    onChange={(e) => handleChange('numericalAnswer.value', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Tolerance
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.numericalAnswer.tolerance}
                    onChange={(e) => handleChange('numericalAnswer.tolerance', parseFloat(e.target.value) || 0)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.numericalAnswer.unit}
                    onChange={(e) => handleChange('numericalAnswer.unit', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="e.g., kg, m/s, %"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.type === 'matching' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Layers className="h-5 w-5 inline mr-2" />
                Matching Pairs
              </h3>
              
              <MatchingPairsComponent
                pairs={formData.matchingPairs}
                onPairsChange={(pairs) => handleChange('matchingPairs', pairs)}
              />
            </div>
          </div>
        )}

        {formData.type === 'drag-drop' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Target className="h-5 w-5 inline mr-2" />
                Drag & Drop Items
              </h3>
              
              <DragDropComponent
                items={formData.dragDropItems}
                onItemsChange={(items) => handleChange('dragDropItems', items)}
                type="drag-drop"
              />
            </div>
          </div>
        )}

        {formData.type === 'hotspot' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Target className="h-5 w-5 inline mr-2" />
                Hotspot Areas
              </h3>
              
              <HotspotComponent
                areas={formData.hotspotAreas}
                onAreasChange={(areas) => handleChange('hotspotAreas', areas)}
              />
            </div>
          </div>
        )}

        {formData.type === 'fill-blank' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Hash className="h-5 w-5 inline mr-2" />
                Fill in the Blank
              </h3>
              
              <FillBlankComponent
                blanks={formData.fillBlankAnswers}
                onBlanksChange={(blanks) => handleChange('fillBlankAnswers', blanks)}
              />
            </div>
          </div>
        )}

        {formData.type === 'essay' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <FileText className="h-5 w-5 inline mr-2" />
                Essay Settings
              </h3>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Minimum Length (words)
                  </label>
                  <input
                    type="number"
                    value={formData.essayRubric.minLength}
                    onChange={(e) => handleChange('essayRubric.minLength', parseInt(e.target.value) || 100)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Maximum Length (words)
                  </label>
                  <input
                    type="number"
                    value={formData.essayRubric.maxLength}
                    onChange={(e) => handleChange('essayRubric.maxLength', parseInt(e.target.value) || 1000)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {formData.type === 'short-answer' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Correct Answer
              </h3>
              
              <div>
                <label htmlFor="correctAnswer" className="block text-sm font-medium text-gray-700">
                  Expected Answer *
                </label>
                <input
                  type="text"
                  id="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={(e) => handleChange('correctAnswer', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter the correct answer"
                />
              </div>
            </div>
          </div>
        )}

        {formData.type === 'code' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Code className="h-5 w-5 inline mr-2" />
                Code Template
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                    Programming Language
                  </label>
                  <select
                    id="language"
                    value={formData.codeTemplate.language}
                    onChange={(e) => handleChange('codeTemplate.language', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="csharp">C#</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                    <option value="php">PHP</option>
                    <option value="ruby">Ruby</option>
                    <option value="swift">Swift</option>
                    <option value="kotlin">Kotlin</option>
                    <option value="typescript">TypeScript</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="template" className="block text-sm font-medium text-gray-700">
                    Code Template *
                  </label>
                  <CodeEditor
                    language={formData.codeTemplate.language}
                    value={formData.codeTemplate.template}
                    onChange={(value) => handleChange('codeTemplate.template', value)}
                    height={400}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Test Cases</h4>
                  <div className="space-y-2">
                    {formData.codeTemplate.testCases.map((testCase, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={testCase.input}
                            onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Input"
                          />
                          <input
                            type="text"
                            value={testCase.expectedOutput}
                            onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            placeholder="Expected Output"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={testCase.isHidden}
                              onChange={(e) => handleTestCaseChange(index, 'isHidden', e.target.checked)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">Hidden</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeTestCase(index)}
                            className="text-red-600 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addTestCase}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Test Case
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Images */}
        {(formData.type === 'image-based' || formData.images.length > 0) && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <ImageIcon className="h-5 w-5 inline mr-2" />
                Images
              </h3>
              
              <ImageUpload
                images={formData.images}
                onImagesChange={(images) => handleChange('images', images)}
                maxImages={5}
              />
            </div>
          </div>
        )}

        {/* Mathematical Expression */}
        {(formData.type === 'numerical' || formData.type === 'code') && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                <Calculator className="h-5 w-5 inline mr-2" />
                Mathematical Expression (Optional)
              </h3>
              
              <MathExpressionInput
                value={formData.mathematicalExpression}
                onChange={(value) => handleChange('mathematicalExpression', value)}
                placeholder="Enter mathematical expression using LaTeX syntax"
              />
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Question Metadata
            </h3>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700">
                  Topic *
                </label>
                <input
                  type="text"
                  id="topic"
                  value={formData.metadata.topic}
                  onChange={(e) => handleChange('metadata.topic', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="e.g., JavaScript, React, Algorithms"
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  value={formData.metadata.difficulty}
                  onChange={(e) => handleChange('metadata.difficulty', e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label htmlFor="points" className="block text-sm font-medium text-gray-700">
                  Points
                </label>
                <input
                  type="number"
                  id="points"
                  min="1"
                  value={formData.metadata.points}
                  onChange={(e) => handleChange('metadata.points', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="estimatedTime" className="block text-sm font-medium text-gray-700">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  id="estimatedTime"
                  min="1"
                  value={formData.metadata.estimatedTime}
                  onChange={(e) => handleChange('metadata.estimatedTime', parseInt(e.target.value))}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {formData.metadata.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500"
                    >
                      <span className="sr-only">Remove</span>
                      <svg className="w-2 h-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path strokeLinecap="round" strokeWidth="1.5" d="m1 1 6 6m0-6L1 7" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="ml-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/questions')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createQuestionMutation.isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createQuestionMutation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Question
              </>
            )}
          </button>
        </div>
      </form>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Import Questions</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import Format
                  </label>
                  <select
                    value={importType}
                    onChange={(e) => setImportType(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="csv">CSV</option>
                    <option value="json">JSON</option>
                  </select>
                </div>

                <div {...getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input {...getInputProps()} />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    {isDragActive ? (
                      <p className="text-sm text-gray-600">Drop the file here...</p>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">
                          Drag and drop a file here, or click to select
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports CSV and JSON formats
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {previewQuestions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Preview ({previewQuestions.length} questions)
                    </h4>
                    <div className="max-h-60 overflow-y-auto border rounded-md">
                      {previewQuestions.slice(0, 5).map((question, index) => (
                        <div key={index} className="p-3 border-b last:border-b-0">
                          <p className="text-sm font-medium">{question.title || question.question || `Question ${index + 1}`}</p>
                          <p className="text-xs text-gray-500">{question.type || 'Unknown type'}</p>
                        </div>
                      ))}
                      {previewQuestions.length > 5 && (
                        <div className="p-3 text-center text-sm text-gray-500">
                          ... and {previewQuestions.length - 5} more questions
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => importQuestionsMutation.mutate({ questions: previewQuestions, type: importType })}
                    disabled={previewQuestions.length === 0 || importQuestionsMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importQuestionsMutation.isLoading ? 'Importing...' : `Import ${previewQuestions.length} Questions`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateQuestion;
