# ============================================================
# Backend Dockerfile — Python 3.11-slim + FastAPI + Qiskit
# ============================================================
FROM python:3.11-slim AS base

# System dependencies required by Qiskit / scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer cache)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy the quantum core packages
COPY qds_core/       ./qds_core/
COPY attack_sim/     ./attack_sim/
COPY detection_engine/ ./detection_engine/

# Copy the FastAPI application
COPY backend/        ./backend/

# Create non-root user and set permissions for safe persistent SQLite writes
RUN useradd -m -u 10001 -s /bin/bash appuser \
 && chown -R appuser:appuser /app

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

USER appuser

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]

