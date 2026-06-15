# Running GameHub Locally

This guide covers how to start every service for local development (modules 1–6).
All services use SQLite by default — no PostgreSQL needed until module 8.

---

## Ports at a glance

| Service              | Port | Tech         |
|----------------------|------|--------------|
| gateway              | 8000 | FastAPI      |
| user-service         | 8001 | FastAPI      |
| game-service         | 8002 | FastAPI      |
| activity-service     | 8003 | FastAPI      |
| notification-service | 8004 | Node.js      |
| auth-service         | 8005 | FastAPI      |
| logging-service      | 8006 | Flask        |
| frontend             | 5173 | Vite (React) |

---

## How each service manages its database

This matters when you wipe databases or set up from scratch.

| Service              | Table creation strategy                                      |
|----------------------|--------------------------------------------------------------|
| user-service         | Alembic only — you MUST run `alembic upgrade head`          |
| game-service         | Alembic only — you MUST run `alembic upgrade head`          |
| activity-service     | Auto-creates on startup via `Base.metadata.create_all()`    |
| logging-service      | Auto-creates on startup via `db.create_all()`               |
| auth-service         | No database                                                  |
| notification-service | Auto-creates on startup (Node.js, better-sqlite3)           |
| gateway              | No database                                                  |

If you delete a `.db` file while a service is already running, the service will recreate the file automatically but the Alembic-managed services (user-service, game-service) will have an empty file with no tables. Run `alembic upgrade head` again from within the service directory to fix it — you do not need to restart the service.

---

## Step 0 — Infrastructure (RabbitMQ + Redis)

RabbitMQ is needed for activity events to flow into logging-service and notification-service.
Redis is needed for the game-service `/summary` cache endpoint.
Skip this step if you only need the basic CRUD endpoints.

```bash
docker compose -f docker-compose.infra.yml up -d rabbitmq redis
```

To stop:
```bash
docker compose -f docker-compose.infra.yml down
```

**Without Redis:** game-service still works for all endpoints except `/summary`. Creating games will succeed — Redis errors are caught and ignored.

**Without RabbitMQ:** logging-service and notification-service still serve HTTP requests. You will see `[consumer] Connection lost — retrying in 5s` in their terminals — this is normal and harmless.

---

## Step 1 — auth-service (port 8005)

No database, no external dependencies. Start this first.

```bash
cd services/auth-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8005
```

**Test it:**
```bash
curl -X POST http://localhost:8005/v1/auth/token \
  -d "username=testuser&password=password"
```

**Hardcoded accounts:**

| Username         | Password     | Role    | Notes                          |
|------------------|--------------|---------|--------------------------------|
| testuser         | password     | gamer   | Default account for dev/seed   |
| admin            | adminpass    | admin   | Required for DELETE /v1/games  |
| activity-service | m2m-secret   | service | Internal M2M calls only        |

These are the only accounts that can log in. Users created via `POST /v1/users` are stored in user-service's database but cannot authenticate — auth-service is intentionally hardcoded for the course.

---

## Step 2 — user-service (port 8001)

```bash
cd services/user-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

> user-service does not have a `/health` endpoint. A `404` on `GET /health` is expected — the service is running.

---

## Step 3 — game-service (port 8002)

```bash
cd services/game-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8002
```

> game-service does not have a `/health` endpoint either. A `404` is expected.

---

## Step 4 — activity-service (port 8003)

Calls user-service and game-service over HTTP to validate users and enrich responses.
Publishes events to RabbitMQ if available (silently skips if not).

```bash
cd services/activity-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8003
```

No `alembic upgrade head` needed — tables are auto-created on startup.
The `.env.example` already points to `http://localhost:8001` and `http://localhost:8002`.

---

## Step 5 — logging-service (port 8006)

Runs Flask (not FastAPI). Starts a RabbitMQ consumer in a background thread.

```bash
cd services/logging-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m flask --app app.main run --port 8006
```

No `alembic upgrade head` needed — tables are auto-created on startup.

