import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["nf6p4w-5173.csb.app"],
  },
  build: {
    outDir: "dist",         // explicitly set output dir (default is 'dist')
    rollupOptions: {
      input: resolve(__dirname, "public/index.html"),
    },
    emptyOutDir: true,
  },
});
