from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import StatusCatalog, User
from app.schemas import CatalogBundle, StatusCatalogRead, UserRead

router = APIRouter()


@router.get("/statuses", response_model=list[StatusCatalogRead])
def list_statuses(db: Session = Depends(get_db)) -> list[StatusCatalog]:
    return list(db.scalars(select(StatusCatalog).order_by(StatusCatalog.id.asc())))


@router.get("/bundle", response_model=CatalogBundle)
def catalog_bundle(db: Session = Depends(get_db)) -> dict:
    statuses = list(db.scalars(select(StatusCatalog).order_by(StatusCatalog.id.asc())))
    users = list(db.scalars(select(User).order_by(User.id.asc())))
    return {
        "statuses": [StatusCatalogRead.model_validate(status) for status in statuses],
        "users": [UserRead.model_validate(user) for user in users],
    }
