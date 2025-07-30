import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      // Vue最適化オプション
      template: {
        compilerOptions: {
          // カスタム要素を無視（Phaserコンポーネント用） 
          isCustomElement: (tag) => tag.startsWith('phaser-')
        }
      }
    }),
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
              // Phaserをさらに細かく分割
              if (id.includes('phaser/src/scene')) {
                return 'phaser-scene'
              }
              if (id.includes('phaser/src/gameobjects')) {
                return 'phaser-gameobjects'
              }
              return 'phaser-core'
            }
            if (id.includes('@unocss') || id.includes('unocss')) {
              return 'css-vendor'
            }
            if (id.includes('chart.js')) {
              return 'chart-vendor'
            }
            return 'vendor'
          }
          
          // 統計・分析系コンポーネントを分離（遅延読み込み）
          if (id.includes('/src/components/statistics/') || 
              id.includes('/src/analytics/') ||
              id.includes('/src/benchmark/')) {
            return 'analytics'
          }
          
          // フィードバック系コンポーネントを分離
          if (id.includes('/src/components/feedback/')) {
            return 'feedback'
          }
          
          // CUI/CLI系を分離
          if (id.includes('/src/cui/') || 
              id.includes('/src/cli/') ||
              id.includes('/src/controllers/')) {
            return 'cli-tools'
          }
          
          // テスト関連を分離
          if (id.includes('/__tests__/') || 
              id.includes('/test/')) {
            return 'tests'
          }
          
          // ゲーム関連のコードを分離
          if (id.includes('/src/game/scenes/')) {
            return 'game-scenes'
          }
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