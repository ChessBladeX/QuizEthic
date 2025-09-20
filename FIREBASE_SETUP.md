# Firebase Setup Guide for QuizEthic

This guide will help you set up Firebase for the QuizEthic platform.

## Prerequisites

1. A Google account
2. Access to the Google Cloud Console
3. Node.js 18+ installed locally

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "quizethic")
4. Choose whether to enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Firestore Database

1. In your Firebase project, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can secure it later)
4. Select a location for your database (choose the closest to your users)
5. Click "Done"

## Step 3: Enable Authentication

1. Go to "Authentication" in your Firebase project
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" provider
5. Click "Save"

## Step 4: Enable Storage (Optional)

1. Go to "Storage" in your Firebase project
2. Click "Get started"
3. Choose "Start in test mode" for development
4. Select the same location as your Firestore database
5. Click "Done"

## Step 5: Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to "IAM & Admin" > "Service Accounts"
4. Click "Create Service Account"
5. Enter a name (e.g., "quizethic-server")
6. Add description: "Service account for QuizEthic backend"
7. Click "Create and Continue"
8. Add role: "Firebase Admin SDK Administrator Service Agent"
9. Click "Continue" and then "Done"
10. Click on the created service account
11. Go to "Keys" tab
12. Click "Add Key" > "Create new key"
13. Choose "JSON" format
14. Click "Create"
15. Download the JSON file and rename it to `serviceAccountKey.json`

## Step 6: Configure Environment Variables

1. Copy `env.production.example` to `.env` in the server directory
2. Update the following variables:

```bash
# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project-id",...}
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

3. For the `FIREBASE_SERVICE_ACCOUNT_KEY`, copy the entire contents of your `serviceAccountKey.json` file as a single-line JSON string.

## Step 7: Set Up Firestore Security Rules

1. Go to "Firestore Database" > "Rules" in your Firebase console
2. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'instructor'];
    }
    
    // Questions collection
    match /questions/{questionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'instructor'];
    }
    
    // Exams collection
    match /exams/{examId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'instructor'];
    }
    
    // Attempts collection
    match /attempts/{attemptId} {
      allow read, write: if request.auth != null && 
        (resource.data.student == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'instructor']);
    }
  }
}
```

3. Click "Publish"

## Step 8: Set Up Storage Security Rules (if using Storage)

1. Go to "Storage" > "Rules" in your Firebase console
2. Replace the default rules with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

## Step 9: Test the Setup

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Start the server:
   ```bash
   npm run dev
   ```

3. Check the console for "Firebase initialized successfully"

4. Test the health endpoint:
   ```bash
   curl http://localhost:5000/health
   ```

## Step 10: Deploy to Production

1. Set up your production environment variables
2. Deploy using Docker:
   ```bash
   docker-compose up -d
   ```

## Troubleshooting

### Common Issues

1. **"Firebase Admin SDK not initialized"**
   - Check that your service account key is properly formatted
   - Ensure the JSON is valid and contains all required fields

2. **"Permission denied"**
   - Check your Firestore security rules
   - Ensure the service account has the correct permissions

3. **"Project not found"**
   - Verify your project ID in the service account key
   - Check that the project exists in Firebase console

### Security Best Practices

1. **Never commit service account keys to version control**
2. **Use environment variables for production**
3. **Regularly rotate service account keys**
4. **Implement proper Firestore security rules**
5. **Monitor Firebase usage and costs**

## Cost Optimization

1. **Use Firestore indexes efficiently**
2. **Implement proper pagination**
3. **Cache frequently accessed data**
4. **Monitor usage in Firebase console**
5. **Set up billing alerts**

## Support

For Firebase-specific issues:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Support](https://firebase.google.com/support)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)

For QuizEthic-specific issues:
- Check the main README.md
- Review the server logs
- Check the Firebase console for errors
