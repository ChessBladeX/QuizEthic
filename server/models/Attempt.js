const { getFirestore, convertTimestamps, prepareForFirestore } = require('../config/firebase');

class Attempt {
  constructor(data = {}) {
    this.id = data.id || null;
    this.exam = data.exam || null;
    this.student = data.student || null;
    this.answers = data.answers || {};
    this.score = data.score || 0;
    this.percentage = data.percentage || 0;
    this.grade = data.grade || null;
    this.status = data.status || 'in-progress';
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || null;
    this.duration = data.duration || 0;
    this.isFlagged = data.isFlagged !== undefined ? data.isFlagged : false;
    this.flagReason = data.flagReason || null;
    this.antiCheating = data.antiCheating || {};
    this.proctoringSession = data.proctoringSession || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new attempt
  static async create(attemptData) {
    try {
      const db = getFirestore();
      const attemptRef = db.collection('attempts').doc();
      
      const attempt = new Attempt({
        ...attemptData,
        id: attemptRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const attemptDataToSave = prepareForFirestore(attempt);
      await attemptRef.set(attemptDataToSave);
      
      return attempt;
    } catch (error) {
      console.error('Error creating attempt:', error);
      throw error;
    }
  }

  // Find attempt by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const attemptDoc = await db.collection('attempts').doc(id).get();
      
      if (!attemptDoc.exists) {
        return null;
      }

      const attemptData = convertTimestamps(attemptDoc.data());
      return new Attempt({ id: attemptDoc.id, ...attemptData });
    } catch (error) {
      console.error('Error finding attempt by ID:', error);
      throw error;
    }
  }

  // Find attempts with filters
  static async find(query = {}) {
    try {
      const db = getFirestore();
      let attemptsQuery = db.collection('attempts');

      // Apply filters
      if (query.exam) {
        attemptsQuery = attemptsQuery.where('exam', '==', query.exam);
      }
      if (query.student) {
        attemptsQuery = attemptsQuery.where('student', '==', query.student);
      }
      if (query.status) {
        attemptsQuery = attemptsQuery.where('status', '==', query.status);
      }
      if (query.isFlagged !== undefined) {
        attemptsQuery = attemptsQuery.where('isFlagged', '==', query.isFlagged);
      }

      // Apply pagination
      if (query.limit) {
        attemptsQuery = attemptsQuery.limit(query.limit);
      }
      if (query.offset) {
        attemptsQuery = attemptsQuery.offset(query.offset);
      }

      // Apply ordering
      const orderBy = query.orderBy || 'createdAt';
      const orderDirection = query.orderDirection || 'desc';
      attemptsQuery = attemptsQuery.orderBy(orderBy, orderDirection);

      const attemptsSnapshot = await attemptsQuery.get();
      const attempts = [];

      attemptsSnapshot.forEach(doc => {
        const attemptData = convertTimestamps(doc.data());
        attempts.push(new Attempt({ id: doc.id, ...attemptData }));
      });

      return attempts;
    } catch (error) {
      console.error('Error finding attempts:', error);
      throw error;
    }
  }

  // Find attempts by exam and student
  static async findByExamAndStudent(examId, studentId) {
    try {
      const db = getFirestore();
      const attemptsSnapshot = await db.collection('attempts')
        .where('exam', '==', examId)
        .where('student', '==', studentId)
        .orderBy('createdAt', 'desc')
        .get();

      const attempts = [];
      attemptsSnapshot.forEach(doc => {
        const attemptData = convertTimestamps(doc.data());
        attempts.push(new Attempt({ id: doc.id, ...attemptData }));
      });

      return attempts;
    } catch (error) {
      console.error('Error finding attempts by exam and student:', error);
      throw error;
    }
  }

  // Find active attempts (in-progress)
  static async findActiveAttempts() {
    try {
      const db = getFirestore();
      const attemptsSnapshot = await db.collection('attempts')
        .where('status', '==', 'in-progress')
        .get();

      const attempts = [];
      attemptsSnapshot.forEach(doc => {
        const attemptData = convertTimestamps(doc.data());
        attempts.push(new Attempt({ id: doc.id, ...attemptData }));
      });

      return attempts;
    } catch (error) {
      console.error('Error finding active attempts:', error);
      throw error;
    }
  }

  // Count attempts
  static async count(query = {}) {
    try {
      const db = getFirestore();
      let attemptsQuery = db.collection('attempts');

      // Apply filters
      if (query.exam) {
        attemptsQuery = attemptsQuery.where('exam', '==', query.exam);
      }
      if (query.student) {
        attemptsQuery = attemptsQuery.where('student', '==', query.student);
      }
      if (query.status) {
        attemptsQuery = attemptsQuery.where('status', '==', query.status);
      }

      const attemptsSnapshot = await attemptsQuery.get();
      return attemptsSnapshot.size;
    } catch (error) {
      console.error('Error counting attempts:', error);
      throw error;
    }
  }

  // Update attempt
  async update(updateData) {
    try {
      const db = getFirestore();
      const attemptRef = db.collection('attempts').doc(this.id);

      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      const dataToSave = prepareForFirestore(updatedData);
      await attemptRef.update(dataToSave);

      // Update local instance
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error('Error updating attempt:', error);
      throw error;
    }
  }

  // Delete attempt
  async delete() {
    try {
      const db = getFirestore();
      await db.collection('attempts').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting attempt:', error);
      throw error;
    }
  }

  // Save attempt (create or update)
  async save() {
    try {
      if (this.id) {
        return await this.update(this);
      } else {
        const newAttempt = await Attempt.create(this);
        Object.assign(this, newAttempt);
        return this;
      }
    } catch (error) {
      console.error('Error saving attempt:', error);
      throw error;
    }
  }

  // Submit attempt
  async submit(finalAnswers) {
    try {
      const now = new Date();
      const duration = now - this.startTime;

      const updateData = {
        answers: finalAnswers,
        status: 'completed',
        endTime: now,
        duration: duration
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error submitting attempt:', error);
      throw error;
    }
  }

  // Flag attempt
  async flag(reason) {
    try {
      const updateData = {
        isFlagged: true,
        flagReason: reason
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error flagging attempt:', error);
      throw error;
    }
  }

  // Unflag attempt
  async unflag() {
    try {
      const updateData = {
        isFlagged: false,
        flagReason: null
      };

      return await this.update(updateData);
    } catch (error) {
      console.error('Error unflagging attempt:', error);
      throw error;
    }
  }

  // Get attempt statistics
  static async getStatistics(examId) {
    try {
      const db = getFirestore();
      const attemptsSnapshot = await db.collection('attempts')
        .where('exam', '==', examId)
        .where('status', '==', 'completed')
        .get();

      const stats = {
        totalAttempts: attemptsSnapshot.size,
        averageScore: 0,
        averagePercentage: 0,
        averageDuration: 0,
        flaggedAttempts: 0,
        gradeDistribution: {}
      };

      if (attemptsSnapshot.size === 0) {
        return stats;
      }

      let totalScore = 0;
      let totalPercentage = 0;
      let totalDuration = 0;
      let flaggedCount = 0;

      attemptsSnapshot.forEach(doc => {
        const attemptData = convertTimestamps(doc.data());
        const attempt = new Attempt({ id: doc.id, ...attemptData });

        totalScore += attempt.score || 0;
        totalPercentage += attempt.percentage || 0;
        totalDuration += attempt.duration || 0;

        if (attempt.isFlagged) {
          flaggedCount++;
        }

        if (attempt.grade) {
          stats.gradeDistribution[attempt.grade] = 
            (stats.gradeDistribution[attempt.grade] || 0) + 1;
        }
      });

      stats.averageScore = totalScore / attemptsSnapshot.size;
      stats.averagePercentage = totalPercentage / attemptsSnapshot.size;
      stats.averageDuration = totalDuration / attemptsSnapshot.size;
      stats.flaggedAttempts = flaggedCount;

      return stats;
    } catch (error) {
      console.error('Error getting attempt statistics:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    return { ...this };
  }

  // Convert to plain object
  toObject() {
    return { ...this };
  }
}

module.exports = Attempt;