import hashlib
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, Request, Response, status

from .db import db

COOKIE_NAME = "solargrid_session"


def _password_bytes(password: str) -> bytes:
    return hashlib.sha256(password.encode("utf-8")).digest()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, encoded: str) -> bool:
    try:
        return bcrypt.checkpw(_password_bytes(password), encoded.encode("ascii"))
    except (ValueError, TypeError):
        return False


def _cookie_secure() -> bool:
    return os.getenv("COOKIE_SECURE", "false").lower() == "true"


def _cookie_samesite() -> str:
    value = os.getenv("COOKIE_SAMESITE", "lax").lower()
    return value if value in {"lax", "strict", "none"} else "lax"


def set_session(response: Response, user_id: str) -> None:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    token = jwt.encode(payload, os.getenv("JWT_SECRET", "solargrid-dev-secret"), algorithm="HS256")
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=_cookie_secure(), samesite=_cookie_samesite(), max_age=7 * 86400)


def clear_session(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME)


async def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET", "solargrid-dev-secret"), algorithms=["HS256"])
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("missing subject")
    except (jwt.InvalidTokenError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user
