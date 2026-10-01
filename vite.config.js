import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Corix Tally build config
// - manualChunks splits vendor libs (supabase, xlsx, papaparse, router) into
//   separate chunks so the first paint only loads what the login screen needs.
// - xlsx and papaparse are lazy-imported (see src/lib/excel.js, src/lib/csv.js)
//   so they don't load at all until the user actually imports/exports a file.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Corix Tally",
        short_name: "Corix Tally",
        description: "Practice ledger accounting, GST vouchers & reports — installable, works on mobile.",
        theme_color: "#1F2A24",
        background_color: "#EDE7D6",
        display: "standalone",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  build: {
    target: "es2018",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor_react: ["react", "react-dom", "react-router-dom"],
          vendor_supabase: ["@supabase/supabase-js"],
          vendor_sheets: ["xlsx", "papaparse"]
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
