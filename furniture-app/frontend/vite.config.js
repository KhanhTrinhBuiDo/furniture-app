import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // Build output
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Code splitting để tối ưu load time
          manualChunks: {
            vendor: ["react", "react-dom"],
            animation: ["framer-motion"],
            swiper: ["swiper"],
          },
        },
      },
    },

    // Dev server
    server: {
      port: 3000,
      open: true,
      proxy: {
        // Proxy API calls đến backend trong dev
        "/api": {
          target: env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: env.VITE_API_URL || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },

    // Preview server (sau khi build)
    preview: {
      port: 4173,
      proxy: {
        "/api": { target: env.VITE_API_URL || "http://localhost:5000", changeOrigin: true },
        "/uploads": { target: env.VITE_API_URL || "http://localhost:5000", changeOrigin: true },
      },
    },

    // Env prefix
    envPrefix: "VITE_",
  };
});