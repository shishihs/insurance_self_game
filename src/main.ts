import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './style.css'
import './styles/design-system.css'
import './styles/micro-interactions.css'
import './styles/brand-elements.css'
import './styles/rtl-support.css'
import App from './App.vue'

// Vueアプリケーションを作成
const app = createApp(App)

// Piniaの初期化
import { createPinia } from 'pinia'
const pinia = createPinia()
app.use(pinia)

// アプリケーション初期化とマウント
async function initializeApp() {
  try {
    // Remove any cached Service Workers
    // Remove any cached Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      let unregistered = false;
      for (const registration of registrations) {
        await registration.unregister();
        console.log('🗑️ Service Worker unregistered');
        unregistered = true;
      }

      if (unregistered && !sessionStorage.getItem('sw_cleaned')) {
        console.log('🔄 Reloading to clear SW cache...');
        sessionStorage.setItem('sw_cleaned', 'true');
        window.location.reload();
        return;
      }
    }

    // アプリケーションをマウント
    app.mount('#app')
    console.log('🚀 アプリケーションが起動しました')
  } catch (error) {
    console.error('アプリケーション初期化に失敗しました:', error)
  }
}

// アプリケーション初期化を実行
initializeApp()