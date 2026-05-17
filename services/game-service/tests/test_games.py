# Module 2 exercise — write your pytest tests here.
#
# Use FastAPI's TestClient to test your endpoints without a running server.
#
# Suggested test cases:
# - POST /v1/games/ with valid data returns 201 and a GameOut body
# - GET  /v1/games/{id} with a valid ID returns 200 and the correct game
# - GET  /v1/games/{id} with an unknown ID returns 404
# - GET  /v1/games/ returns a GameList with the correct total
# - GET  /v1/games/search?q=... returns only matching games
#
# Tip: use an in-memory SQLite database in your test fixture so tests
# never touch the real games.db file.
#
# Run tests with:
#   pytest tests/
