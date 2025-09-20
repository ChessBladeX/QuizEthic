const express = require('express');
const { body, validationResult } = require('express-validator');
const Attempt = require('../models/Attempt');
const Exam = require('../models/Exam');
const { auth, requireRole } = require('../middleware/auth');
const { io } = require('../index');
const multer = require('multer');
const natural = require('natural');
const crypto = require('crypto');
const fetch = require('node-fetch');
const sharp = require('sharp');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/snapshots/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `snapshot-${uniqueSuffix}.jpg`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Advanced plagiarism detection
router.post('/plagiarism-check', auth, [
  body('text').isString().isLength({ min: 10 }),
  body('examId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { text, examId } = req.body;
    const userId = req.userId;

    // Check against previous attempts
    const previousAttempts = await Attempt.find({
      exam: examId,
      student: { $ne: userId },
      'answers.text': { $exists: true }
    }).select('answers');

    let maxSimilarity = 0;
    let similarAttempts = [];

    for (const attempt of previousAttempts) {
      for (const answer of attempt.answers) {
        if (answer.text) {
          const similarity = calculateTextSimilarity(text, answer.text);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            similarAttempts.push({
              attemptId: attempt._id,
              similarity,
              text: answer.text.substring(0, 100) + '...'
            });
          }
        }
      }
    }

    // Check against online sources if enabled
    let onlineSimilarity = 0;
    const exam = await Exam.findById(examId).select('antiCheating');
    if (exam.antiCheating.plagiarismDetection?.checkOnline) {
      onlineSimilarity = await checkOnlinePlagiarism(text);
    }

    const overallSimilarity = Math.max(maxSimilarity, onlineSimilarity);
    const isPlagiarized = overallSimilarity > (exam.antiCheating.plagiarismDetection?.similarityThreshold || 70);

    if (isPlagiarized) {
      // Create violation record
      const violation = {
        type: 'plagiarism-detected',
        timestamp: new Date(),
        details: `Plagiarism detected with ${overallSimilarity.toFixed(1)}% similarity`,
        severity: overallSimilarity > 90 ? 'critical' : 'high',
        examId,
        userId,
        similarity: overallSimilarity,
        similarAttempts: similarAttempts.slice(0, 5) // Top 5 similar attempts
      };

      // Store violation in attempt
      await Attempt.findOneAndUpdate(
        { exam: examId, student: userId, status: 'in-progress' },
        { 
          $push: { 'antiCheating.violations': violation },
          $set: { isFlagged: true, flagReason: 'Plagiarism detected' }
        }
      );

      // Emit real-time alert
      io.to(`exam-${examId}`).emit('violation-alert', violation);
    }

    res.json({
      isPlagiarized,
      similarity: overallSimilarity,
      similarAttempts: similarAttempts.slice(0, 3),
      threshold: exam.antiCheating.plagiarismDetection?.similarityThreshold || 70
    });
  } catch (error) {
    console.error('Plagiarism check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Device fingerprinting and IP analysis
router.post('/device-fingerprint', auth, [
  body('fingerprint').isObject(),
  body('examId').isMongoId()
], async (req, res) => {
  try {
    const { fingerprint, examId } = req.body;
    const userId = req.userId;
    const clientIP = req.ip || req.connection.remoteAddress;

    // Analyze device fingerprint
    const analysis = await analyzeDeviceFingerprint(fingerprint, clientIP, examId, userId);

    if (analysis.suspicious) {
      const violation = {
        type: 'suspicious-device',
        timestamp: new Date(),
        details: analysis.reason,
        severity: analysis.severity,
        examId,
        userId,
        fingerprint: analysis.fingerprintData
      };

      // Store violation
      await Attempt.findOneAndUpdate(
        { exam: examId, student: userId, status: 'in-progress' },
        { 
          $push: { 'antiCheating.violations': violation },
          $set: { isFlagged: true, flagReason: 'Suspicious device detected' }
        }
      );

      // Emit real-time alert
      io.to(`exam-${examId}`).emit('violation-alert', violation);
    }

    res.json({
      suspicious: analysis.suspicious,
      reason: analysis.reason,
      riskScore: analysis.riskScore
    });
  } catch (error) {
    console.error('Device fingerprint analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Real-time monitoring dashboard
router.get('/monitoring/:examId', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { examId } = req.params;
    const { timeRange = '1h' } = req.query;

    const startTime = new Date(Date.now() - getTimeRangeMs(timeRange));

    // Get active attempts
    const activeAttempts = await Attempt.find({
      exam: examId,
      status: 'in-progress',
      createdAt: { $gte: startTime }
    }).populate('student', 'firstName lastName email').select('student antiCheating createdAt');

    // Get recent violations
    const recentViolations = await Attempt.aggregate([
      {
        $match: {
          exam: examId,
          'antiCheating.violations': { $exists: true, $ne: [] },
          createdAt: { $gte: startTime }
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
      { $limit: 50 }
    ]);

    // Get risk score distribution
    const riskDistribution = await Attempt.aggregate([
      {
        $match: {
          exam: examId,
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$antiCheating.riskScore', 20] }, then: 'low' },
                { case: { $lt: ['$antiCheating.riskScore', 50] }, then: 'medium' },
                { case: { $lt: ['$antiCheating.riskScore', 80] }, then: 'high' },
                { case: { $gte: ['$antiCheating.riskScore', 80] }, then: 'critical' }
              ],
              default: 'unknown'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      activeAttempts: activeAttempts.length,
      recentViolations: recentViolations.length,
      riskDistribution,
      monitoringData: {
        totalAttempts: activeAttempts.length,
        flaggedAttempts: activeAttempts.filter(a => a.isFlagged).length,
        averageRiskScore: calculateAverageRiskScore(activeAttempts)
      }
    });
  } catch (error) {
    console.error('Get monitoring data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Enhanced behavior analysis with machine learning
router.post('/advanced-behavior-analysis', auth, requireRole(['instructor', 'admin']), [
  body('attemptId').isMongoId()
], async (req, res) => {
  try {
    const { attemptId } = req.body;

    const attempt = await Attempt.findById(attemptId).populate('exam', 'antiCheating');
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const behaviorData = attempt.antiCheating.behaviorData;
    const analysis = await performAdvancedBehaviorAnalysis(behaviorData, attempt.exam.antiCheating);

    // Update attempt with analysis results
    await Attempt.findByIdAndUpdate(attemptId, {
      'antiCheating.advancedAnalysis': analysis,
      'antiCheating.riskScore': analysis.overallRiskScore,
      isFlagged: analysis.overallRiskScore > 70
    });

    res.json(analysis);
  } catch (error) {
    console.error('Advanced behavior analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get anti-cheating settings for an exam
router.get('/settings/:examId', auth, async (req, res) => {
  try {
    const { examId } = req.params;
    
    const exam = await Exam.findById(examId).select('antiCheating');
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    res.json(exam.antiCheating);
  } catch (error) {
    console.error('Get anti-cheating settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update anti-cheating settings
router.put('/settings/:examId', auth, requireRole(['instructor', 'admin']), [
  body('enabled').optional().isBoolean(),
  body('webcamMonitoring.enabled').optional().isBoolean(),
  body('webcamMonitoring.frequency').optional().isInt({ min: 5, max: 300 }),
  body('browserLock.enabled').optional().isBoolean(),
  body('browserLock.allowCopy').optional().isBoolean(),
  body('browserLock.allowPaste').optional().isBoolean(),
  body('browserLock.allowRightClick').optional().isBoolean(),
  body('browserLock.allowDevTools').optional().isBoolean(),
  body('focusDetection.enabled').optional().isBoolean(),
  body('focusDetection.maxBlurTime').optional().isInt({ min: 1, max: 300 }),
  body('behaviorMonitoring.enabled').optional().isBoolean(),
  body('behaviorMonitoring.trackMouseMovement').optional().isBoolean(),
  body('behaviorMonitoring.trackKeyboardActivity').optional().isBoolean(),
  body('behaviorMonitoring.trackTabSwitching').optional().isBoolean(),
  body('plagiarismDetection.enabled').optional().isBoolean(),
  body('plagiarismDetection.checkOnline').optional().isBoolean(),
  body('plagiarismDetection.similarityThreshold').optional().isFloat({ min: 0, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { examId } = req.params;
    const updates = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is author or admin
    if (exam.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    exam.antiCheating = { ...exam.antiCheating, ...updates };
    await exam.save();

    res.json({
      message: 'Anti-cheating settings updated successfully',
      antiCheating: exam.antiCheating
    });
  } catch (error) {
    console.error('Update anti-cheating settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get violation statistics
router.get('/violations/stats', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { examId, startDate, endDate } = req.query;

    const filter = {};
    if (examId) filter.exam = examId;
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Attempt.aggregate([
      { $match: filter },
      { $unwind: '$antiCheating.violations' },
      { $group: {
        _id: '$antiCheating.violations.type',
        count: { $sum: 1 },
        severity: { $push: '$antiCheating.violations.severity' }
      }},
      { $project: {
        type: '$_id',
        count: 1,
        severityBreakdown: {
          low: { $size: { $filter: { input: '$severity', cond: { $eq: ['$$this', 'low'] } } } },
          medium: { $size: { $filter: { input: '$severity', cond: { $eq: ['$$this', 'medium'] } } } },
          high: { $size: { $filter: { input: '$severity', cond: { $eq: ['$$this', 'high'] } } } },
          critical: { $size: { $filter: { input: '$severity', cond: { $eq: ['$$this', 'critical'] } } } }
        }
      }},
      { $sort: { count: -1 } }
    ]);

    res.json(stats);
  } catch (error) {
    console.error('Get violation stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get real-time violation alerts
router.get('/violations/alerts', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { examId } = req.query;

    const filter = { isFlagged: true };
    if (examId) filter.exam = examId;

    const alerts = await Attempt.find(filter)
      .populate('exam', 'title')
      .populate('student', 'firstName lastName email')
      .select('exam student antiCheating.violations isFlagged flagReason createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(alerts);
  } catch (error) {
    console.error('Get violation alerts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Analyze behavior patterns
router.post('/analyze-behavior', auth, requireRole(['instructor', 'admin']), [
  body('attemptId').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found' });
    }

    const behaviorData = attempt.antiCheating.behaviorData;
    const analysis = {
      suspiciousPatterns: [],
      riskScore: 0,
      recommendations: []
    };

    // Analyze mouse movement patterns
    if (behaviorData.mouseMovements && behaviorData.mouseMovements.length > 0) {
      const movements = behaviorData.mouseMovements;
      
      // Check for repetitive patterns
      const repetitivePatterns = detectRepetitivePatterns(movements);
      if (repetitivePatterns.length > 0) {
        analysis.suspiciousPatterns.push({
          type: 'repetitive_mouse_movement',
          description: 'Detected repetitive mouse movement patterns',
          severity: 'medium'
        });
        analysis.riskScore += 20;
      }

      // Check for unnatural movement speed
      const unnaturalSpeed = detectUnnaturalSpeed(movements);
      if (unnaturalSpeed) {
        analysis.suspiciousPatterns.push({
          type: 'unnatural_mouse_speed',
          description: 'Detected unusually fast mouse movements',
          severity: 'high'
        });
        analysis.riskScore += 30;
      }
    }

    // Analyze keyboard activity
    if (behaviorData.keyboardActivity && behaviorData.keyboardActivity.length > 0) {
      const keyboardData = behaviorData.keyboardActivity;
      
      // Check for copy-paste patterns
      const copyPastePatterns = detectCopyPastePatterns(keyboardData);
      if (copyPastePatterns.length > 0) {
        analysis.suspiciousPatterns.push({
          type: 'copy_paste_detected',
          description: 'Detected copy-paste keyboard patterns',
          severity: 'high'
        });
        analysis.riskScore += 40;
      }

      // Check for typing speed anomalies
      const typingAnomalies = detectTypingAnomalies(keyboardData);
      if (typingAnomalies.length > 0) {
        analysis.suspiciousPatterns.push({
          type: 'typing_anomalies',
          description: 'Detected unusual typing patterns',
          severity: 'medium'
        });
        analysis.riskScore += 15;
      }
    }

    // Analyze focus events
    if (behaviorData.focusEvents && behaviorData.focusEvents.length > 0) {
      const focusData = behaviorData.focusEvents;
      
      // Check for excessive focus loss
      const excessiveBlur = detectExcessiveBlur(focusData);
      if (excessiveBlur) {
        analysis.suspiciousPatterns.push({
          type: 'excessive_focus_loss',
          description: 'Detected excessive focus loss events',
          severity: 'high'
        });
        analysis.riskScore += 35;
      }
    }

    // Generate recommendations based on analysis
    if (analysis.riskScore > 70) {
      analysis.recommendations.push('Flag for manual review');
    } else if (analysis.riskScore > 40) {
      analysis.recommendations.push('Monitor closely for additional violations');
    } else if (analysis.riskScore > 20) {
      analysis.recommendations.push('Continue normal monitoring');
    }

    res.json(analysis);
  } catch (error) {
    console.error('Analyze behavior error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions for behavior analysis
function detectRepetitivePatterns(movements) {
  // Simplified implementation - in production, use more sophisticated algorithms
  const patterns = [];
  const windowSize = 10;
  
  for (let i = 0; i < movements.length - windowSize; i++) {
    const window = movements.slice(i, i + windowSize);
    const variance = calculateVariance(window);
    
    if (variance < 10) { // Low variance indicates repetitive movement
      patterns.push({
        startIndex: i,
        endIndex: i + windowSize,
        variance
      });
    }
  }
  
  return patterns;
}

function detectUnnaturalSpeed(movements) {
  if (movements.length < 2) return false;
  
  let maxSpeed = 0;
  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1];
    const curr = movements[i];
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    const timeDiff = curr.timestamp - prev.timestamp;
    const speed = distance / timeDiff;
    maxSpeed = Math.max(maxSpeed, speed);
  }
  
  return maxSpeed > 1000; // Threshold for unnatural speed
}

function detectCopyPastePatterns(keyboardData) {
  const patterns = [];
  const copyPasteKeys = ['Control', 'c', 'Control', 'v'];
  
  for (let i = 0; i < keyboardData.length - copyPasteKeys.length; i++) {
    const sequence = keyboardData.slice(i, i + copyPasteKeys.length);
    const keys = sequence.map(event => event.key);
    
    if (JSON.stringify(keys) === JSON.stringify(copyPasteKeys)) {
      patterns.push({
        startIndex: i,
        endIndex: i + copyPasteKeys.length
      });
    }
  }
  
  return patterns;
}

function detectTypingAnomalies(keyboardData) {
  const anomalies = [];
  const typingEvents = keyboardData.filter(event => event.action === 'keydown');
  
  if (typingEvents.length < 10) return anomalies;
  
  // Calculate typing intervals
  const intervals = [];
  for (let i = 1; i < typingEvents.length; i++) {
    const interval = typingEvents[i].timestamp - typingEvents[i - 1].timestamp;
    intervals.push(interval);
  }
  
  // Check for unusually consistent intervals (possible automation)
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
  
  if (variance < 100) { // Very low variance indicates automation
    anomalies.push({
      type: 'consistent_typing_intervals',
      variance,
      avgInterval
    });
  }
  
  return anomalies;
}

function detectExcessiveBlur(focusData) {
  const blurEvents = focusData.filter(event => event.type === 'blur');
  const totalBlurTime = blurEvents.reduce((sum, event) => sum + (event.duration || 0), 0);
  const totalTime = focusData.length > 0 ? 
    focusData[focusData.length - 1].timestamp - focusData[0].timestamp : 0;
  
  const blurPercentage = totalBlurTime / totalTime;
  return blurPercentage > 0.3; // More than 30% time spent out of focus
}

function calculateVariance(data) {
  if (data.length < 2) return 0;
  
  const xValues = data.map(point => point.x);
  const yValues = data.map(point => point.y);
  
  const avgX = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
  const avgY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
  
  const varianceX = xValues.reduce((sum, x) => sum + Math.pow(x - avgX, 2), 0) / xValues.length;
  const varianceY = yValues.reduce((sum, y) => sum + Math.pow(y - avgY, 2), 0) / yValues.length;
  
  return varianceX + varianceY;
}

// Webcam snapshot endpoint
router.post('/webcam-snapshot', auth, upload.single('snapshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No snapshot file provided' });
    }

    const { examId, userId, timestamp } = req.body;

    // Process and store snapshot
    const snapshotData = {
      examId,
      userId,
      timestamp: new Date(timestamp),
      imageUrl: `/uploads/snapshots/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    // Store in database (you'll need to create a Snapshot model)
    // const snapshot = new Snapshot(snapshotData);
    // await snapshot.save();

    // Analyze snapshot for suspicious activity
    const analysis = await analyzeSnapshot(req.file);

    if (analysis.suspicious) {
      // Create violation record
      const violation = {
        type: 'suspicious-webcam-activity',
        timestamp: new Date(),
        details: analysis.reason,
        severity: analysis.severity,
        examId,
        userId,
        snapshotUrl: snapshotData.imageUrl
      };

      // Store violation (you'll need to create a Violation model)
      // const violationRecord = new Violation(violation);
      // await violationRecord.save();

      // Emit real-time alert
      io.to(`exam-${examId}`).emit('violation-alert', violation);
    }

    res.json({
      message: 'Snapshot processed successfully',
      analysis
    });
  } catch (error) {
    console.error('Webcam snapshot error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Analyze snapshot for suspicious activity
async function analyzeSnapshot(file) {
  // This is a simplified analysis - in production, use proper image analysis
  const analysis = {
    suspicious: false,
    reason: '',
    severity: 'low',
    confidence: 0
  };

  try {
    // Basic file size check
    if (file.size < 1000) { // Very small file might indicate no camera
      analysis.suspicious = true;
      analysis.reason = 'Suspiciously small snapshot file';
      analysis.severity = 'medium';
      analysis.confidence = 0.7;
    }

    // In production, you would:
    // 1. Use computer vision to detect faces
    // 2. Check for multiple faces (possible collaboration)
    // 3. Detect phone screens or other devices
    // 4. Analyze lighting changes
    // 5. Check for unusual patterns

    return analysis;
  } catch (error) {
    console.error('Snapshot analysis error:', error);
    return analysis;
  }
}

// Get behavior analytics
router.get('/behavior-analytics', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Calculate time range
    const now = new Date();
    let startTime;
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get behavior analytics from attempts
    const analytics = await Attempt.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime },
          'antiCheating.behaviorData': { $exists: true }
        }
      },
      {
        $project: {
          behaviorData: '$antiCheating.behaviorData',
          violations: '$antiCheating.violations',
          isFlagged: '$isFlagged'
        }
      },
      {
        $group: {
          _id: null,
          totalAttempts: { $sum: 1 },
          flaggedAttempts: { $sum: { $cond: ['$isFlagged', 1, 0] } },
          averageRiskScore: { $avg: '$behaviorData.riskScore' },
          suspiciousPatterns: { $push: '$behaviorData.suspiciousPatterns' }
        }
      }
    ]);

    const result = analytics[0] || {
      totalAttempts: 0,
      flaggedAttempts: 0,
      averageRiskScore: 0,
      suspiciousPatterns: []
    };

    // Calculate additional metrics
    const normalBehaviorPercentage = result.totalAttempts > 0 
      ? ((result.totalAttempts - result.flaggedAttempts) / result.totalAttempts) * 100 
      : 100;

    const suspiciousPatterns = result.suspiciousPatterns.flat().filter(p => p);

    res.json({
      totalAttempts: result.totalAttempts,
      flaggedAttempts: result.flaggedAttempts,
      averageRiskScore: result.averageRiskScore || 0,
      normalBehaviorPercentage,
      suspiciousPatterns: suspiciousPatterns.length,
      timeRange
    });
  } catch (error) {
    console.error('Get behavior analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions for enhanced anti-cheating
function calculateTextSimilarity(text1, text2) {
  // Use Jaccard similarity for text comparison
  const words1 = new Set(text1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return (intersection.size / union.size) * 100;
}

async function checkOnlinePlagiarism(text) {
  try {
    // This would integrate with plagiarism detection services
    // For now, return a mock similarity score
    const response = await fetch('https://api.plagiarism-checker.com/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PLAGIARISM_API_KEY}`
      },
      body: JSON.stringify({ text })
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.similarity || 0;
    }
  } catch (error) {
    console.error('Online plagiarism check error:', error);
  }
  
  return 0;
}

async function analyzeDeviceFingerprint(fingerprint, clientIP, examId, userId) {
  const analysis = {
    suspicious: false,
    reason: '',
    severity: 'low',
    riskScore: 0,
    fingerprintData: fingerprint
  };

  // Check for suspicious browser characteristics
  if (fingerprint.userAgent && (
    fingerprint.userAgent.includes('HeadlessChrome') ||
    fingerprint.userAgent.includes('PhantomJS') ||
    fingerprint.userAgent.includes('Selenium')
  )) {
    analysis.suspicious = true;
    analysis.reason = 'Automated browser detected';
    analysis.severity = 'critical';
    analysis.riskScore = 90;
  }

  // Check for unusual screen resolution
  if (fingerprint.screenResolution) {
    const [width, height] = fingerprint.screenResolution.split('x').map(Number);
    if (width < 800 || height < 600) {
      analysis.riskScore += 20;
      analysis.reason += 'Unusual screen resolution. ';
    }
  }

  // Check for missing or suspicious plugins
  if (!fingerprint.plugins || fingerprint.plugins.length === 0) {
    analysis.riskScore += 15;
    analysis.reason += 'No browser plugins detected. ';
  }

  // Check IP geolocation (if available)
  if (clientIP) {
    const geoData = await getIPGeolocation(clientIP);
    if (geoData && geoData.country) {
      // Check if IP is from a known VPN/proxy service
      if (isVPNAndProxyIP(clientIP)) {
        analysis.riskScore += 25;
        analysis.reason += 'VPN/Proxy detected. ';
      }
    }
  }

  // Check for multiple devices from same user
  const existingFingerprints = await Attempt.find({
    exam: examId,
    student: userId,
    'antiCheating.deviceFingerprint': { $exists: true }
  }).select('antiCheating.deviceFingerprint');

  if (existingFingerprints.length > 0) {
    const fingerprintMatch = existingFingerprints.some(attempt => 
      JSON.stringify(attempt.antiCheating.deviceFingerprint) === JSON.stringify(fingerprint)
    );
    
    if (!fingerprintMatch) {
      analysis.riskScore += 30;
      analysis.reason += 'Different device detected. ';
    }
  }

  if (analysis.riskScore > 50) {
    analysis.suspicious = true;
    analysis.severity = analysis.riskScore > 80 ? 'critical' : 'high';
  }

  return analysis;
}

async function getIPGeolocation(ip) {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('IP geolocation error:', error);
  }
  return null;
}

function isVPNAndProxyIP(ip) {
  // This would check against known VPN/proxy IP ranges
  // For now, return false as a placeholder
  return false;
}

async function performAdvancedBehaviorAnalysis(behaviorData, antiCheatingSettings) {
  const analysis = {
    mousePatterns: analyzeAdvancedMousePatterns(behaviorData.mouseMovements || []),
    keyboardPatterns: analyzeAdvancedKeyboardPatterns(behaviorData.keyboardActivity || []),
    focusPatterns: analyzeAdvancedFocusPatterns(behaviorData.focusEvents || []),
    overallRiskScore: 0,
    suspiciousPatterns: [],
    recommendations: []
  };

  // Calculate overall risk score
  analysis.overallRiskScore = (
    analysis.mousePatterns.riskScore * 0.3 +
    analysis.keyboardPatterns.riskScore * 0.4 +
    analysis.focusPatterns.riskScore * 0.3
  );

  // Collect all suspicious patterns
  analysis.suspiciousPatterns = [
    ...analysis.mousePatterns.suspiciousPatterns,
    ...analysis.keyboardPatterns.suspiciousPatterns,
    ...analysis.focusPatterns.suspiciousPatterns
  ];

  // Generate recommendations
  if (analysis.overallRiskScore > 80) {
    analysis.recommendations.push('Immediate manual review required');
  } else if (analysis.overallRiskScore > 60) {
    analysis.recommendations.push('Flag for instructor review');
  } else if (analysis.overallRiskScore > 40) {
    analysis.recommendations.push('Continue monitoring closely');
  }

  return analysis;
}

function analyzeAdvancedMousePatterns(movements) {
  const patterns = {
    riskScore: 0,
    suspiciousPatterns: []
  };

  if (movements.length < 10) return patterns;

  // Analyze movement velocity patterns
  const velocities = calculateMovementVelocities(movements);
  const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  const velocityVariance = calculateVariance(velocities);

  if (velocityVariance < 50) {
    patterns.riskScore += 30;
    patterns.suspiciousPatterns.push({
      type: 'consistent_mouse_velocity',
      description: 'Mouse movements show unusually consistent velocity',
      confidence: 0.8
    });
  }

  // Analyze movement patterns for automation
  const automationScore = detectAutomationPatterns(movements);
  if (automationScore > 0.7) {
    patterns.riskScore += 40;
    patterns.suspiciousPatterns.push({
      type: 'automated_mouse_movement',
      description: 'Mouse movements appear to be automated',
      confidence: automationScore
    });
  }

  return patterns;
}

function analyzeAdvancedKeyboardPatterns(keyboardData) {
  const patterns = {
    riskScore: 0,
    suspiciousPatterns: []
  };

  if (keyboardData.length < 10) return patterns;

  // Analyze typing rhythm
  const typingRhythm = analyzeTypingRhythm(keyboardData);
  if (typingRhythm.isSuspicious) {
    patterns.riskScore += 35;
    patterns.suspiciousPatterns.push({
      type: 'suspicious_typing_rhythm',
      description: typingRhythm.description,
      confidence: typingRhythm.confidence
    });
  }

  // Detect copy-paste patterns
  const copyPasteScore = detectAdvancedCopyPastePatterns(keyboardData);
  if (copyPasteScore > 0.6) {
    patterns.riskScore += 50;
    patterns.suspiciousPatterns.push({
      type: 'copy_paste_detected',
      description: 'Copy-paste activity detected',
      confidence: copyPasteScore
    });
  }

  return patterns;
}

function analyzeAdvancedFocusPatterns(focusEvents) {
  const patterns = {
    riskScore: 0,
    suspiciousPatterns: []
  };

  if (focusEvents.length < 2) return patterns;

  // Analyze focus loss frequency and duration
  const blurEvents = focusEvents.filter(e => e.type === 'blur');
  const totalBlurTime = blurEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
  const totalTime = focusEvents.length > 0 ? 
    focusEvents[focusEvents.length - 1].timestamp - focusEvents[0].timestamp : 0;

  if (totalTime > 0) {
    const blurPercentage = totalBlurTime / totalTime;
    if (blurPercentage > 0.4) {
      patterns.riskScore += 45;
      patterns.suspiciousPatterns.push({
        type: 'excessive_focus_loss',
        description: `Spent ${(blurPercentage * 100).toFixed(1)}% of time out of focus`,
        confidence: 0.9
      });
    }
  }

  return patterns;
}

function calculateMovementVelocities(movements) {
  const velocities = [];
  for (let i = 1; i < movements.length; i++) {
    const prev = movements[i - 1];
    const curr = movements[i];
    const distance = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
    );
    const timeDiff = curr.timestamp - prev.timestamp;
    if (timeDiff > 0) {
      velocities.push(distance / timeDiff);
    }
  }
  return velocities;
}

function detectAutomationPatterns(movements) {
  // Simplified automation detection
  // In production, use more sophisticated ML models
  const velocities = calculateMovementVelocities(movements);
  const variance = calculateVariance(velocities);
  const avgVelocity = velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  
  // Very consistent velocity and high average speed suggests automation
  if (variance < 100 && avgVelocity > 500) {
    return 0.8;
  }
  
  return 0;
}

function analyzeTypingRhythm(keyboardData) {
  const typingEvents = keyboardData.filter(e => e.action === 'keydown');
  if (typingEvents.length < 10) {
    return { isSuspicious: false };
  }

  const intervals = [];
  for (let i = 1; i < typingEvents.length; i++) {
    intervals.push(typingEvents[i].timestamp - typingEvents[i - 1].timestamp);
  }

  const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
  const variance = calculateVariance(intervals);

  // Very consistent intervals suggest automation
  if (variance < 50) {
    return {
      isSuspicious: true,
      description: 'Typing rhythm appears automated',
      confidence: 0.9
    };
  }

  return { isSuspicious: false };
}

function detectAdvancedCopyPastePatterns(keyboardData) {
  const copyPasteSequences = [
    ['Control', 'c'],
    ['Control', 'v'],
    ['Control', 'a'],
    ['Control', 'x']
  ];

  let maxScore = 0;
  for (const sequence of copyPasteSequences) {
    const score = detectKeySequence(keyboardData, sequence);
    maxScore = Math.max(maxScore, score);
  }

  return maxScore;
}

function detectKeySequence(keyboardData, sequence) {
  let matches = 0;
  for (let i = 0; i < keyboardData.length - sequence.length; i++) {
    const window = keyboardData.slice(i, i + sequence.length);
    const keys = window.map(event => event.key);
    
    if (JSON.stringify(keys) === JSON.stringify(sequence)) {
      matches++;
    }
  }
  
  return matches / Math.max(1, keyboardData.length / sequence.length);
}

function calculateVariance(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

function getTimeRangeMs(timeRange) {
  const ranges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000
  };
  return ranges[timeRange] || ranges['24h'];
}

function calculateAverageRiskScore(attempts) {
  if (attempts.length === 0) return 0;
  const totalScore = attempts.reduce((sum, attempt) => 
    sum + (attempt.antiCheating?.riskScore || 0), 0
  );
  return totalScore / attempts.length;
}

module.exports = router;
