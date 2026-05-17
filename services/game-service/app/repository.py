# Infrastructure layer — raw database queries.
#
# Implement these four functions. Each takes `db: Session` as its first argument.
# No business logic here — only ORM queries.
#
# - create_game(db, data) -> Game
# - get_game(db, game_id) -> Game | None
# - list_games(db, limit, offset) -> tuple[list[Game], int]
# - search_games(db, q, limit, offset) -> tuple[list[Game], int]
#   Hint: filter by title using .ilike(f"%{q}%") for case-insensitive search
