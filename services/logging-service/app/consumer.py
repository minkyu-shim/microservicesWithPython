# Fully implemented — do not modify this file.
#
# Consumes activity events from the "gamehub.logs" RabbitMQ queue.
# Before writing a log entry, it checks has_consent(user_id).
# If the user has not consented, the message is acknowledged and discarded.
#
# This runs in a background thread started by app/main.py.

import json
import logging
import os
import time

import pika

logger = logging.getLogger(__name__)

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")
QUEUE_NAME = "gamehub.logs"


def start_consumer(flask_app) -> None:
    """
    Connect to RabbitMQ and consume from gamehub.logs.
    Retries on connection failure (RabbitMQ may not be up yet at startup).
    Runs indefinitely — designed to be called in a daemon thread.
    """
    while True:
        try:
            _run(flask_app)
        except Exception as exc:
            logger.error("[consumer] Connection lost: %s — retrying in 5s", exc)
            time.sleep(5)


def _run(flask_app) -> None:
    params = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(params)
    channel = connection.channel()
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.basic_qos(prefetch_count=1)

    logger.info("[consumer] Waiting for messages on %s", QUEUE_NAME)

    def on_message(ch, method, properties, body):
        try:
            payload = json.loads(body)
            user_id = payload.get("user_id", "")

            with flask_app.app_context():
                from app.models import ActivityLog, db, has_consent

                if not has_consent(user_id):
                    logger.info("[consumer] No consent for user %s — discarding", user_id)
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                    return

                log = ActivityLog(
                    user_id=user_id,
                    game_id=payload.get("game_id", ""),
                    action=payload.get("action", ""),
                    message=payload.get("message", ""),
                )
                db.session.add(log)
                db.session.commit()
                logger.info("[consumer] Log stored for user %s", user_id)

        except Exception as exc:
            logger.error("[consumer] Failed to process message: %s", exc)
        finally:
            ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_message)
    channel.start_consuming()
