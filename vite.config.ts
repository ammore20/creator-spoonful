import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// These run inside the service worker (functions are serialised into sw.js).
declare const self: { location: { origin: string } };
declare const caches: { match: (url: string, opts?: { ignoreSearch?: boolean }) => Promise<Response | undefined> };
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // Registration happens only in src/lib/pwa.ts (guarded: never in dev, preview or iframes).
      injectRegister: null,
      registerType: "prompt",
      devOptions: { enabled: false },
      filename: "sw.js",
      includeAssets: ["favicon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "RecipeMaker",
        short_name: "RecipeMaker",
        description: "Recipe books from food creators. Pay once, cook offline.",
        theme_color: "#f66c31",
        background_color: "#fcfaf8",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/library",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App shell only. No API, auth, payment or recipe responses are ever cached.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,ico}"],
        globIgnores: ["**/marketing-*", "**/Admin-*", "**/pwa-*"],
        cleanupOutdatedCaches: true,
        navigateFallback: null,
        runtimeCaching: [
          {
            // Page loads: always network; offline, serve the precached app shell.
            urlPattern: ({ request, url }) =>
              request.mode === "navigate" &&
              url.origin === self.location.origin &&
              !/^\/(~oauth|auth|admin)(\/|$)/.test(url.pathname),
            handler: "NetworkOnly",
            options: {
              plugins: [
                {
                  handlerDidError: async () =>
                    (await caches.match("/index.html", { ignoreSearch: true })) ?? Response.error(),
                },
              ],
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Book covers and recipe thumbnails (public images, size-limited).
            urlPattern: ({ request, url }) =>
              request.destination === "image" &&
              url.origin !== self.location.origin &&
              !url.pathname.includes("/auth/") &&
              !url.hostname.endsWith("supabase.co") || /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\//.test(url.href),
            handler: "CacheFirst",
            options: {
              cacheName: "book-images",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
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
