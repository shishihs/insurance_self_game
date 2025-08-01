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
  server: {
    // 開発サーバーでCSPを無効化
    headers: {
      'Content-Security-Policy': undefined
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/insurance_self_game/', // GitHub Pages用のベースパス（正しい形式）
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 500, // より厳しくして警告を早期発見
    // アセット最適化
    assetsInlineLimit: 2048, // 小さなファイルのインライン制限を下げる
    cssCodeSplit: true,
    // 圧縮設定（esbuildベース）
    minify: 'esbuild',
    target: 'es2020', // より新しいターゲットで最適化
    // 追加最適化設定
    reportCompressedSize: true,
    emptyOutDir: true,
    rollupOptions: {
      // Tree-shaking最適化
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      },
      output: {
        manualChunks: (id) => {
          // npm パッケージをベンダーチャンクに分離
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vue-vendor'
            }
            if (id.includes('phaser')) {
              // Phaserを最適化してcore機能のみ
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
          
          // CUI/CLI系を除外（開発時のみ）
          if (id.includes('/src/cui/') || 
              id.includes('/src/cli/') ||
              id.includes('/src/controllers/')) {
            return undefined // 本番ビルドから除外
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