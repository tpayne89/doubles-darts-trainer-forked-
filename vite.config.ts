import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["nf6p4w-5173.csb.app"],
  },
  build: {
    rollupOptions: {
      input: resolve(__dirname, "public/index.html"),
    },
  },
});
