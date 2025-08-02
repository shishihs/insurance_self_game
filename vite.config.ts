import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import UnoCSS from 'unocss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
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
  // 依存関係の最適化
  optimizeDeps: {
    include: [
      'phaser' // Phaserを事前に最適化
    ],
    exclude: [
      '@types/*', // 型定義ファイルを除外
      'vitest'    // テストライブラリを除外
    ]
  },
  base: '/insurance_self_game/', // GitHub Pages用のベースパス（正しい形式）
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 600, // Phaserチャンクを考慮して調整
    // アセット最適化
    assetsInlineLimit: 4096, // 最適なインライン制限
    cssCodeSplit: true,
    cssMinify: 'lightningcss', // 最新のCSS最適化
    // 圧縮設定（terserで最大限最適化）
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
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
      // 外部依存関係の最適化
      external: (id) => {
        // 開発時のみの依存関係を除外
        if (id.includes('@types/') || id.includes('vitest')) {
          return true
        }
        return false
      },
      output: {
        manualChunks: (id) => {
          // npm パッケージをベンダーチャンクに分離
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vue-vendor'
            }
            if (id.includes('phaser')) {
              // Phaserを複数のチャンクに分割
              if (id.includes('phaser/src/physics')) {
                return 'phaser-physics'
              }
              if (id.includes('phaser/src/sound')) {
                return 'phaser-sound'
              }
              if (id.includes('phaser/src/loader')) {
                return 'phaser-loader'
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
          
          // CUI/CLI系を除外（本番ビルドから完全除外）
          if (id.includes('/src/cui/') || 
              id.includes('/src/cli/') ||
              id.includes('/src/controllers/') ||
              id.includes('/src/benchmark/') ||
              id.includes('/__tests__/') ||
              id.includes('/test/')) {
            return 'dev-only' // 開発専用チャンク（実際にはビルドから除外）
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
        // 最適化されたファイル名戦略
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          // 重要なチャンクは短いハッシュで高速化
          if (name === 'vendor' || name === 'vue-vendor') {
            return `js/[name]-[hash:8].js`
          }
          return `js/[name]-[hash:12].js`
        },
        entryFileNames: `js/[name]-[hash:8].js`,
        assetFileNames: (assetInfo) => {
          const ext = assetInfo.name?.split('.').pop()
          // 画像ファイルの最適化
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext || '')) {
            return `img/[name]-[hash:8].[ext]`
          }
          // CSSファイルの最適化
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash:8].[ext]`
          }
          // フォントファイル
          if (/woff2?|ttf|eot/i.test(ext || '')) {
            return `fonts/[name]-[hash:8].[ext]`
          }
          return `assets/[name]-[hash:8].[ext]`
        },
        // ブラウザキャッシュ最適化
        generatedCode: {
          constBindings: true,
          arrowFunctions: true,
          objectShorthand: true
        }
      }
    }
  },
  // プロダクション専用設定
  define: {
    // プロダクションビルドでの不要なコードを除外
    __DEV_ONLY__: mode !== 'production',
    __BENCHMARK_ENABLED__: mode === 'development',
    __TEST_MODE__: command === 'serve' && mode === 'test',
    // パフォーマンス最適化用フラグ
    __PROD_OPTIMIZE__: mode === 'production',
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // バンドルサイズ最適化
    'process.env.NODE_ENV': JSON.stringify(mode),
    // Vue プロダクション最適化
    __VUE_OPTIONS_API__: JSON.stringify(true),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false)
  },
  
  // ESBuild最適化設定
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true
  },

  // パフォーマンス最適化設定
  performance: {
    maxEntrypointSize: 250000, // エントリーポイントサイズ制限
    maxAssetSize: 250000, // アセットサイズ制限
    hints: mode === 'production' ? 'warning' : false
  },

  // プレビュー最適化
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  }
}))