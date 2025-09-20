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
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - Real-time communication
- **Multer** - File uploads
- **Sharp** - Image processing
- **Natural** - NLP processing
- **Compromise** - Text analysis
- **FingerprintJS2** - Device fingerprinting

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- MongoDB 6.0+
- Redis 7.0+ (optional, for caching)

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

3. **Environment Configuration**
   ```bash
   # Copy environment files
   cp env.example .env
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```

4. **Start the development servers**
   ```bash
   # From root directory
   npm run dev
   ```

   This will start:
   - Frontend on http://localhost:3000
   - Backend on http://localhost:5000

### Docker Setup

1. **Using Docker Compose**
   ```bash
   # Start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f
   
   # Stop services
   docker-compose down
   ```

2. **Individual Services**
   ```bash
   # Build and run client
   cd client
   docker build -t quizethic-client .
   docker run -p 3000:80 quizethic-client
   
   # Build and run server
   cd server
   docker build -t quizethic-server .
   docker run -p 5000:5000 quizethic-server
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
- Database connection strings
- JWT secrets
- CORS origins
- File upload paths
- Email configuration
- SSL certificates

### Docker Deployment
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
1. Build the application
2. Configure environment variables
3. Set up MongoDB and Redis
4. Configure reverse proxy (Nginx)
5. Set up SSL certificates
6. Configure monitoring and logging

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
