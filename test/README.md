# AGP Pruebas | MVP estatico en `test/`

Subproyecto independiente para revisar inventario AGP como pagina estatica lista para GitHub Pages en:

`https://alejo9812.github.io/AGP/pruebas`

Todo el runtime del MVP vive dentro de `test/`. El subproyecto reutiliza el core Python ya existente para leer Excel, limpiar datos, aplicar reglas, generar recomendaciones y construir el PDF, pero la experiencia final publicada es `HTML + CSS + JS` sin backend.

## Que hace

1. detecta el Excel mas reciente en `test/input/` y, si no hay archivo alli, usa el Excel de la raiz de `test/`
2. valida columnas obligatorias
3. limpia y normaliza el inventario
4. aplica las reglas de negocio de compatibilidad y priorizacion
5. genera artefactos fijos para la pagina estatica:
   - `data/agp_dataset.json`
   - `data/agp_dataset.js`
   - `reports/informe_agp.pdf`
6. deja una pagina lista para abrir localmente o publicar en GitHub Pages

## Contrato publico del dataset

El frontend consume un unico dataset fijo:

- `data/agp_dataset.json`: archivo canonico para descarga e integracion
- `data/agp_dataset.js`: el mismo contenido, precargado para que la pagina muestre la informacion apenas abre, incluso desde `file://`

Estructura principal:

```json
{
  "generated_at": "...",
  "generated_at_display": "...",
  "source_file_name": "Mock_Data.xlsx",
  "download_paths": {
    "dataset_json": "./data/agp_dataset.json",
    "dataset_js": "./data/agp_dataset.js",
    "pdf_report": "./reports/informe_agp.pdf"
  },
  "default_active_record_key": "...",
  "summary": { "...": "KPIs, conteos y listas ejecutivas" },
  "records": [{ "...": "filas enriquecidas del Excel" }]
}
```

## Estructura

```text
test/
  app.js
  index.html
  styles.css
  Mock_Data.xlsx
  input/
  data/
    agp_dataset.json
    agp_dataset.js
  reports/
    informe_agp.pdf
  scripts/
    build_pruebas.py
  src/
    core/
    reports/
    static_site/
    ui/        # legado Streamlit
    utils/
  tests/
```

## Reutilizacion desde el proyecto principal

Este subproyecto sigue siendo independiente, pero se apoyo en estas piezas existentes:

- `test/src/core/*`: carga de Excel, limpieza, reglas, recomendador y resumenes
- `test/src/reports/pdf_report.py`: generacion del PDF ejecutivo
- patrones visuales del repo principal:
  - `apps/web/src/components/ui/data-table.tsx`
  - `apps/web/src/pages/inventory-screen.tsx`
  - `docs/src/styles.css`

No hay imports de runtime cruzando hacia `apps/`, `docs/` ni otras carpetas del proyecto principal.

## Reglas de negocio cubiertas

- `Customer` vacio = stock libre
- `Vehicle` vacio = revision manual
- `Product` vacio = invalido o bloqueado
- `SetStatus` valido: `Complete`, `Incomplete`, `Additionals`
- compatibilidad por:
  - mismo `Vehicle`
  - mismo `Product`
  - mismo `Customer`, salvo stock libre
- prioridad por `DaysStored` mas alto
- preferencia de donantes:
  1. mismo customer
  2. si no existe, stock libre compatible
  3. dentro del bucket, mayor `DaysStored`
  4. `Additionals` antes que `Incomplete`

## Como regenerar JSON y PDF

Desde la raiz del repo:

```powershell
.venv\Scripts\python.exe test\scripts\build_pruebas.py
```

Desde dentro de `test/`:

```powershell
..\.venv\Scripts\python.exe scripts\build_pruebas.py
```

Opciones utiles:

```powershell
.venv\Scripts\python.exe test\scripts\build_pruebas.py --file test\Mock_Data.xlsx
.venv\Scripts\python.exe test\scripts\build_pruebas.py --target-root test
```

## Como abrir la pagina localmente

### Opcion 1: abrir directo

Abre:

```text
test/index.html
```

La pagina precarga `data/agp_dataset.js`, asi que la tabla y los KPIs aparecen al entrar sin depender de `fetch`.

### Opcion 2: servidor local simple

```powershell
cd test
..\.venv\Scripts\python.exe -m http.server 4174
```

Luego abre:

```text
http://localhost:4174/
```

## Como actualizar la informacion si cambia el Excel

1. reemplaza el archivo en `test/input/` o en la raiz de `test/`
2. ejecuta `test/scripts/build_pruebas.py`
3. valida que se regeneraron:
   - `test/data/agp_dataset.json`
   - `test/data/agp_dataset.js`
   - `test/reports/informe_agp.pdf`
4. abre `test/index.html`

## Publicacion en GitHub Pages

El workflow [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml) publica este MVP en:

`/AGP/pruebas`

Archivos publicados:

- `index.html`
- `styles.css`
- `app.js`
- `data/agp_dataset.json`
- `data/agp_dataset.js`
- `reports/informe_agp.pdf`

## Legacy

Siguen existiendo `main.py`, `src/ui/app.py`, `outputs/` y la experiencia Streamlit local como flujo legado para diagnostico rapido, pero el camino oficial del MVP de pruebas es el exportador estatico.

## Pruebas

```powershell
cd test
..\.venv\Scripts\python.exe -m pytest tests
```

Las pruebas cubren:

- busqueda del Excel segun el orden `input/` -> raiz de `test/`
- reglas de recomendacion
- validacion de columnas
- exportador estatico con generacion del dataset unico y el PDF
