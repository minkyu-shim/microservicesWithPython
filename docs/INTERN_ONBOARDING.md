# GameHub — Intern Onboarding

Welcome. This document will tell you how GameHub works so you can start making sense of the code. You do not need to know everything before you start. You just need to know enough to not be lost.

---

## What is GameHub?

GameHub is a social platform for gamers. Users can register an account, browse a game catalog, record what they played and for how long, and receive notifications about their activity.

The system is split into small independent services. Each service does one job and runs as its own process. They do not share databases — every service owns its own data. This is what people mean when they say "microservices."

---

## The services at a glance

```
                          +-------------------+
  Client (browser/curl)   |                   |
        |                 |     Gateway        |  port 8000
        +---------------->|  (front door)     |
                          |                   |
                          +---------+---------+
                                    |
              +---------------------+---------------------+
              |           |         |         |           |
         +----+----+ +----+----+ +--+------+ ++--------+ +---------+
         | user    | | game    | | activity| | auth    | | logging |
         | service | | service | | service | | service | | service |
         | :8001   | | :8002   | | :8003   | | :8005   | | :8006   |
         +---------+ +---------+ +----+----+ +---------+ +----+----+
                                      |                        ^
                                      |     RabbitMQ           |
                                      +----------+-------------+
                                                 |
                                        +--------+--------+
                                        | notification    |
                                        | service  :8004  |
                                        +-----------------+
```

**gateway** (port 8000) is the single entry point. Every request from a client goes here first. The gateway checks the login token, then forwards the request to the right service. Clients never call services directly.

**user-service** (port 8001) manages user accounts — registration, profile lookup, and so on.

**game-service** (port 8002) manages the game catalog. It has a caching layer using Redis so that reading a game summary is very fast.

**activity-service** (port 8003) records what a user played and for how long. When it saves an activity, it also fires off a message to other services via RabbitMQ (a message broker — think of it as a post box that other services can read from).

**auth-service** (port 8005) handles login. You send it a username and password, and it gives back a signed token. That token is your proof of identity for all other requests.

**notification-service** (port 8004) is written in Node.js, not Python. It listens to RabbitMQ and stores a notification for the user whenever a new activity comes in.

**logging-service** (port 8006) is written in Flask (a different Python web framework from FastAPI). It also listens to RabbitMQ and writes a log entry for each activity. But it will only do this if the user has given consent. More on that below.

---

## How a request flows through the system

Here is what happens from the moment a client sends a request to the moment they get a response back.

```
Client
  |
  |  GET /v1/games/42
  |  Authorization: Bearer <token>
  v
Gateway (port 8000)
  |
  |  1. Check the token. Is it valid? Is it expired?
  |     If not valid -> return 401 (Unauthorized), stop here.
  |
  |  2. Read the path: /v1/games/... -> route to game-service
  |
  v
game-service (port 8002)
  |
  |  3. Do the work: look up game 42 in the database.
  |
  v
Gateway
  |
  |  4. Pass the response back to the client.
  v
Client gets the response.
```

One exception: `POST /v1/auth/token` skips the token check. You have to be able to call it without a token — it is how you get a token in the first place.

---

## How login and tokens work

The auth system uses JWTs (JSON Web Tokens). Here is the plain version of what that means.

When you log in, auth-service creates a small packet of data — your username, your role, when the token expires — and signs it with a secret key. That signed packet is the JWT token.

When the gateway gets a request, it checks the token's signature using the same secret key. If the signature is valid, the gateway knows the token was not tampered with and trusts what it says. The gateway does not call auth-service again for every request. It just checks the signature locally.

Role checks (for example, "only admins can delete a game") happen inside the individual services, not at the gateway. A service reads the role out of the token and decides whether to allow the request.

There are three hardcoded test users:

| Username         | Password    | Role    | Used for                          |
|------------------|-------------|---------|-----------------------------------|
| testuser         | password    | gamer   | normal user testing               |
| admin            | adminpass   | admin   | admin actions                     |
| activity-service | m2m-secret  | service | activity-service talking to other services |

---

## How services talk to each other (M2M)

Sometimes one service needs to call another. For example, when a user records an activity, activity-service calls user-service to confirm the user exists before saving anything.

