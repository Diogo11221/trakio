"""Service-to-service authentication: a shared secret compared in constant time."""

import hmac

from fastapi import Header, HTTPException, status

from trakio_ai.config import settings


def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    expected = settings().internal_token
    if not hmac.compare_digest(x_internal_token.encode(), expected.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid internal token")
