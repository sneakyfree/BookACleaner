from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from app.config import get_settings
from app.api.v1.router import api_router
from app.database import connect_db, disconnect_db
from app.core.startup_validation import run_startup_validation
from app.core.health import router as health_router
from app.core.metrics import router as metrics_router
from app.middleware import RateLimitMiddleware, RequestLoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown"""
    # Startup
    logger.info("Starting BookACleaner API...")
    
    # Validate environment and dependencies
    run_startup_validation(strict=False)
    
    await connect_db()
    logger.info("Database connected")
    yield
    # Shutdown
    logger.info("Shutting down BookACleaner API...")
    await disconnect_db()
    logger.info("Database disconnected")


app = FastAPI(
    title="BookACleaner API",
    description="AI-native operating system for the cleaning industry",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS - environment-aware
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
]

# Add production origins
if os.getenv("ENVIRONMENT") == "production":
    allowed_origins = [
        "https://bookacleaner.ai",
        "https://www.bookacleaner.ai",
        "https://app.bookacleaner.ai",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware (production only or if explicitly enabled)
if os.getenv("ENABLE_RATE_LIMIT", "false").lower() == "true" or os.getenv("ENVIRONMENT") == "production":
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=60,
        requests_per_hour=1000,
    )
    logger.info("Rate limiting enabled")

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Include deep health check routes
app.include_router(health_router)

# Include Prometheus metrics
app.include_router(metrics_router)

# Mount Socket.IO WebSocket app
try:
    from app.api.v1.websocket import socket_app
    app.mount("/ws", socket_app)
    logger.info("WebSocket server mounted at /ws")
except ImportError:
    logger.warning("WebSocket module not available")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "BookACleaner API",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/health",
        "websocket": "/ws",
    }

