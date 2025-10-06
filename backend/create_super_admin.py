#!/usr/bin/env python3
"""
Script to create the first super admin account
"""

import asyncio
import asyncpg
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_super_admin():
    """Create the first super admin account"""
    try:
        # Parse database URL
        db_url = settings.DATABASE_URL
        if db_url.startswith('postgresql+asyncpg://'):
            db_url = db_url.replace('postgresql+asyncpg://', 'postgresql://')
        
        # Connect to database
        conn = await asyncpg.connect(db_url)
        
        print("🔍 Checking if admins table exists...")
        
        # Check if admins table exists
        result = await conn.fetch("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admins'
            );
        """)
        
        if not result[0]['exists']:
            print("❌ Admins table does not exist. Please run database migrations first.")
            return
        
        print("✅ Admins table exists")
        
        # Check if super admin already exists
        existing_admin = await conn.fetch("""
            SELECT id, email, is_super_admin 
            FROM admins 
            WHERE is_super_admin = true
        """)
        
        if existing_admin:
            print(f"⚠️  Super admin already exists: {existing_admin[0]['email']}")
            print("   If you want to create a new super admin, please delete the existing one first.")
            return
        
        # Create super admin
        email = "admin@drixai.com"
        name = "Super Admin"
        password = "admin123"  # Change this to a secure password
        hashed_password = pwd_context.hash(password)
        
        print(f"👤 Creating super admin account...")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("   ⚠️  IMPORTANT: Change the password after first login!")
        
        await conn.execute("""
            INSERT INTO admins (email, name, hashed_password, is_super_admin, is_active)
            VALUES ($1, $2, $3, $4, $5)
        """, email, name, hashed_password, True, True)
        
        print("✅ Super admin created successfully!")
        print("\n🔐 Login Credentials:")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print("\n⚠️  SECURITY WARNING:")
        print("   1. Change the password immediately after first login")
        print("   2. Use a strong, unique password")
        print("   3. Keep these credentials secure")
        print("   4. Consider using a password manager")
        
        await conn.close()
        print("\n🎉 Super admin setup completed!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(create_super_admin())
