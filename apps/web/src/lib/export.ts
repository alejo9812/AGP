export function downloadCsv<T extends object>(filename: string, rows: T[]) {
  if (!rows.length) {
    return;
  }

  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const rawValue = (row as Record<string, unknown>)[header];
          const value = rawValue == null ? "" : String(rawValue);
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(href);
}
