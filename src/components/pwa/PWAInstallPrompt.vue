<template>
  <Teleport to="body">
    <Transition
      name="install-prompt"
      enter-active-class="duration-300 ease-out"
      enter-from-class="transform scale-95 opacity-0"
      enter-to-class="transform scale-100 opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="transform scale-100 opacity-100"
      leave-to-class="transform scale-95 opacity-0"
    >
      <div
        v-if="showPrompt"
        class="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
        role="dialog"
        aria-labelledby="install-prompt-title"
        aria-describedby="install-prompt-description"
      >
        <div class="mx-auto max-w-md">
          <div class="flex items-center justify-between rounded-lg bg-white p-4 shadow-lg ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                  <svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
              </div>
              <div class="min-w-0 flex-1">
                <h3 id="install-prompt-title" class="text-sm font-medium text-gray-900 dark:text-white">
                  アプリをインストール
                </h3>
                <p id="install-prompt-description" class="text-sm text-gray-500 dark:text-gray-400">
                  ホーム画面に追加してオフラインでもプレイ
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isInstalling"
                @click="handleInstall"
              >
                <span v-if="!isInstalling">インストール</span>
                <span v-else class="flex items-center">
                  <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  インストール中...
                </span>
              </button>
              <button
                type="button"
                class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                @click="handleDismiss"
              >
                後で
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { pwaManager } from '@/utils/pwa-manager'

// リアクティブな状態
const showPrompt = ref(false)
const isInstalling = ref(false)

// イベントハンドラー
const handleInstallAvailable = () => {
  showPrompt.value = true
}

const handleInstalled = () => {
  showPrompt.value = false
  isInstalling.value = false
  
  // インストール成功通知
  const event = new CustomEvent('pwa-install-success')
  window.dispatchEvent(event)
}

const handleInstall = async () => {
  isInstalling.value = true
  
  try {
    const success = await pwaManager.promptInstall()
    
    if (success) {
      showPrompt.value = false
      
      // 成功メッセージを表示
      setTimeout(() => {
        const event = new CustomEvent('show-toast', {
          detail: {
            title: 'インストール完了',
            message: 'アプリがホーム画面に追加されました！',
            type: 'success'
          }
        })
        window.dispatchEvent(event)
      }, 500)
    }
  } catch (error) {
    console.error('Install failed:', error)
    
    // エラーメッセージを表示
    const event = new CustomEvent('show-toast', {
      detail: {
        title: 'インストール失敗',
        message: 'アプリのインストールに失敗しました',
        type: 'error'
      }
    })
    window.dispatchEvent(event)
  } finally {
    isInstalling.value = false
  }
}

const handleDismiss = () => {
  showPrompt.value = false
  
  // 後で再度表示するため、24時間後に再表示する設定
  localStorage.setItem('pwa-install-dismissed', Date.now().toString())
  
  // 分析用イベント
  const event = new CustomEvent('pwa-install-dismissed')
  window.dispatchEvent(event)
}

// コンポーネントのライフサイクル
onMounted(() => {
  // 過去に非表示にした場合の確認
  const dismissed = localStorage.getItem('pwa-install-dismissed')
  const dayInMs = 24 * 60 * 60 * 1000
  
  if (dismissed && Date.now() - parseInt(dismissed) < dayInMs) {
    return // 24時間以内に非表示にした場合は表示しない
  }
  
  // PWAイベントリスナーの登録
  window.addEventListener('pwa-install-available', handleInstallAvailable)
  window.addEventListener('pwa-installed', handleInstalled)
  
  // 既にインストール可能な状態かチェック
  const pwaStatus = pwaManager.getStatus()
  if (pwaStatus.canInstall) {
    // 少し遅らせて表示（ユーザー体験を向上）
    setTimeout(() => {
      showPrompt.value = true
    }, 3000)
  }
})

onUnmounted(() => {
  window.removeEventListener('pwa-install-available', handleInstallAvailable)
  window.removeEventListener('pwa-installed', handleInstalled)
})
</script>

<style scoped>
/* カスタムアニメーション */
.install-prompt-enter-active,
.install-prompt-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.install-prompt-enter-from {
  opacity: 0;
  transform: translateY(100%) scale(0.95);
}

.install-prompt-leave-to {
  opacity: 0;
  transform: translateY(100%) scale(0.95);
}

/* ダークモードでの境界線 */
@media (prefers-color-scheme: dark) {
  .ring-black\/5 {
    --tw-ring-color: rgb(255 255 255 / 0.1);
  }
}
</style>