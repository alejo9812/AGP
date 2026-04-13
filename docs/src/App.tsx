import { useEffect } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { DocsShell } from "@/components/DocsShell";
import { FrontendBlueprintPage } from "@/pages/FrontendBlueprintPage";
import { PrototypePage } from "@/pages/PrototypePage";

function LegacyBlueprintRedirect() {
  useEffect(() => {
    window.location.replace(import.meta.env.BASE_URL);
  }, []);

  return null;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<DocsShell />}>
          <Route index element={<FrontendBlueprintPage />} />
          <Route path="/warehouse-grouping-prototype" element={<PrototypePage />} />
          <Route path="/frontend-blueprint" element={<LegacyBlueprintRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
