@echo off
REM QuizEthic Development Startup Script for Windows

echo 🚀 Starting QuizEthic Development Environment
echo ==============================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing root dependencies...
    npm install
)

if not exist "server\node_modules" (
    echo 📦 Installing server dependencies...
    cd server && npm install && cd ..
)

if not exist "client\node_modules" (
    echo 📦 Installing client dependencies...
    cd client && npm install && cd ..
)

REM Check if .env files exist
if not exist "server\.env" (
    echo ⚠️  server\.env not found. Please copy env.development.example to server\.env and configure it.
    echo    copy env.development.example server\.env
    echo    Then update the Firebase configuration in server\.env
)

if not exist "client\.env" (
    echo ⚠️  client\.env not found. Creating from example...
    copy client\.env.example client\.env
)

echo.
echo 🎯 Starting QuizEthic...
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo Press Ctrl+C to stop both services
echo.

REM Start both services
npm run dev
