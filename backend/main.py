import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from database import create_tables
from routers import chat, models_router, files

FRONTEND_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "out")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="BEagent API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes (must be registered before the catch-all static mount) ──────────
app.include_router(chat.router, prefix="/api")
app.include_router(models_router.router, prefix="/api")
app.include_router(files.router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok"}


# ── Serve Next.js static export ────────────────────────────────────────────────
if os.path.isdir(FRONTEND_OUT):
    # Next.js JS/CSS chunks live under /_next/
    next_assets = os.path.join(FRONTEND_OUT, "_next")
    if os.path.isdir(next_assets):
        app.mount("/_next", StaticFiles(directory=next_assets), name="next-assets")

    # Any other static files (favicon, images, etc.)
    app.mount("/static", StaticFiles(directory=FRONTEND_OUT), name="frontend-static")

    # Catch-all: return index.html so the SPA handles routing
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str):
        index = os.path.join(FRONTEND_OUT, "index.html")
        return FileResponse(index)
