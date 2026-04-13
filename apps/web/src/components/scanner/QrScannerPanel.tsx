import type { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface QrScannerPanelProps {
  onScan: (value: string) => void;
}

export function QrScannerPanel({ onScan }: QrScannerPanelProps) {
  const mountId = "agp-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMessage, setCameraMessage] = useState(
    "La camara se activa bajo demanda para mantener el flujo tablet-first controlado.",
  );

  async function startCamera() {
    try {
      const module = await import("html5-qrcode");
      const scanner = new module.Html5Qrcode(mountId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          onScan(decodedText);
          setCameraMessage(`Ultima lectura: ${decodedText}`);
        },
        () => undefined,
      );

      setCameraActive(true);
      setCameraMessage("Camara activa. Enfoca el QR del item o pallet.");
    } catch (error) {
      setCameraMessage("No fue posible activar la camara. Usa el fallback manual.");
      console.error(error);
    }
  }

  async function stopCamera() {
    if (!scannerRef.current) {
      return;
    }

    await scannerRef.current.stop();
    await scannerRef.current.clear();
    scannerRef.current = null;
    setCameraActive(false);
    setCameraMessage("Camara detenida. Puedes volver a activarla cuando la necesites.");
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (scanner) {
        void scanner.stop().then(() => scanner.clear()).catch(() => undefined);
      }
    };
  }, []);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">QR live scan</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Escaneo con camara</h3>
        </div>
        {cameraActive ? (
          <button
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
            onClick={() => void stopCamera()}
            type="button"
          >
            <CameraOff className="h-4 w-4" />
            Detener
          </button>
        ) : (
          <button
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => void startCamera()}
            type="button"
          >
            <Camera className="h-4 w-4" />
            Activar camara
          </button>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <div className="flex h-[360px] items-center justify-center" id={mountId}>
          {!cameraActive ? (
            <div className="text-center text-slate-500">
              <QrCode className="mx-auto h-10 w-10" />
              <p className="mt-3 text-sm">Activa la camara para escanear desde tablet.</p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{cameraMessage}</p>
    </article>
  );
}
