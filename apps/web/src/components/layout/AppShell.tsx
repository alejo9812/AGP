import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  FileClock,
  FileSpreadsheet,
  LayoutDashboard,
  PackageSearch,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { demoUsers, roleLabels } from "@shared";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

const navigation = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/imports", label: "Imports", icon: FileSpreadsheet },
  { to: "/quality", label: "Quality", icon: ShieldCheck },
  { to: "/inventory", label: "Inventory", icon: Boxes },
  { to: "/grouping/recommendations", label: "Recommendations", icon: ClipboardCheck },
  { to: "/grouping/free-stock", label: "Free stock", icon: PackageSearch },
  { to: "/warehouse/scan", label: "QR scan", icon: ScanLine },
  { to: "/warehouse/movements", label: "Movements", icon: QrCode },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/audit", label: "Audit", icon: FileClock },
  { to: "/settings", label: "Settings", icon: Settings },
];

function routeLabel(pathname: string) {
  const direct = navigation.find((item) => item.to === pathname);
  if (direct) return direct.label;
  return pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/-/g, " "))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ");
}

export function AppShell() {
  const location = useLocation();
  const activeUserId = useUiStore((state) => state.activeUserId);
  const setActiveUserId = useUiStore((state) => state.setActiveUserId);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const activeUser = demoUsers.find((user) => user.id === activeUserId) ?? demoUsers[0];

  return (
    <div className="min-h-screen bg-[#eef3f2] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside
          className={cn(
            "hidden border-r border-slate-200 bg-[#0d1715] px-4 py-5 text-slate-100 xl:flex xl:flex-col",
            sidebarCollapsed ? "w-[94px]" : "w-[286px]",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className={cn("min-w-0", sidebarCollapsed && "hidden")}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">AGP warehouse</p>
              <p className="mt-1 text-sm text-slate-300">Control operativo de inventario</p>
            </div>
            <button
              aria-label={sidebarCollapsed ? "Expandir menu" : "Contraer menu"}
              className="rounded-md border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              type="button"
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="mt-8 grid gap-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                      isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white",
                      sidebarCollapsed && "justify-center px-0",
                    )
                  }
                  to={item.to}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className={cn(sidebarCollapsed && "hidden")}>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto rounded-lg border border-white/10 bg-white/5 p-4">
            <p className={cn("text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200", sidebarCollapsed && "hidden")}>Usuario activo</p>
            <select
              className={cn(
                "mt-3 w-full rounded-md border border-white/10 bg-[#15211f] px-3 py-2 text-sm text-white outline-none",
                sidebarCollapsed && "mt-0",
              )}
              onChange={(event) => setActiveUserId(event.target.value)}
              value={activeUser.id}
            >
              {demoUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.fullName}</option>
              ))}
            </select>
            <p className={cn("mt-3 text-sm text-slate-300", sidebarCollapsed && "hidden")}>{roleLabels[activeUser.role]}</p>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#eef3f2]/95 backdrop-blur">
            <div className="px-4 py-4 md:px-6 xl:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">AGP operations</p>
                  <h1 className="mt-1 text-lg font-semibold text-slate-950">{routeLabel(location.pathname)}</h1>
                </div>
                <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
                  <p className="text-sm font-semibold text-slate-900">{activeUser.fullName}</p>
                  <p className="text-sm text-slate-500">{activeUser.email}</p>
                </div>
              </div>

              <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 xl:hidden">
                {navigation.map((item) => (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) =>
                      cn(
                        "whitespace-nowrap rounded-md border px-3 py-2 text-sm font-medium transition",
                        isActive ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )
                    }
                    to={item.to}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 xl:px-8 xl:py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
