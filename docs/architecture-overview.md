# GameHub Architecture Overview

GameHub is a gamer social platform. The project is built as a set of small, independent services — each one does a single job. This doc walks through how the pieces fit together, written for someone who's new to the project.

---

## The big picture

A browser (or any client) never talks to individual services directly. Every request goes to the **gateway** first. The gateway reads the URL, figures out which service owns it, and forwards the request. When the service responds, the gateway passes that response back to the client.

Here is what that looks like:

```
Browser / Frontend (port 5173)
        |
        v
  +-----------+
  |  Gateway  |  port 8000
  +-----------+
        |
        |-- /v1/users/...      --> user-service        (port 8001)
        |-- /v1/games/...      --> game-service         (port 8002)
        |-- /v1/activities/... --> activity-service     (port 8003)
        |-- /v1/notifications/..-> notification-service (port 8004)
        |-- /v1/auth/...       --> auth-service         (port 8005)

  (logging-service at port 8006 is reached internally, not through the gateway)

Each service has its own database:
  user-service    --> users.db      (SQLite)
  game-service    --> games.db      (SQLite + Redis cache)
  activity-service--> activities.db (SQLite)
  notification-service -> notifications.db (SQLite)
  logging-service --> logging.db    (SQLite)
```

When a user logs a game activity, something extra happens beyond saving to the database. That's where RabbitMQ comes in — and we'll get to that in a minute.

---

## The services

**Gateway (port 8000)**

The gateway is a thin proxy. It reads the second segment of the URL path — for example, `/v1/games/123` gives `games` — and looks that up in a routing table. It then forwards the entire request (method, headers, body, query params) to the matching service and returns whatever the service says back.

It does not validate the request body. It does not know what a "game" is. It just routes. If RabbitMQ is down or a service is unreachable, the gateway returns a `503 Service Unavailable`.

**User-service (port 8001)**

Handles user accounts. Create, read, update, and delete users. Each user gets a UUID. Activity-service calls this service to check that a user exists before saving an activity.

**Game-service (port 8002)**

Handles the game catalog. Returns game details like title, genre, and platform. Uses Redis to cache responses so repeated lookups are fast. Activity-service calls this service to look up a game's title when logging an activity — but if game-service is down, the activity still saves (the title just shows as "a game").

**Activity-service (port 8003)**

Records what a user did — for example, "played Elden Ring for 45 minutes". When you create an activity, the service:
1. Checks the user exists (calls user-service)
2. Saves the activity to its database
3. Tries to get the game title (calls game-service, optional)
4. Publishes a message to RabbitMQ
5. Returns the saved activity to the caller

Steps 4 and 5 are independent — publishing to RabbitMQ does not block the response. If RabbitMQ is down, the activity is still saved and the response still succeeds. An error is logged, but nothing breaks for the user.

**Notification-service (port 8004)**

A Node.js + TypeScript service. It does two things: it listens on the `gamehub.notifications` RabbitMQ queue, and it serves an HTTP API so clients can fetch stored notifications. Every message it receives from the queue gets written to its SQLite database.

**Auth-service (port 8005)**

Issues JWT tokens (a JWT is a signed string that proves who you are). Send it a username and password, and it gives back a token. Other services can check that token to know the request is legitimate. In development there is one hardcoded test user: `testuser / password`.

**Logging-service (port 8006)**

A Flask service (the only one — the rest are FastAPI). It handles two things: GDPR consent records, and activity logs. It listens on the `gamehub.logs` RabbitMQ queue. When a message arrives, it checks whether the user has given consent. If yes, it writes a log entry. If no, it discards the message silently. Users can also request their logs be deleted (GDPR right to erasure).

---

## How RabbitMQ works

This is the part that trips people up, so here is a plain explanation.

**The idea**

RabbitMQ is a message queue — think of it like a post office. Instead of service A sending a message directly to service B (which means A has to wait for B, and fails if B is down), A drops a message in a queue and immediately moves on. B picks the message up whenever it is ready. A and B never have to be talking at the same time.

**What happens in this project**

When activity-service saves a new activity, it publishes two messages to RabbitMQ — one to each queue:

- `gamehub.notifications` — carries `{ user_id, message }`
- `gamehub.logs` — carries `{ user_id, game_id, action, message }`

Activity-service then returns a response to the user. It does not wait for anyone to consume those messages. This is called "fire and forget" — you send it and move on.

RabbitMQ holds the messages. Then, independently:

- **notification-service** is always listening on `gamehub.notifications`. When a message arrives, it inserts a row into its `notifications` table.
- **logging-service** is always listening on `gamehub.logs`. When a message arrives, it checks consent for that user. If the user consented, it writes an `ActivityLog` row. If not, it discards the message.

Here is that flow as a diagram:

```
activity-service
       |
       | (after saving to DB)
       |
       +--publishes--> [ gamehub.notifications queue ]
       |                          |
       |                          v
       |               notification-service
       |               (Node.js, listens always)
       |               --> INSERT INTO notifications
       |
       +--publishes--> [ gamehub.logs queue ]
                                  |
                                  v
                        logging-service
                        (Flask, listens always)
                        --> check has_consent(user_id)
                            yes --> INSERT INTO activity_logs
                            no  --> discard silently
```

**Why not just call the services directly?**

If activity-service sent an HTTP request to notification-service directly, three things could go wrong:

- If notification-service is down, the activity creation fails too — even though saving the activity worked fine.
- The user has to wait longer, because now there are two network calls instead of one.
- activity-service needs to know notification-service's address, which ties the two services together.

With RabbitMQ, none of those problems exist. If notification-service is down, the message just sits in the queue until it comes back up. Nothing is lost.

---

## The data layer

Right now (Modules 1–7), every service keeps its own SQLite file on disk. There is no shared database.

```
user-service      --> ./users.db
game-service      --> ./games.db
activity-service  --> ./activities.db
notification-service --> ./notifications.db
logging-service   --> ./logging.db
```

From Module 8 onward, services switch to PostgreSQL. Each service gets its own separate PostgreSQL database (`user_db`, `game_db`, `activity_db`, `logging_db`). The switch is handled by changing the `DATABASE_URL` environment variable and running `alembic upgrade head`.

---

## How the gateway routes a request

The gateway routing is simple. Here is the full logic in plain terms:

1. Take the URL path, e.g. `/v1/games/abc-123`
2. Split on `/` → `['', 'v1', 'games', 'abc-123']`
3. The second segment (index 1) is the resource name: `games`
4. Look up `games` in the routing table → `http://localhost:8002`
5. Forward the full request to `http://localhost:8002/v1/games/abc-123`
6. Return the response

The routing table in `gateway/app/main.py` currently maps:
- `users` → user-service (8001)
- `games` → game-service (8002)
- `activities` → activity-service (8003)
- `notifications` → notification-service (8004)

Auth-service and logging-service are called directly in some cases, or routed separately.

---

## Known gaps

- Auth middleware in the gateway is not fully wired yet — the gateway does not currently validate JWT tokens on every route.
- Logging-service consent endpoints are stubbed (`raise NotImplementedError`) — they need to be implemented as part of Module 5.
- Game-service Redis caching behavior is not documented in the API contracts yet.
