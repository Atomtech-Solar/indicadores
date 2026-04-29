import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss(), react()],
  server: {
    port: 3080,
    strictPort: true,
    host: true,
  },
});