It cannot use the user's own token for this call, because then user-service would think the request was coming from the user directly. Instead, activity-service logs in to auth-service as itself, using the username `activity-service` and password `m2m-secret`. It gets back a token with role `service`, and uses that for its outbound calls.

This is called machine-to-machine (M2M) authentication.

---

## How async messaging works

When a user records an activity, two other services need to know about it: the notification service and the logging service. But activity-service does not call them directly.

```
activity-service
  |
  |  1. Save activity to database.
  |
  |  2. Publish a message to RabbitMQ.
  |        (like dropping a letter in a post box)
  v
RabbitMQ
  |              |
  v              v
notification-  logging-
service        service
  |              |
  |  Each service reads the message independently
  |  and does its own thing with it.
```

This design means activity-service does not need to know whether logging-service is running. If logging-service is down, activity-service does not crash — the message just waits in RabbitMQ. When logging-service comes back up, it processes the backlog. This is what people mean by "decoupled."

---

## CQRS in game-service

game-service uses a pattern called CQRS (Command Query Responsibility Segregation). The name sounds complicated but the idea is simple: use different storage for reads and writes.

When a game is added, it is saved to SQLite (the real database). A summary of that game is also written to Redis (a fast in-memory store). When someone requests a game summary, game-service reads from Redis instead of SQLite. This is much faster.

```
Write path:  POST /v1/games  ->  SQLite (authoritative)
                              +-> Redis  (summary copy)

Read paths:  GET /v1/games/{id}          ->  SQLite  (full data)
             GET /v1/games/{id}/summary  ->  Redis   (fast, may be slightly stale)
```

The tradeoff: the Redis copy might be a few seconds behind the SQLite version. For a game summary, that is acceptable.

---

## GDPR consent in logging-service

GDPR is a European privacy law that says users have the right to control how their data is collected and stored. GameHub takes this seriously in the logging-service.

No activity is logged unless the user has explicitly opted in. The consent endpoints are:

- `POST /v1/consent/{user_id}` — user opts in to logging
- `DELETE /v1/consent/{user_id}` — user withdraws consent
- `DELETE /v1/logs/{user_id}` — erase all of a user's logs (right to erasure)

When logging-service picks up a message from RabbitMQ, it checks consent first. If the user has not opted in, the message is dropped silently. Nothing is written.

---

## How Python services are laid out

Every FastAPI service follows the same folder structure. Once you know one, you know them all.

```
services/<service-name>/
  app/
    main.py          <- starts the app, registers routes
    models.py        <- database table definitions (SQLAlchemy ORM)
    schemas.py       <- request and response shapes (Pydantic)
    database.py      <- database connection setup
    repository.py    <- raw database queries
    service.py       <- business logic
    infrastructure/  <- external connections (Redis, RabbitMQ, auth client)
  tests/
  requirements.txt
```

The split between `repository.py` and `service.py` is intentional. The repository handles "how do I get this data from the database." The service handles "what should I do with the data." Keeping them separate makes the code easier to test and change.

notification-service (Node.js) and logging-service (Flask) have different layouts because they are different technologies, but they still follow the same general idea.

---

## How to run the project locally

You need Docker running to start the infrastructure (Redis and RabbitMQ).

```bash
# Start Redis and RabbitMQ
docker compose -f docker-compose.infra.yml up -d redis rabbitmq
```

Then start each Python service in its own terminal:

```bash
# Example: auth-service
cd services/auth-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

logging-service uses Flask instead of uvicorn:

```bash
cd services/logging-service
flask run --port 8006
```

notification-service uses Node.js:

```bash
cd services/notification-service
npm install && npm run dev
```

You need to start all services (plus the gateway) if you want the full flow to work. But if you are working on just one service, you can start only that one.

---

## A quick note on API conventions

All endpoints are prefixed with `/v1/`. So the games endpoint is `/v1/games`, not `/games`.

List responses always come back as a paginated object — they are never just a bare array. For example, `GET /v1/games` returns something like `{ "items": [...], "total": 42, "page": 1 }`.

The full list of endpoints and their expected shapes lives in `docs/api-contracts.md`. If you are unsure what a request or response should look like, that file is the source of truth.
