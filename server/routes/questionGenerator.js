const express = require('express');
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const { auth, requireRole } = require('../middleware/auth');
const natural = require('natural');
const compromise = require('compromise');
const crypto = require('crypto');

const router = express.Router();

// AI-powered question generation
router.post('/generate', auth, requireRole(['instructor', 'admin']), [
  body('topic').notEmpty(),
  body('difficulty').isIn(['easy', 'medium', 'hard']),
  body('questionTypes').isArray({ min: 1 }),
  body('count').isInt({ min: 1, max: 20 }),
  body('adaptiveDifficulty').optional().isBoolean(),
  body('randomization').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      topic,
      difficulty,
      questionTypes,
      count,
      adaptiveDifficulty = false,
      randomization = {},
      constraints = {},
      replaceIndex = null
    } = req.body;

    // Get user performance data for adaptive difficulty
    let adjustedDifficulty = difficulty;
    if (adaptiveDifficulty) {
      const userStats = await getUserPerformanceStats(req.userId);
      adjustedDifficulty = adjustDifficultyBasedOnPerformance(difficulty, userStats);
    }

    // Generate questions based on type
    const generatedQuestions = [];
    const questionsPerType = Math.ceil(count / questionTypes.length);

    for (const questionType of questionTypes) {
      const typeCount = Math.min(questionsPerType, count - generatedQuestions.length);
      
      for (let i = 0; i < typeCount; i++) {
        const question = await generateQuestionByType({
          type: questionType,
          topic,
          difficulty: adjustedDifficulty,
          constraints,
          randomization,
          author: req.userId
        });
        
        if (question) {
          generatedQuestions.push(question);
        }
      }
    }

    // Shuffle questions if requested
    if (randomization.shuffleOrder) {
      shuffleArray(generatedQuestions);
    }

    // If replacing a specific question
    if (replaceIndex !== null && replaceIndex < generatedQuestions.length) {
      const newQuestion = await generateQuestionByType({
        type: questionTypes[0],
        topic,
        difficulty: adjustedDifficulty,
        constraints,
        randomization,
        author: req.userId
      });
      
      if (newQuestion) {
        generatedQuestions[replaceIndex] = newQuestion;
      }
    }

    res.json({
      message: `Generated ${generatedQuestions.length} questions`,
      questions: generatedQuestions,
      settings: {
        topic,
        difficulty: adjustedDifficulty,
        adaptiveDifficulty
      }
    });
  } catch (error) {
    console.error('Question generation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate question by type
async function generateQuestionByType({ type, topic, difficulty, constraints, randomization, author }) {
  const baseQuestion = {
    title: '',
    type,
    content: '',
    author,
    metadata: {
      topic,
      difficulty,
      tags: generateTagsForTopic(topic),
      estimatedTime: getEstimatedTime(type, difficulty),
      points: getPointsForDifficulty(difficulty)
    },
    randomization: {
      shuffleOptions: randomization.shuffleOptions || false,
      shuffleOrder: randomization.shuffleOrder || false,
      randomizeValues: randomization.randomizeValues || false,
      seed: randomization.seed || null
    },
    hints: generateHints(topic, difficulty, type),
    explanation: generateExplanation(topic, difficulty, type),
    references: generateReferences(topic),
    adaptiveSettings: {
      difficultyAdjustment: constraints.adaptiveDifficulty || false,
      personalizedHints: constraints.personalizedHints || false,
      timeBasedScoring: constraints.timeBasedScoring || false
    }
  };

  // Apply randomization seed if provided
  if (randomization.seed) {
    setRandomSeed(randomization.seed);
  }

  switch (type) {
    case 'mcq':
      return await generateMCQ(baseQuestion, topic, difficulty, constraints);
    case 'short-answer':
      return await generateShortAnswer(baseQuestion, topic, difficulty, constraints);
    case 'code':
      return await generateCodeQuestion(baseQuestion, topic, difficulty, constraints);
    case 'true-false':
      return await generateTrueFalse(baseQuestion, topic, difficulty, constraints);
    case 'numerical':
      return await generateNumerical(baseQuestion, topic, difficulty, constraints);
    case 'matching':
      return await generateMatching(baseQuestion, topic, difficulty, constraints);
    case 'drag-drop':
      return await generateDragDrop(baseQuestion, topic, difficulty, constraints);
    case 'hotspot':
      return await generateHotspot(baseQuestion, topic, difficulty, constraints);
    case 'fill-blank':
      return await generateFillBlank(baseQuestion, topic, difficulty, constraints);
    case 'essay':
      return await generateEssay(baseQuestion, topic, difficulty, constraints);
    case 'image-based':
      return await generateImageBased(baseQuestion, topic, difficulty, constraints);
    default:
      return null;
  }
}

// AI-powered question generation using natural language processing
async function generateAIContent(topic, difficulty, type, constraints = {}) {
  try {
    // Use compromise for natural language processing
    const doc = compromise(topic);
    const keywords = doc.nouns().out('array');
    
    // Generate context-aware content based on topic and difficulty
    const content = await generateContextualContent(topic, difficulty, type, keywords);
    return content;
  } catch (error) {
    console.error('AI content generation error:', error);
    return generateFallbackContent(topic, difficulty, type);
  }
}

async function generateContextualContent(topic, difficulty, type, keywords) {
  // This would integrate with AI services like OpenAI, GPT, or local models
  // For now, we'll use rule-based generation with NLP enhancement
  
  const questionTemplates = getAdvancedQuestionTemplates(topic, difficulty, type);
  const selectedTemplate = selectOptimalTemplate(questionTemplates, difficulty, keywords);
  
  return {
    content: selectedTemplate.content,
    options: selectedTemplate.options || [],
    correctAnswer: selectedTemplate.correctAnswer || '',
    explanation: selectedTemplate.explanation || '',
    hints: selectedTemplate.hints || []
  };
}

function getAdvancedQuestionTemplates(topic, difficulty, type) {
  const templates = {
    'JavaScript': {
      easy: {
        mcq: [
          {
            content: `What is the correct way to declare a variable in JavaScript?`,
            options: ['var name = "John"', 'variable name = "John"', 'v name = "John"', 'declare name = "John"'],
            correctAnswer: 'var name = "John"',
            explanation: 'Variables in JavaScript are declared using var, let, or const keywords.',
            hints: ['Think about JavaScript variable declaration syntax', 'Consider the three main keywords: var, let, const']
          }
        ],
        code: [
          {
            content: 'Write a function that adds two numbers and returns the result.',
            template: 'function add(a, b) {\n  // Write your code here\n}',
            testCases: [
              { input: 'add(2, 3)', expectedOutput: '5' },
              { input: 'add(-1, 1)', expectedOutput: '0' }
            ],
            explanation: 'This function should take two parameters and return their sum.',
            hints: ['Use the + operator to add numbers', 'Make sure to return the result']
          }
        ]
      }
    }
  };
  
  return templates[topic]?.[difficulty]?.[type] || [];
}

function selectOptimalTemplate(templates, difficulty, keywords) {
  if (templates.length === 0) return null;
  
  // Use weighted random selection based on difficulty and keyword relevance
  const weights = templates.map(template => {
    let weight = 1;
    
    // Increase weight based on keyword matches
    const contentWords = template.content.toLowerCase().split(' ');
    const keywordMatches = keywords.filter(keyword => 
      contentWords.some(word => word.includes(keyword.toLowerCase()))
    ).length;
    
    weight += keywordMatches * 0.5;
    
    return weight;
  });
  
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < templates.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return templates[i];
    }
  }
  
  return templates[0];
}

