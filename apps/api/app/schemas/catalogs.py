from pydantic import Field

from app.schemas.common import APIModel, UserRead


class StatusCatalogRead(APIModel):
    id: int
    status_code: str
    display_name: str
    description: str


class CatalogBundle(APIModel):
    statuses: list[StatusCatalogRead] = Field(default_factory=list)
    users: list[UserRead] = Field(default_factory=list)
