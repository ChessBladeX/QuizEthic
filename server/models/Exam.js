const { getFirestore, convertTimestamps, prepareForFirestore } = require('../config/firebase');

class Exam {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.sections = data.sections || [];
    this.settings = data.settings || {};
    this.antiCheating = data.antiCheating || {};
    this.grading = data.grading || {};
    this.author = data.author || null;
    this.isPublished = data.isPublished !== undefined ? data.isPublished : false;
    this.startDate = data.startDate || null;
    this.endDate = data.endDate || null;
    this.totalPoints = data.totalPoints || 0;
    this.duration = data.duration || 60;
    this.maxAttempts = data.maxAttempts || 1;
    this.password = data.password || null;
    this.ipRestrictions = data.ipRestrictions || [];
    this.deviceRestrictions = data.deviceRestrictions || [];
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new exam
  static async create(examData) {
    try {
      const db = getFirestore();
      const examRef = db.collection('exams').doc();
      
      const exam = new Exam({
        ...examData,
        id: examRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const examDataToSave = prepareForFirestore(exam);
      await examRef.set(examDataToSave);
      
      return exam;
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  // Find exam by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const examDoc = await db.collection('exams').doc(id).get();
      
      if (!examDoc.exists) {
        return null;
      }

      const examData = convertTimestamps(examDoc.data());
      return new Exam({ id: examDoc.id, ...examData });
    } catch (error) {
      console.error('Error finding exam by ID:', error);
      throw error;
    }
  }

  // Find exams with filters
  static async find(query = {}) {
    try {
      const db = getFirestore();
      let examsQuery = db.collection('exams');

      // Apply filters
      if (query.author) {
        examsQuery = examsQuery.where('author', '==', query.author);
      }
      if (query.isPublished !== undefined) {
        examsQuery = examsQuery.where('isPublished', '==', query.isPublished);
      }
      if (query.status) {
        const now = new Date();
        if (query.status === 'active') {
          examsQuery = examsQuery.where('isPublished', '==', true)
            .where('startDate', '<=', now)
            .where('endDate', '>=', now);
        } else if (query.status === 'scheduled') {
          examsQuery = examsQuery.where('isPublished', '==', true)
            .where('startDate', '>', now);
        } else if (query.status === 'completed') {
          examsQuery = examsQuery.where('isPublished', '==', true)
            .where('endDate', '<', now);
        }
      }

      // Apply pagination
      if (query.limit) {
        examsQuery = examsQuery.limit(query.limit);
      }
      if (query.offset) {
        examsQuery = examsQuery.offset(query.offset);
      }

      // Apply ordering
      const orderBy = query.orderBy || 'createdAt';
      const orderDirection = query.orderDirection || 'desc';
      examsQuery = examsQuery.orderBy(orderBy, orderDirection);

      const examsSnapshot = await examsQuery.get();
      const exams = [];

      examsSnapshot.forEach(doc => {
        const examData = convertTimestamps(doc.data());
        exams.push(new Exam({ id: doc.id, ...examData }));
      });

      return exams;
    } catch (error) {
      console.error('Error finding exams:', error);
      throw error;
    }
  }

  // Search exams by text
  static async search(searchTerm, filters = {}) {
    try {
      const db = getFirestore();
      let examsQuery = db.collection('exams');

      // Apply filters
      if (filters.author) {
        examsQuery = examsQuery.where('author', '==', filters.author);
      }
      if (filters.isPublished !== undefined) {
        examsQuery = examsQuery.where('isPublished', '==', filters.isPublished);
      }

      const examsSnapshot = await examsQuery.get();
      const exams = [];

      examsSnapshot.forEach(doc => {
        const examData = convertTimestamps(doc.data());
        const exam = new Exam({ id: doc.id, ...examData });
        
        // Simple text search
        const searchableText = [
          exam.title,
          exam.description
        ].join(' ').toLowerCase();

        if (searchableText.includes(searchTerm.toLowerCase())) {
          exams.push(exam);
        }
      });

      return exams;
    } catch (error) {
      console.error('Error searching exams:', error);
      throw error;
    }
  }

  // Count exams
  static async count(query = {}) {
    try {
      const db = getFirestore();
      let examsQuery = db.collection('exams');

      // Apply filters
      if (query.author) {
        examsQuery = examsQuery.where('author', '==', query.author);
      }
      if (query.isPublished !== undefined) {
        examsQuery = examsQuery.where('isPublished', '==', query.isPublished);
      }

      const examsSnapshot = await examsQuery.get();
      return examsSnapshot.size;
    } catch (error) {
      console.error('Error counting exams:', error);
      throw error;
    }
  }

  // Update exam
  async update(updateData) {
    try {
      const db = getFirestore();
      const examRef = db.collection('exams').doc(this.id);

      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      const dataToSave = prepareForFirestore(updatedData);
      await examRef.update(dataToSave);

      // Update local instance
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
  }

  // Delete exam
  async delete() {
    try {
      const db = getFirestore();
      await db.collection('exams').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  }

  // Save exam (create or update)
  async save() {
    try {
      if (this.id) {
        return await this.update(this);
      } else {
        const newExam = await Exam.create(this);
        Object.assign(this, newExam);
        return this;
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      throw error;
    }
  }

  // Get active exams (currently running)
  static async getActiveExams() {
    try {
      const db = getFirestore();
      const now = new Date();
      
      const examsSnapshot = await db.collection('exams')
        .where('isPublished', '==', true)
        .where('startDate', '<=', now)
        .where('endDate', '>=', now)
        .get();

      const exams = [];
      examsSnapshot.forEach(doc => {
        const examData = convertTimestamps(doc.data());
        exams.push(new Exam({ id: doc.id, ...examData }));
      });

      return exams;
    } catch (error) {
      console.error('Error getting active exams:', error);
      throw error;
    }
  }

  // Get scheduled exams (not yet started)
  static async getScheduledExams() {
    try {
      const db = getFirestore();
      const now = new Date();
      
      const examsSnapshot = await db.collection('exams')
        .where('isPublished', '==', true)
        .where('startDate', '>', now)
        .get();

      const exams = [];
      examsSnapshot.forEach(doc => {
        const examData = convertTimestamps(doc.data());
        exams.push(new Exam({ id: doc.id, ...examData }));
      });

      return exams;
    } catch (error) {
      console.error('Error getting scheduled exams:', error);
      throw error;
    }
  }

  // Get completed exams
  static async getCompletedExams() {
    try {
      const db = getFirestore();
      const now = new Date();
      
      const examsSnapshot = await db.collection('exams')
        .where('isPublished', '==', true)
        .where('endDate', '<', now)
        .get();

      const exams = [];
      examsSnapshot.forEach(doc => {
        const examData = convertTimestamps(doc.data());
        exams.push(new Exam({ id: doc.id, ...examData }));
      });

      return exams;
    } catch (error) {
      console.error('Error getting completed exams:', error);
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

module.exports = Exam;