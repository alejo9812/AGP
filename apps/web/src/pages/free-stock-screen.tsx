import { type ColumnDef } from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InventoryItem } from "@shared";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Surface } from "@/components/ui/surface";
import { getFreeStock } from "@/lib/demo-api";
import { formatDate } from "@/lib/utils";

export function FreeStockScreen() {
  const freeStockQuery = useQuery({ queryKey: ["free-stock"], queryFn: getFreeStock });
  const columns = useMemo<ColumnDef<InventoryItem>[]>(() => [
    { accessorKey: "orderId", header: "OrderID" },
    { accessorKey: "vehicle", header: "Vehicle", cell: ({ row }) => row.original.vehicle ?? "Pendiente" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "setStatus", header: "SetStatus", cell: ({ row }) => <Badge>{row.original.setStatus}</Badge> },
    { accessorKey: "daysStored", header: "DaysStored" },
    { accessorKey: "created", header: "Created", cell: ({ row }) => formatDate(row.original.created) },
    { accessorKey: "locationCode", header: "Ubicacion" },
  ], []);

  if (freeStockQuery.isLoading) return <LoadingPanel />;
  const freeStock = freeStockQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Free stock" description="Vista dedicada al pool reutilizable que entra como candidato cuando Customer viene vacio y la compatibilidad es valida." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard accent="emerald" helper="Items demo hoy visibles para comercial" icon={PackageSearch} title="Items libres" value={freeStock.length} />
        <StatCard helper="Mayor antiguedad dentro del pool visible" icon={PackageSearch} title="Oldest item" value={Math.max(...freeStock.map((item) => item.daysStored), 0)} />
        <StatCard helper="Products distintos disponibles" icon={PackageSearch} title="Products" value={new Set(freeStock.map((item) => item.product)).size} />
      </div>
      <Surface description="Tabla base para validar si el stock libre puede ayudar a completar receptores pendientes.">
        <DataTable columns={columns} data={freeStock} emptyDescription="No hay stock libre en el subset demo actual." emptyTitle="Sin free stock" />
      </Surface>
    </div>
  );
}
