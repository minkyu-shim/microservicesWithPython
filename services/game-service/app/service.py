# Application layer — business logic.
#
# Calls repository functions and returns Pydantic schemas (not raw ORM objects).
# Raises ValueError when a game is not found — routes.py turns it into a 404.
#
# Implement these four functions:
# - add_game(db, data) -> GameOut
# - fetch_game(db, game_id) -> GameOut        (raises ValueError if not found)
# - fetch_all_games(db, limit, offset) -> GameList
# - find_games(db, q, limit, offset) -> GameList   (delegates to search_games in repository)
