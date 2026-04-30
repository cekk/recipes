import secrets

from fastapi import HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import get_settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def _verify_google_token(token: str) -> dict:
    """Verify a Google ID token and return the payload with user info."""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth non configurato sul server",
        )
    try:
        idinfo = id_token.verify_oauth2_token(
            token, google_requests.Request(), settings.google_client_id
        )
        email = idinfo.get("email", "")
        allowed = settings.allowed_emails_list
        if allowed and email not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email non autorizzata",
            )
        return idinfo
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Google non valido o scaduto",
        )


async def require_auth(
    request: Request,
    api_key: str = Security(api_key_header),
) -> str:
    """Dual-mode auth: accepts either X-API-Key or Authorization: Bearer <google_token>."""
    settings = get_settings()

    # 1. Try API key first (for bot, scripts, backward compat)
    if api_key and secrets.compare_digest(api_key, settings.api_key):
        return api_key

    # 2. Try Google OAuth Bearer token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        idinfo = _verify_google_token(token)
        return idinfo.get("email", "authenticated")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticazione richiesta (API key o Google login)",
    )
