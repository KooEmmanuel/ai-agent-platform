"""
Firebase Authentication Service
"""

import firebase_admin
from firebase_admin import credentials, auth
from firebase_admin.exceptions import FirebaseError
from fastapi import HTTPException, status
from app.core.config import settings
import json

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with credentials"""
    try:
        # Check if Firebase is already initialized
        if not firebase_admin._apps:
            # Check if required Firebase environment variables are set
            if not all([settings.FIREBASE_PROJECT_ID, settings.FIREBASE_PRIVATE_KEY, settings.FIREBASE_CLIENT_EMAIL]):
                print("⚠️ Firebase environment variables not properly configured")
                return
            
            # Parse the private key from environment variable
            private_key = settings.FIREBASE_PRIVATE_KEY.replace('\\n', '\n') if settings.FIREBASE_PRIVATE_KEY else None
            
            # Create credentials dictionary with proper values
            cred_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key_id": settings.FIREBASE_PRIVATE_KEY_ID or "default-key-id",
                "private_key": private_key,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "client_id": settings.FIREBASE_CLIENT_ID or "default-client-id",
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{settings.FIREBASE_CLIENT_EMAIL}"
            }
            
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase Admin SDK initialized successfully")
            
    except Exception as e:
        print(f"❌ Firebase initialization error: {e}")
        # For development, we can continue without Firebase
        pass

def verify_firebase_token(id_token: str) -> dict:
    """Verify Firebase ID token and return user info"""
    try:
        print(f"🔐 Verifying Firebase token (length: {len(id_token)})")
        
        # Check if Firebase is initialized
        if not firebase_admin._apps:
            print("❌ Firebase Admin SDK not initialized")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Firebase Admin SDK not initialized"
            )
        
        # Verify the ID token
        decoded_token = auth.verify_id_token(id_token)
        print(f"✅ Firebase token verified for user: {decoded_token.get('uid', 'unknown')}")
        
        # Extract user information
        user_info = {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email", ""),
            "name": decoded_token.get("name", ""),
            "picture": decoded_token.get("picture", ""),
            "email_verified": decoded_token.get("email_verified", False)
        }
        
        return user_info
        
    except FirebaseError as e:
        print(f"❌ Firebase token verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase token: {str(e)}"
        )
    except Exception as e:
        print(f"❌ Unexpected error during token verification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Firebase token verification failed: {str(e)}"
        )

def get_firebase_user(uid: str) -> dict:
    """Get Firebase user by UID"""
    try:
        user_record = auth.get_user(uid)
        return {
            "uid": user_record.uid,
            "email": user_record.email,
            "name": user_record.display_name,
            "picture": user_record.photo_url,
            "email_verified": user_record.email_verified
        }
    except FirebaseError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Firebase user not found: {str(e)}"
        )

# Initialize Firebase on module import
initialize_firebase() 