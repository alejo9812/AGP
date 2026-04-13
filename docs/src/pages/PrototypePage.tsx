import { Link } from "react-router-dom";

import { MermaidDiagram } from "@/components/MermaidDiagram";
import {
  algorithmSteps,
  apiRoutes,
  architectureLayers,
  architectureMermaid,
  asIsMermaid,
  assumptions,
  dataModelHighlights,
  implementationPhases,
  summaryMetrics,
  technicalPlanSections,
  testingStreams,
  toBeMermaid,
  viabilityCards,
} from "@/content/siteContent";

export function PrototypePage() {
  return (
    <>
      <section
        className="relative overflow-hidden border-b border-white/10 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center"
      >
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(4,9,8,0.95),rgba(8,19,17,0.82),rgba(8,19,17,0.46))]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-16 pt-18 md:pb-20 md:pt-24">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Warehouse grouping prototype</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[0.95] text-white md:text-6xl">
            Plan tecnico del prototipo AGP para agrupar inventario con reglas explicables y trazabilidad operativa.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200">
            Este sitio resume el problema, los hallazgos del Excel, la viabilidad del MVP, la arquitectura por capas,
            las reglas del motor, las rutas API y el mapa de implementacion del monorepo.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              className="rounded-lg bg-emerald-300 px-5 py-3 font-semibold text-[#081311]"
              href="https://github.com/alejo9812/AGP"
              target="_blank"
              rel="noreferrer"
            >
              Ver repositorio
            </a>
            <Link className="rounded-lg border border-white/20 px-5 py-3 font-semibold text-white" to="/frontend-blueprint">
              Ir al frontend blueprint
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaryMetrics.map((metric) => (
            <article key={metric.label} className="rounded-lg border border-white/10 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold text-white">{metric.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Viabilidad</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {viabilityCards.map((card) => (
              <article key={card.title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-semibold text-white">{card.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">AS-IS</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Operacion actual dependiente de Excel y correo</h2>
            <p className="mt-4 text-base leading-8 text-slate-300">
              El proceso actual concentra la logica en personas clave. La informacion llega tarde, los criterios de
              agrupamiento no quedan centralizados y la ejecucion de bodega depende de coordinacion manual.
            </p>
          </div>
          <MermaidDiagram chart={asIsMermaid} />
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">TO-BE</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Operacion digital con aprobacion humana y QR</h2>
              <p className="mt-4 text-base leading-8 text-slate-300">
                La solucion propuesta separa el trabajo en cuatro capas: datos, API, SPA operativa y documentacion
                publica. Comercial decide, bodega ejecuta y direccion audita.
              </p>
            </div>
            <MermaidDiagram chart={toBeMermaid} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Arquitectura</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Capas desacopladas y contratos compartidos</h2>
            <div className="mt-8 space-y-4">
              {architectureLayers.map((layer) => (
                <article key={layer.title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <h3 className="text-lg font-semibold text-white">{layer.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{layer.description}</p>
                </article>
              ))}
            </div>
          </div>
          <MermaidDiagram chart={architectureMermaid} />
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Plan tecnico</p>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {technicalPlanSections.map((section) => (
              <article key={section.title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Motor deterministico</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Reglas claras, ranking visible y decision humana</h2>
            <ol className="mt-8 grid gap-4">
              {algorithmSteps.map((step, index) => (
                <li key={step} className="rounded-lg border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-300">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    Paso {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
          <div className="space-y-5">
            <article className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold text-white">Modelo de datos</h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                {dataModelHighlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-lg border border-white/10 bg-white/5 p-6">
              <h3 className="text-xl font-semibold text-white">Rutas API v1</h3>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-300">
                {apiRoutes.map((route) => (
                  <code key={route} className="rounded-md border border-white/10 bg-[#081311] px-3 py-2 text-emerald-100">
                    {route}
                  </code>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0d1d1b]">
        <div className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-200">Fases</p>
              <div className="mt-8 space-y-4">
                {implementationPhases.map((phase) => (
                  <article key={phase.title} className="rounded-lg border border-white/10 bg-white/5 p-5">
                    <h2 className="text-xl font-semibold text-white">{phase.title}</h2>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                      {phase.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <article className="rounded-lg border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Pruebas</p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                  {testingStreams.map((stream) => (
                    <li key={stream}>{stream}</li>
                  ))}
                </ul>
              </article>

              <article className="rounded-lg border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Supuestos</p>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
                  {assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
