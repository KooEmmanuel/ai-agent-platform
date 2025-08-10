# Deployment Guide for AI Agent Platform

## Overview
This guide will help you deploy your AI Agent Platform to Railway, which supports both frontend (Next.js) and backend (FastAPI) deployments.

## Prerequisites
1. GitHub account with your code repository
2. Railway account (free tier available)
3. Database (PostgreSQL recommended)

## Option 1: Railway (Recommended - Full Stack)

### Step 1: Prepare Your Repository
1. Ensure your repository structure is:
   ```
   your-repo/
   ├── backend/
   │   ├── main.py
   │   ├── requirements.txt
   │   ├── Procfile
   │   └── runtime.txt
   ├── frontend/
   │   ├── package.json
   │   ├── next.config.js
   │   └── railway.json
   └── railway.json
   ```

### Step 2: Set Up Railway
1. Go to [Railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository

### Step 3: Deploy Backend Service
1. In Railway dashboard, click "New Service"
2. Select "GitHub Repo"
3. Choose your repository
4. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Step 4: Set Environment Variables for Backend
Add these environment variables in Railway:
```
DATABASE_URL=your_postgresql_connection_string
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Step 5: Deploy Frontend Service
1. Click "New Service" again
2. Select "GitHub Repo"
3. Choose your repository
4. Set the following:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 6: Set Environment Variables for Frontend
Add these environment variables:
```
NEXT_PUBLIC_API_URL=https://your-backend-service-url.railway.app
```

### Step 7: Set Up Database
1. In Railway, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Copy the connection string
4. Add it to your backend environment variables as `DATABASE_URL`

## Option 2: Vercel (Frontend) + Railway (Backend)

### Frontend on Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `frontend`
4. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
   ```

### Backend on Railway
Follow Steps 3-6 from Option 1 for the backend deployment.

## Option 3: Render (Alternative)

### Backend on Render
1. Go to [Render.com](https://render.com)
2. Create new "Web Service"
3. Connect your GitHub repo
4. Set:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend on Render
1. Create new "Static Site"
2. Connect your GitHub repo
3. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `.next`

## Environment Variables Reference

### Backend Variables
```bash
DATABASE_URL=postgresql://user:password@host:port/database
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production
```

### Frontend Variables
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## Database Setup
1. Use PostgreSQL for production
2. Run migrations after deployment:
   ```bash
   cd backend
   alembic upgrade head
   ```

## Post-Deployment Checklist
- [ ] Backend health check: `https://your-backend-url.com/health`
- [ ] Frontend loads without errors
- [ ] API endpoints are accessible
- [ ] Database migrations completed
- [ ] Environment variables configured
- [ ] CORS settings updated for production domains

## Troubleshooting

### Common Issues
1. **Build Failures**: Check build logs in Railway dashboard
2. **Database Connection**: Verify DATABASE_URL format
3. **CORS Errors**: Update CORS settings in backend
4. **Environment Variables**: Ensure all required variables are set

### Useful Commands
```bash
# Check backend logs
railway logs

# Check frontend logs
railway logs --service frontend

# Update environment variables
railway variables set KEY=value
```

## Cost Considerations
- **Railway**: Free tier includes 500 hours/month
- **Vercel**: Free tier for frontend
- **Render**: Free tier available
- **Database**: Consider managed PostgreSQL service

## Security Notes
1. Use strong SECRET_KEY
2. Enable HTTPS (automatic on Railway/Vercel)
3. Set up proper CORS origins
4. Use environment variables for sensitive data
5. Regular security updates 