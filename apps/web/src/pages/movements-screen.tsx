import { type ColumnDef } from "@tanstack/react-table";
import { Truck } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StockMovement } from "@shared";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Surface } from "@/components/ui/surface";
import { getMovements } from "@/lib/demo-api";
import { formatDate } from "@/lib/utils";

export function MovementsScreen() {
  const movementsQuery = useQuery({ queryKey: ["movements"], queryFn: getMovements });
  const columns = useMemo<ColumnDef<StockMovement>[]>(() => [
    { accessorKey: "itemId", header: "Item" },
    { accessorKey: "action", header: "Accion", cell: ({ row }) => <Badge>{row.original.action}</Badge> },
    { accessorKey: "fromStatus", header: "Desde" },
    { accessorKey: "toStatus", header: "Hacia" },
    { accessorKey: "fromLocation", header: "Origen" },
    { accessorKey: "toLocation", header: "Destino" },
    { accessorKey: "actorName", header: "Actor" },
    { accessorKey: "occurredAt", header: "Fecha", cell: ({ row }) => formatDate(row.original.occurredAt) },
    { accessorKey: "notes", header: "Notas", cell: ({ row }) => <span className="block max-w-[360px] leading-6">{row.original.notes}</span> },
  ], []);

  if (movementsQuery.isLoading) return <LoadingPanel />;
  const movements = movementsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse movements" description="Confirmaciones y movimientos recientes derivados de aprobaciones, reservas, grouping y dispatch." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard accent="emerald" helper="Eventos de bodega registrados en demo" icon={Truck} title="Movimientos" value={movements.length} />
        <StatCard helper="Acciones distintas para el flujo actual" icon={Truck} title="Tipos" value={new Set(movements.map((item) => item.action)).size} />
        <StatCard helper="Ultimo actor operativo visible" icon={Truck} title="Ultimo actor" value={movements[0]?.actorName ?? "--"} />
      </div>
      <Surface description="Tabla de trazabilidad fisica pensada para tablet y escritorio.">
        <DataTable columns={columns} data={movements} emptyDescription="Los movimientos apareceran cuando se ejecuten acciones desde recomendaciones o QR." emptyTitle="Sin movimientos" />
      </Surface>
    </div>
  );
}
