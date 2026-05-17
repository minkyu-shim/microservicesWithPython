from pydantic import BaseModel
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str          # plain-text on the way in — hash it in the service layer

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class UserList(BaseModel):
    """Paginated envelope — all list endpoints return this shape."""
    items: list[UserOut]
    total: int
    limit: int
    offset: int