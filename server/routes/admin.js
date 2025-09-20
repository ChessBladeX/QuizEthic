const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Get admin dashboard data
router.get('/dashboard', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const timeRanges = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeRanges[timeRange]);

    // Get comprehensive dashboard statistics
    const [
      userStats,
      examStats,
      attemptStats,
      violationStats,
      recentActivity,
      systemHealth
    ] = await Promise.all([
      getUserStatistics(startTime),
      getExamStatistics(startTime),
      getAttemptStatistics(startTime),
      getViolationStatistics(startTime),
      getRecentActivity(),
      getSystemHealth()
    ]);

    const dashboardData = {
      ...userStats,
      ...examStats,
      ...attemptStats,
      ...violationStats,
      recentActivity,
      systemHealth,
      timestamp: new Date()
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get real-time monitoring data
router.get('/monitoring', auth, requireRole(['admin']), async (req, res) => {
  try {
    // Get active exam sessions
    const activeSessions = await Attempt.find({
      status: 'in-progress'
    })
    .populate('student', 'firstName lastName email')
    .populate('exam', 'title')
    .select('student exam antiCheating startTime')
    .lean();

    // Get recent violations (last hour)
    const recentViolations = await Attempt.aggregate([
      {
        $match: {
          'antiCheating.violations': { $exists: true, $ne: [] },
          createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        }
      },
      { $unwind: '$antiCheating.violations' },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'exam',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $project: {
          studentName: { $arrayElemAt: ['$student.firstName', 0] },
          examTitle: { $arrayElemAt: ['$exam.title', 0] },
          violation: '$antiCheating.violations',
          timestamp: '$antiCheating.violations.timestamp'
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: 20 }
    ]);

    // Calculate risk levels for active sessions
    const sessionsWithRisk = activeSessions.map(session => {
      const violations = session.antiCheating?.violations || [];
      const riskScore = calculateRiskScore(violations);
      
      let riskLevel = 'low';
      if (riskScore > 70) riskLevel = 'high';
      else if (riskScore > 40) riskLevel = 'medium';

      return {
        ...session,
        studentName: `${session.student.firstName} ${session.student.lastName}`,
        examTitle: session.exam.title,
        riskLevel,
        startTime: session.startTime
      };
    });

    res.json({
      activeSessions: sessionsWithRisk,
      recentViolations: recentViolations.map(v => ({
        type: v.violation.type,
        studentName: v.studentName,
        examTitle: v.examTitle,
        timestamp: v.timestamp
      })),
      totalActiveSessions: activeSessions.length,
      totalRecentViolations: recentViolations.length
    });
  } catch (error) {
    console.error('Get monitoring data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get violation management data
router.get('/violations', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { priority = 'all', timeRange = '7d' } = req.query;
    
    const timeRanges = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeRanges[timeRange]);

    // Get violations with priority filtering
    const violations = await Attempt.aggregate([
      {
        $match: {
          'antiCheating.violations': { $exists: true, $ne: [] },
          createdAt: { $gte: startTime }
        }
      },
      { $unwind: '$antiCheating.violations' },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'exam',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $project: {
          studentName: { $arrayElemAt: ['$student.firstName', 0] },
          examTitle: { $arrayElemAt: ['$exam.title', 0] },
          violation: '$antiCheating.violations',
          timestamp: '$antiCheating.violations.timestamp'
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    // Filter by priority if specified
    const filteredViolations = priority !== 'all' 
      ? violations.filter(v => v.violation.priority === priority)
      : violations;

    // Group by priority
    const priorityCounts = violations.reduce((acc, v) => {
      const p = v.violation.priority || 'low';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {});

    // Get recent violations for display
    const recent = filteredViolations.slice(0, 20).map(v => ({
      type: v.violation.type,
      studentName: v.studentName,
      examTitle: v.examTitle,
      description: v.violation.description,
      priority: v.violation.priority || 'low',
      timestamp: v.timestamp
    }));

    res.json({
      highPriority: priorityCounts.high || 0,
      mediumPriority: priorityCounts.medium || 0,
      lowPriority: priorityCounts.low || 0,
      recent,
      total: filteredViolations.length
    });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user management data
router.get('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, role = 'all', search = '' } = req.query;
    
    const query = {};
    if (role !== 'all') {
      query.role = role;
    }
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('firstName lastName email role isActive createdAt lastLogin')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    const roleStats = userStats.reduce((acc, stat) => {
      acc[stat._id] = { total: stat.count, active: stat.activeCount };
      return acc;
    }, {});

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      },
      roleStats
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status
router.patch('/users/:id/status', auth, requireRole(['admin']), [
  body('isActive').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('firstName lastName email role isActive');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system analytics
router.get('/analytics', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { timeRange = '30d', metric = 'all' } = req.query;
    
    const timeRanges = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };

    const startTime = new Date(Date.now() - timeRanges[timeRange]);

    const analytics = await generateSystemAnalytics(startTime, metric);
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get system logs
router.get('/logs', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { level = 'all', limit = 100 } = req.query;
    
    // In a real implementation, you would query your logging system
    // For now, we'll return mock data
    const logs = await getSystemLogs(level, limit);
    
    res.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update system settings
router.patch('/settings', auth, requireRole(['admin']), [
  body('antiCheating').optional().isObject(),
  body('performance').optional().isObject(),
  body('notifications').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // In a real implementation, you would update system settings in a database
    // For now, we'll just return success
    res.json({
      message: 'System settings updated successfully',
      settings: req.body
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper functions
async function getUserStatistics(startTime) {
  const totalUsers = await User.countDocuments();
  const newUsers = await User.countDocuments({ createdAt: { $gte: startTime } });
  const activeUsers = await User.countDocuments({ isActive: true });
  
  // Calculate user growth percentage
  const previousPeriod = new Date(startTime.getTime() - (Date.now() - startTime.getTime()));
  const previousUsers = await User.countDocuments({ createdAt: { $gte: previousPeriod, $lt: startTime } });
  const userGrowth = previousUsers > 0 ? ((newUsers - previousUsers) / previousUsers) * 100 : 0;

  return {
    totalUsers,
    newUsers,
    activeUsers,
    userGrowth: Math.round(userGrowth * 100) / 100
  };
}

async function getExamStatistics(startTime) {
  const totalExams = await Exam.countDocuments();
  const newExams = await Exam.countDocuments({ createdAt: { $gte: startTime } });
  const publishedExams = await Exam.countDocuments({ isPublished: true });
  const activeExams = await Exam.countDocuments({
    isPublished: true,
    $or: [
      { startDate: { $lte: new Date() } },
      { startDate: { $exists: false } }
    ],
    $or: [
      { endDate: { $gte: new Date() } },
      { endDate: { $exists: false } }
    ]
  });

  // Calculate exam growth percentage
  const previousPeriod = new Date(startTime.getTime() - (Date.now() - startTime.getTime()));
  const previousExams = await Exam.countDocuments({ createdAt: { $gte: previousPeriod, $lt: startTime } });
  const examGrowth = previousExams > 0 ? ((newExams - previousExams) / previousExams) * 100 : 0;

  return {
    totalExams,
    newExams,
    publishedExams,
    activeExams,
    examGrowth: Math.round(examGrowth * 100) / 100
  };
}

async function getAttemptStatistics(startTime) {
  const totalAttempts = await Attempt.countDocuments();
  const newAttempts = await Attempt.countDocuments({ createdAt: { $gte: startTime } });
  const completedAttempts = await Attempt.countDocuments({ 
    status: 'completed',
    createdAt: { $gte: startTime }
  });
  const flaggedAttempts = await Attempt.countDocuments({ 
    isFlagged: true,
    createdAt: { $gte: startTime }
  });

  // Calculate attempt growth percentage
  const previousPeriod = new Date(startTime.getTime() - (Date.now() - startTime.getTime()));
  const previousAttempts = await Attempt.countDocuments({ createdAt: { $gte: previousPeriod, $lt: startTime } });
  const attemptGrowth = previousAttempts > 0 ? ((newAttempts - previousAttempts) / previousAttempts) * 100 : 0;

  return {
    totalAttempts,
    newAttempts,
    completedAttempts,
    flaggedAttempts,
    attemptGrowth: Math.round(attemptGrowth * 100) / 100
  };
}

async function getViolationStatistics(startTime) {
  const violations = await Attempt.aggregate([
    {
      $match: {
        'antiCheating.violations': { $exists: true, $ne: [] },
        createdAt: { $gte: startTime }
      }
    },
    { $unwind: '$antiCheating.violations' },
    {
      $group: {
        _id: null,
        totalViolations: { $sum: 1 },
        highPriority: { $sum: { $cond: [{ $eq: ['$antiCheating.violations.priority', 'high'] }, 1, 0] } },
        mediumPriority: { $sum: { $cond: [{ $eq: ['$antiCheating.violations.priority', 'medium'] }, 1, 0] } },
        lowPriority: { $sum: { $cond: [{ $eq: ['$antiCheating.violations.priority', 'low'] }, 1, 0] } }
      }
    }
  ]);

  const result = violations[0] || {
    totalViolations: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  };

  // Calculate violation growth percentage
  const previousPeriod = new Date(startTime.getTime() - (Date.now() - startTime.getTime()));
  const previousViolations = await Attempt.aggregate([
    {
      $match: {
        'antiCheating.violations': { $exists: true, $ne: [] },
        createdAt: { $gte: previousPeriod, $lt: startTime }
      }
    },
    { $unwind: '$antiCheating.violations' },
    { $count: 'total' }
  ]);

  const previousCount = previousViolations[0]?.total || 0;
  const violationGrowth = previousCount > 0 ? ((result.totalViolations - previousCount) / previousCount) * 100 : 0;

  return {
    ...result,
    violationGrowth: Math.round(violationGrowth * 100) / 100
  };
}

async function getRecentActivity() {
  // Get recent exam attempts, user registrations, and violations
  const [recentAttempts, recentUsers, recentViolations] = await Promise.all([
    Attempt.find({ status: 'completed' })
      .populate('student', 'firstName lastName')
      .populate('exam', 'title')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('student exam score createdAt'),
    
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName role createdAt'),
    
    Attempt.aggregate([
      {
        $match: {
          'antiCheating.violations': { $exists: true, $ne: [] },
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      { $unwind: '$antiCheating.violations' },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $lookup: {
          from: 'exams',
          localField: 'exam',
          foreignField: '_id',
          as: 'exam'
        }
      },
      {
        $project: {
          studentName: { $arrayElemAt: ['$student.firstName', 0] },
          examTitle: { $arrayElemAt: ['$exam.title', 0] },
          violationType: '$antiCheating.violations.type',
          timestamp: '$antiCheating.violations.timestamp'
        }
      },
      { $sort: { timestamp: -1 } },
      { $limit: 5 }
    ])
  ]);

  const activities = [
    ...recentAttempts.map(attempt => ({
      type: 'exam',
      description: `${attempt.student.firstName} completed "${attempt.exam.title}" with ${attempt.score}%`,
      timestamp: attempt.createdAt
    })),
    ...recentUsers.map(user => ({
      type: 'user',
      description: `New ${user.role} registered: ${user.firstName} ${user.lastName}`,
      timestamp: user.createdAt
    })),
    ...recentViolations.map(violation => ({
      type: 'violation',
      description: `${violation.studentName} - ${violation.violationType} in "${violation.examTitle}"`,
      timestamp: violation.timestamp
    }))
  ];

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)
    .map(activity => ({
      ...activity,
      timestamp: new Date(activity.timestamp).toLocaleString()
    }));
}

async function getSystemHealth() {
  // In a real implementation, you would check actual system metrics
  // For now, we'll return mock data
  return {
    serverStatus: 'healthy',
    databaseStatus: 'connected',
    antiCheatingStatus: 'active',
    cpuUsage: Math.floor(Math.random() * 30) + 20, // 20-50%
    memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
    diskUsage: Math.floor(Math.random() * 20) + 40, // 40-60%
    avgResponseTime: Math.floor(Math.random() * 50) + 100, // 100-150ms
    successRate: Math.floor(Math.random() * 5) + 95, // 95-99%
    storageUsed: Math.floor(Math.random() * 50) + 100, // 100-150GB
    storageTotal: 500 // 500GB
  };
}

function calculateRiskScore(violations) {
  if (!violations || violations.length === 0) return 0;
  
  const weights = {
    'tab-switch': 10,
    'copy-paste': 15,
    'dev-tools': 20,
    'webcam-blocked': 25,
    'suspicious-behavior': 30,
    'plagiarism': 40,
    'multiple-devices': 35
  };

  const totalScore = violations.reduce((sum, violation) => {
    return sum + (weights[violation.type] || 5);
  }, 0);

  return Math.min(totalScore, 100);
}

async function generateSystemAnalytics(startTime, metric) {
  const analytics = {
    timeRange: '30d',
    metrics: {}
  };

  if (metric === 'all' || metric === 'performance') {
    analytics.metrics.performance = {
      avgResponseTime: Math.floor(Math.random() * 50) + 100,
      successRate: Math.floor(Math.random() * 5) + 95,
      errorRate: Math.floor(Math.random() * 2) + 1,
      throughput: Math.floor(Math.random() * 1000) + 5000
    };
  }

  if (metric === 'all' || metric === 'usage') {
    analytics.metrics.usage = {
      dailyActiveUsers: Math.floor(Math.random() * 200) + 300,
      avgSessionDuration: Math.floor(Math.random() * 30) + 45, // minutes
      returnRate: Math.floor(Math.random() * 20) + 70, // percentage
      peakConcurrentUsers: Math.floor(Math.random() * 100) + 150
    };
  }

  if (metric === 'all' || metric === 'exams') {
    const examStats = await Exam.aggregate([
      {
        $match: { createdAt: { $gte: startTime } }
      },
      {
        $group: {
          _id: null,
          totalExams: { $sum: 1 },
          publishedExams: { $sum: { $cond: ['$isPublished', 1, 0] } },
          avgQuestionsPerExam: { $avg: { $size: '$sections.questions' } }
        }
      }
    ]);

    analytics.metrics.exams = examStats[0] || {
      totalExams: 0,
      publishedExams: 0,
      avgQuestionsPerExam: 0
    };
  }

  return analytics;
}

async function getSystemLogs(level, limit) {
  // In a real implementation, you would query your logging system
  // For now, we'll return mock data
  const logLevels = ['error', 'warn', 'info', 'debug'];
  const messages = [
    'User authentication successful',
    'Exam attempt started',
    'Violation detected: tab switch',
    'Database connection established',
    'Anti-cheating system activated',
    'Webcam snapshot captured',
    'Plagiarism check completed',
    'System backup completed'
  ];

  const logs = [];
  for (let i = 0; i < Math.min(limit, 50); i++) {
    const logLevel = level === 'all' ? logLevels[Math.floor(Math.random() * logLevels.length)] : level;
    const message = messages[Math.floor(Math.random() * messages.length)];
    const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
    
    logs.push({
      level: logLevel,
      message,
      timestamp: timestamp.toISOString(),
      source: 'system'
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = router;