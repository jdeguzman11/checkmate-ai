import json
import os
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

import certifi


SUPABASE_TABLE = "games"


class GameStorageError(RuntimeError):
    pass


class GameStorageNotConfiguredError(GameStorageError):
    pass


def build_game_record(pgn: str, analysis_result: dict[str, Any]) -> dict[str, Any]:
    game = analysis_result.get("game") or {}

    return {
        "white_player": game.get("white", "Unknown"),
        "black_player": game.get("black", "Unknown"),
        "result": game.get("result", "*"),
        "game_date": _normalize_game_date(game.get("date")),
        "pgn": pgn,
        "analysis_json": analysis_result,
    }


def save_game(pgn: str, analysis_result: dict[str, Any]) -> dict[str, Any]:
    record = build_game_record(pgn, analysis_result)
    response = _supabase_request(
        "",
        method="POST",
        payload=record,
        extra_headers={"Prefer": "return=representation"},
    )

    if isinstance(response, list) and response:
        return response[0]

    raise GameStorageError("Supabase did not return the saved game.")


def list_games() -> list[dict[str, Any]]:
    query = urllib.parse.urlencode(
        {
            "select": "id,white_player,black_player,result,game_date,created_at",
            "order": "created_at.desc",
        }
    )
    response = _supabase_request(f"?{query}", method="GET")
    return response if isinstance(response, list) else []


def get_game(game_id: str) -> dict[str, Any]:
    query = urllib.parse.urlencode(
        {
            "id": f"eq.{game_id}",
            "select": "*",
            "limit": "1",
        }
    )
    response = _supabase_request(f"?{query}", method="GET")

    if isinstance(response, list) and response:
        return response[0]

    raise GameStorageError("Saved game was not found.")


def _supabase_request(
    path: str,
    *,
    method: str,
    payload: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> Any:
    supabase_url = _normalize_supabase_url(os.getenv("SUPABASE_URL"))
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        raise GameStorageNotConfiguredError(
            "Saved games are not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        )

    request_body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/rest/v1/{SUPABASE_TABLE}{path}",
        data=request_body,
        method=method,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            **(extra_headers or {}),
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=10, context=_ssl_context()) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8")
        raise GameStorageError(f"Supabase request failed: {detail or exc.reason}") from exc
    except urllib.error.URLError as exc:
        raise GameStorageError(f"Could not connect to Supabase: {exc.reason}") from exc

    return json.loads(body) if body else None


def _normalize_game_date(date_value: str | None) -> str | None:
    if not date_value or date_value == "Unknown" or "?" in date_value:
        return None

    return date_value.replace(".", "-")


def _normalize_supabase_url(url: str | None) -> str | None:
    if not url:
        return None

    normalized = url.strip()
    if normalized.endswith("/rest/v1/"):
        return normalized[: -len("/rest/v1/")]
    if normalized.endswith("/rest/v1"):
        return normalized[: -len("/rest/v1")]
    return normalized


def _ssl_context() -> ssl.SSLContext:
    return ssl.create_default_context(cafile=certifi.where())
