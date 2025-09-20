const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  instructions: {
    type: String
  },
  sections: [{
    name: String,
    description: String,
    timeLimit: Number, // in minutes
    questions: [{
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      points: Number,
      order: Number
    }],
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    randomizeOptions: {
      type: Boolean,
      default: false
    }
  }],
  settings: {
    totalTimeLimit: Number, // in minutes
    allowReview: {
      type: Boolean,
      default: true
    },
    allowSkip: {
      type: Boolean,
      default: true
    },
    showCorrectAnswers: {
      type: Boolean,
      default: false
    },
    showScore: {
      type: Boolean,
      default: true
    },
    maxAttempts: {
      type: Number,
      default: 1
    },
    password: String,
    ipRestrictions: [String],
    deviceRestrictions: {
      allowMobile: Boolean,
      allowTablet: Boolean,
      allowDesktop: Boolean
    }
  },
  antiCheating: {
    enabled: {
      type: Boolean,
      default: true
    },
    webcamMonitoring: {
      enabled: Boolean,
      frequency: Number // seconds between snapshots
    },
    browserLock: {
      enabled: Boolean,
      allowCopy: Boolean,
      allowPaste: Boolean,
      allowRightClick: Boolean,
      allowDevTools: Boolean
    },
    focusDetection: {
      enabled: Boolean,
      maxBlurTime: Number // seconds
    },
    behaviorMonitoring: {
      enabled: Boolean,
      trackMouseMovement: Boolean,
      trackKeyboardActivity: Boolean,
      trackTabSwitching: Boolean
    },
    plagiarismDetection: {
      enabled: Boolean,
      checkOnline: Boolean,
      similarityThreshold: Number
    }
  },
  grading: {
    method: {
      type: String,
      enum: ['points', 'percentage', 'weighted'],
      default: 'points'
    },
    passingScore: Number,
    gradeScale: [{
      minScore: Number,
      maxScore: Number,
      grade: String
    }]
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
  isPublished: {
    type: Boolean,
    default: false
  },
  startDate: Date,
  endDate: Date,
  totalPoints: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate total points before saving
examSchema.pre('save', function(next) {
  this.totalPoints = this.sections.reduce((total, section) => {
    return total + section.questions.reduce((sectionTotal, q) => sectionTotal + (q.points || 1), 0);
  }, 0);
  next();
});

module.exports = mongoose.model('Exam', examSchema);
