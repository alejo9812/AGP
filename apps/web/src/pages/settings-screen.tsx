import * as Tabs from "@radix-ui/react-tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { demoUsers, operationalStatusMeta, roleLabels } from "@shared";
import { Settings } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";

const settingsSchema = z.object({ prioritizeOldest: z.boolean(), allowFreeStock: z.boolean(), blockMissingVehicle: z.boolean(), stagingLocation: z.string().min(3) });
type SettingsFormValues = z.infer<typeof settingsSchema>;

export function SettingsScreen() {
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema), defaultValues: { prioritizeOldest: true, allowFreeStock: true, blockMissingVehicle: true, stagingLocation: "MX-QA-01" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings y catalogos" description="Parametros visibles del motor, estados operativos y usuarios seed para la demo del MVP." />
      <Surface description="La configuracion del MVP se mantiene deliberadamente pequena y explicable.">
        <Tabs.Root className="space-y-6" defaultValue="engine">
          <Tabs.List className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">{[{ value: "engine", label: "Motor" }, { value: "statuses", label: "Estados" }, { value: "roles", label: "Roles" }].map((tab) => <Tabs.Trigger key={tab.value} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:border-emerald-600 data-[state=active]:bg-emerald-600 data-[state=active]:text-white" value={tab.value}>{tab.label}</Tabs.Trigger>)}</Tabs.List>
          <Tabs.Content value="engine">
            <form className="grid gap-6 xl:grid-cols-[1.1fr_1fr]" onSubmit={form.handleSubmit((values) => { toast.success(`Parametros guardados en modo demo para ${values.stagingLocation}.`); })}>
              <div className="space-y-4">
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"><input className="mt-1 h-4 w-4" type="checkbox" {...form.register("prioritizeOldest")} /><span><span className="block font-semibold text-slate-900">Priorizar mayor antiguedad</span><span className="mt-1 block text-sm text-slate-500">FEFO / oldest-first como tie-break principal.</span></span></label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"><input className="mt-1 h-4 w-4" type="checkbox" {...form.register("allowFreeStock")} /><span><span className="block font-semibold text-slate-900">Permitir stock libre</span><span className="mt-1 block text-sm text-slate-500">Customer vacio puede actuar como pool compatible si cumple reglas.</span></span></label>
                <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4"><input className="mt-1 h-4 w-4" type="checkbox" {...form.register("blockMissingVehicle")} /><span><span className="block font-semibold text-slate-900">Bloquear vehicle vacio</span><span className="mt-1 block text-sm text-slate-500">Todo item sin vehicle queda fuera de auto-agrupacion.</span></span></label>
              </div>
              <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="space-y-2"><label className="text-sm font-semibold text-slate-800" htmlFor="stagingLocation">Ubicacion default de staging</label><input className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500" id="stagingLocation" {...form.register("stagingLocation")} />{form.formState.errors.stagingLocation ? <p className="text-sm text-rose-700">{form.formState.errors.stagingLocation.message}</p> : null}</div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600"><p className="font-semibold text-slate-900">Supuestos fijos del MVP</p><ul className="mt-3 space-y-2"><li>1 fila = 1 unidad o set trazable.</li><li>Aprobacion humana obligatoria antes de mutacion.</li><li>IA avanzada queda fuera de la fase actual.</li></ul></div>
                <button className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700" type="submit"><Settings className="h-4 w-4" />Guardar parametros</button>
              </div>
            </form>
          </Tabs.Content>
          <Tabs.Content value="statuses"><div className="grid gap-4 md:grid-cols-2">{Object.entries(operationalStatusMeta).map(([status, meta]) => <div key={status} className="rounded-lg border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-900">{meta.label}</p><Badge tone={meta.tone}>{status}</Badge></div><p className="mt-3 text-sm leading-6 text-slate-600">{meta.description}</p></div>)}</div></Tabs.Content>
          <Tabs.Content value="roles"><div className="space-y-4">{demoUsers.map((user) => <div key={user.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold text-slate-900">{user.fullName}</p><p className="text-sm text-slate-500">{user.email}</p></div><Badge tone="neutral">{roleLabels[user.role]}</Badge></div></div>)}</div></Tabs.Content>
        </Tabs.Root>
      </Surface>
    </div>
  );
}
