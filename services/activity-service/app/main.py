import asyncio
import os
import httpx
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import Activity
from app.schemas import ActivityCreate, ActivityResponse, ActivityList, GameSummary

Base.metadata.create_all(bind=engine)

app = FastAPI(title="activity-service", version="1.0.0")

USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8001")
GAME_SERVICE_URL = os.getenv("GAME_SERVICE_URL", "http://localhost:8002")


async def validate_user(user_id: str) -> None:
    """Critical check — request must not proceed if the user doesn't exist."""
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{USER_SERVICE_URL}/v1/users/{user_id}")
            if resp.status_code == 404:
                raise HTTPException(status_code=404, detail="User not found")
            if resp.status_code < 500:
                return
        except HTTPException:
            raise
        except httpx.RequestError:
            pass
        if attempt < 2:
            await asyncio.sleep(0.5)
    raise HTTPException(status_code=503, detail="user-service unavailable")


async def enrich_with_game(game_id: str) -> GameSummary | None:
    """Optional enrichment — returns None if game-service is unreachable."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{GAME_SERVICE_URL}/v1/games/{game_id}")
        if resp.status_code == 200:
            data = resp.json()
            return GameSummary(
                id=data["id"],
                title=data["title"],
                genre=data["genre"],
                platform=data["platform"],
                cover_url=data.get("cover_url"),
            )
    except httpx.RequestError:
        pass
    return None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "activity-service"}


@app.post("/v1/activities", response_model=ActivityResponse, status_code=201)
async def create_activity(body: ActivityCreate, db: Session = Depends(get_db)):
    await validate_user(body.user_id)

    activity = Activity(
        user_id=body.user_id,
        game_id=body.game_id,
        action=body.action,
        duration_minutes=body.duration_minutes,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)

    game = await enrich_with_game(body.game_id)
    return ActivityResponse(
        id=activity.id,
        user_id=activity.user_id,
        action=activity.action,
        duration_minutes=activity.duration_minutes,
        created_at=activity.created_at,
        game=game,
    )


@app.get("/v1/activities", response_model=ActivityList)
async def list_activities(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    total = db.query(Activity).count()
    rows = db.query(Activity).offset(offset).limit(limit).all()
    items = []
    for row in rows:
        game = await enrich_with_game(row.game_id)
        items.append(ActivityResponse(
            id=row.id,
            user_id=row.user_id,
            action=row.action,
            duration_minutes=row.duration_minutes,
            created_at=row.created_at,
            game=game,
        ))
    return ActivityList(items=items, total=total, limit=limit, offset=offset)


@app.get("/v1/activities/user/{user_id}", response_model=ActivityList)
async def list_user_activities(user_id: str, limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    query = db.query(Activity).filter(Activity.user_id == user_id)
    total = query.count()
    rows = query.offset(offset).limit(limit).all()
    items = []
    for row in rows:
        game = await enrich_with_game(row.game_id)
        items.append(ActivityResponse(
            id=row.id,
            user_id=row.user_id,
            action=row.action,
            duration_minutes=row.duration_minutes,
            created_at=row.created_at,
            game=game,
        ))
    return ActivityList(items=items, total=total, limit=limit, offset=offset)
