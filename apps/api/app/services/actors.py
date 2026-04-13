from __future__ import annotations

from fastapi import Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User, UserRole


def get_actor_by_email(db: Session, email: str | None) -> User:
    actor_email = email or "daniela.vargas@agp.demo"
    actor = db.scalar(select(User).where(User.email == actor_email))
    if actor is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario demo no encontrado.")
    return actor


def require_actor(db: Session, x_demo_user: str | None = Header(default=None)) -> User:
    return get_actor_by_email(db, x_demo_user)


def ensure_role(actor: User, allowed: set[UserRole]) -> None:
    if actor.role not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="El rol no tiene permisos para esta accion.")

