#!/bin/bash

# AI Agent Platform Deployment Script
# This script helps prepare your application for deployment

echo "🚀 AI Agent Platform Deployment Script"
echo "======================================"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

echo "✅ Git repository found"

# Check if backend files exist
if [ ! -f "backend/main.py" ]; then
    echo "❌ Backend main.py not found. Please ensure you're in the correct directory."
    exit 1
fi

# Check if frontend files exist
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Frontend package.json not found. Please ensure you're in the correct directory."
    exit 1
fi

echo "✅ Project structure looks good"

# Create .env.example files if they don't exist
if [ ! -f "backend/.env.example" ]; then
    echo "📝 Creating backend .env.example..."
    cat > backend/.env.example << EOF
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/ai_agent_platform

# Security
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development

# API Configuration
API_V1_STR=/api/v1
PROJECT_NAME=AI Agent Platform

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000", "http://localhost:8000"]
EOF
fi

if [ ! -f "frontend/.env.example" ]; then
    echo "📝 Creating frontend .env.example..."
    cat > frontend/.env.example << EOF
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Authentication
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EOF
fi

echo "✅ Environment files created"

# Check if all required deployment files exist
echo "🔍 Checking deployment files..."

required_files=(
    "railway.json"
    "backend/Procfile"
    "backend/runtime.txt"
    "frontend/railway.json"
    "deployment-guide.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file missing"
    fi
done

echo ""
echo "🎯 Next Steps:"
echo "=============="
echo ""
echo "1. 📚 Read the deployment guide:"
echo "   cat deployment-guide.md"
echo ""
echo "2. 🚀 Deploy to Railway (Recommended):"
echo "   - Go to https://railway.app"
echo "   - Sign up with GitHub"
echo "   - Create new project from your repository"
echo "   - Follow the deployment guide"
echo ""
echo "3. 🌐 Alternative: Deploy frontend to Vercel:"
echo "   - Go to https://vercel.com"
echo "   - Import your repository"
echo "   - Set root directory to 'frontend'"
echo ""
echo "4. 🔧 Set up environment variables:"
echo "   - Backend: DATABASE_URL, SECRET_KEY, etc."
echo "   - Frontend: NEXT_PUBLIC_API_URL"
echo ""
echo "5. 🗄️ Set up database:"
echo "   - Use PostgreSQL (Railway provides this)"
echo "   - Run migrations after deployment"
echo ""
echo "📖 For detailed instructions, see: deployment-guide.md"
echo ""
echo "🎉 Good luck with your deployment!" 