/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-antd": ["antd", "@ant-design/icons"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      // Thresholds intentionally low — this is a coverage floor, not a
      // target. Tighten over time as the test suite expands.
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 20,
        statements: 30,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/main.tsx",
        "src/**/*.test.{ts,tsx}",
        "src/test/**",
        "src/types/**",
      ],
    },
  },
});