import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './style.css'
import App from './App.vue'

// セキュリティシステムの初期化
import { initializeSecurity } from '@/utils/security-extensions'

// セキュリティシステムを起動
try {
  initializeSecurity()
} catch (error) {
  console.error('セキュリティシステムの初期化に失敗しました:', error)
}

createApp(App).mount('#app')