> If RabbitMQ is not running: `[consumer] Connection lost — retrying in 5s` will repeat in the terminal. This is intentional retry logic — the HTTP endpoints (consent, logs) still work fine.

---

## Step 6 — notification-service (port 8004)

Node.js + TypeScript. Consumes from RabbitMQ and stores notifications in SQLite.

```bash
cd services/notification-service
npm install
npm run build
npm start
```

For development with auto-reload:
```bash
npm run dev
```

No database setup needed — SQLite file is created automatically on first run.

---

## Step 7 — gateway (port 8000)

Start this after all other services are up. It proxies every request.

```bash
cd services/gateway
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

No `.env` needed — all service URLs default to `localhost` with the correct ports.

**Test it:**
```bash
curl http://localhost:8000/health
```

---

## Step 8 — frontend (port 5173)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` and log in with `testuser / password`.

### Mock mode (no backend needed)

```bash
VITE_USE_MOCK=true npm run dev
```

---

## Seeding the database

Once all services are running, populate the database with the canonical GameHub dataset (5 users, 8 games, 15 activities, GDPR consent for all users):

```bash
# Run from the project root
source services/user-service/.venv/bin/activate
python3 seed.py
```

The seed calls the REST API through the gateway, so all services (especially gateway, auth-service, user-service, game-service, activity-service, logging-service) must be up first.

If some services are not running, you can skip sections:
```bash
python3 seed.py --no-activities   # skip activity-service calls
python3 seed.py --no-consent      # skip logging-service consent calls
python3 seed.py --no-activities --no-consent
```

### Wiping and re-seeding

Delete the SQLite files, then re-run migrations for the Alembic-managed services before running the seed again:

```bash
# Delete all databases
rm services/user-service/users.db
rm services/game-service/games.db
rm services/activity-service/activities.db
rm services/logging-service/instance/logging.db
rm services/notification-service/notifications.db

# Re-run migrations (the other services auto-recreate their tables on next request)
cd services/user-service && source .venv/bin/activate && alembic upgrade head && cd ../..
cd services/game-service && source .venv/bin/activate && alembic upgrade head && cd ../..

# Re-seed
source services/user-service/.venv/bin/activate
python3 seed.py
```

You do not need to restart the running services after deleting the database files.

---

## Full startup order (recommended)

```
docker (rabbitmq + redis)          ← optional but needed for events and cache
  → auth-service         :8005
  → user-service         :8001
  → game-service         :8002
  → activity-service     :8003
  → logging-service      :8006
  → notification-service :8004
  → gateway              :8000
  → frontend             :5173
```

Each service runs in its own terminal tab.

---

## Minimal setup (no Docker)

If you only need to test the core CRUD features (users, games, auth, consent):

1. auth-service `:8005`
2. user-service `:8001`
3. game-service `:8002`
4. logging-service `:8006`
5. gateway `:8000`
6. frontend `:5173`

Activity events, notifications, and the Redis summary cache will not work, but all other HTTP endpoints will.

---

## Common problems

| Symptom | Cause | Fix |
|---|---|---|
| `[consumer] Connection lost — retrying in 5s` | RabbitMQ not running | Start via Docker (Step 0), or ignore — HTTP endpoints still work |
| `POST /v1/games` returns 500 | Redis not reachable | Already fixed in `service.py` — cache is skipped gracefully |
| Gateway returns 502 | A downstream service is not running | Start the missing service |
| `alembic upgrade head` fails | No `.env` file | Run `cp .env.example .env` first |
| Frontend login fails | Gateway or auth-service not running | Make sure both are up on `:8000` and `:8005` |
| Seed fails with `ModuleNotFoundError: requests` | Wrong Python env | Run `source services/user-service/.venv/bin/activate` first |
| Seed fails with `Connection refused` on port 8005 | auth-service not running | Start auth-service first |
| After wiping DB, service returns 500 on every request | Alembic tables missing | Run `alembic upgrade head` in user-service and game-service |
| `GET /health` returns 404 on user-service or game-service | Those services have no health endpoint | Expected — the service is running fine |
