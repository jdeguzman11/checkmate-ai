import json
import os
import ssl
import urllib.error
import urllib.request
from typing import Any

import certifi

from .game_storage import _normalize_supabase_url


class AuthError(RuntimeError):
    pass


class AuthNotConfiguredError(AuthError):
    pass


def get_user_from_token(token: str) -> dict[str, Any]:
    supabase_url = _normalize_supabase_url(os.getenv("SUPABASE_URL"))
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        raise AuthNotConfiguredError(
            "Authentication is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/auth/v1/user",
        method="GET",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10, context=_ssl_context()) as response:
            user = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise AuthError("Sign in again to save or load games.") from exc
    except urllib.error.URLError as exc:
        raise AuthError(f"Could not verify Supabase session: {exc.reason}") from exc

    if not user.get("id"):
        raise AuthError("Sign in again to save or load games.")

    return user


def _ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())
