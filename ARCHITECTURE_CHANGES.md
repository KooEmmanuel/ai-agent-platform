# Architecture Simplification - Frontend-Backend Connection

## Changes Made

### 1. Backend CORS Configuration
- **File**: `backend/app/core/config.py`
- **Change**: Removed wildcard `"*"` from `ALLOWED_ORIGINS` for better security
- **Impact**: More secure CORS configuration

### 2. Simplified API Client
- **File**: `frontend/lib/api.ts`
- **Changes**:
  - Removed complex routing logic (`forceNextJsRoute`, `isDynamicRoute`)
  - Simplified `request()` method to always call backend directly
  - Updated `refreshToken()` to call backend directly
  - Removed all `forceNextJsRoute` parameters from method calls
  - Updated `initializeApiClient()` to call backend directly

### 3. Removed Next.js API Proxy Routes
- **Action**: Deleted entire `frontend/app/api/` directory
- **Impact**: Eliminated 40+ proxy route files
- **Benefit**: Reduced complexity, maintenance overhead, and potential bugs

### 4. Updated Next.js Configuration
- **File**: `frontend/next.config.js`
- **Change**: Removed `rewrites()` configuration
- **Impact**: No more proxy routing through Next.js

### 5. Updated Authentication Client
- **File**: `frontend/lib/auth.ts`
- **Change**: Updated to use `NEXT_PUBLIC_API_URL` environment variable

## New Architecture

### Before (Complex)
```
Frontend → Next.js API Route → Backend
```

### After (Simple)
```
Frontend → Backend (Direct)
```

## Environment Variables

### Frontend (.env.local)
```bash
# Development
NEXT_PUBLIC_API_URL=http://localhost:8000

# Production
NEXT_PUBLIC_API_URL=https://kwickbuild.up.railway.app
```

### Backend (.env)
```bash
# CORS origins are now configured in backend/app/core/config.py
# No additional environment variables needed for this change
```

## Benefits

1. **Simplified Architecture**: Direct frontend-to-backend communication
2. **Better Performance**: No proxy overhead
3. **Easier Debugging**: Single connection point
4. **Reduced Maintenance**: No duplicate API logic
5. **Better Security**: More specific CORS configuration

## Migration Notes

### For Frontend Components
- Replace direct `fetch()` calls with `apiClient` methods
- Remove `makeAuthenticatedRequest` helper functions
- Update any hardcoded `/api` URLs to use `apiClient`

### For Development
- Set `NEXT_PUBLIC_API_URL` in your `.env.local` file
- Ensure backend CORS allows your frontend origin
- Test all API endpoints to ensure they work with direct calls

## Testing Checklist

- [ ] Authentication flow works
- [ ] All CRUD operations work (agents, tools, integrations)
- [ ] File uploads work
- [ ] Real-time features work (streaming, webhooks)
- [ ] Error handling works properly
- [ ] Token refresh works
- [ ] CORS is properly configured

## Rollback Plan

If issues arise, you can rollback by:
1. Restoring the `frontend/app/api/` directory from git
2. Reverting `frontend/lib/api.ts` changes
3. Restoring `frontend/next.config.js` rewrites
4. Reverting CORS changes in backend
