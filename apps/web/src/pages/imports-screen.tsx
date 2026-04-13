import { type ColumnDef } from "@tanstack/react-table";
import { Download, UploadCloud } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InventoryImportBatch } from "@shared";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { LoadingPanel } from "@/components/ui/loading-panel";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getImports } from "@/lib/demo-api";
import { downloadCsv } from "@/lib/export";
import { formatDate, formatNumber } from "@/lib/utils";

export function ImportsScreen() {
  const importsQuery = useQuery({ queryKey: ["imports"], queryFn: getImports });
  const columns = useMemo<ColumnDef<InventoryImportBatch>[]>(() => [
    { accessorKey: "fileName", header: "Archivo" },
    { accessorKey: "sourceType", header: "Tipo" },
    { accessorKey: "importedAt", header: "Importado", cell: ({ row }) => formatDate(row.original.importedAt) },
    { accessorKey: "totalRows", header: "Total filas", cell: ({ row }) => formatNumber(row.original.totalRows) },
    { accessorKey: "validRows", header: "Validas", cell: ({ row }) => formatNumber(row.original.validRows) },
    { accessorKey: "rowsNeedingReview", header: "Revision", cell: ({ row }) => formatNumber(row.original.rowsNeedingReview) },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => <Badge tone={row.original.status === "processed" ? "success" : "warning"}>{row.original.status}</Badge> },
  ], []);

  if (importsQuery.isLoading) return <LoadingPanel />;
  const batches = importsQuery.data ?? [];
  const latestBatch = batches[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Imports"
        description="Carga de archivo, historial de batches y resumen de parseo para el dataset sanitizado del MVP."
        actions={<button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700" onClick={() => downloadCsv("imports-history.csv", batches as unknown as Record<string, unknown>[])} type="button"><Download className="h-4 w-4" />Export batches</button>}
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface description="La carga definitiva conectara con el importador FastAPI. En esta iteracion queda listo el shell visual y el historial." title="Carga de inventario">
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
            <UploadCloud className="h-10 w-10 text-emerald-600" />
            <p className="mt-4 text-lg font-semibold text-slate-950">Arrastra un XLSX o CSV del inventario</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Columnas esperadas: ID, OrderID, Serial, Vehicle, Created, Product, Invoice, InvoiceCost, Customer, DaysStored y SetStatus.</p>
          </div>
        </Surface>
        <Surface description="Resumen rapido del batch mas reciente procesado en demo." title="Ultimo lote">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">Archivo</p><p className="mt-2 font-semibold text-slate-950">{latestBatch?.fileName ?? "--"}</p></div>
            <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">Importado</p><p className="mt-2 font-semibold text-slate-950">{formatDate(latestBatch?.importedAt)}</p></div>
            <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">Total filas</p><p className="mt-2 font-semibold text-slate-950">{formatNumber(latestBatch?.totalRows ?? 0)}</p></div>
            <div className="rounded-lg bg-slate-50 p-4"><p className="text-sm text-slate-500">Filas a revision</p><p className="mt-2 font-semibold text-slate-950">{formatNumber(latestBatch?.rowsNeedingReview ?? 0)}</p></div>
          </div>
        </Surface>
      </div>
      <Surface description="Historial de lotes importados y su resultado operativo." title="Historial">
        <DataTable columns={columns} data={batches} emptyDescription="Cuando conectemos el importador real, aqui quedara la trazabilidad de cada lote." emptyTitle="Todavia no hay lotes" />
      </Surface>
    </div>
  );
}
