import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'

const currentVersion = Date.now().toString()

const versionPlugin = () => {
  return {
    name: 'version-plugin',
    buildStart() {
      fs.writeFileSync('public/version.json', JSON.stringify({ version: currentVersion }))
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    versionPlugin()
  ],
  define: {
    __APP_VERSION__: JSON.stringify(currentVersion)
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5200',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // Reduce memory usage during production build
  build: {
    minify: false, // disable terser/esbuild minification which can cause SIGSEGV
    sourcemap: false,
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    // increase memory limit for Node (optional, can be set via env var)
    // rollupOptions: { ... }
  }
})
