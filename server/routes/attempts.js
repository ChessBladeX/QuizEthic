const express = require('express');
const { body, validationResult } = require('express-validator');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const { auth } = require('../middleware/auth');
const { io } = require('../index');

const router = express.Router();

// Start exam attempt
router.post('/start', auth, [
  body('examId').isMongoId(),
  body('password').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examId, password } = req.body;

    // Get exam
    const exam = await Exam.findById(examId)
      .populate('sections.questions.question');
    
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (!exam.isPublished) {
      return res.status(403).json({ message: 'Exam is not published' });
    }

    // Check exam availability
    const now = new Date();
    if (exam.startDate && exam.startDate > now) {
      return res.status(403).json({ message: 'Exam has not started yet' });
    }
    if (exam.endDate && exam.endDate < now) {
      return res.status(403).json({ message: 'Exam has ended' });
    }

    // Check password if required
    if (exam.settings.password && exam.settings.password !== password) {
      return res.status(401).json({ message: 'Invalid exam password' });
    }

    // Check IP restrictions
    if (exam.settings.ipRestrictions && exam.settings.ipRestrictions.length > 0) {
      const clientIP = req.ip;
      if (!exam.settings.ipRestrictions.includes(clientIP)) {
        return res.status(403).json({ message: 'Access denied from this IP address' });
      }
    }

    // Check existing attempts
    const existingAttempts = await Attempt.find({
      exam: examId,
      student: req.userId,
      status: { $in: ['in-progress', 'completed'] }
    });

    if (existingAttempts.length >= exam.settings.maxAttempts) {
      return res.status(403).json({ message: 'Maximum attempts exceeded' });
    }

    // Create new attempt
    const attempt = new Attempt({
      exam: examId,
      student: req.userId,
      startTime: new Date(),
      antiCheating: {
        deviceInfo: {
          fingerprint: req.body.deviceFingerprint || '',
          userAgent: req.get('User-Agent'),
          screenResolution: req.body.screenResolution || '',
          timezone: req.body.timezone || '',
          language: req.get('Accept-Language')
        },
        ipAddress: req.ip,
        location: req.body.location || {}
      }
    });

    await attempt.save();

    // Randomize questions if required
    let examData = exam.toObject();
    if (exam.sections.some(section => section.randomizeQuestions)) {
      examData.sections = examData.sections.map(section => {
        if (section.randomizeQuestions) {
          const shuffled = [...section.questions].sort(() => Math.random() - 0.5);
          return { ...section, questions: shuffled };
        }
        return section;
      });
    }

    // Randomize options if required
    if (exam.sections.some(section => section.randomizeOptions)) {
      examData.sections = examData.sections.map(section => {
        if (section.randomizeOptions) {
          const questionsWithRandomizedOptions = section.questions.map(q => {
            if (q.question.type === 'mcq' && q.question.options) {
              const shuffledOptions = [...q.question.options].sort(() => Math.random() - 0.5);
              return { ...q, question: { ...q.question, options: shuffledOptions } };
            }
            return q;
          });
          return { ...section, questions: questionsWithRandomizedOptions };
        }
        return section;
      });
    }

    res.json({
      message: 'Exam started successfully',
      attemptId: attempt._id,
      exam: examData,
      timeLimit: exam.settings.totalTimeLimit
    });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit answer
router.post('/:attemptId/answer', auth, [
  body('questionId').isMongoId(),
  body('answer').notEmpty(),
  body('timeSpent').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attemptId } = req.params;
    const { questionId, answer, timeSpent = 0 } = req.body;

    const attempt = await Attempt.findById(attemptId)
      .populate('exam');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Attempt is not in progress' });
    }

    // Find the question in the exam
    const exam = attempt.exam;
    let question = null;
    let points = 1;

    for (const section of exam.sections) {
      const questionRef = section.questions.find(q => q.question.toString() === questionId);
      if (questionRef) {
        question = questionRef.question;
        points = questionRef.points || 1;
        break;
      }
    }

    if (!question) {
      return res.status(404).json({ message: 'Question not found in this exam' });
    }

    // Check if answer already exists
    const existingAnswerIndex = attempt.answers.findIndex(a => a.questionId.toString() === questionId);
    
    // Grade the answer
    let isCorrect = false;
    let earnedPoints = 0;

    if (question.type === 'mcq') {
      const correctOptions = question.options.filter(opt => opt.isCorrect);
      isCorrect = correctOptions.some(opt => opt.text === answer);
    } else if (question.type === 'short-answer') {
      // Simple text matching (in production, use more sophisticated matching)
      isCorrect = answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    } else if (question.type === 'code') {
      // Code evaluation would be implemented here
      isCorrect = false; // Placeholder
    }

    if (isCorrect) {
      earnedPoints = points;
    }

    const answerData = {
      questionId,
      answer,
      timeSpent,
      isCorrect,
      points: earnedPoints
    };

    if (existingAnswerIndex >= 0) {
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      attempt.answers.push(answerData);
    }

    await attempt.save();

    res.json({
      message: 'Answer submitted successfully',
      isCorrect,
      points: earnedPoints
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit violation report
router.post('/:attemptId/violation', auth, [
  body('type').isIn(['tab-switch', 'copy-paste', 'right-click', 'dev-tools', 'focus-loss', 'suspicious-behavior', 'plagiarism']),
  body('details').optional().notEmpty(),
  body('severity').isIn(['low', 'medium', 'high', 'critical'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attemptId } = req.params;
    const { type, details, severity } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add violation
    attempt.antiCheating.violations.push({
      type,
      timestamp: new Date(),
      details: details || '',
      severity
    });

    // Flag attempt if critical violation
    if (severity === 'critical') {
      attempt.isFlagged = true;
      attempt.flagReason = `Critical violation: ${type}`;
    }

    await attempt.save();

    // Notify instructors in real-time
    io.to(`exam-${attempt.exam}`).emit('violation-detected', {
      attemptId,
      studentId: attempt.student,
      type,
      severity,
      timestamp: new Date()
    });

    res.json({ message: 'Violation reported successfully' });
  } catch (error) {
    console.error('Report violation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit webcam snapshot
router.post('/:attemptId/webcam', auth, [
  body('imageData').notEmpty(),
  body('timestamp').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attemptId } = req.params;
    const { imageData, timestamp } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // In production, save image to cloud storage
    const imageUrl = `/webcam-snapshots/${attemptId}-${Date.now()}.jpg`;

    attempt.antiCheating.webcamSnapshots.push({
      timestamp: new Date(timestamp),
      imageUrl,
      flagged: false
    });

    await attempt.save();

    res.json({ message: 'Webcam snapshot saved successfully' });
  } catch (error) {
    console.error('Submit webcam snapshot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit behavior data
router.post('/:attemptId/behavior', auth, [
  body('mouseMovements').optional().isArray(),
  body('keyboardActivity').optional().isArray(),
  body('focusEvents').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attemptId } = req.params;
    const { mouseMovements, keyboardActivity, focusEvents } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update behavior data
    if (mouseMovements) {
      attempt.antiCheating.behaviorData.mouseMovements.push(...mouseMovements);
    }
    if (keyboardActivity) {
      attempt.antiCheating.behaviorData.keyboardActivity.push(...keyboardActivity);
    }
    if (focusEvents) {
      attempt.antiCheating.behaviorData.focusEvents.push(...focusEvents);
    }

    await attempt.save();

    res.json({ message: 'Behavior data saved successfully' });
  } catch (error) {
    console.error('Submit behavior data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit plagiarism check
router.post('/:attemptId/plagiarism', auth, [
  body('text').notEmpty(),
  body('questionId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attemptId } = req.params;
    const { text, questionId } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Simple plagiarism detection (in production, use external services)
    const similarityScore = Math.random() * 100; // Placeholder

    if (similarityScore > 80) {
      attempt.antiCheating.violations.push({
        type: 'plagiarism',
        timestamp: new Date(),
        details: `High similarity detected: ${similarityScore.toFixed(2)}%`,
        severity: 'high'
      });

      attempt.isFlagged = true;
      attempt.flagReason = 'Plagiarism detected';
    }

    await attempt.save();

    res.json({
      message: 'Plagiarism check completed',
      similarityScore: similarityScore.toFixed(2)
    });
  } catch (error) {
    console.error('Plagiarism check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Finish exam attempt
router.post('/:attemptId/finish', auth, async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate('exam');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (attempt.status !== 'in-progress') {
      return res.status(400).json({ message: 'Attempt is not in progress' });
    }

    // Calculate final score
    const totalPoints = attempt.answers.reduce((sum, answer) => sum + answer.points, 0);
    const percentage = (totalPoints / attempt.exam.totalPoints) * 100;

    // Determine grade
    let grade = 'F';
    if (attempt.exam.grading.gradeScale) {
      for (const scale of attempt.exam.grading.gradeScale) {
        if (percentage >= scale.minScore && percentage <= scale.maxScore) {
          grade = scale.grade;
          break;
        }
      }
    }

    attempt.status = 'completed';
    attempt.endTime = new Date();
    attempt.timeSpent = Math.floor((attempt.endTime - attempt.startTime) / 1000);
    attempt.score = totalPoints;
    attempt.percentage = percentage;
    attempt.grade = grade;

    await attempt.save();

    res.json({
      message: 'Exam completed successfully',
      score: totalPoints,
      percentage: percentage.toFixed(2),
      grade,
      timeSpent: attempt.timeSpent,
      isFlagged: attempt.isFlagged
    });
  } catch (error) {
    console.error('Finish exam error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attempt results
router.get('/:attemptId/results', auth, async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate('exam', 'title settings')
      .populate('sections.questions.question', 'title type content options correctAnswer');
    
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    if (attempt.student.toString() !== req.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(attempt);
  } catch (error) {
    console.error('Get attempt results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's attempts
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check if user can view these attempts
    if (userId !== req.userId && req.userRole !== 'instructor' && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const attempts = await Attempt.find({ student: userId })
      .populate('exam', 'title')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Attempt.countDocuments({ student: userId });

    res.json({
      attempts,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get user attempts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
