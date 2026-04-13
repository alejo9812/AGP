# AGP Warehouse Grouping Prototype

Prototipo integral para AGP orientado a reducir inventario inmovilizado en bodega, recomendar agrupamientos deterministas y dejar trazabilidad operativa con validacion humana y QR.

## Que resuelve

AGP opera una bodega con miles de piezas almacenadas y un proceso que hoy depende de Excel, correo y coordinacion manual. Este repositorio implementa una base full stack para:

- importar y normalizar inventario desde CSV o Excel;
- detectar calidad de datos y filas que requieren revision;
- generar recomendaciones de agrupamiento explicables;
- aprobar o rechazar agrupaciones con trazabilidad;
- operar en bodega mediante QR, ubicaciones y movimientos;
- publicar documentacion tecnica viva en GitHub Pages.

## Enlaces rapidos

- Repositorio: <https://github.com/alejo9812/AGP>
- Docs publicos: <https://alejo9812.github.io/AGP/#/warehouse-grouping-prototype>
- Frontend blueprint: <https://alejo9812.github.io/AGP/#/frontend-blueprint>
- App operativa local: `http://localhost:5173/dashboard`
- Docs locales: `http://localhost:4173/AGP/#/warehouse-grouping-prototype`

## Monorepo

```text
.
|-- apps/
|   |-- api/      # FastAPI + SQLAlchemy + Alembic
|   `-- web/      # React + TypeScript + Vite
|-- data/
|   `-- sample/   # Datos sanitizados y fixtures
|-- docs/         # Sitio publico para GitHub Pages
|-- packages/
|   `-- shared/   # Tipos, contratos y datos mock
|-- scripts/      # Seeds, limpieza y utilidades
`-- .github/
    `-- workflows/
```

## Stack

- Frontend operativo: React, TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, Zustand, html5-qrcode.
- Backend: FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL, openpyxl.
- Infraestructura: Docker Compose, GitHub Actions, GitHub Pages, Render, Supabase.

## Frontend base

- `apps/web` toma como referencia principal los patrones de `shadcn-admin-kit` para shell, tablas, filtros, formularios y estados de interfaz, sin forkear ese repositorio.
- `TailAdmin` queda como referencia visual secundaria para KPIs, charts y composicion del dashboard.
- El frontend mantiene el idioma español, layout tablet-first y tablas como centro de la experiencia.
- Los tipos compartidos viven en `packages/shared` y gobiernan tanto el frontend como la API.

## Documentacion viva

El contenido del otro chat ya se aterriza en `docs/` como dos vistas publicas:

- `#/warehouse-grouping-prototype`: problema, hallazgos del Excel, viabilidad, arquitectura, modelo de datos, reglas del motor, rutas API, fases, pruebas y supuestos.
- `#/frontend-blueprint`: base visual y arquitectonica del frontend, mapa de pantallas, roles, navegacion y decisiones UX.

## Quick start

### 1. Instalar dependencias Node

```bash
npm install
```

### 2. Instalar dependencias Python

```powershell
.venv\Scripts\python.exe -m pip install -r apps/api/requirements.txt
```

### 3. Variables de entorno

```bash
copy .env.example .env
copy apps/api/.env.example apps/api/.env
```

### 4. Levantar PostgreSQL local

```bash
docker compose up -d db
```

### 5. Aplicar migraciones y seed

```powershell
cd apps/api
..\..\.venv\Scripts\python.exe -m alembic upgrade head
..\..\.venv\Scripts\python.exe -m app.seed
```

### 6. Ejecutar API, web y docs

```bash
npm run dev:api
npm run dev:web
npm run dev:docs
```

Luego abre:

- `http://localhost:5173/dashboard` para la app operativa.
- `http://localhost:4173/AGP/#/warehouse-grouping-prototype` para la documentacion.

## Scripts utiles

- `npm run dev:web` inicia la app operativa.
- `npm run dev:docs` inicia el sitio publico.
- `npm run build` construye `packages/shared`, `docs` y `apps/web`.
- `npm run lint` ejecuta ESLint en los workspaces frontend.
- `npm run test:web` corre Vitest en la app operativa.
- `npm run test:api` corre pytest para backend.

## Despliegue

- `docs/` se publica en GitHub Pages por GitHub Actions con rutas hash para `warehouse-grouping-prototype` y `frontend-blueprint`.
- `apps/web/` se construye como SPA estatica y puede publicarse en Vercel, Netlify o GitHub Pages separada.
- `apps/api/` esta preparado para desplegarse en Render con PostgreSQL gestionado o Supabase.

## Roadmap

1. MVP deterministico con importacion, calidad, agrupamiento y QR.
2. Integracion con servicios de correo y aprobaciones avanzadas.
3. Analitica avanzada para anomalias, obsolescencia y copiloto explicativo.

## Licencia

MIT.
