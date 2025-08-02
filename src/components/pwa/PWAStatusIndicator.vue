<template>
  <div class="fixed top-4 right-4 z-40">
    <!-- オフライン状態インジケーター -->
    <Transition
      name="status-indicator"
      enter-active-class="duration-300 ease-out"
      enter-from-class="transform translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-2 opacity-0"
    >
      <div
        v-if="showOfflineIndicator"
        class="mb-2 flex items-center rounded-lg bg-amber-50 px-3 py-2 shadow-lg ring-1 ring-amber-200 dark:bg-amber-900/20 dark:ring-amber-800"
        role="alert"
        aria-live="polite"
      >
        <svg class="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span class="ml-2 text-sm font-medium text-amber-700 dark:text-amber-300">
          オフラインモード
        </span>
      </div>
    </Transition>

    <!-- 更新利用可能インジケーター -->
    <Transition
      name="status-indicator"
      enter-active-class="duration-300 ease-out"
      enter-from-class="transform translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-2 opacity-0"
    >
      <div
        v-if="showUpdateIndicator"
        class="mb-2 flex items-center rounded-lg bg-blue-50 px-3 py-2 shadow-lg ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800"
        role="alert"
        aria-live="polite"
      >
        <div class="flex items-center">
          <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span class="ml-2 text-sm font-medium text-blue-700 dark:text-blue-300">
            更新利用可能
          </span>
        </div>
        <button
          type="button"
          class="ml-3 inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          @click="handleUpdate"
        >
          更新
        </button>
        <button
          type="button"
          class="ml-1 flex-shrink-0 rounded-md p-1 text-blue-400 hover:bg-blue-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-blue-50 dark:hover:bg-blue-800 dark:focus:ring-offset-blue-900"
          @click="dismissUpdate"
        >
          <span class="sr-only">閉じる</span>
          <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- PWA状態ドット -->
    <div
      v-if="showPWAStatus"
      class="flex items-center space-x-2 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      :title="pwaStatusTitle"
    >
      <!-- Service Worker状態 -->
      <div class="flex items-center space-x-1">
        <div
          class="h-2 w-2 rounded-full"
          :class="{
            'bg-green-500': pwaStatus.hasServiceWorker,
            'bg-gray-300': !pwaStatus.hasServiceWorker
          }"
        />
        <span class="text-xs text-gray-500 dark:text-gray-400">SW</span>
      </div>

      <!-- オンライン状態 -->
      <div class="flex items-center space-x-1">
        <div
          class="h-2 w-2 rounded-full"
          :class="{
            'bg-green-500': pwaStatus.isOnline,
            'bg-red-500': !pwaStatus.isOnline
          }"
        />
        <span class="text-xs text-gray-500 dark:text-gray-400">NET</span>
      </div>

      <!-- Push通知状態 -->
      <div class="flex items-center space-x-1">
        <div
          class="h-2 w-2 rounded-full"
          :class="{
            'bg-green-500': pwaStatus.hasPushSubscription,
            'bg-yellow-500': pwaStatus.notificationPermission === 'default',
            'bg-red-500': pwaStatus.notificationPermission === 'denied',
            'bg-gray-300': pwaStatus.notificationPermission === 'denied'
          }"
        />
        <span class="text-xs text-gray-500 dark:text-gray-400">PUSH</span>
      </div>

      <!-- インストール可能状態 -->
      <div 
        v-if="pwaStatus.canInstall" 
        class="flex items-center space-x-1"
      >
        <div class="h-2 w-2 rounded-full bg-blue-500" />
        <span class="text-xs text-gray-500 dark:text-gray-400">INSTALL</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { pwaManager } from '@/utils/pwa-manager'

// リアクティブな状態
const showOfflineIndicator = ref(false)
const showUpdateIndicator = ref(false)
const showPWAStatus = ref(false)
const pwaStatus = ref(pwaManager.getStatus())

