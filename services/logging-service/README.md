# logging-service — port 8006

GDPR-compliant activity logging. Uses **Flask** (not FastAPI) and consumes activity events from RabbitMQ.

## Module 5 task

1. Implement `has_consent(user_id)` in `app/models.py`
2. Implement the five endpoints in `app/main.py`

The RabbitMQ consumer (`app/consumer.py`) is pre-written — it calls `has_consent()` before storing any log entry.

## Setup

```bash
cp .env.example .env
pip install -r requirements.txt
flask run --port 8006
```

Note: Flask uses `@app.route` decorators, not FastAPI routers. No Pydantic — use `request.get_json()` and `jsonify()`.

## File structure

```
logging-service/
├── app/
│   ├── __init__.py
│   ├── models.py     — Consent, ActivityLog, has_consent() (YOUR TASK)
│   ├── main.py       — Flask app + endpoint stubs (YOUR TASK)
│   └── consumer.py   — RabbitMQ consumer, pre-written
├── requirements.txt
└── .env.example
```
