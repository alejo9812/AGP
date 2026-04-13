export const summaryMetrics = [
  { label: "Filas del inventario", value: "3,838" },
  { label: "Incompletos", value: "2,121" },
  { label: "Stock libre", value: "993" },
  { label: "Candidatos completables", value: "1,483" },
  { label: "Additionals compatibles", value: "421" },
  { label: "Antiguedad maxima", value: "1,847 dias" },
];

export const viabilityCards = [
  {
    title: "Viabilidad de negocio",
    bullets: [
      "Hay volumen suficiente de stock libre y antiguedad suficiente para justificar una estrategia FEFO y oldest-first.",
      "Comercial, bodega y direccion ganan una sola fuente de verdad en vez de correo, Excel y memoria operativa.",
      "Cada aprobacion, rechazo y movimiento se vuelve evidencia auditable y exportable.",
    ],
  },
  {
    title: "Viabilidad tecnica",
    bullets: [
      "Las columnas Customer, Vehicle, Product, DaysStored y SetStatus permiten construir reglas deterministicas claras.",
      "Customer vacio se tratara como stock libre y Vehicle vacio se enviara a revision en lugar de forzar agrupacion.",
      "El MVP asume 1 fila = 1 unidad o set trazable y deja la puerta abierta a granularidad por piezas en una fase posterior.",
    ],
  },
  {
    title: "Viabilidad operativa",
    bullets: [
      "La interfaz esta pensada para tablet y escritorio con lenguaje claro y acciones primarias visibles.",
      "QR web con fallback manual cubre operacion real sin exigir una app nativa.",
      "Los roles seed mantienen el entrenamiento corto y la gobernanza simple.",
    ],
  },
  {
    title: "Viabilidad de implementacion",
    bullets: [
      "El monorepo actual permite construir docs, frontend y contratos compartidos dentro del mismo flujo.",
      "FastAPI, PostgreSQL y Render quedan alineados con un backend deploy-ready sin sobreingenieria.",
      "La PWA se deja instalada para shell y activos, pero todas las mutaciones siguen siendo online en v1.",
    ],
  },
];

export const architectureLayers = [
  {
    title: "Capa publica",
    description: "Sitio tecnico en GitHub Pages con el caso, arquitectura, roadmap, manual y blueprint del frontend.",
  },
  {
    title: "Capa operativa",
    description: "SPA interna en React para importacion, calidad, inventario, recomendaciones, QR y auditoria.",
  },
  {
    title: "Capa API",
    description: "FastAPI con modulos de imports, inventory, grouping, warehouse, reports, catalogs y audit.",
  },
  {
    title: "Capa de datos",
    description: "PostgreSQL simple con trazabilidad, recomendaciones ranked, movimientos y catalogos operativos.",
  },
];

export const asIsMermaid = `
flowchart LR
    A[Inventario en Excel] --> B[Revision manual por comercial]
    B --> C[Correo y llamadas]
    C --> D[Validacion con partner logistico]
    D --> E[Agrupacion manual]
    E --> F[Confirmacion en bodega]
    F --> G[Sin trazabilidad central]
`;

export const toBeMermaid = `
flowchart LR
    A[Importacion CSV o XLSX] --> B[Calidad de datos]
    B --> C[Motor deterministico]
    C --> D[Recomendaciones ranked]
    D --> E[Aprobacion humana]
    E --> F[Reserva y movimiento]
    F --> G[Escaneo QR]
    G --> H[Reportes y auditoria]
`;

export const architectureMermaid = `
flowchart TB
    subgraph Publico
      A[Docs GitHub Pages]
    end
    subgraph Operacion
      B[React SPA]
      C[html5-qrcode]
      D[TanStack Query]
    end
    subgraph Backend
      E[FastAPI]
      F[Motor de reglas]
      G[Reportes y auditoria]
    end
    subgraph Datos
      H[(PostgreSQL o Supabase)]
    end
    A --> B
    B --> E
    C --> E
    D --> E
    E --> F
    E --> G
    F --> H
    G --> H
`;

export const algorithmSteps = [
  "Importar el archivo y normalizar columnas, fechas de Excel, estados y vacios significativos.",
  "Marcar Vehicle vacio como Review Needed y Product vacio como bloqueo operativo para auto-agrupacion.",
  "Interpretar Customer vacio como stock libre reutilizable.",
  "Tomar filas Incomplete aptas como receptores de recomendacion.",
  "Buscar donantes en Additionals, otros Incomplete compatibles y stock libre exacto por Vehicle y Product.",
  "Ordenar candidatos por mayor DaysStored, luego preferencia del mismo cliente, luego Created mas antiguo y luego ID.",
  "Construir una recomendacion explicable con ranking y razon de negocio visible.",
  "Esperar aprobacion o rechazo humano y registrar movimiento, auditoria y cambio de estado solo al aprobar.",
];

