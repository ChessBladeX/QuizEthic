const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Question = require('../models/Question');
const { auth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all questions with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('topic').optional().notEmpty(),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('type').optional().isIn(['mcq', 'short-answer', 'code', 'image-based']),
  query('tags').optional().notEmpty(),
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
      topic,
      difficulty,
      type,
      tags,
      search
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (topic) filter['metadata.topic'] = topic;
    if (difficulty) filter['metadata.difficulty'] = difficulty;
    if (type) filter.type = type;
    if (tags) filter['metadata.tags'] = { $in: tags.split(',') };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const questions = await Question.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Question.countDocuments(filter);

    res.json({
      questions,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'firstName lastName');
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json(question);
  } catch (error) {
    console.error('Get question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new question
router.post('/', auth, requireRole(['instructor', 'admin']), [
  body('title').notEmpty().trim(),
  body('type').isIn(['mcq', 'short-answer', 'code', 'image-based']),
  body('content').notEmpty(),
  body('metadata.topic').notEmpty(),
  body('metadata.difficulty').isIn(['easy', 'medium', 'hard']),
  body('metadata.tags').isArray(),
  body('metadata.points').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const questionData = {
      ...req.body,
      author: req.userId
    };

    // Validate MCQ options
    if (req.body.type === 'mcq') {
      if (!req.body.options || req.body.options.length < 2) {
        return res.status(400).json({ message: 'MCQ questions must have at least 2 options' });
      }
      
      const correctOptions = req.body.options.filter(opt => opt.isCorrect);
      if (correctOptions.length === 0) {
        return res.status(400).json({ message: 'At least one option must be marked as correct' });
      }
    }

    // Validate code questions
    if (req.body.type === 'code') {
      if (!req.body.codeTemplate || !req.body.codeTemplate.language) {
        return res.status(400).json({ message: 'Code questions must have a language specified' });
      }
    }

    const question = new Question(questionData);
    await question.save();

    res.status(201).json({
      message: 'Question created successfully',
      question
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update question
router.put('/:id', auth, requireRole(['instructor', 'admin']), [
  body('title').optional().notEmpty().trim(),
  body('type').optional().isIn(['mcq', 'short-answer', 'code', 'image-based']),
  body('content').optional().notEmpty(),
  body('metadata.topic').optional().notEmpty(),
  body('metadata.difficulty').optional().isIn(['easy', 'medium', 'hard']),
  body('metadata.tags').optional().isArray(),
  body('metadata.points').optional().isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user is author or admin
    if (question.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Question updated successfully',
      question: updatedQuestion
    });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete question
router.delete('/:id', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user is author or admin
    if (question.author.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Soft delete
    question.isActive = false;
    await question.save();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload image for question
router.post('/:id/images', auth, requireRole(['instructor', 'admin']), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Process image with sharp
    const processedImage = await sharp(req.file.buffer)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Save image (in production, use cloud storage)
    const imageName = `question-${req.params.id}-${Date.now()}.jpg`;
    const imagePath = path.join(__dirname, '../uploads', imageName);
    
    // Ensure uploads directory exists
    const uploadsDir = path.dirname(imagePath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(imagePath, processedImage);

    // Add image to question
    const imageUrl = `/uploads/${imageName}`;
    question.images.push({
      url: imageUrl,
      alt: req.body.alt || '',
      caption: req.body.caption || ''
    });

    await question.save();

    res.json({
      message: 'Image uploaded successfully',
      imageUrl
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Import questions from CSV/JSON
router.post('/import', auth, requireRole(['instructor', 'admin']), [
  body('questions').isArray({ min: 1 }),
  body('type').isIn(['csv', 'json'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { questions, type } = req.body;
    const importedQuestions = [];
    const errors_ = [];

    for (let i = 0; i < questions.length; i++) {
      try {
        const questionData = questions[i];
        
        // Validate required fields
        if (!questionData.title && !questionData.question) {
          errors_.push(`Question ${i + 1}: Title is required`);
          continue;
        }
        
        if (!questionData.type) {
          errors_.push(`Question ${i + 1}: Type is required`);
          continue;
        }

        // Map CSV/JSON fields to our schema
        const mappedQuestion = {
          title: questionData.title || questionData.question || `Imported Question ${i + 1}`,
          type: questionData.type,
          content: questionData.content || questionData.question || '',
          author: req.userId,
          metadata: {
            topic: questionData.topic || questionData.subject || 'General',
            difficulty: questionData.difficulty || 'medium',
            tags: questionData.tags ? (Array.isArray(questionData.tags) ? questionData.tags : questionData.tags.split(',')) : [],
            estimatedTime: parseInt(questionData.estimatedTime) || 5,
            points: parseInt(questionData.points) || 1
          }
        };

        // Handle different question types
        if (questionData.type === 'mcq') {
          const options = [];
          if (questionData.options && Array.isArray(questionData.options)) {
            questionData.options.forEach(opt => {
              options.push({
                text: opt.text || opt.option || opt,
                isCorrect: opt.isCorrect || opt.correct || false,
                explanation: opt.explanation || ''
              });
            });
          } else {
            // Try to parse options from string
            const optionTexts = questionData.optionTexts ? questionData.optionTexts.split('|') : [];
            const correctOptions = questionData.correctOptions ? questionData.correctOptions.split('|') : [];
            
            optionTexts.forEach((text, index) => {
              options.push({
                text: text.trim(),
                isCorrect: correctOptions.includes(index.toString()) || correctOptions.includes(text.trim()),
                explanation: ''
              });
            });
          }
          mappedQuestion.options = options;
        } else if (questionData.type === 'short-answer') {
          mappedQuestion.correctAnswer = questionData.correctAnswer || questionData.answer || '';
        } else if (questionData.type === 'code') {
          mappedQuestion.codeTemplate = {
            language: questionData.language || 'javascript',
            template: questionData.template || questionData.codeTemplate || '',
            testCases: questionData.testCases || []
          };
        }

        // Add hints and explanation if provided
        if (questionData.hints) {
          mappedQuestion.hints = Array.isArray(questionData.hints) ? questionData.hints : [questionData.hints];
        }
        if (questionData.explanation) {
          mappedQuestion.explanation = questionData.explanation;
        }

        const question = new Question(mappedQuestion);
        await question.save();
        importedQuestions.push(question);
      } catch (error) {
        errors_.push(`Question ${i + 1}: ${error.message}`);
      }
    }

    res.json({
      message: `Successfully imported ${importedQuestions.length} questions`,
      count: importedQuestions.length,
      errors: errors_,
      questions: importedQuestions
    });
  } catch (error) {
    console.error('Import questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export questions to CSV/JSON
router.get('/export', auth, requireRole(['instructor', 'admin']), [
  query('format').isIn(['csv', 'json']),
  query('topic').optional().notEmpty(),
  query('difficulty').optional().isIn(['easy', 'medium', 'hard']),
  query('type').optional().isIn(['mcq', 'short-answer', 'code', 'image-based'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { format, topic, difficulty, type } = req.query;
    
    // Build filter
    const filter = { isActive: true };
    if (topic) filter['metadata.topic'] = topic;
    if (difficulty) filter['metadata.difficulty'] = difficulty;
    if (type) filter.type = type;

    const questions = await Question.find(filter)
      .populate('author', 'firstName lastName')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csvHeaders = ['title', 'type', 'content', 'topic', 'difficulty', 'tags', 'points', 'estimatedTime'];
      let csvContent = csvHeaders.join(',') + '\n';
      
      questions.forEach(question => {
        const row = [
          `"${question.title}"`,
          question.type,
          `"${question.content.replace(/"/g, '""')}"`,
          question.metadata.topic,
          question.metadata.difficulty,
          `"${question.metadata.tags.join(';')}"`,
          question.metadata.points,
          question.metadata.estimatedTime
        ];
        csvContent += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.csv');
      res.send(csvContent);
    } else {
      // JSON format
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=questions.json');
      res.json(questions);
    }
  } catch (error) {
    console.error('Export questions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get question statistics
router.get('/:id/stats', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Get usage statistics (this would require additional queries in a real implementation)
    const stats = {
      usageCount: question.usageCount,
      averageScore: question.averageScore,
      plagiarismScore: question.plagiarismScore,
      createdAt: question.createdAt,
      lastUsed: question.updatedAt
    };

    res.json(stats);
  } catch (error) {
    console.error('Get question stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all question statistics
router.get('/stats', auth, requireRole(['instructor', 'admin']), async (req, res) => {
  try {
    const stats = await Question.aggregate([
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          averageScore: { $avg: '$averageScore' },
          totalTopics: { $addToSet: '$metadata.topic' },
          thisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$createdAt', new Date(new Date().setMonth(new Date().getMonth() - 1))] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          totalQuestions: 1,
          averageScore: { $round: ['$averageScore', 1] },
          totalTopics: { $size: '$totalTopics' },
          thisMonth: 1
        }
      }
    ]);

    res.json(stats[0] || { totalQuestions: 0, averageScore: 0, totalTopics: 0, thisMonth: 0 });
  } catch (error) {
    console.error('Get question stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available tags
router.get('/metadata/tags', auth, async (req, res) => {
  try {
    const tags = await Question.distinct('metadata.tags');
    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get available topics
router.get('/metadata/topics', auth, async (req, res) => {
  try {
    const topics = await Question.distinct('metadata.topic');
    res.json(topics);
  } catch (error) {
    console.error('Get topics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk operations
router.delete('/bulk', auth, requireRole(['instructor', 'admin']), [
  body('questionIds').isArray({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { questionIds } = req.body;
    
    // Soft delete questions
    await Question.updateMany(
      { _id: { $in: questionIds } },
      { isActive: false }
    );

    res.json({ message: `${questionIds.length} questions deleted successfully` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
