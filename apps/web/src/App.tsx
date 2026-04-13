import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { AuditScreen } from "@/pages/audit-screen";
import { DashboardScreen } from "@/pages/dashboard-screen";
import { FreeStockScreen } from "@/pages/free-stock-screen";
import { ImportsScreen } from "@/pages/imports-screen";
import { InventoryScreen } from "@/pages/inventory-screen";
import { MovementsScreen } from "@/pages/movements-screen";
import { QualityScreen } from "@/pages/quality-screen";
import { RecommendationsScreen } from "@/pages/recommendations-screen";
import { ReportsScreen } from "@/pages/reports-screen";
import { ScanScreen } from "@/pages/scan-screen";
import { SettingsScreen } from "@/pages/settings-screen";

const queryClient = new QueryClient();
const Router = import.meta.env.PROD ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route element={<AppShell />} path="/">
            <Route element={<Navigate replace to="/dashboard" />} index />
            <Route element={<DashboardScreen />} path="dashboard" />
            <Route element={<ImportsScreen />} path="imports" />
            <Route element={<QualityScreen />} path="quality" />
            <Route element={<InventoryScreen />} path="inventory" />
            <Route element={<RecommendationsScreen />} path="grouping/recommendations" />
            <Route element={<FreeStockScreen />} path="grouping/free-stock" />
            <Route element={<ScanScreen />} path="warehouse/scan" />
            <Route element={<MovementsScreen />} path="warehouse/movements" />
            <Route element={<ReportsScreen />} path="reports" />
            <Route element={<AuditScreen />} path="audit" />
            <Route element={<SettingsScreen />} path="settings" />
            <Route element={<Navigate replace to="/dashboard" />} path="*" />
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
