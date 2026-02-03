import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Prevent core styles from being split into async chunks
        manualChunks: (id) => {
          // Keep core UI components together
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui') || id.includes('framer-motion')) {
              return 'vendor-ui';
            }
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
          }
          return undefined;
        },
      },
    },
  },
}));
