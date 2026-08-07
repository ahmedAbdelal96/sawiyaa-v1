import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/navigation": path.resolve(__dirname, "./node_modules/next/navigation.js"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/component/setup.ts"],
    include: ["tests/component/**/*.test.tsx", "src/**/*.test.tsx"],
    css: false,
    server: {
      deps: {
        inline: ["next-intl"],
      },
    },
  },
});
