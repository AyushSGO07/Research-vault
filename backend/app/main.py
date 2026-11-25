import time
import shutil
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from slowapi.errors import RateLimitExceeded

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.search import router as search_router
from app.api.collections import router as collections_router
from app.api.saved import router as saved_router
from app.api.history import router as history_router
from app.api.evaluation import router as evaluation_router
from app.api.external import router as external_router
from app.core.config import settings
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler
from app.database.session import Base, engine, init_db, get_db
from app.database.vector_store import vector_store

_app_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist on startup and run migrations
    init_db()
    # Ensure upload directory exists
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan,
)

# Set up rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    cors_ancestors = " ".join(settings.CORS_ORIGINS)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob:; "
        "font-src 'self' data:; "
        f"connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 {cors_ancestors} ws://localhost:3000; "
        "frame-src 'self' blob:; "
        f"frame-ancestors 'self' {cors_ancestors}; "
        "object-src 'self' blob:;"
    )
    return response


# Deep Health Check Diagnostics Endpoint
@app.get(f"{settings.API_V1_STR}/health", tags=["system"])
def health_check(response: Response, db: Session = Depends(get_db)):
    """
    Deep system health check probe verifying database connectivity,
    vector store status, storage directory writeability, and disk capacity.
    """
    checks = {}
    is_healthy = True

    # 1. Database Probe
    t0 = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        db_latency = round((time.perf_counter() - t0) * 1000.0, 2)
        checks["database"] = {
            "status": "ok",
            "latency_ms": db_latency,
        }
    except Exception as e:
        is_healthy = False
        checks["database"] = {
            "status": "error",
            "error": str(e),
        }

    # 2. ChromaDB Vector Store Probe
    try:
        total_chunks = vector_store.collection.count()
        checks["vector_store"] = {
            "status": "ok",
            "collection": settings.CHROMA_COLLECTION_NAME,
            "total_chunks": total_chunks,
        }
    except Exception as e:
        is_healthy = False
        checks["vector_store"] = {
            "status": "error",
            "error": str(e),
        }

    # 3. Storage Directory Writeability & Free Disk Space
    try:
        upload_path = Path(settings.UPLOAD_DIR)
        upload_path.mkdir(parents=True, exist_ok=True)
        probe_file = upload_path / ".probe_tmp"
        probe_file.write_text("health")
        probe_file.unlink()

        disk_usage = shutil.disk_usage(upload_path)
        free_mb = round(disk_usage.free / (1024 * 1024), 2)
        checks["storage"] = {
            "status": "ok",
            "upload_dir": str(upload_path),
            "writable": True,
            "free_space_mb": free_mb,
        }
    except Exception as e:
        is_healthy = False
        checks["storage"] = {
            "status": "error",
            "error": str(e),
        }

    uptime_sec = round(time.time() - _app_start_time, 1)

    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": uptime_sec,
        "checks": checks,
    }


# Include routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(documents_router, prefix=settings.API_V1_STR)
app.include_router(search_router, prefix=settings.API_V1_STR)
app.include_router(collections_router, prefix=settings.API_V1_STR)
app.include_router(saved_router, prefix=settings.API_V1_STR)
app.include_router(history_router, prefix=settings.API_V1_STR)
app.include_router(evaluation_router, prefix=settings.API_V1_STR)
app.include_router(external_router, prefix=settings.API_V1_STR)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
