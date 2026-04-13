import {
  type ColumnDef,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  emptyTitle: string;
  emptyDescription: string;
  selectionEnabled?: boolean;
}

export function DataTable<TData>({
  data,
  columns,
  emptyTitle,
  emptyDescription,
  selectionEnabled = false,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 8 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    enableRowSelection: selectionEnabled,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      pagination,
      rowSelection,
    },
  });

  if (!data.length) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex items-center gap-2"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: "↑",
                          desc: "↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="align-top">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm text-slate-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div>
          {selectionEnabled
            ? `${table.getSelectedRowModel().rows.length} seleccionados`
            : `${data.length} registros filtrados`}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            type="button"
          >
            Anterior
          </button>
          <span>
            Pagina {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <button
            className="rounded-md border border-slate-300 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            type="button"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
