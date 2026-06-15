"""
GameHub seed script — adapted from painfulMonolitic-Flask/seed.py

Calls the REST API through the gateway (localhost:8000).
All services must be running before you run this.

Usage:
    python seed.py

Optional: skip activities/consent if activity-service or logging-service are not up:
    python seed.py --no-activities --no-consent
"""

import argparse
import sys
import requests

GATEWAY = "http://localhost:8000"
AUTH_URL = "http://localhost:8005"  # auth-service is called directly for token


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_token() -> str:
    res = requests.post(
        f"{AUTH_URL}/v1/auth/token",
        data={"username": "testuser", "password": "password"},
    )
    res.raise_for_status()
    return res.json()["access_token"]


def headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def post(path: str, body: dict, token: str) -> dict:
    res = requests.post(f"{GATEWAY}{path}", json=body, headers=headers(token))
    if not res.ok:
        print(f"  ERROR {res.status_code} on POST {path}: {res.text}")
        sys.exit(1)
    return res.json()


# ---------------------------------------------------------------------------
# Data — canonical GameHub users and games, same as the monolith seed
# ---------------------------------------------------------------------------

USERS = [
    {"username": "nova",        "email": "nova@gamehub.io",    "password": "password"},
    {"username": "alex_g",      "email": "alex@gamehub.io",    "password": "password"},
    {"username": "maya_r",      "email": "maya@gamehub.io",    "password": "password"},
    {"username": "thunderbyte", "email": "thunder@gamehub.io", "password": "password"},
    {"username": "pixel_queen", "email": "pixel@gamehub.io",   "password": "password"},
]

GAMES = [
    {"title": "Hollow Knight",            "genre": "metroidvania", "platform": "PC",      "release_year": 2017, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg"},
    {"title": "Celeste",                  "genre": "platformer",   "platform": "PC",      "release_year": 2018, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/504230/header.jpg"},
    {"title": "Hades",                    "genre": "roguelite",    "platform": "PC",      "release_year": 2020, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/1145360/header.jpg"},
    {"title": "Stardew Valley",           "genre": "simulation",   "platform": "PC",      "release_year": 2016, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/413150/header.jpg"},
    {"title": "Dead Cells",               "genre": "roguelite",    "platform": "PC",      "release_year": 2018, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/588650/header.jpg"},
    {"title": "Ori and the Blind Forest", "genre": "platformer",   "platform": "PC",      "release_year": 2015, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/261570/header.jpg"},
    {"title": "Disco Elysium",            "genre": "rpg",          "platform": "PC",      "release_year": 2019, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/632470/header.jpg"},
    {"title": "Outer Wilds",              "genre": "adventure",    "platform": "PC",      "release_year": 2019, "cover_url": "https://cdn.cloudflare.steamstatic.com/steam/apps/753640/header.jpg"},
]

# (username, game_title, action, duration_minutes)
# Monolith used "started" — mapped to "played" here (closest valid action)
ACTIVITIES = [
    ("nova",        "Hollow Knight",            "played",     60),
    ("nova",        "Celeste",                  "completed",  180),
    ("nova",        "Outer Wilds",              "played",     90),
    ("alex_g",      "Hollow Knight",            "completed",  300),
    ("alex_g",      "Dead Cells",               "played",     120),
    ("alex_g",      "Celeste",                  "played",     90),
    ("maya_r",      "Disco Elysium",            "played",     150),
    ("maya_r",      "Stardew Valley",           "completed",  400),
    ("maya_r",      "Ori and the Blind Forest", "played",     60),
    ("thunderbyte", "Hades",                    "played",     90),
    ("thunderbyte", "Dead Cells",               "completed",  200),
    ("thunderbyte", "Hollow Knight",            "played",     30),
    ("pixel_queen", "Celeste",                  "completed",  600),
    ("pixel_queen", "Hollow Knight",            "completed",  500),
    ("pixel_queen", "Hades",                    "played",     180),
]

# Users who grant GDPR consent for logging
CONSENT_GRANTED = ["nova", "alex_g", "maya_r", "thunderbyte", "pixel_queen"]


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed(skip_activities=False, skip_consent=False):
    print("Getting auth token…")
    token = get_token()
    print("  OK\n")

    # Users
    print("Creating users…")
    user_ids: dict[str, str] = {}
    for u in USERS:
        created = post("/v1/users", u, token)
        user_ids[u["username"]] = created["id"]
        print(f"  {u['username']} → {created['id']}")
    print()

    # Games
    print("Creating games…")
    game_ids: dict[str, str] = {}
    for g in GAMES:
        created = post("/v1/games", g, token)
        game_ids[g["title"]] = created["id"]
        print(f"  {g['title']} → {created['id']}")
    print()

    # Activities
    if skip_activities:
        print("Skipping activities (--no-activities).\n")
    else:
        print("Logging activities…")
        for username, title, action, duration in ACTIVITIES:
            body = {
                "user_id": user_ids[username],
                "game_id": game_ids[title],
                "action": action,
                "duration_minutes": duration,
            }
            created = post("/v1/activities", body, token)
            print(f"  {username} {action} {title} ({duration} min) → {created['id']}")
        print()

    # Consent
    if skip_consent:
        print("Skipping consent (--no-consent).\n")
    else:
        print("Setting GDPR consent…")
        for username in CONSENT_GRANTED:
            uid = user_ids[username]
            res = requests.post(
                f"{GATEWAY}/v1/consent/{uid}",
                json={"granted": True},
                headers=headers(token),
            )
            if res.ok:
                print(f"  {username} → granted")
            else:
                print(f"  {username} → FAILED ({res.status_code}): {res.text}")
        print()

    print("Seed complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-activities", action="store_true")
    parser.add_argument("--no-consent",    action="store_true")
    args = parser.parse_args()

    seed(skip_activities=args.no_activities, skip_consent=args.no_consent)
