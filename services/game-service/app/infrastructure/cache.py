# Module 5 — CQRS read model.
#
# SQLite is the write model (authoritative). Redis is the read model (fast, potentially stale).
#
# Write side (set_game_summary): IMPLEMENTED — call it from add_game() in service.py
#   after the game is saved to SQLite.
#
# Read side (get_game_summary): YOUR TASK — implement it, then add the
#   GET /v1/games/{game_id}/summary endpoint in routes.py that calls it.

import json
import os

import redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(REDIS_URL, decode_responses=True)
    return _client


def _key(game_id: str) -> str:
    return f"game:summary:{game_id}"


# ---------------------------------------------------------------------------
# Write side — implemented, call this from service.py after creating a game
# ---------------------------------------------------------------------------

def set_game_summary(game_id: str, data: dict) -> None:
    """
    Store a game summary projection in Redis.

    data must match the /summary response shape from api-contracts.md:
        { "id": "...", "title": "...", "genre": "...", "platform": "...", "cover_url": "..." }

    Call this in add_game() in service.py, right after the DB write:
        from app.infrastructure.cache import set_game_summary
        set_game_summary(game.id, {"id": game.id, "title": game.title, ...})
    """
    r = _get_client()
    r.set(_key(game_id), json.dumps(data))


# ---------------------------------------------------------------------------
# Read side — YOUR TASK
# ---------------------------------------------------------------------------

def get_game_summary(game_id: str) -> dict | None:
    """
    Retrieve a game summary projection from Redis.

    Returns the cached dict if the key exists, or None if it was never cached
    (e.g. the game was added before Redis was running).

    Steps:
    1. Get the Redis client with _get_client()
    2. Fetch the raw value: r.get(_key(game_id))
    3. If None → return None
    4. Otherwise → return json.loads(raw)

    Once implemented, add this endpoint to routes.py:
        GET /v1/games/{game_id}/summary
        → call get_game_summary(game_id)
        → return 200 with the dict, or 404 if None
    """
    raise NotImplementedError
