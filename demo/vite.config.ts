import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: __dirname,
  plugins: [react(), tailwindcss()],
  server: {
    // Reachable from a phone on the same network — the gesture cannot be
    // judged with a trackpad.
    host: true,
  },
  resolve: {
    alias: {
      // Straight at source, so an edit to the package hot-reloads here.
      "@tjcages/presentation/presentation.css": new URL(
        "../src/presentation.css",
        import.meta.url,
      ).pathname,
      "@tjcages/presentation": new URL("../src/index.ts", import.meta.url).pathname,
    },
  },
});
