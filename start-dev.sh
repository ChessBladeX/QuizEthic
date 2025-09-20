#!/bin/bash

# QuizEthic Development Startup Script

echo "🚀 Starting QuizEthic Development Environment"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing root dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo "📦 Installing client dependencies..."
    cd client && npm install && cd ..
fi

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo "⚠️  server/.env not found. Please copy env.development.example to server/.env and configure it."
    echo "   cp env.development.example server/.env"
    echo "   Then update the Firebase configuration in server/.env"
fi

if [ ! -f "client/.env" ]; then
    echo "⚠️  client/.env not found. Creating from example..."
    cp client/.env.example client/.env
fi

echo ""
echo "🎯 Starting QuizEthic..."
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Start both services
npm run dev