export const dataModelHighlights = [
  "Campos originales: ID, OrderID, Serial, Vehicle, Created, Product, Invoice, InvoiceCost, Customer, DaysStored y SetStatus.",
  "Campos calculados: is_free_stock, needs_review, review_reasons, recommendation_rank y qr_token.",
  "Campos operativos: operational_status, location_id, audit trail, stock movements y decision metadata.",
];

export const technicalPlanSections = [
  {
    title: "Problema a resolver",
    bullets: [
      "Reemplazar un proceso disperso de Excel y correo por una plataforma web trazable.",
      "Reducir inventario inmovilizado con agrupamiento deterministico y aprobacion humana obligatoria.",
      "Dar a comercial, bodega y direccion una vista comun del estado del inventario y sus decisiones.",
    ],
  },
  {
    title: "Hallazgos del Excel",
    bullets: [
      "El archivo base tiene 3,838 filas y 11 columnas reales sin duplicados en ID, OrderID ni Serial.",
      "SetStatus se distribuye entre Complete 1,323, Incomplete 2,121 y Additionals 394.",
      "Customer aparece vacio 993 veces y Vehicle 175 veces, lo que obliga a separar stock libre de filas en revision.",
    ],
  },
  {
    title: "Reglas del motor",
    bullets: [
      "Nunca usar Complete como donante automatico.",
      "Permitir match exacto por Customer, Vehicle y Product; usar stock libre solo por Vehicle y Product.",
      "No auto-agrupiar con datos incompletos ni mezclar clientes, vehiculos o productos incompatibles.",
    ],
  },
  {
    title: "Modelo y contratos",
    bullets: [
      "Las entidades base son inventory_items, inventory_import_batches, grouping_recommendations, grouping_matches, stock_movements, qr_tags, users y audit_logs.",
      "Los contratos compartidos viven en packages/shared y gobiernan web y API sin duplicar tipos.",
      "Los estados operativos iniciales incluyen In Stock, Reserved, Grouped, Completed, Ready for Dispatch, Dispatched, Blocked y Review Needed.",
    ],
  },
];

export const apiRoutes = [
  "/health",
  "/api/v1/imports",
  "/api/v1/inventory",
  "/api/v1/grouping/analyze",
  "/api/v1/grouping/recommendations",
  "/api/v1/grouping/recommendations/{id}/approve",
  "/api/v1/grouping/recommendations/{id}/reject",
  "/api/v1/warehouse/scan",
  "/api/v1/warehouse/movements",
  "/api/v1/reports/summary",
  "/api/v1/reports/export",
  "/api/v1/catalogs/statuses",
];

export const implementationPhases = [
  {
    title: "Fase A - Analisis y arquitectura",
    bullets: [
      "Documentar AS-IS, TO-BE, viabilidad, ADRs y supuestos del prototipo.",
      "Cerrar modelo de datos, contratos y reglas del motor sobre el dataset sanitizado.",
      "Definir importacion y calidad de datos desde Mock_Data.xlsx sin exponer el archivo original.",
    ],
  },
  {
    title: "Fase B - Monorepo, README y sitio publico",
    bullets: [
      "Consolidar workspaces, README raiz, estructura del repo y scripts comunes.",
      "Publicar docs tecnicos en GitHub Pages con arquitectura, algoritmo, roadmap y blueprint del frontend.",
      "Dejar CI y workflows listos para build, lint y despliegue de la documentacion.",
    ],
  },
  {
    title: "Fase C - Backend y motor",
    bullets: [
      "Implementar FastAPI, SQLAlchemy, Alembic, seeds y Docker Compose.",
      "Persistir batches, calidad de datos, recomendaciones ranked, aprobaciones, rechazos y reportes.",
      "Registrar audit logs y movimientos de stock ligados a las decisiones humanas.",
    ],
  },
  {
    title: "Fase D - Frontend operativo",
    bullets: [
      "Construir dashboard, imports, quality, inventory, recommendations, free stock, reports, audit y settings.",
      "Separar estado de servidor con TanStack Query y estado local de UI con Zustand.",
      "Mantener idioma español y un UX tablet-first con tablas y listas como eje del producto.",
    ],
  },
  {
    title: "Fase E - QR, movimientos y hardening",
    bullets: [
      "Integrar html5-qrcode con fallback manual para la operacion en bodega.",
      "Cerrar exportes CSV, capturas, manuales, logs estructurados y guia de despliegue.",
      "Completar pruebas del motor, smoke tests y checklist de demo final.",
    ],
  },
];

export const testingStreams = [
  "Importacion: parseo de CSV y XLSX, serial de fechas Excel, validacion de columnas y errores de estructura.",
  "Calidad: Customer vacio como stock libre, Vehicle vacio como revision, Product vacio como bloqueo y deteccion de sospechosos.",
  "Motor: exclusiones de Complete, compatibilidad estricta, prioridad por DaysStored y explicacion visible de cada recomendacion.",
  "Operacion: aprobar genera movimiento y auditoria; rechazar conserva inventario; QR devuelve la accion valida por estado.",
  "UI: filtros, exportes, tablas responsivas, estado vacio, errores, skeletons y flujo tablet-first.",
  "CI: lint y typecheck de docs y web, pruebas del frontend y build de documentacion sin rutas rotas.",
];