// 計算されたプロパティ
const pwaStatusTitle = computed(() => {
  const statuses = []
  
  if (pwaStatus.value.hasServiceWorker) {
    statuses.push('Service Worker: 有効')
  } else {
    statuses.push('Service Worker: 無効')
  }
  
  if (pwaStatus.value.isOnline) {
    statuses.push('ネットワーク: オンライン')
  } else {
    statuses.push('ネットワーク: オフライン')
  }
  
  switch (pwaStatus.value.notificationPermission) {
    case 'granted':
      statuses.push('通知: 許可済み')
      break
    case 'denied':
      statuses.push('通知: 拒否済み')
      break
    case 'default':
      statuses.push('通知: 未設定')
      break
  }
  
  if (pwaStatus.value.canInstall) {
    statuses.push('インストール: 利用可能')
  }
  
  return statuses.join('\n')
})

// イベントハンドラー
const handleNetworkStatus = (event: CustomEvent) => {
  const { isOnline } = event.detail
  showOfflineIndicator.value = !isOnline
  pwaStatus.value = pwaManager.getStatus()
}

const handleOfflineMode = () => {
  showOfflineIndicator.value = true
  pwaStatus.value = pwaManager.getStatus()
}

const handleUpdateAvailable = () => {
  showUpdateIndicator.value = true
}

const handleUpdate = async () => {
  try {
    // Service Workerの更新を適用
    const registration = await navigator.serviceWorker.ready
    
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  } catch (error) {
    console.error('Update failed:', error)
    
    // エラーメッセージを表示
    const event = new CustomEvent('show-toast', {
      detail: {
        title: '更新失敗',
        message: 'アプリの更新に失敗しました',
        type: 'error'
      }
    })
    window.dispatchEvent(event)
  }
}

const dismissUpdate = () => {
  showUpdateIndicator.value = false
}

const togglePWAStatus = () => {
  showPWAStatus.value = !showPWAStatus.value
}

// PWA状態の更新
const updatePWAStatus = () => {
  pwaStatus.value = pwaManager.getStatus()
}

// キーボードショートカット
const handleKeydown = (event: KeyboardEvent) => {
  // Alt + P で PWA状態を表示/非表示
  if (event.altKey && event.key === 'p') {
    event.preventDefault()
    togglePWAStatus()
  }
}

// コンポーネントのライフサイクル
onMounted(() => {
  // イベントリスナーの登録
  window.addEventListener('pwa-network-status', handleNetworkStatus as EventListener)
  window.addEventListener('pwa-offline-mode', handleOfflineMode)
  window.addEventListener('pwa-update-available', handleUpdateAvailable)
  window.addEventListener('keydown', handleKeydown)
  
  // 初期PWA状態の更新
  updatePWAStatus()
  
  // 定期的な状態更新
  const statusUpdateInterval = setInterval(updatePWAStatus, 5000)
  
  // デバッグモード時は PWA状態を表示
  if (import.meta.env.DEV) {
    showPWAStatus.value = true
  }
  
  // クリーンアップ関数を設定
  onUnmounted(() => {
    clearInterval(statusUpdateInterval)
  })
})

onUnmounted(() => {
  window.removeEventListener('pwa-network-status', handleNetworkStatus as EventListener)
  window.removeEventListener('pwa-offline-mode', handleOfflineMode)
  window.removeEventListener('pwa-update-available', handleUpdateAvailable)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* アニメーション定義 */
.status-indicator-enter-active,
.status-indicator-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-indicator-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.status-indicator-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ホバーエフェクト */
.rounded-lg:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* ダークモードでの境界線調整 */
@media (prefers-color-scheme: dark) {
  .ring-gray-200 {
    --tw-ring-color: rgb(75 85 99);
  }
  
  .ring-amber-200 {
    --tw-ring-color: rgb(217 119 6);
  }
  
  .ring-blue-200 {
    --tw-ring-color: rgb(59 130 246);
  }
}
</style>