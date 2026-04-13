import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { label: "Plan tecnico", to: "/warehouse-grouping-prototype" },
];

function navClassName(isActive: boolean) {
  return [
    "rounded-md px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-emerald-300 text-[#081311]" : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export function DocsShell() {
  return (
    <div className="min-h-screen bg-[#081311] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#081311]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <a className="text-sm font-semibold tracking-[0.18em] text-emerald-200" href="/AGP/">
              AGP WAREHOUSE
            </a>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Documentacion versionada del prototipo de agrupamiento y base operativa del frontend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => navClassName(isActive)}>
                {item.label}
              </NavLink>
            ))}
            <a
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
              href="/AGP/"
            >
              Frontend blueprint
            </a>
            <a
              className="rounded-md border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/5"
              href="https://github.com/alejo9812/AGP"
              target="_blank"
              rel="noreferrer"
            >
              Repositorio
            </a>
            <a
              className="rounded-md border border-emerald-300/40 px-3 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-300/10"
              href="https://alejo9812.github.io/AGP/app/#/dashboard"
              target="_blank"
              rel="noreferrer"
            >
              App operativa
            </a>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-[#07100f]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-400 lg:flex-row lg:items-center lg:justify-between">
          <p>AGP Warehouse Grouping Prototype. Documentacion publica y base del frontend operativo.</p>
          <div className="flex flex-wrap gap-4">
            <a className="hover:text-white" href="#/warehouse-grouping-prototype">
              Plan tecnico
            </a>
            <a className="hover:text-white" href="/AGP/">
              Frontend blueprint
            </a>
            <a className="hover:text-white" href="https://github.com/alejo9812/AGP" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
