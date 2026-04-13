import {
  blueprintPrinciples,
  extractedBlocks,
  frontendBase,
  frontendStack,
  roleCards,
  screenMap,
} from "@/content/siteContent";

export function FrontendBlueprintPage() {
  return (
    <>
      <section className="border-b border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Frontend blueprint</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[0.98] text-white md:text-5xl">
            Base operativa para AGP Warehouse dentro del monorepo actual.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
            El frontend se implementa en <code>apps/web</code> y toma como referencia principal los patrones de
            shadcn-admin-kit para shell, tablas, formularios y estados de interfaz, sin convertirlo en una app aparte.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {frontendBase.map((item) => (
            <article key={item} className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
              {item}
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="rounded-lg border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Stack definitivo</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                {frontendStack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Bloques adaptados</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                {extractedBlocks.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Mapa de pantallas</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Rutas alineadas con el flujo operativo real</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-300">
            Las vistas se organizan por trabajo real: importar, limpiar datos, decidir agrupaciones, ejecutar
            movimientos y auditar. No hay CRUD genérico ni secciones de relleno.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg border border-white/10">
          <table className="min-w-full border-collapse text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Ruta</th>
                <th className="px-4 py-3 font-medium">Pantalla</th>
                <th className="px-4 py-3 font-medium">Uso principal</th>
                <th className="px-4 py-3 font-medium">Rol dominante</th>
              </tr>
            </thead>
            <tbody>
              {screenMap.map((screen) => (
                <tr key={screen.path} className="border-t border-white/10">
                  <td className="px-4 py-4 align-top">
                    <code className="rounded bg-[#081311] px-2 py-1 text-emerald-100">{screen.path}</code>
                  </td>
                  <td className="px-4 py-4 align-top font-medium text-white">{screen.title}</td>
                  <td className="px-4 py-4 align-top leading-7">{screen.description}</td>
                  <td className="px-4 py-4 align-top">{screen.roles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-lg border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Decisiones UX</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                {blueprintPrinciples.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Roles MVP</p>
              <div className="mt-5 grid gap-3">
                {roleCards.map((role) => (
                  <div key={role.title} className="rounded-lg border border-white/10 bg-[#081311] p-4">
                    <h3 className="text-base font-semibold text-white">{role.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-300">{role.description}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 lg:grid-cols-3">
          <article className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Contratos</p>
            <p className="mt-4">
              Los tipos compartidos viven en <code>packages/shared</code> y cubren InventoryImportBatch, InventoryItem,
              DataQualityIssue, GroupingRecommendation, GroupingMatchCandidate, StockMovement, QrScanResult y
              ReportSummary.
            </p>
          </article>
          <article className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Estado local</p>
            <p className="mt-4">
              Zustand queda limitado a sesion temporal, preferencias de UI y persistencia ligera de filtros. Todo lo que
              venga del servidor vive en TanStack Query.
            </p>
          </article>
          <article className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">PWA</p>
            <p className="mt-4">
              La app ya queda preparada para instalacion ligera y cache del shell. No se habilitan mutaciones offline en
              esta primera version porque la operacion necesita consistencia en tiempo real.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
