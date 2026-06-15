# GameHub — Service Reference

This document covers each service in enough detail that you can open the code and understand what you're looking at. It assumes you've already read `docs/INTERN_ONBOARDING.md`.

---

## gateway — port 8000

The gateway is the front door. Every request from the browser (or curl, or your test) hits port 8000 first. Nothing else is reachable from outside.

### What it does

It does exactly two things, in order:

1. Check the JWT token in the `Authorization` header.
2. Forward the request to the right service.

That's it. It does not look at request bodies. It does not check roles. It does not do anything with the response before passing it back.

### How routing works

The gateway reads the second segment of the URL path to decide where to send the request.

```
GET /v1/games/42
         ^
         this segment ("games") is the key
```

It looks up that key in a routing table:

```python
ROUTES = {
    "users":         "http://localhost:8001",
    "games":         "http://localhost:8002",
    "activities":    "http://localhost:8003",
    "notifications": "http://localhost:8004",
    "auth":          "http://localhost:8005",
    "consent":       "http://localhost:8006",
    "logs":          "http://localhost:8006",
}
```

Then it forwards the full request — same method, same headers, same body — to the target. The path is preserved exactly: `/v1/games/42` arrives at game-service as `/v1/games/42`.

The code for this lives in `services/gateway/app/main.py`. It uses the `httpx` library to make the outbound call.

### Token checking

Before forwarding, the gateway checks `Authorization: Bearer <token>`. It decodes the JWT using the shared `SECRET_KEY` and the `HS256` algorithm. If the token is missing, expired, or tampered with, it returns 401 and stops there.

One path skips this check: `/v1/auth/token`. That is how you get a token in the first place, so it cannot require one.

### What happens if a service is down

If the target service does not respond, `httpx` raises a `RequestError` and the gateway returns 503.

### What's in the code

The gateway has only two source files:

```
services/gateway/app/
  config.py   <- reads URLs and SECRET_KEY from environment variables
  main.py     <- all the logic (token check + routing)
```

---

## user-service — port 8001

Manages user accounts. This is the simplest service in the project.

### What it does

Three things: create a user, list users, get one user by ID.

### Endpoints

**POST /v1/users** — create a new user.

Send JSON:
```json
{
  "username": "nova",
  "email": "nova@example.com",
  "password": "secret"
}
```

