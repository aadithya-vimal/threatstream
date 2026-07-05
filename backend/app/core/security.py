from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

security_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    """
    Validates the Supabase JWT token passed in the Authorization header.
    Returns the user claims dict if valid, otherwise raises 401.
    """
    token = credentials.credentials
    try:
        # Supabase JWTs use standard HS256 signature
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False} # Supabase might set aud to "authenticated"
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: sub missing"
            )
        return {
            "id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated")
        }
    except JWTError as e:
        # Fallback for development/offline testing if mock secret is active
        if settings.SUPABASE_JWT_SECRET == "mock-jwt-secret":
            # Allow mock credentials
            return {
                "id": "00000000-0000-0000-0000-000000000000",
                "email": "dev-analyst@acme.com",
                "role": "authenticated"
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )
