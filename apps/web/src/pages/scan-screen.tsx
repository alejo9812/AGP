import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { demoUsers } from "@shared";
import QRCode from "qrcode";
import { toast } from "sonner";

import { QrScannerPanel } from "@/components/scanner/QrScannerPanel";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getWarehouseActionOptions, performWarehouseAction, scanInventoryItem } from "@/lib/demo-api";
import { useUiStore } from "@/store/ui-store";

export function ScanScreen() {
  const queryClient = useQueryClient();
  const activeUserId = useUiStore((state) => state.activeUserId);
  const actorName = demoUsers.find((user) => user.id === activeUserId)?.fullName ?? "Operador";
  const [token, setToken] = useState("AGP-Q-INV-001");
  const [qrPreview, setQrPreview] = useState("");
  const [scanResult, setScanResult] = useState<Awaited<ReturnType<typeof scanInventoryItem>>>(null);

  const scan = useMutation({
    mutationFn: (value: string) => scanInventoryItem(value),
    onSuccess: (result) => {
      setScanResult(result);
      if (!result) toast.error("No se encontro el QR en el dataset demo.");
    },
  });
  const action = useMutation({
    mutationFn: (value: "reserve" | "move" | "complete" | "dispatch") => performWarehouseAction({ action: value, actorName, itemId: scanResult?.item.id ?? "" }),
    onSuccess: async () => {
      toast.success("Movimiento demo registrado correctamente.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["movements"] }),
        queryClient.invalidateQueries({ queryKey: ["summary"] }),
        queryClient.invalidateQueries({ queryKey: ["audit"] }),
      ]);
      if (scanResult?.qrToken) setScanResult(await scanInventoryItem(scanResult.qrToken));
    },
  });

  useEffect(() => {
    QRCode.toDataURL(token, { margin: 1, width: 220, color: { dark: "#081311", light: "#ffffff" } }).then(setQrPreview);
  }, [token]);

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouse QR scan" description="Pantalla tablet-first con camara, fallback manual y acciones restringidas por estado operativo valido." />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
        <QrScannerPanel onScan={(value) => scan.mutate(value)} />
        <Surface description="Tambien puedes consultar por token, id o order para cuando la camara no este disponible." title="Fallback manual">
          <div className="flex flex-wrap gap-3"><input className="min-w-0 flex-1 rounded-md border border-slate-300 px-4 py-2.5 text-sm outline-none" onChange={(event) => setToken(event.target.value)} value={token} /><button className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white" onClick={() => scan.mutate(token)} type="button">Consultar</button></div>
          <div className="mt-5 flex flex-wrap items-start gap-5">
            <img alt="Preview QR" className="h-40 w-40 rounded-lg border border-slate-200" src={qrPreview} />
            <div className="min-w-[220px] flex-1 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              {scanResult ? <><div className="flex flex-wrap items-center gap-3"><p className="text-lg font-semibold text-slate-950">{scanResult.item.orderId}</p><Badge>{scanResult.item.operationalStatus}</Badge></div><p className="mt-3">{scanResult.item.customer ?? "Stock libre"} · {scanResult.item.vehicle ?? "Vehicle pendiente"}</p><p>{scanResult.item.product}</p><p className="mt-2">Accion sugerida: {scanResult.suggestedAction}</p><div className="mt-4 flex flex-wrap gap-2">{getWarehouseActionOptions(scanResult.item).map((option) => <button key={option.action} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700" onClick={() => action.mutate(option.action)} type="button">{option.label}</button>)}</div></> : <p>Escanea o consulta un token para ver acciones disponibles.</p>}
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}
