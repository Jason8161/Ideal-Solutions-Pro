// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";

const SITE_ORIGIN = "https://www.idealsolutionspro.com";

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || SITE_ORIGIN,
  server: {
    port: 4321,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 4321,
    strictPort: true,
    host: true,
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [mdx()],
});
