import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png", "chito/*.webp"],
      manifest: {
        name: "마이치 - 수험생 심리 코칭",
        short_name: "마이치",
        description:
          "수험생들의 불안을 걷어내고 스스로를 돕는 방법을 주는 AI 기반 수험생 전문 멘탈코칭",
        lang: "ko",
        start_url: "/",
        display: "standalone",
        background_color: "#F8F9FA",
        theme_color: "#6466F1",
        orientation: "portrait",
        categories: ["health", "education", "lifestyle"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // SPA 라우팅 + 정적 자산 캐시. API(supabase)는 캐시하지 않음.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/payment\//],
        globPatterns: ["**/*.{js,css,html,png,webp,svg,ico}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
