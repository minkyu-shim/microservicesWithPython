# --- Stage 1: builder ---
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
# psycopg2-binary requires libpq — install it in the builder for compilation
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


# --- Stage 2: runtime ---
# logging-service uses Flask (not FastAPI/uvicorn) — intentional polyglot design.
# The runtime stage still needs libpq for psycopg2 at runtime.
FROM python:3.12-slim AS runtime

RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /install /usr/local
WORKDIR /app
COPY . .

ENV FLASK_APP=app.main
EXPOSE 8006
CMD ["flask", "run", "--host", "0.0.0.0", "--port", "8006"]
