import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    // Testing Library registers its between-test cleanup on the global
    // `afterEach`; without globals it never runs and renders pile up in one
    // document. Assertions are still imported explicitly.
    globals: true,
  },
});
