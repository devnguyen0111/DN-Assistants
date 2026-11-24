import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;
const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "Asia/Ho_Chi_Minh" },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react/") || id.includes("react-dom/")) {
              return "vendor-react";
            }
            if (id.includes("@radix-ui/")) {
              return "vendor-radix";
            }
            if (id.includes("@tauri-apps/")) {
              return "vendor-tauri";
            }
            if (id.includes("lucide-react")) {
              return "vendor-icons";
            }
          }
        },
      },
    },
  },
}));