You get back a 201 with the created user. The password is hashed before it is saved — you will never see the original in the database. The `id` is a UUID generated automatically.

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "username": "nova",
  "email": "nova@example.com",
  "is_active": true,
  "created_at": "2025-03-01T10:00:00Z"
}
```

**GET /v1/users** — list all users (paginated).

Query params: `limit` (default 20) and `offset` (default 0). Response is an envelope, not a bare array:

```json
{
  "items": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

**GET /v1/users/{user_id}** — get one user. Returns 404 if the ID doesn't exist.

### Internal structure

The service uses a four-layer layout. A request travels through each layer in order:

```
routes.py  ->  service.py  ->  repository.py  ->  database (SQLite)
```

- `routes.py` — defines the FastAPI endpoints. Validates the request shape using Pydantic schemas and calls into service.py.
- `service.py` — business logic. For example, it hashes the password here before passing the data to the repository.
- `repository.py` — raw database queries. Only talks to SQLAlchemy. No business logic here.
- `models.py` — defines the `User` table (id, username, email, hashed_password, is_active, created_at).
- `schemas.py` — Pydantic models (think: typed dictionaries) that define what a valid request looks like and what the response must contain.
- `database.py` — sets up the SQLAlchemy engine and the `get_db` dependency that FastAPI injects into route handlers.

---

## game-service — port 8002

Manages the game catalog. This is the most interesting Python service because it uses two storage systems: SQLite and Redis.

### What it does

You can add games, list them, search them, get one by ID, get a lightweight summary, or delete one. The delete is restricted to admin users.

### Endpoints

**POST /v1/games** — add a game.

```json
{
  "title": "Hollow Knight",
  "genre": "metroidvania",
  "platform": "PC",
  "release_year": 2017,
  "cover_url": "https://example.com/cover.jpg"
}
```

Returns 201 with the full game object including its generated ID.

**GET /v1/games** — list all games (paginated).

**GET /v1/games/search?q=hollow** — search by title. Returns the same paginated envelope as the list endpoint.

**GET /v1/games/{game_id}** — full game record from SQLite. Authoritative. Contains all fields.

**GET /v1/games/{game_id}/summary** — lightweight read from Redis. Returns only `id`, `title`, `genre`, and `platform`. Much faster than the full read but may be slightly out of date.

**DELETE /v1/games/{game_id}** — delete a game. Returns 204. Admin role required — a `gamer` token gets a 403.

### How the two storage systems work together

This is a pattern called CQRS. The idea is: writes go to SQLite, but fast reads go to Redis (an in-memory store — think of it as a very fast dictionary that lives in RAM).

```
POST /v1/games
      |
      +-> SQLite (full record, the real copy)
      +-> Redis  (summary only: id, title, genre, platform)

GET /v1/games/{id}         -> reads from SQLite
GET /v1/games/{id}/summary -> reads from Redis
```

When a game is added, `service.py` saves it to SQLite and then immediately calls `set_game_summary()` to write the summary to Redis. The Redis key format is `game:summary:{game_id}`.

When the summary endpoint is called, it calls `get_game_summary()` which does a `GET` on that Redis key. If the key does not exist (for example, Redis was restarted), it returns 404.

The cache logic lives in `app/infrastructure/cache.py`. Only two functions matter:

- `set_game_summary(game_id, data)` — write to Redis.
- `get_game_summary(game_id)` — read from Redis, returns `None` if missing.

The tradeoff: if someone modifies a game's data in SQLite through some other means and forgets to update Redis, the summary will be stale. For this project that is acceptable.

### The admin-only delete

The `DELETE /v1/games/{game_id}` endpoint uses a FastAPI dependency called `require_admin` from `app/security.py`. The dependency reads the JWT from the `Authorization` header, decodes it, and checks that `role == "admin"`. If it is not admin, it raises a 403 — not 401.

The difference matters:
- 401 = "I don't know who you are" (missing or invalid token)
- 403 = "I know who you are, but you can't do this" (valid token, wrong role)

`require_admin` decodes the token directly using the shared `SECRET_KEY`. It never calls auth-service. This is the same trick the gateway uses — the secret key is shared, so any service can verify tokens locally.

### Internal structure

```
services/game-service/app/
  routes.py           <- FastAPI endpoints
  service.py          <- business logic
  repository.py       <- database queries
  models.py           <- SQLAlchemy Game table
  schemas.py          <- Pydantic request/response models
  security.py         <- require_admin dependency
  config.py           <- reads settings from environment
  infrastructure/
    cache.py          <- Redis read/write functions
```

---

## activity-service — port 8003

Records what users did — played a game, completed it, added it to their wishlist. This service also triggers the async message flow that reaches notification-service and logging-service.

### What it does

Three endpoints: log an activity, get a global feed, get one user's feed. The interesting part is what happens behind the scenes when you log an activity.

### Endpoints

**POST /v1/activities** — log an activity.

```json
{
  "user_id": "3fa85f64-...",
  "game_id": "4fa85f64-...",
  "action": "played",
  "duration_minutes": 90
}
```

Valid `action` values: `played`, `completed`, `reviewed`, `wishlist_added`.

**GET /v1/activities** — global activity feed (paginated).

**GET /v1/activities/user/{user_id}** — activities for one user (paginated).

Both list endpoints include a `game` object in each item, fetched live from game-service on each request.

### What happens when you POST an activity

This is the most complex flow in the project:

```
POST /v1/activities
  |
  1. Call user-service to check the user exists.
  |     -> 404 if user not found
  |     -> retries 3 times if user-service is unreachable, then 503
  |
  2. Save the activity to SQLite.
  |
  3. Call game-service to get game details (title, genre, etc.)
  |     -> if game-service is down, game = null (does not fail the request)
  |
  4. Publish an event to RabbitMQ (fire-and-forget).
  |     -> if RabbitMQ is down, log the error and continue
  |
  5. Return 201 with the saved activity + game data.
```

Steps 1 is critical — the request fails if the user is not found. Steps 3 and 4 are best-effort — the response still returns 201 even if they fail.

### Machine-to-machine (M2M) calls

When activity-service calls user-service or game-service, those calls go through the gateway. The gateway requires a valid JWT. But activity-service cannot use the user's token — that would look like the user was calling user-service directly.

Instead, activity-service logs in to auth-service as itself, using `username=activity-service` and `password=m2m-secret`. It gets back a token with `role=service`. That token is cached in memory and reused for all outbound calls.

This logic lives in `app/infrastructure/auth_client.py`. The important function is `get_auth_headers()` — it returns `{"Authorization": "Bearer <token>"}` ready to pass to `httpx`.

One detail: the M2M token call goes directly to auth-service on port 8005, not through the gateway. This has to bypass the gateway because you cannot use a token to get a token.

### RabbitMQ publishing

After saving the activity, `publish_activity_event()` sends the same event to two queues:

- `gamehub.notifications` — consumed by notification-service
- `gamehub.logs` — consumed by logging-service

The payloads are slightly different. The notifications queue gets `user_id` + `message`. The logs queue gets `user_id`, `game_id`, `action`, and `message`.

This lives in `app/infrastructure/rabbitmq_publisher.py`. The publish is fire-and-forget — if RabbitMQ is down, the exception is caught and logged, but the HTTP response still returns 201.

### Internal structure

```
services/activity-service/app/
  main.py               <- FastAPI endpoints + validate_user() + enrich_with_game()
  models.py             <- SQLAlchemy Activity table
  schemas.py            <- Pydantic request/response models
  repository.py         <- database queries
  database.py           <- SQLAlchemy setup
  infrastructure/
    auth_client.py      <- M2M token fetch and cache
    rabbitmq_publisher.py <- publishes to two RabbitMQ queues
```

---

## auth-service — port 8005

Issues and verifies JWT tokens. There is no real user database here — just three hardcoded users for testing.

### What it does

Two endpoints: get a token (login), and check the current token's contents.

### Endpoints

**POST /v1/auth/token** — log in, get a JWT.

This endpoint uses form-encoded data, not JSON. That is the OAuth2 standard for the "password flow."

```bash
curl -X POST http://localhost:8005/v1/auth/token \
  -d "username=testuser&password=password"
```

Returns:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

Returns 401 if the credentials are wrong.

**GET /v1/auth/me** — returns the contents of the current token.

Requires `Authorization: Bearer <token>`. Returns the decoded payload:
```json
{
  "sub": "testuser",
  "role": "gamer",
  "exp": 1234567890
}
```

Use this to check that your token is valid and contains the right role.

### The three hardcoded users

```
Username           Password     Role
-----------        ----------   -------
testuser           password     gamer
admin              adminpass    admin
activity-service   m2m-secret   service
```

The `service` role is for M2M calls. The `admin` role is needed to delete a game.

### How tokens work

When you log in, auth-service calls `create_access_token()` in `app/security.py`. It takes a dict like `{"sub": "testuser", "role": "gamer"}`, adds an expiry timestamp (`exp`, 30 minutes from now), and signs the whole thing using the `SECRET_KEY` and the `HS256` algorithm.

The signed result is the JWT. It is not encrypted — anyone can read it — but it cannot be tampered with without knowing the `SECRET_KEY`.

When the gateway or game-service receives a token, they call `jwt.decode()` with the same `SECRET_KEY`. If the signature checks out and the token is not expired, the payload is trusted. Neither service calls auth-service to do this check. The shared key is enough.

---

## notification-service — port 8004

This is the only service written in Node.js and TypeScript. It does not have a POST endpoint for creating notifications — notifications come in through RabbitMQ automatically.

### What it does

Listen to RabbitMQ. When an activity event arrives, store a notification for the user. Expose an endpoint to read those notifications.

### Endpoints

**GET /v1/notifications/{user_id}** — list notifications for a user.

```json
{
  "items": [
    {
      "id": 1,
      "user_id": "3fa85f64-...",
      "message": "Someone just played Hollow Knight",
      "read": false,
      "received_at": "2025-03-01T10:00:00Z"
    }
  ]
}
```

**PATCH /v1/notifications/{notification_id}/read** — mark a notification as read.

```json
{
  "id": 1,
  "read": true
}
```

### How the consumer works

On startup, the service calls `startConsumer()` from `src/consumer.ts`. This connects to RabbitMQ and starts listening on the `gamehub.notifications` queue.

When a message arrives, the consumer:

1. Parses the JSON body: `{ "user_id": "...", "message": "..." }`.
2. Inserts a row into a local SQLite file (`notifications.db`).
3. Calls `channel.ack(msg)` to tell RabbitMQ the message was handled.

If anything goes wrong during step 1 or 2, it calls `channel.nack(msg, false, false)` instead. This tells RabbitMQ the message was not processed, so it can be retried or routed to a dead-letter queue.

The startup order matters:

```
main() in src/index.ts
  |
  +-> startConsumer()  <- must connect to RabbitMQ first
  +-> app.listen()     <- HTTP server starts after
```

If RabbitMQ is not running when you start notification-service, the whole process will crash on startup.

### Internal structure

```
services/notification-service/src/
  index.ts    <- main(): starts consumer, then HTTP server
  consumer.ts <- RabbitMQ listener, writes to SQLite
  routes.ts   <- Express route handlers
  db.ts       <- SQLite connection setup (better-sqlite3)
```

### Running it

```bash
cd services/notification-service
npm install
npm run dev   # compiles TypeScript and watches for changes
```

---

## logging-service — port 8006

This service is different in two ways: it uses Flask instead of FastAPI (every other Python service uses FastAPI), and it enforces GDPR consent before writing any data.

### What it does

Track whether users have consented to data logging. Consume activity events from RabbitMQ, but only write them if the user has consented. Let users delete all their data (right to erasure).

### Endpoints

**POST /v1/consent/{user_id}** — opt a user in (or out) of logging.

```json
{ "granted": true }
```

**GET /v1/consent/{user_id}** — check a user's current consent status. Returns 404 if no record exists — treat that as "not consented."

**DELETE /v1/consent/{user_id}** — withdraw consent. Sets `granted: false`. Does not delete the consent record itself — just flips the flag.

**DELETE /v1/logs/{user_id}** — erase all log entries for a user. This is the GDPR "right to erasure." Returns how many entries were deleted.

**GET /v1/logs/{user_id}** — read all log entries for a user.

### How the consent check works

The models file (`app/models.py`) defines two tables: `Consent` (one row per user, just `user_id` + `granted`) and `ActivityLog` (one row per logged event).

There is a helper function `has_consent(user_id)` in `models.py`:

```python
def has_consent(user_id: str) -> bool:
    record = Consent.query.get(user_id)
    return record is not None and record.granted is True
```

The consumer calls this before writing anything. If `has_consent()` returns `False`, the message is acknowledged (so RabbitMQ removes it from the queue) and silently dropped. Nothing is written.

### How the RabbitMQ consumer works

On startup, `app/main.py` starts a background thread:

```python
threading.Thread(target=start_consumer, args=(app,), daemon=True).start()
```

`daemon=True` means the thread will be killed automatically when the main process exits. The `app` argument is the Flask app itself — the consumer needs it to set up a database context.

The consumer in `app/consumer.py` runs a `while True` loop. It tries to connect to RabbitMQ and consume from `gamehub.logs`. If the connection drops (for example, RabbitMQ restarts), the exception is caught and the loop sleeps for 5 seconds before trying again.

Inside each message callback, the consumer calls `with flask_app.app_context():` before any database access. This is a Flask requirement — database sessions are tied to the application context, and background threads do not have one automatically.

### Why Flask instead of FastAPI

This is an intentional project decision. Flask is older and more common in enterprise Python — you will likely encounter it at work. The project uses it here to expose you to both frameworks. The behavior is the same; the syntax is different. Flask routes use `@app.route()` and return `jsonify()`. There is no Pydantic — request bodies are parsed manually with `request.get_json()`.

### Internal structure

```
services/logging-service/app/
  main.py     <- Flask app, all five endpoints, starts consumer thread
  consumer.py <- RabbitMQ listener, consent check, writes ActivityLog rows
  models.py   <- SQLAlchemy Consent and ActivityLog tables, has_consent()
```

### Running it

```bash
cd services/logging-service
flask run --port 8006
```

Note: Flask does not use `uvicorn`. The command is different from every other Python service.
