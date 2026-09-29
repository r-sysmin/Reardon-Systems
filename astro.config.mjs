import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwind from "@tailwindcss/vite";

// Static site by default; API + checkout set `prerender = false` for on-demand.
export default defineConfig({
  site: "https://reardonsystems.com",
  output: "static",
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwind()],
  },
});
