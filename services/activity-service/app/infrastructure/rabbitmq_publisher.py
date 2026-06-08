# Fully implemented — do not modify this file.
#
# Your job in Module 4 is to CALL publish_activity_event() from
# the create_activity endpoint in app/main.py, after saving the activity.
#
# This publisher sends to two queues:
#   gamehub.notifications → consumed by notification-service (Node.js)
#   gamehub.logs          → consumed by logging-service (Flask, Module 5)
#
# Example call site in app/main.py:
#   game_title = game_data["title"] if game_data else None
#   await publish_activity_event(
#       user_id=activity.user_id,
#       game_id=activity.game_id,
#       action=activity.action,
#       game_title=game_title,
#   )

import json
import logging

import aio_pika

from app.config import settings

logger = logging.getLogger(__name__)

NOTIFICATIONS_QUEUE = "gamehub.notifications"
LOGS_QUEUE = "gamehub.logs"


async def publish_activity_event(
    user_id: str,
    game_id: str,
    action: str,
    game_title: str | None = None,
) -> None:
    """
    Publish an activity event to RabbitMQ.

    Sends to two queues — both calls are fire-and-forget. If RabbitMQ is
    unavailable the error is logged but the HTTP request still succeeds.

    Args:
        user_id:    UUID of the user who performed the action.
        game_id:    UUID of the game involved.
        action:     Action string, e.g. "played", "completed".
        game_title: Human-readable game title for the notification message,
                    or None if game-service was unreachable.
    """
    title = game_title or "a game"
    notification_payload = json.dumps({
        "user_id": user_id,
        "message": f"Someone just {action} {title}",
    })
    log_payload = json.dumps({
        "user_id": user_id,
        "game_id": game_id,
        "action": action,
        "message": f"Someone just {action} {title}",
    })

    try:
        connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        async with connection:
            channel = await connection.channel()
            await channel.declare_queue(NOTIFICATIONS_QUEUE, durable=True)
            await channel.declare_queue(LOGS_QUEUE, durable=True)
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=notification_payload.encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                ),
                routing_key=NOTIFICATIONS_QUEUE,
            )
            await channel.default_exchange.publish(
                aio_pika.Message(
                    body=log_payload.encode(),
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                ),
                routing_key=LOGS_QUEUE,
            )
            logger.info("[publisher] Events published for user %s", user_id)
    except Exception as exc:
        logger.error("[publisher] Failed to publish to RabbitMQ: %s", exc)
