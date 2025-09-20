const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const { auth, requireRole } = require('../middleware/auth');
const { io } = require('../index');
const natural = require('natural');

const router = express.Router();

// Get all exams with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['draft', 'published', 'active', 'completed']),
  query('author').optional().isMongoId(),
  query('search').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      page = 1,
      limit = 10,
      status,
      author,
      search
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (author) filter.author = author;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status) {
      const now = new Date();
      switch (status) {
        case 'draft':
          filter.isPublished = false;
          break;
        case 'published':
          filter.isPublished = true;
          filter.startDate = { $gt: now };
          break;
        case 'active':
          filter.isPublished = true;
          filter.startDate = { $lte: now };
          filter.endDate = { $gte: now };
          break;
        case 'completed':
          filter.isPublished = true;
          filter.endDate = { $lt: now };
          break;
      }
    }

    const exams = await Exam.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Exam.countDocuments(filter);

    res.json({
      exams,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get exam by ID
router.get('/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('author', 'firstName lastName')
      .populate('sections.questions.question', 'title type content metadata');
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(exam);
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new exam
router.post('/', auth, requireRole(['instructor', 'admin']), [
  body('title').notEmpty().trim(),
  body('description').optional().notEmpty(),
  body('instructions').optional().notEmpty(),
  body('sections').isArray({ min: 1 }),
  body('sections.*.name').notEmpty(),
  body('sections.*.questions').isArray({ min: 1 }),
  body('settings.totalTimeLimit').optional().isInt({ min: 1 }),
  body('antiCheating.enabled').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Validate questions exist and are active
    const allQuestionIds = req.body.sections.flatMap(section => 
      section.questions.map(q => q.question)
    );
    
    const questions = await Question.find({
      _id: { $in: allQuestionIds },
      isActive: true
    });

    if (questions.length !== allQuestionIds.length) {
      return res.status(400).json({ message: 'Some questions are invalid or inactive' });
    }

    const examData = {
      ...req.body,
      author: req.userId
    };

    const exam = new Exam(examData);
    await exam.save();

    res.status(201).json({
      message: 'Exam created successfully',
      exam
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update exam
router.put('/:id', auth, requireRole(['instructor', 'admin']), [
  body('title').optional().notEmpty().trim(),
  body('description').optional().notEmpty(),
  body('instructions').optional().notEmpty(),
  body('sections').optional().isArray({ min: 1 }),
  body('settings.totalTimeLimit').optional().isInt({ min: 1 }),
  body('antiCheating.enabled').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate questions if sections are being updated
    if (req.body.sections) {
      const allQuestionIds = req.body.sections.flatMap(section => 
        section.questions.map(q => q.question)
      );
      
      const questions = await Question.find({
        _id: { $in: allQuestionIds },
        isActive: true
      });

      if (questions.length !== allQuestionIds.length) {
        return res.status(400).json({ message: 'Some questions are invalid or inactive' });
      }
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Exam updated successfully',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Publish exam
router.post('/:id/publish', auth, requireRole(['instructor', 'admin']), [
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    exam.isPublished = true;
    if (req.body.startDate) exam.startDate = new Date(req.body.startDate);
    if (req.body.endDate) exam.endDate = new Date(req.body.endDate);

    await exam.save();

    res.json({
      message: 'Exam published successfully',
      exam
    });
  } catch (error) {
    console.error('Publish exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unpublish exam
router.post('/:id/unpublish', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    exam.isPublished = false;
    await exam.save();

    res.json({
      message: 'Exam unpublished successfully',
      exam
    });
  } catch (error) {
    console.error('Unpublish exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete exam
router.delete('/:id', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    exam.isActive = false;
    await exam.save();

    res.json({ message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get exam statistics
router.get('/:id/stats', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get attempt statistics (this would require additional queries in a real implementation)
    const stats = {
      totalAttempts: 0,
      averageScore: 0,
      completionRate: 0,
      averageTimeSpent: 0,
      flaggedAttempts: 0,
      createdAt: exam.createdAt,
      lastModified: exam.updatedAt
    };

    res.json(stats);
  } catch (error) {
    console.error('Get exam stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate exam preview (for students to see before starting)
router.get('/:id/preview', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('sections.questions.question', 'title type metadata');
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!exam.isPublished) {
      return res.status(403).json({ message: 'Exam is not published' });
    }

    // Return exam info without sensitive data
    const preview = {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      settings: {
        totalTimeLimit: exam.settings.totalTimeLimit,
        allowReview: exam.settings.allowReview,
        allowSkip: exam.settings.allowSkip,
        maxAttempts: exam.settings.maxAttempts
      },
      sections: exam.sections.map(section => ({
        name: section.name,
        description: section.description,
        timeLimit: section.timeLimit,
        questionCount: section.questions.length,
        randomizeQuestions: section.randomizeQuestions,
        randomizeOptions: section.randomizeOptions
      })),
      totalPoints: exam.totalPoints,
      startDate: exam.startDate,
      endDate: exam.endDate
    };

    res.json(preview);
  } catch (error) {
    console.error('Get exam preview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Advanced grading rules management
router.post('/:id/grading-rules', auth, requireRole(['instructor', 'admin']), [
  body('method').isIn(['points', 'percentage', 'weighted', 'adaptive']),
  body('passingScore').optional().isFloat({ min: 0, max: 100 }),
  body('gradeScale').optional().isArray(),
  body('penalties').optional().isObject(),
  body('bonuses').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    exam.grading = {
      ...exam.grading,
      ...req.body
    };

    await exam.save();

    res.json({
      message: 'Grading rules updated successfully',
      grading: exam.grading
    });
  } catch (error) {
    console.error('Update grading rules error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Section management
router.post('/:id/sections', auth, requireRole(['instructor', 'admin']), [
  body('name').notEmpty(),
  body('description').optional(),
  body('timeLimit').optional().isInt({ min: 1 }),
  body('questions').isArray({ min: 1 }),
  body('randomizeQuestions').optional().isBoolean(),
  body('randomizeOptions').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Validate questions exist
    const questionIds = req.body.questions.map(q => q.question);
    const questions = await Question.find({
      _id: { $in: questionIds },
      isActive: true
    });

    if (questions.length !== questionIds.length) {
      return res.status(400).json({ message: 'Some questions are invalid or inactive' });
    }

    const newSection = {
      name: req.body.name,
      description: req.body.description || '',
      timeLimit: req.body.timeLimit || null,
      questions: req.body.questions.map((q, index) => ({
        question: q.question,
        points: q.points || 1,
        order: index
      })),
      randomizeQuestions: req.body.randomizeQuestions || false,
      randomizeOptions: req.body.randomizeOptions || false
    };

    exam.sections.push(newSection);
    await exam.save();

    res.json({
      message: 'Section added successfully',
      section: newSection
    });
  } catch (error) {
    console.error('Add section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update section
router.put('/:id/sections/:sectionId', auth, requireRole(['instructor', 'admin']), [
  body('name').optional().notEmpty(),
  body('description').optional(),
  body('timeLimit').optional().isInt({ min: 1 }),
  body('questions').optional().isArray({ min: 1 }),
  body('randomizeQuestions').optional().isBoolean(),
  body('randomizeOptions').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const section = exam.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    // Validate questions if being updated
    if (req.body.questions) {
      const questionIds = req.body.questions.map(q => q.question);
      const questions = await Question.find({
        _id: { $in: questionIds },
        isActive: true
      });

      if (questions.length !== questionIds.length) {
        return res.status(400).json({ message: 'Some questions are invalid or inactive' });
      }

      section.questions = req.body.questions.map((q, index) => ({
        question: q.question,
        points: q.points || 1,
        order: index
      }));
    }

    // Update other fields
    if (req.body.name) section.name = req.body.name;
    if (req.body.description !== undefined) section.description = req.body.description;
    if (req.body.timeLimit !== undefined) section.timeLimit = req.body.timeLimit;
    if (req.body.randomizeQuestions !== undefined) section.randomizeQuestions = req.body.randomizeQuestions;
    if (req.body.randomizeOptions !== undefined) section.randomizeOptions = req.body.randomizeOptions;

    await exam.save();

    res.json({
      message: 'Section updated successfully',
      section
    });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete section
router.delete('/:id/sections/:sectionId', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const section = exam.sections.id(req.params.sectionId);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }

    section.remove();
    await exam.save();

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reorder sections
router.post('/:id/sections/reorder', auth, requireRole(['instructor', 'admin']), [
  body('sectionIds').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { sectionIds } = req.body;
    const reorderedSections = sectionIds.map(id => exam.sections.id(id)).filter(Boolean);
    
    if (reorderedSections.length !== sectionIds.length) {
      return res.status(400).json({ message: 'Some sections not found' });
    }

    exam.sections = reorderedSections;
    await exam.save();

    res.json({ message: 'Sections reordered successfully' });
  } catch (error) {
    console.error('Reorder sections error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Calculate exam score with advanced grading
router.post('/:id/calculate-score', auth, async (req, res) => {
  try {
    const { answers, timeSpent, violations } = req.body;
    
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const score = calculateAdvancedScore(exam, answers, timeSpent, violations);

    res.json({
      score: score.totalScore,
      percentage: score.percentage,
      grade: score.grade,
      breakdown: score.breakdown,
      feedback: score.feedback
    });
  } catch (error) {
    console.error('Calculate score error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function for advanced score calculation
function calculateAdvancedScore(exam, answers, timeSpent, violations) {
  let totalScore = 0;
  let maxScore = exam.totalPoints;
  let breakdown = {};
  let feedback = [];

  // Calculate base score from answers
  for (const section of exam.sections) {
    let sectionScore = 0;
    let sectionMax = 0;

    for (const questionRef of section.questions) {
      const answer = answers[questionRef.question.toString()];
      const questionScore = calculateQuestionScore(questionRef, answer);
      
      sectionScore += questionScore;
      sectionMax += questionRef.points || 1;
    }

    breakdown[section.name] = {
      score: sectionScore,
      maxScore: sectionMax,
      percentage: sectionMax > 0 ? (sectionScore / sectionMax) * 100 : 0
    };

    totalScore += sectionScore;
  }

  // Apply grading method
  let percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  // Apply penalties
  if (exam.grading.penalties) {
    const penalties = exam.grading.penalties;
    
    // Time penalty
    if (penalties.timePenalty && timeSpent > exam.settings.totalTimeLimit) {
      const overtime = timeSpent - exam.settings.totalTimeLimit;
      const penalty = Math.min(penalties.timePenalty * overtime, percentage * 0.5);
      percentage -= penalty;
      feedback.push(`Time penalty: -${penalty.toFixed(1)}% for overtime`);
    }

    // Violation penalty
    if (penalties.violationPenalty && violations && violations.length > 0) {
      const violationPenalty = violations.length * penalties.violationPenalty;
      percentage -= violationPenalty;
      feedback.push(`Violation penalty: -${violationPenalty.toFixed(1)}% for ${violations.length} violations`);
    }
  }

  // Apply bonuses
  if (exam.grading.bonuses) {
    const bonuses = exam.grading.bonuses;
    
    // Early completion bonus
    if (bonuses.earlyCompletion && timeSpent < exam.settings.totalTimeLimit * 0.8) {
      const bonus = bonuses.earlyCompletion;
      percentage += bonus;
      feedback.push(`Early completion bonus: +${bonus.toFixed(1)}%`);
    }
  }

  // Determine grade
  let grade = 'F';
  if (exam.grading.gradeScale) {
    for (const gradeRule of exam.grading.gradeScale) {
      if (percentage >= gradeRule.minScore && percentage <= gradeRule.maxScore) {
        grade = gradeRule.grade;
        break;
      }
    }
  } else {
    // Default grading scale
    if (percentage >= 90) grade = 'A';
    else if (percentage >= 80) grade = 'B';
    else if (percentage >= 70) grade = 'C';
    else if (percentage >= 60) grade = 'D';
  }

  return {
    totalScore: Math.max(0, totalScore),
    percentage: Math.max(0, Math.min(100, percentage)),
    grade,
    breakdown,
    feedback
  };
}

function calculateQuestionScore(questionRef, answer) {
  // This is a simplified version - in production, implement proper scoring logic
  // based on question type and answer format
  if (!answer) return 0;
  
  // For now, return full points if answer exists
  return questionRef.points || 1;
}

// Advanced exam analytics and reporting
router.get('/:id/analytics', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange = '30d', groupBy = 'day' } = req.query;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const analytics = await generateExamAnalytics(id, timeRange, groupBy);
    res.json(analytics);
  } catch (error) {
    console.error('Get exam analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Real-time exam monitoring
router.get('/:id/monitoring', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get active attempts with real-time data
    const activeAttempts = await Attempt.find({
      exam: id,
      status: 'in-progress'
    }).populate('student', 'firstName lastName email').select('student antiCheating createdAt');

    // Get recent violations
    const recentViolations = await Attempt.aggregate([
      {
        $match: {
          exam: id,
          'antiCheating.violations': { $exists: true, $ne: [] },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }
      },
      { $unwind: '$antiCheating.violations' },
      {
        $project: {
          student: 1,
          violation: '$antiCheating.violations',
          createdAt: 1
        }
      },
      { $sort: { 'violation.timestamp': -1 } },
      { $limit: 20 }
    ]);

    res.json({
      activeAttempts: activeAttempts.length,
      recentViolations: recentViolations.length,
      examStatus: getExamStatus(exam),
      monitoringData: {
        totalAttempts: activeAttempts.length,
        flaggedAttempts: activeAttempts.filter(a => a.isFlagged).length,
        averageRiskScore: calculateAverageRiskScore(activeAttempts)
      }
    });
  } catch (error) {
    console.error('Get exam monitoring error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Adaptive difficulty adjustment
router.post('/:id/adaptive-difficulty', auth, requireRole(['instructor', 'admin']), [
  body('enabled').isBoolean(),
  body('adjustmentRate').optional().isFloat({ min: 0, max: 1 }),
  body('minDifficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('maxDifficulty').optional().isIn(['easy', 'medium', 'hard'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    exam.adaptiveSettings = {
      ...exam.adaptiveSettings,
      ...req.body
    };

    await exam.save();

    res.json({
      message: 'Adaptive difficulty settings updated successfully',
      adaptiveSettings: exam.adaptiveSettings
    });
  } catch (error) {
    console.error('Update adaptive difficulty error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Proctoring session management
router.post('/:id/proctoring/start', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!exam.isPublished) {
      return res.status(403).json({ message: 'Exam is not published' });
    }

    // Check if exam is currently active
    const now = new Date();
    if (exam.startDate && exam.startDate > now) {
      return res.status(403).json({ message: 'Exam has not started yet' });
    }
    if (exam.endDate && exam.endDate < now) {
      return res.status(403).json({ message: 'Exam has ended' });
    }

    // Create proctoring session
    const proctoringSession = {
      studentId: studentId || req.userId,
      examId: id,
      startTime: new Date(),
      status: 'active',
      violations: [],
      behaviorData: {
        mouseMovements: [],
        keyboardActivity: [],
        focusEvents: []
      }
    };

    // Store in attempt or separate proctoring collection
    const attempt = new Attempt({
      exam: id,
      student: studentId || req.userId,
      status: 'in-progress',
      proctoringSession,
      antiCheating: {
        enabled: exam.antiCheating.enabled,
        violations: [],
        behaviorData: proctoringSession.behaviorData
      }
    });

    await attempt.save();

    // Emit real-time event for instructors
    io.to(`exam-${id}`).emit('proctoring-started', {
      studentId: studentId || req.userId,
      examId: id,
      startTime: proctoringSession.startTime
    });

    res.json({
      message: 'Proctoring session started successfully',
      sessionId: attempt._id,
      proctoringSettings: exam.antiCheating
    });
  } catch (error) {
    console.error('Start proctoring session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// End proctoring session
router.post('/:id/proctoring/end', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { sessionId, finalAnswers } = req.body;

    const attempt = await Attempt.findById(sessionId);
    if (!attempt) {
      return res.status(404).json({ message: 'Proctoring session not found' });
    }

    // Update attempt with final data
    attempt.status = 'completed';
    attempt.answers = finalAnswers || {};
    attempt.endTime = new Date();
    attempt.duration = attempt.endTime - attempt.startTime;

    // Calculate final score
    const exam = await Exam.findById(id);
    const score = calculateAdvancedScore(exam, attempt.answers, attempt.duration, attempt.antiCheating.violations);
    
    attempt.score = score.totalScore;
    attempt.percentage = score.percentage;
    attempt.grade = score.grade;

    await attempt.save();

    // Emit real-time event for instructors
    io.to(`exam-${id}`).emit('proctoring-ended', {
      studentId: attempt.student,
      examId: id,
      endTime: attempt.endTime,
      score: attempt.score,
      violations: attempt.antiCheating.violations.length
    });

    res.json({
      message: 'Proctoring session ended successfully',
      score: attempt.score,
      percentage: attempt.percentage,
      grade: attempt.grade,
      violations: attempt.antiCheating.violations.length
    });
  } catch (error) {
    console.error('End proctoring session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get detailed exam results
router.get('/:id/results', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, sortBy = 'score', sortOrder = 'desc' } = req.query;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const attempts = await Attempt.find({ exam: id, status: 'completed' })
      .populate('student', 'firstName lastName email')
      .select('student score percentage grade duration antiCheating.violations createdAt')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attempt.countDocuments({ exam: id, status: 'completed' });

    // Calculate statistics
    const stats = await calculateExamStatistics(id);

    res.json({
      attempts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      statistics: stats
    });
  } catch (error) {
    console.error('Get exam results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export exam results
router.get('/:id/export', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'csv' } = req.query;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attempts = await Attempt.find({ exam: id, status: 'completed' })
      .populate('student', 'firstName lastName email')
      .select('student score percentage grade duration antiCheating.violations createdAt');

    if (format === 'csv') {
      const csvData = generateCSVExport(attempts, exam);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="exam-${id}-results.csv"`);
      res.send(csvData);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="exam-${id}-results.json"`);
      res.json({ exam, attempts });
    } else {
      res.status(400).json({ message: 'Unsupported export format' });
    }
  } catch (error) {
    console.error('Export exam results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
async function generateExamAnalytics(examId, timeRange, groupBy) {
  const timeRanges = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000
  };

  const startTime = new Date(Date.now() - timeRanges[timeRange]);

  const analytics = await Attempt.aggregate([
    {
      $match: {
        exam: examId,
        createdAt: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        completedAttempts: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        averageScore: { $avg: '$score' },
        averagePercentage: { $avg: '$percentage' },
        averageDuration: { $avg: '$duration' },
        flaggedAttempts: { $sum: { $cond: ['$isFlagged', 1, 0] } },
        totalViolations: { $sum: { $size: '$antiCheating.violations' } }
      }
    }
  ]);

  const result = analytics[0] || {
    totalAttempts: 0,
    completedAttempts: 0,
    averageScore: 0,
    averagePercentage: 0,
    averageDuration: 0,
    flaggedAttempts: 0,
    totalViolations: 0
  };

  // Calculate additional metrics
  result.completionRate = result.totalAttempts > 0 ? (result.completedAttempts / result.totalAttempts) * 100 : 0;
  result.flagRate = result.totalAttempts > 0 ? (result.flaggedAttempts / result.totalAttempts) * 100 : 0;
  result.averageViolationsPerAttempt = result.completedAttempts > 0 ? result.totalViolations / result.completedAttempts : 0;

  return result;
}

function getExamStatus(exam) {
  const now = new Date();
  
  if (!exam.isPublished) {
    return 'draft';
  }
  
  if (exam.startDate && exam.startDate > now) {
    return 'scheduled';
  }
  
  if (exam.endDate && exam.endDate < now) {
    return 'completed';
  }
  
  return 'active';
}

function calculateAverageRiskScore(attempts) {
  if (attempts.length === 0) return 0;
  const totalScore = attempts.reduce((sum, attempt) => 
    sum + (attempt.antiCheating?.riskScore || 0), 0
  );
  return totalScore / attempts.length;
}

async function calculateExamStatistics(examId) {
  const stats = await Attempt.aggregate([
    {
      $match: { exam: examId, status: 'completed' }
    },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        averageScore: { $avg: '$score' },
        averagePercentage: { $avg: '$percentage' },
        minScore: { $min: '$score' },
        maxScore: { $max: '$score' },
        averageDuration: { $avg: '$duration' },
        flaggedAttempts: { $sum: { $cond: ['$isFlagged', 1, 0] } }
      }
    }
  ]);

  const result = stats[0] || {
    totalAttempts: 0,
    averageScore: 0,
    averagePercentage: 0,
    minScore: 0,
    maxScore: 0,
    averageDuration: 0,
    flaggedAttempts: 0
  };

  // Calculate grade distribution
  const gradeDistribution = await Attempt.aggregate([
    {
      $match: { exam: examId, status: 'completed' }
    },
    {
      $group: {
        _id: '$grade',
        count: { $sum: 1 }
      }
    }
  ]);

  result.gradeDistribution = gradeDistribution.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return result;
}

function generateCSVExport(attempts, exam) {
  const headers = [
    'Student Name',
    'Student Email',
    'Score',
    'Percentage',
    'Grade',
    'Duration (minutes)',
    'Violations',
    'Flagged',
    'Completion Date'
  ];

  const rows = attempts.map(attempt => [
    `${attempt.student.firstName} ${attempt.student.lastName}`,
    attempt.student.email,
    attempt.score || 0,
    attempt.percentage || 0,
    attempt.grade || 'N/A',
    Math.round((attempt.duration || 0) / 60000), // Convert to minutes
    attempt.antiCheating?.violations?.length || 0,
    attempt.isFlagged ? 'Yes' : 'No',
    attempt.createdAt.toISOString().split('T')[0]
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  return csvContent;
}

module.exports = router;
