import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Surface } from "@/components/ui/surface";
import { getInventory, getQualityIssues } from "@/lib/demo-api";
import { toneFromSeverity } from "@/lib/utils";

interface QualityRow {
  itemId: string;
  severity: "info" | "warning" | "error";
  field: string;
  message: string;
  customer: string;
  vehicle: string;
  product: string;
}

export function QualityScreen() {
  const issuesQuery = useQuery({ queryKey: ["quality"], queryFn: getQualityIssues });
  const inventoryQuery = useQuery({ queryKey: ["inventory"], queryFn: getInventory });
  const rows = useMemo<QualityRow[]>(() => {
    const inventory = inventoryQuery.data ?? [];
    return (issuesQuery.data ?? []).map((issue) => {
      const item = inventory.find((candidate) => candidate.id === issue.itemId);
      return {
        itemId: issue.itemId,
        severity: issue.severity,
        field: issue.field,
        message: issue.message,
        customer: item?.customer ?? "Stock libre",
        vehicle: item?.vehicle ?? "Pendiente",
        product: item?.product ?? "--",
      };
    });
  }, [inventoryQuery.data, issuesQuery.data]);

  const columns = useMemo<ColumnDef<QualityRow>[]>(() => [
    { accessorKey: "itemId", header: "Item" },
    { accessorKey: "severity", header: "Severidad", cell: ({ row }) => <Badge tone={toneFromSeverity(row.original.severity)}>{row.original.severity}</Badge> },
    { accessorKey: "field", header: "Campo" },
    { accessorKey: "customer", header: "Customer" },
    { accessorKey: "vehicle", header: "Vehicle" },
    { accessorKey: "product", header: "Product" },
    { accessorKey: "message", header: "Observacion", cell: ({ row }) => <span className="block max-w-[420px] leading-6">{row.original.message}</span> },
  ], []);

  if (issuesQuery.isLoading || inventoryQuery.isLoading) return <LoadingPanel />;
  const warnings = rows.filter((row) => row.severity === "warning").length;
  const errors = rows.filter((row) => row.severity === "error").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Quality" description="Faltantes, bloqueos y filas que deben quedarse fuera de auto-agrupacion hasta completar evidencia." />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard accent="amber" helper="Registros con revision comercial o de datos" icon={AlertTriangle} title="Warnings" value={warnings} />
        <StatCard accent="rose" helper="Items bloqueados por calidad o inconsistencia fuerte" icon={ShieldAlert} title="Errors" value={errors} />
        <StatCard helper="Total de issues detectados en el subset demo" icon={AlertTriangle} title="Issues" value={rows.length} />
      </div>
      <Surface description="Esta vista concentra lo que no debe entrar al motor sin explicacion: vehicle vacio, producto sospechoso o registros bloqueados." title="Cola de issues">
        <DataTable columns={columns} data={rows} emptyDescription="Cuando el importador procese un lote, aqui veras las incidencias por fila." emptyTitle="Sin issues de calidad" />
      </Surface>
    </div>
  );
}
