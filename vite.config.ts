import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/insurance_self_game/', // GitHub Pages用のベースパス（正しい形式）
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    // アセット最適化
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    // 圧縮設定（esbuildベース）
    minify: 'esbuild',
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // npm パッケージをベンダーチャンクに分離
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vue-vendor'
            }
            if (id.includes('phaser')) {
              return 'phaser-vendor'
            }
            if (id.includes('@unocss') || id.includes('unocss')) {
              return 'css-vendor'
            }
            return 'vendor'
          }
          
          // ゲーム関連のコードを分離
          if (id.includes('/src/game/')) {
            return 'game-engine'
          }
          
          // ドメインロジックを分離
          if (id.includes('/src/domain/')) {
            return 'game-logic'
          }
        },
        // ファイル名の最適化
        chunkFileNames: (_chunkInfo) => {
          return `js/[name]-[hash].js`
        },
        entryFileNames: `js/[name]-[hash].js`,
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop()
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `img/[name]-[hash].[ext]`
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash].[ext]`
          }
          return `assets/[name]-[hash].[ext]`
        }
      }
    }
  }
})