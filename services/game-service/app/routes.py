from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import service, schemas

router = APIRouter(prefix="/v1/games", tags=["games"])


@router.post("/", response_model=schemas.GameOut, status_code=201)
def create_game(data: schemas.GameCreate, db: Session = Depends(get_db)):
    return service.add_game(db, data)


@router.get("/", response_model=schemas.GameList)
def list_games(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    return service.fetch_all_games(db, limit=limit, offset=offset)


@router.get("/search", response_model=schemas.GameList)
def search_games(q: str, limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    return service.find_games(db, q, limit=limit, offset=offset)


@router.get("/{game_id}", response_model=schemas.GameOut)
def get_game(game_id: str, db: Session = Depends(get_db)):
    try:
        return service.fetch_game(db, game_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
