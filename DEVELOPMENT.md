# QuizEthic Development Guide

This guide will help you set up and run QuizEthic locally for development.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project (see FIREBASE_SETUP.md)

### 1. Clone and Install
```bash
git clone <repository-url>
cd QuizEthic
npm run install-all
```

### 2. Configure Environment
```bash
# Copy development environment file
cp env.development.example server/.env

# Edit server/.env with your Firebase credentials
# FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
# FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
# FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

### 3. Start Development
```bash
# Option 1: Use startup script
./start-dev.sh          # Linux/Mac
start-dev.bat           # Windows

# Option 2: Manual start
npm run dev
```

## 📁 Project Structure

```
QuizEthic/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── utils/          # Utility functions
│   │   └── styles/         # CSS styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/            # Configuration files
│   ├── models/            # Data models
│   ├── routes/            # API routes
│   ├── middleware/        # Express middleware
│   └── package.json
├── start-dev.sh           # Development startup script (Linux/Mac)
├── start-dev.bat          # Development startup script (Windows)
└── package.json           # Root package.json
```

## 🔧 Development Commands

### Root Commands
```bash
npm run dev              # Start both client and server
npm run server           # Start only server
npm run client           # Start only client
npm run build            # Build client for production
npm run install-all      # Install all dependencies
```

### Client Commands (in client/ directory)
```bash
npm start                # Start development server
npm run build            # Build for production
npm test                 # Run tests
npm run eject            # Eject from Create React App
```

### Server Commands (in server/ directory)
```bash
npm start                # Start production server
npm run dev              # Start development server with nodemon
npm test                 # Run tests
```

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

## 🔥 Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Enable Authentication
4. Create a service account
5. Download the service account key
6. Update `server/.env` with your Firebase credentials

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions.

## 🛠️ Development Tips

### Hot Reloading
- Client: Automatic hot reloading with React
- Server: Automatic restart with nodemon

### API Testing
```bash
# Test health endpoint
curl http://localhost:5000/health

# Test API endpoints
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","firstName":"Test","lastName":"User"}'
```

### Database Access
- Use Firebase Console to view/manage data
- Firestore collections: `users`, `questions`, `exams`, `attempts`

### Debugging
- Client: Use React Developer Tools
- Server: Check console logs
- Firebase: Use Firebase Console

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Kill process on port 3000
   npx kill-port 3000
   
   # Kill process on port 5000
   npx kill-port 5000
   ```

2. **Firebase connection error**
   - Check your service account key
   - Verify Firebase project ID
   - Ensure Firestore is enabled

3. **Dependencies not installed**
   ```bash
   npm run install-all
   ```

4. **Environment variables not loaded**
   - Check `server/.env` exists
   - Verify Firebase credentials are correct

### Logs
- Client logs: Browser console
- Server logs: Terminal where you ran `npm run dev`
- Firebase logs: Firebase Console

## 📝 Code Style

### Frontend (React)
- Use functional components with hooks
- Follow React best practices
- Use TypeScript for type safety (optional)

### Backend (Node.js)
- Use async/await for async operations
- Follow REST API conventions
- Use proper error handling

## 🧪 Testing

### Run Tests
```bash
# Client tests
cd client && npm test

# Server tests
cd server && npm test
```

### Test Coverage
```bash
# Client coverage
cd client && npm run test -- --coverage

# Server coverage
cd server && npm run test -- --coverage
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables for Production
- Copy `env.production.example` to `.env`
- Update with production Firebase credentials
- Set `NODE_ENV=production`

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs)
- [Node.js Documentation](https://nodejs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Express.js Documentation](https://expressjs.com/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test your changes
5. Submit a pull request

## 📞 Support

For development issues:
- Check this guide
- Review the main README.md
- Check Firebase setup guide
- Review server logs
