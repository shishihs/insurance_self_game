import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    // バンドル分析ツール（ビルド時のみ）
    process.env.ANALYZE && visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
    // Gzip圧縮
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // Brotli圧縮
    viteCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  base: '/insurance_self_game/',
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    chunkSizeWarningLimit: 500, // より厳しい制限
    // アセット最適化
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    // 圧縮設定（terserでより高度な圧縮）
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2,
        // 追加の最適化
        dead_code: true,
        collapse_vars: true,
        reduce_vars: true,
      },
      mangle: {
        safari10: true,
        // プロパティ名も短縮（注意深く使用）
        properties: {
          regex: /^_/,
        },
      },
      format: {
        comments: false,
        // よりコンパクトな出力
        ecma: 2015,
        compact: true,
      },
    },
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // npm パッケージをベンダーチャンクに分離
          if (id.includes('node_modules')) {
            // Vue エコシステム
            if (id.includes('vue') || id.includes('@vue')) {
              return 'vue-vendor'
            }
            // Phaser（大きいので別チャンク）
            if (id.includes('phaser')) {
              // Phaserの一部だけを使用している場合は、さらに細分化
              if (id.includes('phaser/src/gameobjects')) {
                return 'phaser-gameobjects'
              }
              if (id.includes('phaser/src/scene')) {
                return 'phaser-scenes'
              }
              return 'phaser-core'
            }
            // CSS関連
            if (id.includes('@unocss') || id.includes('unocss')) {
              return 'css-vendor'
            }
            // その他の小さいライブラリ
            return 'vendor'
          }
          
          // ゲーム関連のコードを詳細に分離
          if (id.includes('/src/game/')) {
            // シーンは遅延読み込み可能
            if (id.includes('/scenes/')) {
              // GameSceneは頻繁に使用されるので別チャンク
              if (id.includes('GameScene')) {
                return 'game-scene-main'
              }
              return 'game-scenes'
            }
            // システムも別チャンク
            if (id.includes('/systems/')) {
              return 'game-systems'
            }
            // UI関連
            if (id.includes('/ui/')) {
              return 'game-ui'
            }
            return 'game-engine'
          }
          
          // ドメインロジックを分離
          if (id.includes('/src/domain/')) {
            // エンティティ
            if (id.includes('/entities/')) {
              return 'domain-entities'
            }
            // サービス
            if (id.includes('/services/')) {
              return 'domain-services'
            }
            return 'game-logic'
          }
          
          // UIコンポーネント
          if (id.includes('/src/components/')) {
            // アクセシビリティコンポーネントは別チャンク
            if (id.includes('/accessibility/')) {
              return 'accessibility'
            }
            return 'ui-components'
          }
        },
        // 非同期チャンクの最適化
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop()
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `img/[name]-[hash:8].[ext]`
          }
          if (/woff2?|ttf|eot/i.test(ext || '')) {
            return `fonts/[name]-[hash:8].[ext]`
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash:8].[ext]`
          }
          return `assets/[name]-[hash:8].[ext]`
        },
        chunkFileNames: (chunkInfo) => {
          // チャンク名に基づいてディレクトリを分ける
          if (chunkInfo.name?.includes('vendor')) {
            return `js/vendor/[name]-[hash:8].js`
          }
          if (chunkInfo.name?.includes('game')) {
            return `js/game/[name]-[hash:8].js`
          }
          return `js/[name]-[hash:8].js`
        },
        entryFileNames: `js/[name]-[hash:8].js`,
      },
      // Tree-shaking最適化
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // CSS最適化
    cssMinify: true,
  },
  // 開発サーバーの最適化
  server: {
    warmup: {
      clientFiles: [
        './src/App.vue',
        './src/components/game/GameCanvas.vue',
        './src/game/GameManager.ts',
      ],
    },
  },
  // 最適化設定
  optimizeDeps: {
    include: ['vue', 'phaser'],
    exclude: [],
  },
})