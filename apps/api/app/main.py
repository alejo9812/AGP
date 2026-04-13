from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.import_service import ensure_master_data
from app.core.db import SessionLocal

settings = get_settings()
configure_logging()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="API para importacion, agrupamiento, QR y reportes del prototipo AGP.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_prefix)


@app.on_event("startup")
def startup() -> None:
    with SessionLocal() as session:
        ensure_master_data(session)


@app.get("/health")
def root_health() -> dict[str, str]:
    return {"status": "ok"}
