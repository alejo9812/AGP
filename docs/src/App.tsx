import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { DocsShell } from "@/components/DocsShell";
import { FrontendBlueprintPage } from "@/pages/FrontendBlueprintPage";
import { PrototypePage } from "@/pages/PrototypePage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<DocsShell />}>
          <Route index element={<Navigate to="/warehouse-grouping-prototype" replace />} />
          <Route path="/warehouse-grouping-prototype" element={<PrototypePage />} />
          <Route path="/frontend-blueprint" element={<FrontendBlueprintPage />} />
          <Route path="*" element={<Navigate to="/warehouse-grouping-prototype" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
