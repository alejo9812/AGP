import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
    base: "/AGP/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src"),
            "@shared": path.resolve(__dirname, "../packages/shared/src"),
        },
    },
});
