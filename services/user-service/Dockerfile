# --- Stage 1: builder ---
# Installs all dependencies into /install.
# This stage is thrown away after the build — it never runs in production.
# Separating install from runtime keeps the final image small and reproducible:
# pip, build tools, and caches are not present in the image that actually runs.
FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt


# --- Stage 2: runtime ---
# Starts from a clean base image.
# Copies the pre-installed packages from /install — no pip, no build tools.
# The result is a lean, predictable image with only what the service needs to run.
FROM python:3.12-slim AS runtime

COPY --from=builder /install /usr/local
WORKDIR /app
COPY . .

EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
