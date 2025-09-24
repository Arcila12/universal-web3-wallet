import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import webExtension, { readJsonFile } from "vite-plugin-web-extension";

function generateManifest() {
  const manifest = readJsonFile("src/manifest.json");
  const pkg = readJsonFile("package.json");
  return {
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    ...manifest,
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    webExtension({
      manifest: generateManifest,
      additionalInputs: ['src/content/inject.ts', 'src/confirm.html', 'src/unlock.html']
    }),
  ],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      assert: 'assert',
      http: 'stream-http',
      https: 'https-browserify',
      os: 'os-browserify',
      url: 'url',
      zlib: 'browserify-zlib',
      path: 'path-browserify',
      util: 'util',
      events: 'events',
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'crypto-browserify',
      'stream-browserify',
      'assert',
      'events',
      'util',
      'path-browserify',
      'os-browserify',
      'browserify-zlib',
      'stream-http',
      'https-browserify',
      'url'
    ],
  },
});