export const assumptions = [
  "El dataset publico sera sanitizado y derivado del Excel original.",
  "El MVP mantiene autenticacion simple con usuarios seed y sin SSO.",
  "No habra escrituras offline; la PWA solo cachea shell y activos.",
  "La granularidad operacional sigue siendo 1 fila = 1 unidad o set trazable.",
  "La IA queda como fase futura para normalizacion semantica, anomalias y priorizacion predictiva.",
];

export const frontendBase = [
  "La referencia principal es shadcn-admin-kit como fuente de shell, tablas, formularios, filtros y estados de interfaz.",
  "TailAdmin queda solo como referencia visual secundaria para composicion de KPIs y resumen ejecutivo.",
  "Refine no se adopta en v1 porque añade una capa de abstraccion demasiado gruesa para los flujos de agrupamiento, auditoria y QR.",
];

export const frontendStack = [
  "React + TypeScript + Vite + Tailwind CSS + React Router",
  "TanStack Query para cache de servidor y sincronizacion",
  "shadcn/ui + Radix UI + React Hook Form + Zod + Lucide",
  "TanStack Table para tablas filtrables, exportables y seleccionables",
  "Zustand solo para sesion temporal, filtros persistidos y UI local",
  "PWA basica instalable despues del shell principal",
];

export const extractedBlocks = [
  "App shell con sidebar, header, breadcrumb y acciones contextuales",
  "Data table con filtros, sorting, paginacion, export y seleccion multiple",
  "Dialogs y drawers para aprobacion, rechazo y detalle operacional",
  "Formularios con validacion declarativa, toasts y feedback visual",
  "Empty states, loading states y error states escritos en español",
];

export const screenMap = [
  {
    path: "/dashboard",
    title: "Dashboard",
    description: "KPIs, alertas de calidad, backlog de recomendaciones, aging y resumen ejecutivo.",
    roles: "Direccion y analista comercial",
  },
  {
    path: "/imports",
    title: "Imports",
    description: "Carga de archivo, historial de lotes, parseo, validacion y acceso a errores del batch.",
    roles: "Admin y analista comercial",
  },
  {
    path: "/quality",
    title: "Quality",
    description: "Issues por lote, filas en revision, bloqueos y prioridades de limpieza.",
    roles: "Analista comercial",
  },
  {
    path: "/inventory",
    title: "Inventory",
    description: "Tabla principal con filtros por cliente, vehiculo, producto, estado y dias almacenados.",
    roles: "Comercial, bodega y direccion",
  },
  {
    path: "/grouping/recommendations",
    title: "Recommendations",
    description: "Cola ranked con explicacion, candidato sugerido y acciones de aprobar o rechazar.",
    roles: "Analista comercial",
  },
  {
    path: "/grouping/free-stock",
    title: "Free stock",
    description: "Vista dedicada al stock libre disponible para reutilizacion controlada.",
    roles: "Analista comercial",
  },
  {
    path: "/warehouse/scan",
    title: "Warehouse scan",
    description: "Pantalla tablet-first con camara, fallback manual y acciones operativas validas.",
    roles: "Operador de bodega",
  },
  {
    path: "/warehouse/movements",
    title: "Movements",
    description: "Confirmaciones recientes, historial de movimiento y trazabilidad por item o ubicacion.",
    roles: "Operador y coordinacion",
  },
  {
    path: "/reports",
    title: "Reports",
    description: "Resumen ejecutivo, aging, pendientes y exportes para seguimiento.",
    roles: "Direccion y analista",
  },
  {
    path: "/audit",
    title: "Audit",
    description: "Timeline auditable de decisiones, movimientos y cambios de estado.",
    roles: "Direccion y admin",
  },
  {
    path: "/settings",
    title: "Settings",
    description: "Catalogos, parametros del motor, estados operativos y usuarios seed.",
    roles: "Admin",
  },
];

export const blueprintPrinciples = [
  "Estetica industrial sobria con alto contraste, tipografia neutra y acentos verdes o ambar operativos.",
  "Nada de hero de marketing dentro del producto; las tablas y listas son el centro de la experiencia.",
  "Sidebar estable en desktop, navegacion compacta en tablet y acciones primarias siempre visibles.",
  "Charts solo para resumen ejecutivo y aging; el trabajo diario vive en filtros, tablas y trazabilidad.",
];

export const roleCards = [
  {
    title: "admin",
    description: "Configura catalogos, parametros del motor, usuarios seed y supervision general.",
  },
  {
    title: "commercial_analyst",
    description: "Importa, valida, revisa calidad y decide si aprueba o rechaza agrupaciones.",
  },
  {
    title: "warehouse_operator",
    description: "Escanea QR, confirma movimientos y ejecuta acciones permitidas por estado.",
  },
  {
    title: "executive_readonly",
    description: "Consume dashboard, reportes y auditoria sin mutaciones operativas.",
  },
];
