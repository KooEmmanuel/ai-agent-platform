#!/bin/bash

# Railway Deployment Script for Drixai AI Agent Platform
# This script helps optimize the deployment process

echo "🚀 Starting Railway Deployment for Drixai AI Agent Platform"

# Check if we're in the right directory
if [ ! -f "railway.json" ]; then
    echo "❌ Error: railway.json not found. Please run this script from the project root."
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: backend directory not found."
    exit 1
fi

echo "✅ Project structure verified"

# Check if Dockerfile exists
if [ ! -f "backend/Dockerfile" ]; then
    echo "❌ Error: backend/Dockerfile not found."
    exit 1
fi

echo "✅ Dockerfile found"

# Check if requirements.txt exists
if [ ! -f "backend/requirements.txt" ]; then
    echo "❌ Error: backend/requirements.txt not found."
    exit 1
fi

echo "✅ Requirements file found"

# Display deployment configuration
echo ""
echo "📋 Deployment Configuration:"
echo "   - Builder: Dockerfile"
echo "   - Dockerfile: backend/Dockerfile"
echo "   - Start Command: cd backend && python main.py"
echo "   - Health Check: /health"
echo ""

# Check file sizes to optimize build
echo "📊 File Size Analysis:"
echo "   - Backend directory: $(du -sh backend | cut -f1)"
echo "   - Requirements.txt: $(wc -l < backend/requirements.txt) lines"
echo ""

# Check for large files that might slow down build
echo "🔍 Checking for large files in backend:"
find backend -type f -size +10M 2>/dev/null | head -5

echo ""
echo "🎯 Deployment Tips:"
echo "   1. The .dockerignore file will exclude unnecessary files"
echo "   2. Docker layer caching is optimized for faster rebuilds"
echo "   3. Health checks are configured for better monitoring"
echo "   4. Non-root user is created for security"
echo ""

echo "🚀 Ready to deploy! Run: railway up"
echo ""
echo "💡 If you encounter timeout issues:"
echo "   - Check Railway logs: railway logs"
echo "   - Monitor build progress: railway status"
echo "   - Consider upgrading Railway plan for longer build times"
echo ""

echo "✅ Deployment script completed successfully!" 