function generateFallbackContent(topic, difficulty, type) {
  return {
    content: `Sample ${type} question about ${topic}`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctAnswer: 'Option A',
    explanation: 'This is a sample explanation.',
    hints: ['Hint 1', 'Hint 2']
  };
}

// Generate Multiple Choice Question
async function generateMCQ(baseQuestion, topic, difficulty, constraints = {}) {
  const questionTemplates = {
    'JavaScript': {
      easy: [
        'What is the correct way to declare a variable in JavaScript?',
        'Which method is used to add an element to the end of an array?',
        'What does the typeof operator return for a string?'
      ],
      medium: [
        'What is the difference between == and === in JavaScript?',
        'Which method creates a new array with all elements that pass the test?',
        'What is the purpose of the bind() method?'
      ],
      hard: [
        'Explain the concept of closures in JavaScript with an example.',
        'What is the difference between call, apply, and bind methods?',
        'How does the event loop work in JavaScript?'
      ]
    },
    'React': {
      easy: [
        'What is JSX in React?',
        'Which lifecycle method is called after a component is mounted?',
        'What is the purpose of props in React?'
      ],
      medium: [
        'What is the difference between state and props?',
        'When should you use useCallback hook?',
        'What is the purpose of React.memo?'
      ],
      hard: [
        'Explain the reconciliation process in React.',
        'What are the differences between class components and functional components?',
        'How does React handle performance optimization?'
      ]
    }
  };

  const templates = questionTemplates[topic]?.[difficulty] || questionTemplates['JavaScript'][difficulty];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  const options = generateMCQOptions(topic, difficulty, randomTemplate);
  
  return {
    ...baseQuestion,
    title: `MCQ: ${topic} - ${difficulty}`,
    content: randomTemplate,
    options: options.map((opt, index) => ({
      text: opt.text,
      isCorrect: opt.isCorrect,
      explanation: opt.explanation || ''
    }))
  };
}

