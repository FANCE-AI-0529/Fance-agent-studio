import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// NUCLEAR FIX: Build de-optimization for production UI consistency
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // NUCLEAR: Disable CSS code splitting - force single CSS file for correct loading order
    cssCodeSplit: false,
    // NUCLEAR: Disable CSS minification to prevent calc/grid syntax corruption
    cssMinify: false,
    // Enable sourcemap for debugging production issues
    sourcemap: mode === "development",
    // NUCLEAR: Disable chunk splitting to prevent style-component separation
    rollupOptions: {
      output: {
        // Disable manual chunks - keep everything together
        manualChunks: undefined,
        // Ensure consistent asset naming
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  css: {
    // Prevent CSS module issues
    modules: {
      localsConvention: 'camelCaseOnly',
    },
    // Ensure postcss processes correctly
    postcss: './postcss.config.js',
  },
}));
