const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'short-answer', 'code', 'image-based', 'true-false', 'fill-blank', 'matching', 'essay', 'numerical', 'drag-drop', 'hotspot'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  options: [{
    text: String,
    isCorrect: Boolean,
    explanation: String
  }],
  correctAnswer: {
    type: String
  },
  codeTemplate: {
    language: String,
    template: String,
    testCases: [{
      input: String,
      expectedOutput: String,
      isHidden: Boolean
    }]
  },
  images: [{
    url: String,
    alt: String,
    caption: String
  }],
  metadata: {
    topic: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    tags: [String],
    estimatedTime: Number, // in minutes
    points: {
      type: Number,
      default: 1
    }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  plagiarismScore: {
    type: Number,
    default: 0
  },
  // Enhanced question features
  hints: [{
    text: String,
    order: Number,
    isActive: { type: Boolean, default: true }
  }],
  explanation: {
    type: String,
    default: ''
  },
  references: [{
    title: String,
    url: String,
    type: { type: String, enum: ['book', 'article', 'website', 'video', 'other'] }
  }],
  adaptiveSettings: {
    difficultyAdjustment: { type: Boolean, default: false },
    personalizedHints: { type: Boolean, default: false },
    timeBasedScoring: { type: Boolean, default: false }
  },
  randomization: {
    shuffleOptions: { type: Boolean, default: false },
    shuffleOrder: { type: Boolean, default: false },
    randomizeValues: { type: Boolean, default: false },
    seed: String
  },
  // Additional question type specific fields
  trueFalseAnswer: {
    type: Boolean
  },
  fillBlankAnswers: [{
    position: Number,
    correctAnswer: String,
    alternatives: [String]
  }],
  matchingPairs: [{
    left: String,
    right: String,
    explanation: String
  }],
  numericalAnswer: {
    value: Number,
    tolerance: { type: Number, default: 0 },
    unit: String
  },
  dragDropItems: [{
    id: String,
    content: String,
    category: String,
    correctPosition: Number
  }],
  hotspotAreas: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    isCorrect: Boolean,
    explanation: String
  }]
}, {
  timestamps: true
});

// Index for efficient querying
questionSchema.index({ 'metadata.topic': 1, 'metadata.difficulty': 1 });
questionSchema.index({ 'metadata.tags': 1 });
questionSchema.index({ author: 1 });

module.exports = mongoose.model('Question', questionSchema);
