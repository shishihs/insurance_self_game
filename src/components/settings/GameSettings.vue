<template>
  <div class="game-settings">
    <div class="settings-header">
      <h2 class="settings-title">ゲーム設定</h2>
      <button class="close-button" aria-label="設定を閉じる" @click="$emit('close')">
        ×
      </button>
    </div>

    <div class="settings-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'tab-button',
          { 'active': activeTab === tab.id }
        ]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </div>

    <div class="settings-content">
      <!-- AI戦略設定 -->
      <div v-if="activeTab === 'ai'" class="tab-content">
        <AIStrategySettings />
      </div>

      <!-- アクセシビリティ設定 -->
      <div v-else-if="activeTab === 'accessibility'" class="tab-content">
        <AccessibilitySettings />
      </div>

      <!-- ゲーム設定 -->
      <div v-else-if="activeTab === 'game'" class="tab-content">
        <GameGeneralSettings />
      </div>

      <!-- サウンド設定 -->
      <div v-else-if="activeTab === 'sound'" class="tab-content">
        <SoundSettings />
      </div>

      <!-- 統計情報 -->
      <div v-else-if="activeTab === 'stats'" class="tab-content">
        <GameStatistics />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AIStrategySettings from './AIStrategySettings.vue'
import AccessibilitySettings from '../accessibility/AccessibilitySettings.vue'
import GameGeneralSettings from './GameGeneralSettings.vue'
import SoundSettings from './SoundSettings.vue'
import GameStatistics from './GameStatistics.vue'

// エミット
defineEmits<{
  close: []
}>()

// アクティブタブ
const activeTab = ref('ai')

// タブ設定
const tabs = [
  {
    id: 'ai',
    label: 'AI戦略',
    icon: '🤖'
  },
  {
    id: 'game',
    label: 'ゲーム',
    icon: '🎮'
  },
  {
    id: 'sound',
    label: 'サウンド',
    icon: '🔊'
  },
  {
    id: 'accessibility',
    label: 'アクセシビリティ',
    icon: '♿'
  },
  {
    id: 'stats',
    label: '統計',
    icon: '📊'
  }
]
</script>

<style scoped>
.game-settings {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  color: #ffffff;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);
}

.settings-title {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0;
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-button {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.settings-tabs {
  display: flex;
  padding: 0 2rem;
  background: rgba(0, 0, 0, 0.2);
  overflow-x: auto;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 500;
}

.tab-button:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.05);
}

.tab-button.active {
  color: #4C6EF5;
  border-bottom-color: #4C6EF5;
  background: rgba(76, 110, 245, 0.1);
}

.tab-icon {
  font-size: 1.2rem;
}

.tab-label {
  font-weight: 600;
}

.settings-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
}

.tab-content {
  max-width: 1200px;
  margin: 0 auto;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .settings-header {
    padding: 1rem;
  }
  
  .settings-title {
    font-size: 1.5rem;
  }
  
  .settings-tabs {
    padding: 0 1rem;
  }
  
  .tab-button {
    padding: 0.8rem 1rem;
    font-size: 0.8rem;
  }
  
  .tab-icon {
    font-size: 1rem;
  }
  
  .settings-content {
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .tab-button .tab-label {
    display: none;
  }
  
  .tab-button {
    padding: 0.8rem;
  }
}

/* スクロールバーのスタイリング */
.settings-tabs::-webkit-scrollbar {
  height: 4px;
}

.settings-tabs::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.settings-tabs::-webkit-scrollbar-thumb {
  background: rgba(76, 110, 245, 0.5);
  border-radius: 2px;
}

.settings-content::-webkit-scrollbar {
  width: 8px;
}

.settings-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
}

.settings-content::-webkit-scrollbar-thumb {
  background: rgba(76, 110, 245, 0.5);
  border-radius: 4px;
}
</style>