# Infrastructure layer — raw database queries.
#
# Functions here take a SQLAlchemy Session and return ORM objects.
# This is the only layer allowed to write SQL / ORM queries.
#
# Rules:
# - No HTTP knowledge here (no Request, no HTTPException)
# - No business rules here (no password hashing, no validation logic)
# - Every function receives `db: Session` as its first argument
#
# This file should implement:
# - create_user(db, data, hashed_password) -> User
# - get_user(db, user_id) -> User | None
# - list_users(db, limit, offset) -> tuple[list[User], int]
#
# See the README for the full implementation.
