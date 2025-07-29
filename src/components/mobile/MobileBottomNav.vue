<script setup lang="ts">
import { ref, computed } from 'vue'

interface NavItem {
  id: string
  label: string
  icon: string
  badge?: number
}

const props = defineProps<{
  items: NavItem[]
  activeId: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

// タッチフィードバック用
const touchingId = ref<string | null>(null)

const handleTouchStart = (id: string) => {
  touchingId.value = id
  // 触覚フィードバック（対応デバイスのみ）
  if ('vibrate' in navigator) {
    navigator.vibrate(10)
  }
}

const handleTouchEnd = () => {
  touchingId.value = null
}

const handleSelect = (id: string) => {
  emit('select', id)
  // より強い触覚フィードバック
  if ('vibrate' in navigator) {
    navigator.vibrate([20, 10, 20])
  }
}
</script>

<template>
  <nav class="mobile-bottom-nav safe-area-bottom">
    <div class="nav-container">
      <button
        v-for="item in items"
        :key="item.id"
        :class="[
          'nav-item',
          { 
            'active': activeId === item.id,
            'touching': touchingId === item.id
          }
        ]"
        @click="handleSelect(item.id)"
        @touchstart="handleTouchStart(item.id)"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchEnd"
        :aria-label="item.label"
        :aria-current="activeId === item.id ? 'page' : undefined"
      >
        <div class="nav-icon-wrapper">
          <span class="nav-icon" :aria-hidden="true">{{ item.icon }}</span>
          <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
        </div>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: var(--z-sticky);
  background: rgba(31, 41, 55, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  
  /* iOS セーフエリア対応 */
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 56px;
  padding: 0 var(--space-sm);
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  
  height: 100%;
  padding: var(--space-xs);
  
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  transition: all var(--transition-fast);
  position: relative;
}

.nav-item.active {
  color: var(--primary-light);
}

.nav-item.touching {
  transform: scale(0.95);
}

.nav-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 3px;
  background: var(--primary-gradient);
  border-radius: 0 0 3px 3px;
  transition: width var(--transition-normal);
}

.nav-item.active::before {
  width: 80%;
}

.nav-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
}

.nav-icon {
  font-size: 24px;
  line-height: 1;
  transition: transform var(--transition-fast);
}

.nav-item.active .nav-icon {
  transform: translateY(-2px);
}

.nav-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: var(--accent-gold);
  color: var(--primary-dark);
  border-radius: 9px;
  
  font-size: 10px;
  font-weight: bold;
  line-height: 1;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  transition: opacity var(--transition-fast);
}

.nav-item.active .nav-label {
  font-weight: 600;
}

/* タップ時のリップル効果 */
.nav-item::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  opacity: 0;
  pointer-events: none;
}

.nav-item.touching::after {
  animation: ripple 600ms ease-out;
}

@keyframes ripple {
  0% {
    width: 0;
    height: 0;
    opacity: 1;
  }
  100% {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

/* ランドスケープモード対応 */
@media (orientation: landscape) and (max-height: 600px) {
  .nav-container {
    height: 48px;
  }
  
  .nav-icon {
    font-size: 20px;
  }
  
  .nav-label {
    display: none;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: light) {
  .mobile-bottom-nav {
    background: rgba(255, 255, 255, 0.95);
    border-top-color: rgba(0, 0, 0, 0.1);
  }
  
  .nav-item {
    color: rgba(0, 0, 0, 0.6);
  }
  
  .nav-item.active {
    color: var(--primary-dark);
  }
}

/* アクセシビリティ: フォーカス表示 */
.nav-item:focus {
  outline: 2px solid var(--primary-light);
  outline-offset: -2px;
}

/* アクセシビリティ: モーション削減 */
@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-icon,
  .nav-item::before,
  .nav-item::after {
    transition: none !important;
    animation: none !important;
  }
}
</style>