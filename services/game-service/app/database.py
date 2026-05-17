# Infrastructure layer — database connection.
#
# Replicate the same structure as user-service/app/database.py.
# The only difference: the default DATABASE_URL points to games.db.
#
# This file should provide:
# - engine         — SQLAlchemy engine built from DATABASE_URL
# - SessionLocal   — session factory bound to the engine
# - Base           — DeclarativeBase that all ORM models inherit from
# - get_db()       — FastAPI dependency: yields a session, closes it after the request
