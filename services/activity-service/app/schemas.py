from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional

class ActivityCreate(BaseModel):
    user_id: str
    game_id: str
    action: Literal["played", "completed", "reviewed", "wishlist_added"]
    duration_minutes: Optional[int] = None

class GameSummary(BaseModel):
    id: str
    title: str
    genre: str
    platform: str
    cover_url: Optional[str] = None

class ActivityResponse(BaseModel):
    id: str
    user_id: str
    action: str
    duration_minutes: Optional[int]
    created_at: datetime
    game: Optional[GameSummary]

    class Config:
        from_attributes = True

class ActivityList(BaseModel):
    items: list[ActivityResponse]
    total: int
    limit: int
    offset: int
