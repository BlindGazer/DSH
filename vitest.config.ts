import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { transform } from "esbuild";
import { getInternalSourceAliases } from "./configs/source-aliases.ts";

export default defineConfig({
  plugins: [{
    name: "test-standard-decorators",
    enforce: "pre",
    transform(code, id) {
      if (!id.replaceAll("\\", "/").endsWith("/src/host/remote-service.ts")) return;
      return transform(code, {
        sourcefile: id,
        sourcemap: "external",
        loader: "ts",
        target: "es2022",
        tsconfigRaw: { compilerOptions: { experimentalDecorators: false } },
      });
    },
  }],
  test: {
    environment: "node",
    globals: true,
    isolate: false,
    include: [
      "packages/**/{test,tests}/**/*.{test,spec}.{ts,tsx}",
      "scripts/**/*.{test,spec}.{ts,tsx}",
    ],
  },
  resolve: {
    alias: getInternalSourceAliases(resolve(import.meta.dirname)),
  },
});
