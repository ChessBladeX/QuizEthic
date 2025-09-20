const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question'
    },
    answer: mongoose.Schema.Types.Mixed,
    timeSpent: Number, // in seconds
    isCorrect: Boolean,
    points: Number
  }],
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  timeSpent: Number, // total time in seconds
  score: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  grade: String,
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned', 'flagged'],
    default: 'in-progress'
  },
  antiCheating: {
    violations: [{
      type: {
        type: String,
        enum: ['tab-switch', 'copy-paste', 'right-click', 'dev-tools', 'focus-loss', 'suspicious-behavior', 'plagiarism']
      },
      timestamp: Date,
      details: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    }],
    webcamSnapshots: [{
      timestamp: Date,
      imageUrl: String,
      flagged: Boolean
    }],
    behaviorData: {
      mouseMovements: [{
        x: Number,
        y: Number,
        timestamp: Date
      }],
      keyboardActivity: [{
        key: String,
        timestamp: Date,
        action: String
      }],
      focusEvents: [{
        type: String, // 'blur', 'focus'
        timestamp: Date,
        duration: Number
      }]
    },
    deviceInfo: {
      fingerprint: String,
      userAgent: String,
      screenResolution: String,
      timezone: String,
      language: String
    },
    ipAddress: String,
    location: {
      country: String,
      region: String,
      city: String
    }
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flagReason: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNotes: String
}, {
  timestamps: true
});

// Calculate score before saving
attemptSchema.pre('save', function(next) {
  if (this.answers && this.answers.length > 0) {
    this.score = this.answers.reduce((total, answer) => total + (answer.points || 0), 0);
    this.percentage = this.exam ? (this.score / this.exam.totalPoints) * 100 : 0;
  }
  next();
});

module.exports = mongoose.model('Attempt', attemptSchema);
