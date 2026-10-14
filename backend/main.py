import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()
from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from lib.db import ensure_indexes
from lib.auth import current_user
from lib.explain import ai_available
from routers.auth import router as auth_router
from routers.sim import router as sim_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("solargrid")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SolarGrid AI backend...")
    await ensure_indexes()
    yield
    logger.info("SolarGrid AI backend shutting down.")


app = FastAPI(
    title="SolarGrid AI API",
    description="Simulation-based residential microgrid energy management and decision support engine",
    version="1.0.0",
    lifespan=lifespan
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
frontend_url = os.environ.get("FRONTEND_URL")
if frontend_url:
    origins.append(frontend_url.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app|.*\.onrender\.com|.*\.railway\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers both with and without /api prefix for maximum client flexibility
app.include_router(auth_router)
app.include_router(sim_router)
app.include_router(auth_router, prefix="/api")
app.include_router(sim_router, prefix="/api")


@app.get("/health")
@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": "SolarGrid AI",
        "ai_available": ai_available(),
        "ai_provider": "gemini" if ai_available() else "rule_based"
    }


class ApiKeyRequest(BaseModel):
    api_key: str


@app.post("/api/settings/gemini-key")
@app.post("/settings/gemini-key")
async def set_gemini_key(body: ApiKeyRequest, _: dict = Depends(current_user)):
    key = body.api_key.strip()
    if key:
        os.environ["GEMINI_API_KEY"] = key
        return {"status": "success", "message": "Gemini API key updated", "ai_available": True}
    else:
        os.environ.pop("GEMINI_API_KEY", None)
        return {"status": "cleared", "message": "Gemini API key removed; falling back to rule-based engine", "ai_available": ai_available()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
