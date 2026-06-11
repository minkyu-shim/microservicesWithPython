# logging-service — Flask app (not FastAPI — intentional, see docs/specs.md)
#
# Run with:   flask run --port 8006
# Or:         python -m flask --app app.main run --port 8006
#
# YOUR TASK: implement the four consent endpoints and the log deletion endpoint.
# The response shapes are in docs/api-contracts.md.

import os
import threading
from datetime import datetime, timezone

from dotenv import load_dotenv
from flask import Flask, jsonify, request

from app.models import ActivityLog, Consent, db

load_dotenv()

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///./logging.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    # Start the RabbitMQ consumer in a background thread
    from app.consumer import start_consumer
    threading.Thread(target=start_consumer, args=(app,), daemon=True).start()


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "logging-service"})


# ---------------------------------------------------------------------------
# YOUR TASK — implement the five endpoints below
# ---------------------------------------------------------------------------

@app.post("/v1/consent/<user_id>")
def set_consent(user_id):
    body = request.get_json(silent=True) or {}
    granted = bool(body.get("granted", False))
    now = datetime.now(timezone.utc)

    record = Consent.query.get(user_id)
    if record is None:
        record = Consent(user_id=user_id, granted=granted, updated_at=now)
        db.session.add(record)
    else:
        record.granted = granted
        record.updated_at = now
    db.session.commit()

    return jsonify({"user_id": record.user_id, "granted": record.granted, "updated_at": record.updated_at.isoformat()})


@app.get("/v1/consent/<user_id>")
def get_consent(user_id):
    record = Consent.query.get(user_id)
    if record is None:
        return jsonify({"detail": "No consent record found"}), 404
    return jsonify({"user_id": record.user_id, "granted": record.granted, "updated_at": record.updated_at.isoformat()})


@app.delete("/v1/consent/<user_id>")
def withdraw_consent(user_id):
    record = Consent.query.get(user_id)
    if record is None:
        return jsonify({"detail": "No consent record found"}), 404
    record.granted = False
    record.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"user_id": record.user_id, "granted": record.granted, "updated_at": record.updated_at.isoformat()})


@app.delete("/v1/logs/<user_id>")
def delete_logs(user_id):
    count = ActivityLog.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"user_id": user_id, "deleted_entries": count})


@app.get("/v1/logs/<user_id>")
def get_logs(user_id):
    logs = ActivityLog.query.filter_by(user_id=user_id).all()
    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "game_id": log.game_id,
            "action": log.action,
            "message": log.message,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]
    return jsonify({"items": items, "total": len(items)})
