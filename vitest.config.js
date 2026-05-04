import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    exclude: ["node_modules", ".trash"],
  },
  resolve: {
    alias: {
      // Mock obsidian module which doesn't have a proper entry point for testing
      obsidian: path.resolve(__dirname, "src/__mocks__/obsidian.js"),
    },
  },
});
