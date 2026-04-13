/// <reference types="vitest" />
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "AGP Warehouse Grouping",
        short_name: "AGP Warehouse",
        description: "Operacion de inventario y agrupamiento para AGP",
        theme_color: "#1f6f61",
        background_color: "#f1f6f4",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});
