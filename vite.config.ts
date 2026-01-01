import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["logo.svg"],
      manifest: {
        name: "Bujit — Simple Expense Tracking",
        short_name: "Bujit",
        description: "Stupidly simple budgeting. Track expenses like taking notes.",
        theme_color: "#39C692",
        background_color: "#1a1a1a",
        display: "standalone",
        icons: [
          { src: "/logo.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "/logo.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
