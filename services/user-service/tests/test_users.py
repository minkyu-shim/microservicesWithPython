# Module 2 exercise — write your pytest tests here.
#
# Use FastAPI's TestClient to send HTTP requests to your app without
# running a real server. The client is synchronous and works out of the box.
#
# Suggested test cases to get started:
# - POST /v1/users/ with valid data returns 201 and a UserOut body
# - POST /v1/users/ with a duplicate username returns 4xx
# - GET  /v1/users/{id} with a valid ID returns 200 and the correct user
# - GET  /v1/users/{id} with an unknown ID returns 404
# - GET  /v1/users/ returns a UserList with the correct total
#
# Tip: use an in-memory SQLite database in your test fixture so tests
# never touch the real users.db file.
#
# Run tests with:
#   pytest tests/
