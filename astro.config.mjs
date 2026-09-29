import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwind from "@tailwindcss/vite";

// Static site; API + checkout set `prerender = false` for on-demand routes,
// served by the Node adapter behind the edge nginx proxy.
export default defineConfig({
  site: "https://reardonsystems.com",
  output: "static",
  adapter: node({ mode: "standalone" }),
  // Trust the edge proxy's X-Forwarded-* so request URLs (and the CSRF origin
  // check) use the real public host instead of the loopback upstream host.
  security: {
    allowedDomains: [
      { hostname: "reardonsystems.com", protocol: "https" },
      { hostname: "www.reardonsystems.com", protocol: "https" },
      { hostname: "api.reardonsystems.com", protocol: "https" },
    ],
  },
  vite: {
    plugins: [tailwind()],
  },
});