// Generate Short Answer Question
function generateShortAnswer(baseQuestion, topic, difficulty) {
  const questionTemplates = {
    'JavaScript': {
      easy: [
        'What is a variable in JavaScript?',
        'Name three data types in JavaScript.',
        'What is the purpose of console.log()?'
      ],
      medium: [
        'Explain the concept of hoisting in JavaScript.',
        'What is the difference between let and var?',
        'Describe the purpose of arrow functions.'
      ],
      hard: [
        'Explain the concept of prototypal inheritance in JavaScript.',
        'What is the difference between synchronous and asynchronous programming?',
        'Describe the event delegation pattern.'
      ]
    }
  };

  const templates = questionTemplates[topic]?.[difficulty] || questionTemplates['JavaScript'][difficulty];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    ...baseQuestion,
    title: `Short Answer: ${topic} - ${difficulty}`,
    content: randomTemplate,
    correctAnswer: generateShortAnswerAnswer(topic, difficulty, randomTemplate)
  };
}

// Generate Code Question
function generateCodeQuestion(baseQuestion, topic, difficulty) {
  const codeTemplates = {
    'JavaScript': {
      easy: [
        {
          template: 'function add(a, b) {\n  // Write your code here\n}',
          description: 'Write a function that adds two numbers and returns the result.',
          testCases: [
            { input: 'add(2, 3)', expectedOutput: '5' },
            { input: 'add(-1, 1)', expectedOutput: '0' }
          ]
        }
      ],
      medium: [
        {
          template: 'function findMax(arr) {\n  // Write your code here\n}',
          description: 'Write a function that finds the maximum number in an array.',
          testCases: [
            { input: 'findMax([1, 5, 3, 9, 2])', expectedOutput: '9' },
            { input: 'findMax([-1, -5, -3])', expectedOutput: '-1' }
          ]
        }
      ],
      hard: [
        {
          template: 'function fibonacci(n) {\n  // Write your code here\n}',
          description: 'Write a function that returns the nth Fibonacci number using memoization.',
          testCases: [
            { input: 'fibonacci(10)', expectedOutput: '55' },
            { input: 'fibonacci(0)', expectedOutput: '0' }
          ]
        }
      ]
    }
  };

  const templates = codeTemplates[topic]?.[difficulty] || codeTemplates['JavaScript'][difficulty];
  const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    ...baseQuestion,
    title: `Code: ${topic} - ${difficulty}`,
    content: randomTemplate.description,
    codeTemplate: {
      language: 'javascript',
      template: randomTemplate.template,
      testCases: randomTemplate.testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: false
      }))
    }
  };
}

// Generate True/False Question
function generateTrueFalse(baseQuestion, topic, difficulty) {
  const statements = {
    'JavaScript': {
      easy: [
        { statement: 'JavaScript is a case-sensitive language.', correct: true },
        { statement: 'var has block scope in JavaScript.', correct: false },
        { statement: 'console.log() is used to display output.', correct: true }
      ],
      medium: [
        { statement: 'Arrow functions have their own this binding.', correct: false },
        { statement: 'const variables can be reassigned.', correct: false },
        { statement: 'JavaScript is a single-threaded language.', correct: true }
      ],
      hard: [
        { statement: 'Closures can cause memory leaks in JavaScript.', correct: true },
        { statement: 'Promises are always asynchronous.', correct: false },
        { statement: 'JavaScript uses prototypal inheritance.', correct: true }
      ]
    }
  };

  const topicStatements = statements[topic]?.[difficulty] || statements['JavaScript'][difficulty];
  const randomStatement = topicStatements[Math.floor(Math.random() * topicStatements.length)];
  
  return {
    ...baseQuestion,
    title: `True/False: ${topic} - ${difficulty}`,
    content: randomStatement.statement,
    trueFalseAnswer: randomStatement.correct
  };
}

