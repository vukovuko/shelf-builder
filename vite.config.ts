import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const src = (path: string) =>
  fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  return {
    resolve: {
      alias: {
        // Not tsconfigPaths: tsconfig.json includes only the ported files, and
        // path mapping from it would skip everything else they import.
        "@": src("."),
        // Shared files still import these Next.js modules. Until `main` is
        // retired they resolve to small stand-ins, so the same component file
        // runs in both apps and `git merge main` stays clean.
        "next/link": src("compat/next/link.tsx"),
        "next/navigation": src("compat/next/navigation.ts"),
        "next/image": src("compat/next/image.tsx"),
        // Next's guard throws outside a React Server Components build.
        "server-only": src("server/server-only-shim.ts"),
      },
    },
    define: {
      // Browser code has no `process`. Next inlines NEXT_PUBLIC_* at build
      // time; these two are the ones client components read.
      // The public address of the site, for canonical links and structured
      // data. It is the same on every deployment, dev builds included.
      "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify(
        "https://ormanipomeri.com",
      ),
      "process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY": JSON.stringify(
        env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
      ),
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  };
});
