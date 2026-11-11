import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      // Not tsconfigPaths: tsconfig.json includes only the ported files, and
      // path mapping from it would skip everything else they import.
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Shared files still carry Next's `import "server-only"` guard, which
      // throws outside a React Server Components build. Until every file is
      // ported, it resolves to an empty module here.
      "server-only": fileURLToPath(
        new URL("./src/server/server-only-shim.ts", import.meta.url),
      ),
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
