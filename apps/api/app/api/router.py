from fastapi import APIRouter

from app.api.routes import catalogs, grouping, health, imports, inventory, reports, warehouse

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(grouping.router, prefix="/grouping", tags=["grouping"])
api_router.include_router(warehouse.router, prefix="/warehouse", tags=["warehouse"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(catalogs.router, prefix="/catalogs", tags=["catalogs"])
