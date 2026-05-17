from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app import service, schemas

router = APIRouter(prefix="/v1/users", tags=["users"])

@router.post("/", response_model=schemas.UserOut, status_code=201)
def create_user(data: schemas.UserCreate, db: Session = Depends(get_db)):
    return service.add_user(db, data)

@router.get("/", response_model=schemas.UserList)
def list_users(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    return service.fetch_all_users(db, limit=limit, offset=offset)

@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)):
    try:
        return service.fetch_user(db, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))