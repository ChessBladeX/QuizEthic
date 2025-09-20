const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase is already initialized
    if (admin.apps.length === 0) {
      // Initialize with service account key
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        : require('../serviceAccountKey.json');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });

      console.log('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

// Get Firestore instance
const getFirestore = () => {
  return admin.firestore();
};

// Get Auth instance
const getAuth = () => {
  return admin.auth();
};

// Get Storage instance
const getStorage = () => {
  return admin.storage();
};

// Helper function to convert Firestore timestamps
const convertTimestamps = (data) => {
  if (!data) return data;
  
  const converted = { ...data };
  
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object') {
      if (converted[key]._seconds !== undefined) {
        // Firestore timestamp
        converted[key] = new Date(converted[key]._seconds * 1000);
      } else if (Array.isArray(converted[key])) {
        // Array of objects
        converted[key] = converted[key].map(item => convertTimestamps(item));
      } else if (typeof converted[key] === 'object') {
        // Nested object
        converted[key] = convertTimestamps(converted[key]);
      }
    }
  });
  
  return converted;
};

// Helper function to prepare data for Firestore
const prepareForFirestore = (data) => {
  if (!data) return data;
  
  const prepared = { ...data };
  
  Object.keys(prepared).forEach(key => {
    if (prepared[key] instanceof Date) {
      // Convert Date to Firestore timestamp
      prepared[key] = admin.firestore.Timestamp.fromDate(prepared[key]);
    } else if (Array.isArray(prepared[key])) {
      // Process array items
      prepared[key] = prepared[key].map(item => 
        item instanceof Date ? admin.firestore.Timestamp.fromDate(item) : item
      );
    } else if (prepared[key] && typeof prepared[key] === 'object' && !prepared[key]._seconds) {
      // Recursively process nested objects
      prepared[key] = prepareForFirestore(prepared[key]);
    }
  });
  
  return prepared;
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  convertTimestamps,
  prepareForFirestore,
  admin
};
