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
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/model/defaults.ts",
        "src/model/geometry.ts",
        "src/model/ops.ts",
        "src/model/palette.ts",
        "src/model/validate.ts",
        "src/export/contactsheet.ts",
        "src/export/projectfile.ts",
        "src/render/primitives.ts",
        "src/state/history.ts",
      ],
      thresholds: { lines: 85, functions: 80, branches: 70, statements: 85 },
    },
  },
});
