from fastapi import FastAPI, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from database import db
from routes import recommendations, search, roadmap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to Async MongoDB
    await db.connect_db()
    yield
    # Shutdown: Close connection
    await db.close_db()

app = FastAPI(
    title="Travel API (Async Modular)",
    description="Refactored API using Motor and modular routing",
    version="2.0.1",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modular routers
app.include_router(recommendations.router, prefix="/api/v2")
app.include_router(search.router, prefix="/api/v2")
app.include_router(roadmap.router, prefix="/api/v2")

@app.get("/")
async def root():
    return {"status": "healthy", "message": "Async Travel API is running"}
