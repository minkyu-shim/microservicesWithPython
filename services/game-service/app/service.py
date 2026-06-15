from sqlalchemy.orm import Session
from app import repository
from app.schemas import GameCreate, GameOut, GameList
from app.infrastructure.cache import set_game_summary


def add_game(db: Session, data: GameCreate) -> GameOut:
    game = repository.create_game(db, data)
    try:
        set_game_summary(game.id, {
            "id": game.id,
            "title": game.title,
            "genre": game.genre,
            "platform": game.platform,
            "cover_url": game.cover_url,
        })
    except Exception:
        pass  # Redis unavailable — cache skipped, DB write already committed
    return GameOut.model_validate(game)


def fetch_game(db: Session, game_id: str) -> GameOut:
    game = repository.get_game(db, game_id)
    if game is None:
        raise ValueError(f"Game {game_id} not found")
    return GameOut.model_validate(game)


def fetch_all_games(db: Session, limit: int = 20, offset: int = 0) -> GameList:
    games, total = repository.list_games(db, limit=limit, offset=offset)
    return GameList(
        items=[GameOut.model_validate(g) for g in games],
        total=total,
        limit=limit,
        offset=offset,
    )


def remove_game(db: Session, game_id: str) -> None:
    found = repository.delete_game(db, game_id)
    if not found:
        raise ValueError(f"Game {game_id} not found")


def find_games(db: Session, q: str, limit: int = 20, offset: int = 0) -> GameList:
    games, total = repository.search_games(db, q, limit=limit, offset=offset)
    return GameList(
        items=[GameOut.model_validate(g) for g in games],
        total=total,
        limit=limit,
        offset=offset,
    )
