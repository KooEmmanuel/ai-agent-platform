#!/usr/bin/env python3
"""
Script to generate a new admin token
"""

import jwt
from datetime import datetime, timedelta
from app.core.config import settings

def create_admin_token():
    """Create a new admin access token"""
    try:
        # Token payload
        payload = {
            "sub": "1",  # Admin ID
            "exp": datetime.utcnow() + timedelta(hours=24),  # Expires in 24 hours
            "type": "admin"
        }
        
        # Create JWT token
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        
        print("🔑 New Admin Token Generated:")
        print(f"Token: {token}")
        print(f"Expires: {payload['exp']}")
        print(f"Valid for: 24 hours")
        
        # Save to file
        with open('admin_token.txt', 'w') as f:
            f.write(token)
        
        print("\n✅ Token saved to admin_token.txt")
        print("\n🔐 To use this token:")
        print("1. Copy the token above")
        print("2. Go to your browser's developer tools")
        print("3. Open Application/Storage tab")
        print("4. Find localStorage")
        print("5. Set 'admin_token' to the new token value")
        print("6. Refresh the admin dashboard page")
        
        return token
        
    except Exception as e:
        print(f"❌ Error creating token: {e}")
        return None

if __name__ == "__main__":
    create_admin_token()
