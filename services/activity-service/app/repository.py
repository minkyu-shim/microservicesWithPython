from sqlalchemy.orm import Session

from app.models import Activity
from app.schemas import ActivityCreate


def create_activity(db: Session, data: ActivityCreate) -> Activity:
    activity = Activity(
        user_id=data.user_id,
        game_id=data.game_id,
        action=data.action,
        duration_minutes=data.duration_minutes,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def list_activities(db: Session, limit: int = 20, offset: int = 0) -> tuple[list[Activity], int]:
    total = db.query(Activity).count()
    activities = db.query(Activity).order_by(Activity.created_at.desc()).offset(offset).limit(limit).all()
    return activities, total


def list_user_activities(db: Session, user_id: str, limit: int = 20, offset: int = 0) -> tuple[list[Activity], int]:
    q = db.query(Activity).filter(Activity.user_id == user_id)
    total = q.count()
    activities = q.order_by(Activity.created_at.desc()).offset(offset).limit(limit).all()
    return activities, total
