from sqlalchemy import Column, String, Integer, DateTime
from datetime import datetime, timezone
import uuid
from app.database import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    genre = Column(String, nullable=False)
    platform = Column(String, nullable=False)
    release_year = Column(Integer, nullable=True)
    cover_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
