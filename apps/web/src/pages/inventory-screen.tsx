import { type ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { operationalStatuses, sourceStatuses } from "@shared";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InventoryItem } from "@shared";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { downloadCsv } from "@/lib/export";
import { getInventory } from "@/lib/demo-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

export function InventoryScreen() {
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: getInventory });
  const filters = useUiStore((state) => state.inventoryFilters);
  const updateFilters = useUiStore((state) => state.updateInventoryFilters);
  const resetFilters = useUiStore((state) => state.resetInventoryFilters);
  const inventory = useMemo(() => inventoryQuery.data ?? [], [inventoryQuery.data]);

  const options = useMemo(() => ({
    customers: Array.from(new Set(inventory.map((item) => item.customer).filter(Boolean))).sort(),
    vehicles: Array.from(new Set(inventory.map((item) => item.vehicle).filter(Boolean))).sort(),
    products: Array.from(new Set(inventory.map((item) => item.product))).sort(),
  }), [inventory]);

  const filtered = useMemo(() => inventory.filter((item) => {
    const haystack = `${item.orderId} ${item.customer ?? ""} ${item.vehicle ?? ""} ${item.product}`.toLowerCase();
    return (!filters.search || haystack.includes(filters.search.toLowerCase())) &&
      (filters.customer === "all" || item.customer === filters.customer) &&
      (filters.vehicle === "all" || item.vehicle === filters.vehicle) &&
      (filters.product === "all" || item.product === filters.product) &&
      (filters.operationalStatus === "all" || item.operationalStatus === filters.operationalStatus) &&
      (filters.sourceStatus === "all" || item.setStatus === filters.sourceStatus);
  }), [filters, inventory]);

  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    { accessorKey: "orderId", header: "OrderID" },
    { accessorKey: "customer", header: "Customer", cell: ({ row }) => row.original.customer ?? "Stock libre" },
    { accessorKey: "vehicle", header: "Vehicle", cell: ({ row }) => row.original.vehicle ?? "Pendiente" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "setStatus", header: "SetStatus", cell: ({ row }) => <Badge>{row.original.setStatus}</Badge> },
    { accessorKey: "operationalStatus", header: "Estado operativo", cell: ({ row }) => <Badge tone={row.original.operationalStatus === "Blocked" ? "danger" : row.original.operationalStatus === "Review Needed" ? "warning" : "neutral"}>{row.original.operationalStatus}</Badge> },
    { accessorKey: "daysStored", header: "DaysStored" },
    { accessorKey: "created", header: "Created", cell: ({ row }) => formatDate(row.original.created) },
    { accessorKey: "invoiceCost", header: "InvoiceCost", cell: ({ row }) => formatCurrency(row.original.invoiceCost) },
    { accessorKey: "locationCode", header: "Ubicacion" },
  ], []);

  if (inventoryQuery.isLoading) return <LoadingPanel />;

  return (
    <div className="space-y-6">
      <PageHeader title="Inventory" description="Tabla principal filtrable por customer, vehicle, product, estado y antiguedad operativa." actions={<button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => downloadCsv("inventory-filtered.csv", filtered as unknown as Record<string, unknown>[])} type="button"><Download className="h-4 w-4" />Export filtered</button>} />
      <Surface description="Los filtros persisten localmente para que comercial y bodega retomen el contexto sin perderse.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <input className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Buscar por order, customer o vehicle" value={filters.search} />
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ customer: event.target.value })} value={filters.customer}><option value="all">Todos los customer</option>{options.customers.map((value) => <option key={value} value={value ?? ""}>{value}</option>)}</select>
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ vehicle: event.target.value })} value={filters.vehicle}><option value="all">Todos los vehicle</option>{options.vehicles.map((value) => <option key={value} value={value ?? ""}>{value}</option>)}</select>
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ product: event.target.value })} value={filters.product}><option value="all">Todos los product</option>{options.products.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ operationalStatus: event.target.value })} value={filters.operationalStatus}><option value="all">Todos los estados</option>{operationalStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select className="rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm" onChange={(event) => updateFilters({ sourceStatus: event.target.value })} value={filters.sourceStatus}><option value="all">Todos los SetStatus</option>{sourceStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        </div>
        <div className="mt-4"><button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => resetFilters()} type="button">Limpiar filtros</button></div>
      </Surface>
      <Surface description="Centro del producto: filtros, seleccion multiple, ordenamiento y export sobre la misma vista.">
        <DataTable columns={columns} data={filtered} emptyDescription="Ajusta los filtros o carga un lote para ver inventario operativo." emptyTitle="No hay registros para esos filtros" selectionEnabled />
      </Surface>
    </div>
  );
}
