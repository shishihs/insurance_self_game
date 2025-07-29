import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'

// HTTPSの証明書を生成または読み込み
function getHttpsConfig() {
  const keyPath = path.resolve(__dirname, 'localhost-key.pem')
  const certPath = path.resolve(__dirname, 'localhost.pem')
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    }
  }
  
  console.warn('HTTPS証明書が見つかりません。mkcertを使用して生成してください:')
  console.warn('  npm install -g mkcert')
  console.warn('  mkcert -install')
  console.warn('  mkcert localhost')
  
  return false
}

// モバイル開発用の設定
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // ネットワーク経由でアクセス可能にする
    host: '0.0.0.0',
    port: 5173,
    
    // HTTPS設定（PWAテスト用）
    https: getHttpsConfig(),
    
    // CORS設定
    cors: true,
    
    // HMR設定（モバイルでの高速リロード）
    hmr: {
      host: 'localhost',
      protocol: 'wss'
    },
    
    // ファイル監視設定
    watch: {
      // ポーリングを使用（ネットワークドライブやDocker環境対応）
      usePolling: true,
      interval: 100
    }
  },
  
  // ビルド設定
  build: {
    // モバイル向けの最適化
    target: 'es2015',
    
    // チャンクサイズの制限（モバイル回線を考慮）
    chunkSizeWarningLimit: 500,
    
    // アセット最適化
    assetsInlineLimit: 4096,
    
    // CSS最適化
    cssCodeSplit: true,
    
    // 圧縮設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // 開発中はコンソールログを残す
        drop_debugger: true
      }
    },
    
    // ソースマップ（デバッグ用）
    sourcemap: true,
    
    // Rollupオプション
    rollupOptions: {
      output: {
        // チャンク分割戦略
        manualChunks: {
          'vue-vendor': ['vue'],
          'phaser-vendor': ['phaser'],
          'ui-components': [
            './src/components/mobile/MobileBottomNav.vue',
            './src/components/mobile/SwipeableCardStack.vue',
            './src/components/mobile/MobileFAB.vue',
            './src/components/mobile/PullToRefresh.vue'
          ]
        }
      }
    }
  },
  
  // プレビューサーバー設定（ビルド後のテスト用）
  preview: {
    host: '0.0.0.0',
    port: 4173,
    https: getHttpsConfig(),
    cors: true
  },
  
  // 最適化設定
  optimizeDeps: {
    include: ['vue', 'phaser'],
    exclude: ['@vue/repl']
  },
  
  // PWA開発用の設定
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__VUE_PROD_DEVTOOLS__': true // 本番環境でもVue DevToolsを有効化
  }
})