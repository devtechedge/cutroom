/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5210,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
