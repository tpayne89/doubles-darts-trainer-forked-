import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["nf6p4w-5173.csb.app"],
  },
  build: {
    outDir: "dist",         // optional, this is the default
    rollupOptions: {
      input: resolve(__dirname, "index.html"),  // updated path!
    },
    emptyOutDir: true,
  },
});
