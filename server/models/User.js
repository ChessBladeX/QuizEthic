const { getFirestore, convertTimestamps, prepareForFirestore } = require('../config/firebase');
const bcrypt = require('bcryptjs');

class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.role = data.role || 'student';
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastLogin = data.lastLogin || null;
    this.profile = data.profile || {};
  }

  // Create a new user
  static async create(userData) {
    try {
      const db = getFirestore();
      const userRef = db.collection('users').doc();
      
      // Hash password if provided
      if (userData.password) {
        userData.password = await bcrypt.hash(userData.password, 12);
      }
      
      const user = new User({
        ...userData,
        id: userRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const userDataToSave = prepareForFirestore(user);
      await userRef.set(userDataToSave);
      
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(id).get();
      
      if (!userDoc.exists) {
        return null;
      }

      const userData = convertTimestamps(userDoc.data());
      return new User({ id: userDoc.id, ...userData });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const db = getFirestore();
      const usersSnapshot = await db.collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return null;
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = convertTimestamps(userDoc.data());
      return new User({ id: userDoc.id, ...userData });
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Find all users with optional filters
  static async find(query = {}) {
    try {
      const db = getFirestore();
      let usersQuery = db.collection('users');

      // Apply filters
      if (query.role) {
        usersQuery = usersQuery.where('role', '==', query.role);
      }
      if (query.isActive !== undefined) {
        usersQuery = usersQuery.where('isActive', '==', query.isActive);
      }

      // Apply pagination
      if (query.limit) {
        usersQuery = usersQuery.limit(query.limit);
      }
      if (query.offset) {
        usersQuery = usersQuery.offset(query.offset);
      }

      // Apply ordering
      const orderBy = query.orderBy || 'createdAt';
      const orderDirection = query.orderDirection || 'desc';
      usersQuery = usersQuery.orderBy(orderBy, orderDirection);

      const usersSnapshot = await usersQuery.get();
      const users = [];

      usersSnapshot.forEach(doc => {
        const userData = convertTimestamps(doc.data());
        users.push(new User({ id: doc.id, ...userData }));
      });

      return users;
    } catch (error) {
      console.error('Error finding users:', error);
      throw error;
    }
  }

  // Count users
  static async count(query = {}) {
    try {
      const db = getFirestore();
      let usersQuery = db.collection('users');

      // Apply filters
      if (query.role) {
        usersQuery = usersQuery.where('role', '==', query.role);
      }
      if (query.isActive !== undefined) {
        usersQuery = usersQuery.where('isActive', '==', query.isActive);
      }

      const usersSnapshot = await usersQuery.get();
      return usersSnapshot.size;
    } catch (error) {
      console.error('Error counting users:', error);
      throw error;
    }
  }

  // Update user
  async update(updateData) {
    try {
      const db = getFirestore();
      const userRef = db.collection('users').doc(this.id);

      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      const dataToSave = prepareForFirestore(updatedData);
      await userRef.update(dataToSave);

      // Update local instance
      Object.assign(this, updatedData);
      return this;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Delete user
  async delete() {
    try {
      const db = getFirestore();
      await db.collection('users').doc(this.id).delete();
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  // Save user (create or update)
  async save() {
    try {
      if (this.id) {
        return await this.update(this);
      } else {
        const newUser = await User.create(this);
        Object.assign(this, newUser);
        return this;
      }
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  // Convert to JSON
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }

  // Convert to plain object
  toObject() {
    return { ...this };
  }
}

module.exports = User;