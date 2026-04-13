# AGP API

Backend FastAPI para importacion, agrupamiento, reportes y operacion de bodega.

## Ejecutar local

```powershell
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migraciones

```powershell
.venv\Scripts\python.exe -m alembic upgrade head
```

## Seed

```powershell
.venv\Scripts\python.exe -m app.seed
```
