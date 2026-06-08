# activity-service — port 8003

Logs user activity (plays, completions, reviews). Calls `user-service` and `game-service` at request time.

## Module 3 task

Open `app/main.py` and implement `validate_user()` and `fetch_game()`. Everything else (models, schemas, repository, routes) is pre-written.

## Setup

```bash
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

## File structure

```
activity-service/
├── app/
│   ├── __init__.py
│   ├── config.py          # service URLs read from .env
│   ├── database.py        # SQLAlchemy engine + get_db()
│   ├── models.py          # Activity ORM model
│   ├── schemas.py         # ActivityCreate, ActivityOut, ActivityList
│   ├── repository.py      # DB queries (pre-written)
│   ├── main.py            # FastAPI app + YOUR stubs
│   └── infrastructure/
│       └── auth_client.py # Module 6 — M2M token fetch
├── requirements.txt
└── .env.example
```
