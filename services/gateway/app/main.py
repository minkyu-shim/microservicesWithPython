import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt

from app.config import settings

app = FastAPI(title="gateway", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTES: dict[str, str] = {
    "users":      settings.user_service_url,
    "games":      settings.game_service_url,
    "activities": settings.activity_service_url,
    # Added in Module 4
    "notifications": settings.notification_service_url,
    # Added in Module 5
    "consent": settings.logging_service_url,
    "logs":    settings.logging_service_url,
    # Added in Module 6
    "auth": settings.auth_service_url,
}

PUBLIC_PATHS = {"/v1/auth/token"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway"}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(request: Request, path: str):
    # Step 0 — JWT validation (skip public paths)
    if f"/{path}" not in PUBLIC_PATHS:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return Response(status_code=401, content="Missing token")
        token = auth_header.removeprefix("Bearer ")
        try:
            jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        except JWTError:
            return Response(status_code=401, content="Invalid or expired token")

    # Step 1 — parse the resource name from the path
    segments = path.split("/")
    if len(segments) < 2:
        return Response(status_code=404, content="Not found")

    resource = segments[1]

    # Step 2 — look up the target service
    target_base = ROUTES.get(resource)
    if target_base is None:
        return Response(status_code=404, content=f"Unknown resource: {resource}")

    # Step 3 — forward the request
    target_url = f"{target_base}/{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=request.headers.raw,
                content=await request.body(),
                params=request.query_params,
            )
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.headers.get("content-type"),
        )
    # Step 4 — handle unreachable service
    except httpx.RequestError:
        return Response(status_code=503, content="Service unavailable")
