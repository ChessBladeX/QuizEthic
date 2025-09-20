const { getFirestore, convertTimestamps, prepareForFirestore } = require('../config/firebase');

class Question {
  constructor(data = {}) {
    this.id = data.id || null;
    this.title = data.title || '';
    this.type = data.type || 'multiple-choice';
    this.content = data.content || '';
    this.options = data.options || [];
    this.correctAnswer = data.correctAnswer || '';
    this.codeTemplate = data.codeTemplate || {};
    this.images = data.images || [];
    this.metadata = data.metadata || {};
    this.hints = data.hints || [];
    this.explanation = data.explanation || '';
    this.references = data.references || [];
    this.adaptiveSettings = data.adaptiveSettings || {};
    this.randomization = data.randomization || {};
    this.trueFalseAnswer = data.trueFalseAnswer || null;
    this.fillBlankAnswers = data.fillBlankAnswers || [];
    this.matchingPairs = data.matchingPairs || [];
    this.numericalAnswer = data.numericalAnswer || null;
    this.dragDropItems = data.dragDropItems || [];
    this.hotspotAreas = data.hotspotAreas || [];
    this.mathematicalExpression = data.mathematicalExpression || '';
    this.essayRubric = data.essayRubric || {};
    this.author = data.author || null;
    this.isPublished = data.isPublished !== undefined ? data.isPublished : false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Create a new question
  static async create(questionData) {
    try {
      const db = getFirestore();
      const questionRef = db.collection('questions').doc();
      
      const question = new Question({
        ...questionData,
        id: questionRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const questionDataToSave = prepareForFirestore(question);
      await questionRef.set(questionDataToSave);
      
      return question;
    } catch (error) {
      console.error('Error creating question:', error);
      throw error;
    }
  }

  // Find question by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const questionDoc = await db.collection('questions').doc(id).get();
      
      if (!questionDoc.exists) {
        return null;
      }

      const questionData = convertTimestamps(questionDoc.data());
      return new Question({ id: questionDoc.id, ...questionData });
    } catch (error) {
      console.error('Error finding question by ID:', error);
      throw error;
    }
  }

  // Find questions with filters
  static async find(query = {}) {
    try {
      const db = getFirestore();
      let questionsQuery = db.collection('questions');

      // Apply filters
      if (query.type) {
        questionsQuery = questionsQuery.where('type', '==', query.type);
      }
      if (query.author) {
        questionsQuery = questionsQuery.where('author', '==', query.author);
      }
      if (query.isPublished !== undefined) {
        questionsQuery = questionsQuery.where('isPublished', '==', query.isPublished);
      }
      if (query.difficulty) {
        questionsQuery = questionsQuery.where('metadata.difficulty', '==', query.difficulty);
      }
      if (query.topic) {
        questionsQuery = questionsQuery.where('metadata.topic', '==', query.topic);
      }

      // Apply pagination
      if (query.limit) {
        questionsQuery = questionsQuery.limit(query.limit);
      }
      if (query.offset) {
        questionsQuery = questionsQuery.offset(query.offset);
      }

      // Apply ordering
      const orderBy = query.orderBy || 'createdAt';
      const orderDirection = query.orderDirection || 'desc';
      questionsQuery = questionsQuery.orderBy(orderBy, orderDirection);

      const questionsSnapshot = await questionsQuery.get();
      const questions = [];

      questionsSnapshot.forEach(doc => {
        const questionData = convertTimestamps(doc.data());
        questions.push(new Question({ id: doc.id, ...questionData }));
      });

      return questions;
    } catch (error) {
      console.error('Error finding questions:', error);
      throw error;
    }
  }

  // Search questions by text
  static async search(searchTerm, filters = {}) {
    try {
      const db = getFirestore();
      let questionsQuery = db.collection('questions');

      // Apply filters
      if (filters.type) {
        questionsQuery = questionsQuery.where('type', '==', filters.type);
      }
      if (filters.author) {
        questionsQuery = questionsQuery.where('author', '==', filters.author);
      }
      if (filters.isPublished !== undefined) {
        questionsQuery = questionsQuery.where('isPublished', '==', filters.isPublished);
      }

      const questionsSnapshot = await questionsQuery.get();
      const questions = [];

      questionsSnapshot.forEach(doc => {
        const questionData = convertTimestamps(doc.data());
        const question = new Question({ id: doc.id, ...questionData });
        
        // Simple text search (Firestore doesn't support full-text search natively)
        const searchableText = [
          question.title,
          question.content,
          question.metadata.topic,
          ...question.metadata.tags || []
        ].join(' ').toLowerCase();

        if (searchableText.includes(searchTerm.toLowerCase())) {
          questions.push(question);
        }
      });

      return questions;
    } catch (error) {
      console.error('Error searching questions:', error);
      throw error;
    }
  }

  // Count questions
  static async count(query = {}) {
    try {
      const db = getFirestore();
      let questionsQuery = db.collection('questions');

      // Apply filters
      if (query.type) {
        questionsQuery = questionsQuery.where('type', '==', query.type);
      }
      if (query.author) {
        questionsQuery = questionsQuery.where('author', '==', query.author);
      }
      if (query.isPublished !== undefined) {
        questionsQuery = questionsQuery.where('isPublished', '==', query.isPublished);
      }

      const questionsSnapshot = await questionsQuery.get();
      return questionsSnapshot.size;
    } catch (error) {
      console.error('Error counting questions:', error);
      throw error;
    }
  }

  // Update question
  async update(updateData) {
    try {
      const db = getFirestore();
      const questionRef = db.collection('questions').doc(this.id);

      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      const dataToSave = prepareForFirestore(updatedData);
      await questionRef.update(dataToSave);

      // Update local instance
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error('Error updating question:', error);
      throw error;
    }
  }

  // Delete question
  async delete() {
    try {
      const db = getFirestore();
      await db.collection('questions').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting question:', error);
      throw error;
    }
  }

  // Save question (create or update)
  async save() {
    try {
      if (this.id) {
        return await this.update(this);
      } else {
        const newQuestion = await Question.create(this);
        Object.assign(this, newQuestion);
        return this;
      }
    } catch (error) {
      console.error('Error saving question:', error);
      throw error;
    }
  }

  // Get questions by IDs
  static async findByIds(ids) {
    try {
      const db = getFirestore();
      const questions = [];

      // Firestore 'in' queries are limited to 10 items, so we need to batch them
      const batches = [];
      for (let i = 0; i < ids.length; i += 10) {
        const batch = ids.slice(i, i + 10);
        batches.push(batch);
      }

      for (const batch of batches) {
        const questionsSnapshot = await db.collection('questions')
          .where(admin.firestore.FieldPath.documentId(), 'in', batch)
          .get();

        questionsSnapshot.forEach(doc => {
          const questionData = convertTimestamps(doc.data());
          questions.push(new Question({ id: doc.id, ...questionData }));
        });
      }

      return questions;
    } catch (error) {
      console.error('Error finding questions by IDs:', error);
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

module.exports = Question;