// Generate Numerical Question
function generateNumerical(baseQuestion, topic, difficulty) {
  const numericalQuestions = {
    'JavaScript': {
      easy: [
        { question: 'What is the result of 2 + 3 * 4?', answer: 14 },
        { question: 'What is the length of the string "Hello"?', answer: 5 }
      ],
      medium: [
        { question: 'What is the result of Math.floor(3.7)?', answer: 3 },
        { question: 'What is the index of "world" in "Hello world"?', answer: 6 }
      ],
      hard: [
        { question: 'What is the result of 2 ** 10?', answer: 1024 },
        { question: 'What is the result of parseInt("1010", 2)?', answer: 10 }
      ]
    }
  };

  const questions = numericalQuestions[topic]?.[difficulty] || numericalQuestions['JavaScript'][difficulty];
  const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
  
  return {
    ...baseQuestion,
    title: `Numerical: ${topic} - ${difficulty}`,
    content: randomQuestion.question,
    numericalAnswer: {
      value: randomQuestion.answer,
      tolerance: 0,
      unit: ''
    }
  };
}

// Generate Matching Question
function generateMatching(baseQuestion, topic, difficulty) {
  const matchingPairs = {
    'JavaScript': {
      easy: [
        { left: 'console.log()', right: 'Display output' },
        { left: 'parseInt()', right: 'Convert string to integer' },
        { left: 'Math.random()', right: 'Generate random number' }
      ],
      medium: [
        { left: 'Array.map()', right: 'Transform array elements' },
        { left: 'Array.filter()', right: 'Filter array elements' },
        { left: 'Array.reduce()', right: 'Reduce array to single value' }
      ],
      hard: [
        { left: 'Closure', right: 'Function with access to outer scope' },
        { left: 'Prototype', right: 'Object from which other objects inherit' },
        { left: 'Event Loop', right: 'JavaScript execution model' }
      ]
    }
  };

  const pairs = matchingPairs[topic]?.[difficulty] || matchingPairs['JavaScript'][difficulty];
  const selectedPairs = pairs.slice(0, Math.min(4, pairs.length));
  
  return {
    ...baseQuestion,
    title: `Matching: ${topic} - ${difficulty}`,
    content: 'Match the following JavaScript concepts with their descriptions:',
    matchingPairs: selectedPairs.map(pair => ({
      left: pair.left,
      right: pair.right,
      explanation: ''
    }))
  };
}

// Helper functions
function generateMCQOptions(topic, difficulty, question) {
  // This is a simplified version - in production, use AI/ML models
  const correctAnswer = generateCorrectAnswer(topic, difficulty, question);
  const incorrectAnswers = generateIncorrectAnswers(topic, difficulty, question);
  
  const options = [
    { text: correctAnswer, isCorrect: true, explanation: 'This is the correct answer.' },
    ...incorrectAnswers.map(answer => ({ text: answer, isCorrect: false, explanation: '' }))
  ];
  
  // Shuffle options
  return shuffleArray(options);
}

function generateCorrectAnswer(topic, difficulty, question) {
  // Simplified correct answer generation
  const answers = {
    'JavaScript': {
      'What is the correct way to declare a variable in JavaScript?': 'var, let, or const',
      'Which method is used to add an element to the end of an array?': 'push()',
      'What does the typeof operator return for a string?': 'string'
    }
  };
  
  return answers[topic]?.[question] || 'Correct answer';
}

function generateIncorrectAnswers(topic, difficulty, question) {
  // Simplified incorrect answer generation
  return [
    'Incorrect option 1',
    'Incorrect option 2',
    'Incorrect option 3'
  ];
}

function generateShortAnswerAnswer(topic, difficulty, question) {
  // Simplified answer generation
  return 'Sample correct answer';
}

