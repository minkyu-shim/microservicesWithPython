# Application layer — Pydantic DTOs.
#
# Define the shapes of data coming IN and going OUT of the API.
#
# This file should define:
# - GameCreate  — fields accepted when creating a game
#                 (title, genre, platform required; release_year and cover_url optional)
# - GameOut     — fields returned to the caller (includes id and created_at)
#                 add model_config = {"from_attributes": True}
# - GameList    — paginated envelope: { items, total, limit, offset }
