import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


GAME_PAYLOAD = {
    "title": "Elden Ring",
    "genre": "RPG",
    "platform": "PC",
    "release_year": 2022,
    "cover_url": "https://example.com/elden.jpg",
}


def test_create_game_returns_201(client):
    response = client.post("/v1/games/", json=GAME_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Elden Ring"
    assert "id" in body


def test_get_game_by_id(client):
    created = client.post("/v1/games/", json=GAME_PAYLOAD).json()
    response = client.get(f"/v1/games/{created['id']}")
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_game_unknown_id_returns_404(client):
    response = client.get("/v1/games/nonexistent-id")
    assert response.status_code == 404


def test_list_games_returns_gamelist(client):
    client.post("/v1/games/", json=GAME_PAYLOAD)
    response = client.get("/v1/games/")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert len(body["items"]) == 1


def test_search_games_returns_matches(client):
    client.post("/v1/games/", json=GAME_PAYLOAD)
    client.post("/v1/games/", json={**GAME_PAYLOAD, "title": "Dark Souls"})
    response = client.get("/v1/games/search?q=elden")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Elden Ring"


def test_search_games_case_insensitive(client):
    client.post("/v1/games/", json=GAME_PAYLOAD)
    response = client.get("/v1/games/search?q=ELDEN")
    assert response.status_code == 200
    assert response.json()["total"] == 1
