from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings


PBKDF2_PREFIX = "pbkdf2_sha256"
JWT_ALGORITHM = "HS256"


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64decode(encoded: str) -> bytes:
    padded = encoded + "=" * (-len(encoded) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    iterations = int(settings.password_hash_iterations)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"{PBKDF2_PREFIX}${iterations}${_b64encode(salt)}${_b64encode(derived)}"


def verify_password(password: str, stored: str) -> bool:
    # Backward compatible: treat unknown format as plaintext for migration.
    if not stored or "$" not in stored:
        return hmac.compare_digest(password, stored or "")

    parts = stored.split("$")
    if len(parts) != 4 or parts[0] != PBKDF2_PREFIX:
        return hmac.compare_digest(password, stored)

    try:
        iterations = int(parts[1])
        salt = _b64decode(parts[2])
        expected = _b64decode(parts[3])
    except Exception:
        return False

    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(derived, expected)


def create_access_token(subject: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=int(settings.access_token_expire_minutes))
    payload = {"sub": subject, "exp": expires}
    return jwt.encode(payload, settings.secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[JWT_ALGORITHM])

