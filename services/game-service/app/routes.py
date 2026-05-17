# Interface layer — HTTP endpoints.
#
# Define a router with prefix="/v1/games" and implement these endpoints:
# - POST   /v1/games/          -> create a game (201)
# - GET    /v1/games/          -> list games (limit/offset pagination)
# - GET    /v1/games/search    -> search games by title (?q=...)
# - GET    /v1/games/{game_id} -> get one game by ID (404 if not found)
#
# IMPORTANT: declare /search BEFORE /{game_id} in your router.
# If /{game_id} comes first, FastAPI will try to match "search" as an ID
# and return a 422 Unprocessable Entity error.
