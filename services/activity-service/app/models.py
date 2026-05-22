from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, timezone
import uuid
from app.database import Base

class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False)
    game_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
