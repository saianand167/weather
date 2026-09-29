from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import get_settings
from app.api.api import api_router
from app.database.init_db import init_db

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database tables and seed authentic district & data source registries
    print(f"Starting {settings.APP_NAME} ({settings.SIH_PROBLEM_CODE})...")
    init_db()
    yield
    # Shutdown
    print(f"Shutting down {settings.APP_NAME}...")


app = FastAPI(
    title=settings.APP_NAME,
    description=f"{settings.APP_SUBTITLE} — SIH Problem Statement {settings.SIH_PROBLEM_CODE}",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for local development, Render, and Vercel deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https:\/\/.*(\.onrender\.com|\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include unified API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "project": settings.APP_NAME,
        "subtitle": settings.APP_SUBTITLE,
        "problem_statement": settings.SIH_PROBLEM_CODE,
        "part": "Part 1, 2 & 3 — Live Data, ML Post-Processing & AI Assistant",
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "data_status": f"{settings.API_V1_STR}/data-sources/status"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Friendly error handling without leaking technical stack traces
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred while processing the request. Please check the service status.",
            "error_type": exc.__class__.__name__
        }
    )
