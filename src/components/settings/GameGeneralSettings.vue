<template>
  <div class="game-general-settings">
    <div class="settings-header">
      <h3 class="settings-title">一般設定</h3>
      <p class="settings-description">
        ゲームの基本的な設定を変更できます
      </p>
    </div>

    <div class="settings-section">
      <h4 class="section-title">ゲーム難易度</h4>
      
      <div class="difficulty-grid">
        <div
          v-for="difficulty in difficulties"
          :key="difficulty.id"
          :class="[
            'difficulty-card',
            { 'selected': currentDifficulty === difficulty.id }
          ]"
          @click="selectDifficulty(difficulty.id)"
        >
          <div class="difficulty-header">
            <span class="difficulty-icon">{{ difficulty.icon }}</span>
            <h5 class="difficulty-name">{{ difficulty.name }}</h5>
          </div>
          <p class="difficulty-description">{{ difficulty.description }}</p>
          <div class="difficulty-features">
            <span
              v-for="feature in difficulty.features"
              :key="feature"
              class="feature-tag"
            >
              {{ feature }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4 class="section-title">表示設定</h4>
      
      <div class="setting-items">
        <div class="setting-item">
          <label class="setting-label">
            <input
              v-model="showHints"
              type="checkbox"
              class="setting-checkbox"
              @change="updateShowHints"
            />
            <span class="checkbox-custom"></span>
            <span class="setting-text">チュートリアルヒントを表示</span>
          </label>
          <p class="setting-help">初心者向けのヒントやアドバイスを表示します</p>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input
              v-model="showAnimations"
              type="checkbox"
              class="setting-checkbox"
              @change="updateShowAnimations"
            />
            <span class="checkbox-custom"></span>
            <span class="setting-text">アニメーションを有効化</span>
          </label>
          <p class="setting-help">カードやUIのアニメーション効果を表示します</p>
        </div>

        <div class="setting-item">
          <label class="setting-label">
            <input
              v-model="showStatistics"
              type="checkbox"
              class="setting-checkbox"
              @change="updateShowStatistics"
            />
            <span class="checkbox-custom"></span>
            <span class="setting-text">統計情報を表示</span>
          </label>
          <p class="setting-help">プレイ中に詳細な統計情報を表示します</p>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4 class="section-title">自動保存</h4>
      
      <div class="setting-items">
        <div class="setting-item">
          <label class="setting-label">
            <input
              v-model="autoSave"
              type="checkbox"
              class="setting-checkbox"
              @change="updateAutoSave"
            />
            <span class="checkbox-custom"></span>
            <span class="setting-text">自動保存を有効化</span>
          </label>
          <p class="setting-help">ゲーム進行を自動的に保存します</p>
        </div>

        <div v-if="autoSave" class="setting-item">
          <label class="setting-label-inline">
            <span class="setting-text">保存間隔</span>
            <select v-model="autoSaveInterval" class="setting-select" @change="updateAutoSaveInterval">
              <option value="30">30秒</option>
              <option value="60">1分</option>
              <option value="120">2分</option>
              <option value="300">5分</option>
            </select>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4 class="section-title">ゲームリセット</h4>
      
      <div class="reset-actions">
        <button
          class="btn btn-warning"
          :disabled="!gameStore.game"
          @click="confirmReset = true"
        >
          ゲームをリセット
        </button>
        
        <p class="reset-warning">
          ⚠️ この操作は元に戻せません。すべての進行状況が失われます。
        </p>
      </div>
    </div>

    <!-- リセット確認モーダル -->
    <div v-if="confirmReset" class="modal-overlay" @click="confirmReset = false">
      <div class="modal-content" @click.stop>
        <h4 class="modal-title">ゲームリセットの確認</h4>
        <p class="modal-message">
          本当にゲームをリセットしますか？<br>
          すべての進行状況、統計情報、保存データが失われます。
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="confirmReset = false">
            キャンセル
          </button>
          <button class="btn btn-danger" @click="resetGame">
            リセット実行
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'

const gameStore = useGameStore()

// 設定状態
const currentDifficulty = ref('normal')
const showHints = ref(true)
const showAnimations = ref(true)
const showStatistics = ref(false)
const autoSave = ref(true)
const autoSaveInterval = ref(60)
const confirmReset = ref(false)

// 難易度設定
const difficulties = [
  {
    id: 'easy',
    name: '簡単',
    icon: '🟢',
    description: '初心者にやさしい設定。チャレンジが易しく、ヒントが多く表示されます。',
    features: ['低難易度', '多めのヒント', '長めの制限時間']
  },
  {
    id: 'normal',
    name: '普通',
    icon: '🟡',
    description: 'バランスの取れた標準的な設定。ほとんどのプレイヤーに適しています。',
    features: ['標準難易度', '適度なヒント', '標準制限時間']
  },
  {
    id: 'hard',
    name: '難しい',
    icon: '🔴',
    description: '上級者向けの挑戦的な設定。戦略的思考が要求されます。',
    features: ['高難易度', '最小限のヒント', '短い制限時間']
  }
]

// 難易度選択
function selectDifficulty(difficultyId: string): void {
  currentDifficulty.value = difficultyId
  // ローカルストレージに保存
  localStorage.setItem('gameDifficulty', difficultyId)
  console.log(`難易度を変更しました: ${difficultyId}`)
}

// 設定更新関数群
function updateShowHints(): void {
  localStorage.setItem('showHints', showHints.value.toString())
}

function updateShowAnimations(): void {
  localStorage.setItem('showAnimations', showAnimations.value.toString())
  // アニメーション設定をグローバルに適用
  document.documentElement.style.setProperty(
    '--animation-duration',
    showAnimations.value ? '0.3s' : '0s'
  )
}

function updateShowStatistics(): void {
  localStorage.setItem('showStatistics', showStatistics.value.toString())
}

function updateAutoSave(): void {
  localStorage.setItem('autoSave', autoSave.value.toString())
}

function updateAutoSaveInterval(): void {
  localStorage.setItem('autoSaveInterval', autoSaveInterval.value.toString())
}

// ゲームリセット
function resetGame(): void {
  try {
    // ゲーム状態をリセット
    gameStore.resetGame()
    
    // ローカルストレージをクリア
    localStorage.removeItem('gameState')
    localStorage.removeItem('gameStatistics')
    
    console.log('ゲームがリセットされました')
    confirmReset.value = false
    
    // 必要に応じてページをリロード
    setTimeout(() => {
      window.location.reload()
    }, 500)
  } catch (error) {
    console.error('ゲームリセットエラー:', error)
  }
}

// 初期化
onMounted(() => {
  // ローカルストレージから設定を復元
  const savedDifficulty = localStorage.getItem('gameDifficulty')
  if (savedDifficulty) {
    currentDifficulty.value = savedDifficulty
  }
  
  const savedShowHints = localStorage.getItem('showHints')
  if (savedShowHints !== null) {
    showHints.value = savedShowHints === 'true'
  }
  
  const savedShowAnimations = localStorage.getItem('showAnimations')
  if (savedShowAnimations !== null) {
    showAnimations.value = savedShowAnimations === 'true'
  }
  
  const savedShowStatistics = localStorage.getItem('showStatistics')
  if (savedShowStatistics !== null) {
    showStatistics.value = savedShowStatistics === 'true'
  }
  
  const savedAutoSave = localStorage.getItem('autoSave')
  if (savedAutoSave !== null) {
    autoSave.value = savedAutoSave === 'true'
  }
  
  const savedAutoSaveInterval = localStorage.getItem('autoSaveInterval')
  if (savedAutoSaveInterval) {
    autoSaveInterval.value = parseInt(savedAutoSaveInterval)
  }
  
  // アニメーション設定を適用
  updateShowAnimations()
})
</script>

<style scoped>
.game-general-settings {
  max-width: 800px;
  margin: 0 auto;
}

.settings-header {
  text-align: center;
  margin-bottom: 2rem;
}

.settings-title {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.settings-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin: 0;
}

.settings-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section-title {
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
}

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.difficulty-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.difficulty-card:hover {
  border-color: rgba(76, 110, 245, 0.5);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.difficulty-card.selected {
  border-color: #4C6EF5;
  background: rgba(76, 110, 245, 0.1);
}

.difficulty-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.difficulty-icon {
  font-size: 1.5rem;
}

.difficulty-name {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0;
}

.difficulty-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.difficulty-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-tag {
  background: rgba(76, 110, 245, 0.2);
  color: #ffffff;
  font-size: 0.8rem;
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  border: 1px solid rgba(76, 110, 245, 0.3);
}

.setting-items {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  color: #ffffff;
  font-weight: 500;
}

.setting-label-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #ffffff;
  font-weight: 500;
}

.setting-checkbox {
  display: none;
}

.checkbox-custom {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  position: relative;
  transition: all 0.3s ease;
}

.checkbox-custom::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.setting-checkbox:checked + .checkbox-custom {
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  border-color: #4C6EF5;
}

.setting-checkbox:checked + .checkbox-custom::after {
  opacity: 1;
}

.setting-select {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: #ffffff;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.setting-select option {
  background: rgba(0, 0, 0, 0.9);
  color: #ffffff;
}

.setting-text {
  font-size: 1rem;
}

.setting-help {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin: 0;
  margin-left: 3rem;
}

.reset-actions {
  text-align: center;
}

.reset-warning {
  color: rgba(255, 193, 7, 0.8);
  font-size: 0.9rem;
  margin-top: 1rem;
  margin-bottom: 0;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-warning {
  background: linear-gradient(135deg, #FFC107 0%, #FF8F00 100%);
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #FFB300 0%, #F57C00 100%);
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-danger {
  background: linear-gradient(135deg, #DC3545 0%, #C82333 100%);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #C82333 0%, #A71E2A 100%);
  transform: translateY(-2px);
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: rgba(26, 26, 46, 0.95);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.modal-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 2rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .difficulty-grid {
    grid-template-columns: 1fr;
  }
  
  .setting-label-inline {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}
</style>