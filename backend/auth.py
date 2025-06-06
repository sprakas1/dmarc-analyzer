from fastapi import HTTPException, Depends, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
import jwt
from jwt import PyJWTError
import os
from typing import Optional, Dict, Any
import logging

from config import get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer()

# Supabase JWT secret
SUPABASE_JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')

class AuthManager:
    def __init__(self):
        self.supabase = get_supabase_client()
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """Verify Supabase JWT token and return user data"""
        try:
            if not SUPABASE_JWT_SECRET:
                # Fallback: verify with Supabase API
                return self._verify_with_supabase_api(token)
            
            # Decode JWT token
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            
            return payload
            
        except PyJWTError as e:
            logger.error(f"JWT verification failed: {e}")
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(
                status_code=401,
                detail="Authentication failed"
            )
    
    def _verify_with_supabase_api(self, token: str) -> Dict[str, Any]:
        """Verify token using Supabase API as fallback"""
        try:
            # Set the token for the client
            self.supabase.auth.set_session(token, "dummy_refresh_token")
            user = self.supabase.auth.get_user(token)
            
            if not user.user:
                raise HTTPException(status_code=401, detail="Invalid token")
                
            return {
                "sub": user.user.id,
                "email": user.user.email,
                "role": "authenticated"
            }
        except Exception as e:
            logger.error(f"Supabase API verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid token")
    
    def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """Extract user information from validated token"""
        payload = self.verify_jwt_token(token)
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        return {
            "id": user_id,
            "email": email,
            "role": payload.get("role", "authenticated")
        }

# Global auth manager instance
auth_manager = AuthManager()

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """FastAPI dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        user = auth_manager.get_user_from_token(token)
        
        # Store the access token in the user object for RLS operations
        user['access_token'] = token
        
        # Ensure user profile exists in database
        _ensure_user_profile(user)
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=401,
            detail="Authentication failed"
        )

def _ensure_user_profile(user: Dict[str, Any]) -> None:
    """Ensure user profile exists in the profiles table"""
    try:
        supabase = get_supabase_client()
        
        profile_data = {
            'id': user['id'],
            'email': user['email'],
        }
        
        # Use upsert to handle existing profiles gracefully
        supabase.table('profiles').upsert(profile_data, on_conflict='id').execute()
        
    except Exception as e:
        logger.warning(f"Failed to ensure user profile: {e}")
        # Don't fail authentication if profile creation fails

def get_optional_user(request: Request) -> Optional[Dict[str, Any]]:
    """Optional authentication dependency for endpoints that work with or without auth"""
    try:
        # Extract authorization header manually
        auth_header = request.headers.get("authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        user = auth_manager.get_user_from_token(token)
        
        # Store the access token in the user object for RLS operations
        user['access_token'] = token
        
        # Ensure user profile exists in database
        _ensure_user_profile(user)
        
        return user
        
    except Exception:
        # If any error occurs, just return None for optional auth
        return None

def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Require admin role (can be extended for role-based access)"""
    # For now, all authenticated users are considered admins
    # This can be extended with proper role checking
    return user 