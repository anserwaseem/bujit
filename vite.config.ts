import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
  },
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: getChunkName,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["logo.svg", "icon-192x192.png", "icon-512x512.png"],
      manifest: getPwaManifest(),
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

// chunking configuration
const REACT_PACKAGES = ["react", "react-dom", "react-router-dom", "scheduler"];
const REACT_SHARED_DEPS = [
  "history",
  "react-router",
  "@remix-run/router",
  "hoist-non-react-statics",
];

/**
 * extracts package name from module id
 */
function extractPackageName(id: string): string | null {
  const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
  return match ? match[1] : null;
}

/**
 * checks if package is a react core package
 */
function isReactPackage(packageName: string): boolean {
  return (
    REACT_PACKAGES.includes(packageName) ||
    REACT_PACKAGES.some((pkg) => packageName.startsWith(`${pkg}/`))
  );
}

/**
 * checks if package is a shared dependency of react packages
 */
function isReactSharedDep(packageName: string): boolean {
  return REACT_SHARED_DEPS.some(
    (dep) => packageName === dep || packageName.startsWith(`${dep}/`)
  );
}

/**
 * checks if module is nested within react-router-dom's dependencies
 */
function isNestedInReactRouter(id: string, packageName: string): boolean {
  const packageIndex = id.indexOf(`node_modules/${packageName}`);
  if (packageIndex === -1) return false;
  const pathBeforePackage = id.substring(0, packageIndex);
  return pathBeforePackage.includes("react-router-dom");
}

/**
 * determines which chunk a module should belong to
 * optimizes for browser concurrency limits (~4-6 concurrent requests per domain)
 */
function getChunkName(id: string): string | undefined {
  // only process node_modules
  if (!id.includes("node_modules/")) {
    return;
  }

  const packageName = extractPackageName(id);
  if (!packageName) {
    return "vendor";
  }

  // react core libraries - check first to avoid circular deps
  if (isReactPackage(packageName)) {
    return "react-vendor";
  }

  // chart library - keep separate for code-splitting (can be lazy-loaded)
  if (packageName === "recharts" || packageName.startsWith("recharts/")) {
    return "chart-vendor";
  }

  // shared dependencies that might cause circular deps with react
  if (isReactSharedDep(packageName)) {
    return "react-vendor";
  }

  // check if nested in react-router-dom dependencies
  if (isNestedInReactRouter(id, packageName)) {
    return "react-vendor";
  }

  // consolidate all other dependencies into a single vendor chunk
  // includes: radix-ui, date-fns, lucide-react, react-query, utils, pwa, etc.
  return "vendor";
}

// pwa manifest configuration
function getPwaManifest() {
  return {
    name: "Bujit — Simple Expense Tracking",
    short_name: "Bujit",
    description: "Stupidly simple budgeting. Track expenses like taking notes.",
    theme_color: "#39C692",
    background_color: "#1a1a1a",
    display: "standalone" as const,
    orientation: "portrait" as const,
    categories: ["finance", "productivity"],
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop-home.png",
        sizes: "2560x1440",
        type: "image/png",
        form_factor: "wide" as const,
        label: "Bujit desktop home screen",
      },
      {
        src: "/screenshots/mobile-home.png",
        sizes: "1170x2532",
        type: "image/png",
        form_factor: "narrow" as const,
        label: "Bujit mobile home screen",
      },
    ],
    shortcuts: [
      {
        name: "Quick Add Expense",
        short_name: "Add Expense",
        description: "Quickly add an expense transaction",
        url: "/?action=add-expense",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "View Dashboard",
        short_name: "Dashboard",
        description: "View spending dashboard and analytics",
        url: "/?action=dashboard",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
    share_target: {
      action: "/",
      method: "GET" as const,
      params: {
        title: "text",
        text: "text",
      },
    },
  };
}