function generateTagsForTopic(topic) {
  const tagMap = {
    'JavaScript': ['javascript', 'programming', 'web'],
    'React': ['react', 'javascript', 'frontend'],
    'Node.js': ['nodejs', 'javascript', 'backend'],
    'Database': ['database', 'sql', 'data']
  };
  
  return tagMap[topic] || ['general'];
}

function getEstimatedTime(type, difficulty) {
  const baseTime = {
    'mcq': 2,
    'short-answer': 5,
    'code': 15,
    'true-false': 1,
    'numerical': 3,
    'matching': 5
  };
  
  const difficultyMultiplier = {
    'easy': 1,
    'medium': 1.5,
    'hard': 2
  };
  
  return Math.ceil(baseTime[type] * difficultyMultiplier[difficulty]);
}

function getPointsForDifficulty(difficulty) {
  const points = {
    'easy': 1,
    'medium': 2,
    'hard': 3
  };
  
  return points[difficulty];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function getUserPerformanceStats(userId) {
  // This would query the database for user performance data
  // For now, return mock data
  return {
    averageScore: 75,
    totalAttempts: 10,
    improvementRate: 0.1
  };
}

function adjustDifficultyBasedOnPerformance(baseDifficulty, userStats) {
  if (userStats.averageScore > 80) {
    return 'hard';
  } else if (userStats.averageScore < 60) {
    return 'easy';
  }
  return baseDifficulty;
}

// New question type generators
async function generateDragDrop(baseQuestion, topic, difficulty, constraints = {}) {
  const content = await generateAIContent(topic, difficulty, 'drag-drop', constraints);
  
  const items = generateDragDropItems(topic, difficulty);
  
  return {
    ...baseQuestion,
    title: `Drag & Drop: ${topic} - ${difficulty}`,
    content: content.content || `Arrange the following ${topic} concepts in the correct order:`,
    dragDropItems: items,
    explanation: content.explanation || 'Drag and drop the items to arrange them correctly.'
  };
}

async function generateHotspot(baseQuestion, topic, difficulty, constraints = {}) {
  const content = await generateAIContent(topic, difficulty, 'hotspot', constraints);
  
  return {
    ...baseQuestion,
    title: `Hotspot: ${topic} - ${difficulty}`,
    content: content.content || `Click on the correct area in the image related to ${topic}:`,
    hotspotAreas: generateHotspotAreas(topic, difficulty),
    explanation: content.explanation || 'Click on the correct hotspot area.'
  };
}

async function generateFillBlank(baseQuestion, topic, difficulty, constraints = {}) {
  const content = await generateAIContent(topic, difficulty, 'fill-blank', constraints);
  
  return {
    ...baseQuestion,
    title: `Fill in the Blank: ${topic} - ${difficulty}`,
    content: content.content || `Complete the following ${topic} statement:`,
    fillBlankAnswers: generateFillBlankAnswers(topic, difficulty),
    explanation: content.explanation || 'Fill in the blanks with the correct terms.'
  };
}

async function generateEssay(baseQuestion, topic, difficulty, constraints = {}) {
  const content = await generateAIContent(topic, difficulty, 'essay', constraints);
  
  return {
    ...baseQuestion,
    title: `Essay: ${topic} - ${difficulty}`,
    content: content.content || `Write a comprehensive essay about ${topic}:`,
    essayRubric: {
      criteria: generateEssayCriteria(topic, difficulty),
      maxLength: getEssayLength(difficulty).max,
      minLength: getEssayLength(difficulty).min
    },
    explanation: content.explanation || 'Provide a detailed written response.'
  };
}

async function generateImageBased(baseQuestion, topic, difficulty, constraints = {}) {
  const content = await generateAIContent(topic, difficulty, 'image-based', constraints);
  
  return {
    ...baseQuestion,
    title: `Image-based: ${topic} - ${difficulty}`,
    content: content.content || `Analyze the following image related to ${topic}:`,
    images: generateImageQuestions(topic, difficulty),
    explanation: content.explanation || 'Analyze the image and answer the question.'
  };
}

// Helper functions for new question types
function generateDragDropItems(topic, difficulty) {
  const items = {
    'JavaScript': {
      easy: [
        { content: 'Variable Declaration', category: 'Syntax', correctPosition: 1 },
        { content: 'Function Definition', category: 'Syntax', correctPosition: 2 },
        { content: 'Conditional Statement', category: 'Control Flow', correctPosition: 3 },
        { content: 'Loop Structure', category: 'Control Flow', correctPosition: 4 }
      ],
      medium: [
        { content: 'Array Methods', category: 'Data Structures', correctPosition: 1 },
        { content: 'Object Properties', category: 'Data Structures', correctPosition: 2 },
        { content: 'Event Handling', category: 'DOM', correctPosition: 3 },
        { content: 'Asynchronous Code', category: 'Advanced', correctPosition: 4 }
      ]
    }
  };
  
  return items[topic]?.[difficulty] || [];
}

function generateHotspotAreas(topic, difficulty) {
  // Generate mock hotspot areas - in production, these would be based on actual images
  return [
    { x: 100, y: 100, width: 50, height: 50, isCorrect: true, explanation: 'Correct area' },
    { x: 200, y: 200, width: 50, height: 50, isCorrect: false, explanation: 'Incorrect area' }
  ];
}

function generateFillBlankAnswers(topic, difficulty) {
  const answers = {
    'JavaScript': {
      easy: [
        { position: 1, correctAnswer: 'var', alternatives: ['let', 'const'] },
        { position: 2, correctAnswer: 'function', alternatives: ['func', 'def'] }
      ],
      medium: [
        { position: 1, correctAnswer: 'closure', alternatives: ['scope', 'context'] },
        { position: 2, correctAnswer: 'prototype', alternatives: ['inheritance', 'class'] }
      ]
    }
  };
  
  return answers[topic]?.[difficulty] || [];
}

function generateEssayCriteria(topic, difficulty) {
  return [
    { name: 'Content Knowledge', weight: 0.4, description: 'Demonstrates understanding of the topic' },
    { name: 'Critical Thinking', weight: 0.3, description: 'Shows analytical and evaluative skills' },
    { name: 'Communication', weight: 0.2, description: 'Clear and coherent writing' },
    { name: 'Examples', weight: 0.1, description: 'Uses relevant examples and evidence' }
  ];
}

function getEssayLength(difficulty) {
  const lengths = {
    easy: { min: 100, max: 300 },
    medium: { min: 300, max: 600 },
    hard: { min: 600, max: 1000 }
  };
  
  return lengths[difficulty] || lengths.medium;
}

function generateImageQuestions(topic, difficulty) {
  // In production, this would generate or select appropriate images
  return [
    {
      url: '/api/images/placeholder',
      alt: `${topic} diagram`,
      caption: `Analyze this ${topic} diagram`
    }
  ];
}

// Enhanced helper functions
function generateHints(topic, difficulty, type) {
  const hintTemplates = {
    'JavaScript': {
      easy: [
        'Think about the basic syntax',
        'Consider the fundamental concepts',
        'Remember the key keywords'
      ],
      medium: [
        'Consider the underlying principles',
        'Think about best practices',
        'Consider edge cases'
      ],
      hard: [
        'Think about advanced concepts',
        'Consider performance implications',
        'Think about scalability'
      ]
    }
  };
  
  const hints = hintTemplates[topic]?.[difficulty] || hintTemplates['JavaScript'][difficulty];
  return hints.map((hint, index) => ({
    text: hint,
    order: index + 1,
    isActive: true
  }));
}

function generateExplanation(topic, difficulty, type) {
  return `This ${type} question tests your understanding of ${topic} concepts at the ${difficulty} level. The correct answer demonstrates proper knowledge of the fundamental principles and best practices.`;
}

function generateReferences(topic) {
  const references = {
    'JavaScript': [
      { title: 'MDN JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', type: 'website' },
      { title: 'Eloquent JavaScript', url: 'https://eloquentjavascript.net/', type: 'book' }
    ],
    'React': [
      { title: 'React Documentation', url: 'https://reactjs.org/docs', type: 'website' },
      { title: 'React Patterns', url: 'https://reactpatterns.com/', type: 'website' }
    ]
  };
  
  return references[topic] || references['JavaScript'];
}

function setRandomSeed(seed) {
  // Set random seed for reproducible generation
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  const numericSeed = parseInt(hash.substring(0, 8), 16);
  
  // Simple seeded random number generator
  let currentSeed = numericSeed;
  Math.random = function() {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };
}

module.exports = router;
