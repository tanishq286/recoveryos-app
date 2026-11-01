import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: "./",
    include: ["test/**/*.test.ts"],
    // One database, so test files run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    globalSetup: ["test/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54329/recoveryos_test",
      STORAGE_LOCAL_DIR: "../../.data/test-uploads",
    },
  },
  // SWC emits the decorator metadata Nest's dependency injection reads.
  plugins: [swc.vite({ module: { type: "es6" } })],
});
