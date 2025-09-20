# QuizEthic - Advanced Online Examination Platform

A comprehensive online examination platform with advanced anti-cheating features, AI-powered question generation, and real-time monitoring capabilities.

## 🚀 Features

### Question Management
- **Multiple Question Types**: MCQ, short answer, code, image-based, true/false, numerical, matching, drag-drop, hotspot, fill-in-the-blank, essay, mathematical expressions
- **Question Bank**: Organized question pool with metadata (topic, difficulty, tags)
- **AI Question Generator**: Smart question generation with randomization and adaptive difficulty
- **Import/Export**: Support for CSV and JSON question imports

### Exam Management
- **Timed Exams**: Configurable time limits with section-based timing
- **Advanced Grading**: Multiple grading methods, penalties, bonuses, and adaptive scoring
- **Proctoring**: Real-time monitoring with webcam snapshots and behavior analysis
- **Analytics**: Comprehensive exam performance and result analytics

### Anti-Cheating System
- **UI Lockdown**: Prevents copy/paste, right-click, and developer tools access
- **Behavior Monitoring**: Tracks mouse movements, keyboard activity, and focus events
- **Webcam Monitoring**: Captures snapshots and analyzes for suspicious activity
- **Browser Detection**: Monitors tab switching and window focus
- **Device Fingerprinting**: Identifies unique devices and detects multiple logins
- **Plagiarism Detection**: Compares answers against previous attempts and online sources
- **Real-time Alerts**: Instant notifications for violations and suspicious behavior

### Admin Dashboard
- **User Management**: Complete user administration with role-based access
- **Violation Monitoring**: Real-time violation tracking and management
- **Analytics**: System performance and usage analytics
- **Settings**: Comprehensive system configuration

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library
- **React Router DOM** - Client-side routing
- **React Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **Socket.io Client** - Real-time communication
- **Monaco Editor** - Code editing
- **KaTeX** - Math rendering
- **React Beautiful DnD** - Drag and drop

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Firebase Firestore** - NoSQL database
- **Firebase Admin SDK** - Database operations
- **Socket.io** - Real-time communication
- **Multer** - File uploads
- **Sharp** - Image processing
- **Natural** - NLP processing
- **Compromise** - Text analysis
- **FingerprintJS2** - Device fingerprinting

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- Firebase project with Firestore enabled
- Redis 7.0+ (optional, for caching)

> **📖 For detailed development setup, see [DEVELOPMENT.md](DEVELOPMENT.md)**

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/quizethic.git
   cd quizethic
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Firebase Setup**
   ```bash
   # Follow the Firebase setup guide
   # See FIREBASE_SETUP.md for detailed instructions
   
   # 1. Create a Firebase project
   # 2. Enable Firestore Database
   # 3. Enable Authentication
   # 4. Create a service account
   # 5. Download service account key
   ```

4. **Environment Configuration**
   ```bash
   # Copy environment files
   cp env.development.example .env
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   
   # Update server/.env with your Firebase service account key
   # FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   # FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
   # FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   ```

5. **Start the development servers**
   
   **Option 1: Using the startup script (Recommended)**
   ```bash
   # On Linux/Mac
   chmod +x start-dev.sh
   ./start-dev.sh
   
   # On Windows
   start-dev.bat
   ```
   
   **Option 2: Manual start**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start:
   - Frontend on http://localhost:3000
   - Backend on http://localhost:5000
   - Both services will run concurrently

### Local Development Setup

1. **Start Both Services**
   ```bash
   # From root directory - starts both client and server
   npm run dev
   ```

2. **Start Services Individually**
   ```bash
   # Start only the server (backend)
   npm run server
   
   # Start only the client (frontend) - in a new terminal
   npm run client
   ```

## 🧪 Testing

### Frontend Testing
```bash
cd client
npm test
npm run test:coverage
```

### Backend Testing
```bash
cd server
npm test
npm run test:coverage
```

### E2E Testing
```bash
npm run test:e2e
```

## 🚀 Deployment

### Production Build
```bash
# Build client
cd client
npm run build

# Build server
cd ../server
npm run build
```

### Environment Variables
Copy `env.production.example` to `.env` and configure:
- Firebase service account key
- Firebase database URL
- Firebase storage bucket
- JWT secrets
- CORS origins
- File upload paths
- Email configuration
- SSL certificates

### Production Deployment
1. Build the application
2. Configure environment variables
3. Set up Firebase project and service account
4. Set up Redis (optional)
5. Configure reverse proxy (Nginx)
6. Set up SSL certificates
7. Configure monitoring and logging

### Build for Production
```bash
# Build the client
npm run build

# The built files will be in client/build/
# Serve them with a web server like Nginx or Apache
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Questions
- `GET /api/questions` - Get questions
- `POST /api/questions` - Create question
- `PUT /api/questions/:id` - Update question
- `DELETE /api/questions/:id` - Delete question
- `POST /api/questions/generate` - Generate AI questions

### Exams
- `GET /api/exams` - Get exams
- `POST /api/exams` - Create exam
- `PUT /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam
- `POST /api/exams/:id/start` - Start exam
- `POST /api/exams/:id/submit` - Submit exam

### Anti-Cheating
- `POST /api/anti-cheating/violation` - Report violation
- `POST /api/anti-cheating/webcam-snapshot` - Upload webcam snapshot
- `GET /api/anti-cheating/monitoring/:examId` - Get monitoring data

## 🔧 Configuration

### Anti-Cheating Settings
```javascript
{
  "webcam": {
    "enabled": true,
    "snapshotInterval": 30000,
    "quality": 0.8
  },
  "behavior": {
    "enabled": true,
    "mouseTracking": true,
    "keyboardTracking": true,
    "focusTracking": true
  },
  "plagiarism": {
    "enabled": true,
    "checkOnline": false,
    "similarityThreshold": 0.8
  }
}
```

### Question Generation Settings
```javascript
{
  "ai": {
    "enabled": true,
    "model": "gpt-3.5-turbo",
    "maxTokens": 1000
  },
  "randomization": {
    "enabled": true,
    "shuffleOptions": true,
    "shuffleOrder": true
  },
  "adaptive": {
    "enabled": true,
    "adjustmentRate": 0.1,
    "minDifficulty": "easy",
    "maxDifficulty": "hard"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@quizethic.com or join our Slack channel.

## 🙏 Acknowledgments

- React team for the amazing framework
- MongoDB team for the database
- All open-source contributors
- The education community for feedback and suggestions

---

**QuizEthic** - Making online examinations secure, fair, and efficient.
