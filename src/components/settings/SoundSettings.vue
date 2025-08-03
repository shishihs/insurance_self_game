<template>
  <div class="sound-settings">
    <div class="settings-header">
      <h3 class="settings-title">サウンド設定</h3>
      <p class="settings-description">
        ゲーム内の音楽と効果音の設定を調整できます
      </p>
    </div>

    <div class="settings-section">
      <h4 class="section-title">音量調整</h4>
      
      <div class="volume-controls">
        <div class="volume-control">
          <div class="volume-header">
            <span class="volume-icon">🎵</span>
            <label class="volume-label">マスター音量</label>
            <span class="volume-value">{{ masterVolume }}%</span>
          </div>
          <div class="volume-slider-container">
            <input
              v-model="masterVolume"
              type="range"
              min="0"
              max="100"
              class="volume-slider"
              @input="updateMasterVolume"
            />
            <div class="volume-indicators">
              <span>🔇</span>
              <span>🔊</span>
            </div>
          </div>
        </div>

        <div class="volume-control">
          <div class="volume-header">
            <span class="volume-icon">🎼</span>
            <label class="volume-label">BGM音量</label>
            <span class="volume-value">{{ bgmVolume }}%</span>
          </div>
          <div class="volume-slider-container">
            <input
              v-model="bgmVolume"
              type="range"
              min="0"
              max="100"
              class="volume-slider"
              :disabled="masterVolume === 0"
              @input="updateBgmVolume"
            />
            <div class="volume-indicators">
              <span>🔇</span>
              <span>🎼</span>
            </div>
          </div>
        </div>

        <div class="volume-control">
          <div class="volume-header">
            <span class="volume-icon">🔔</span>
            <label class="volume-label">効果音音量</label>
            <span class="volume-value">{{ sfxVolume }}%</span>
          </div>
          <div class="volume-slider-container">
            <input
              v-model="sfxVolume"
              type="range"
              min="0"
              max="100"
              class="volume-slider"
              :disabled="masterVolume === 0"
              @input="updateSfxVolume"
            />
            <div class="volume-indicators">
              <span>🔇</span>
              <span>🔔</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4 class="section-title">サウンドオプション</h4>
      
      <div class="sound-options">
        <div class="option-item">
          <label class="option-label">
            <input
              v-model="enableBgm"
              type="checkbox"
              class="option-checkbox"
              @change="updateEnableBgm"
            />
            <span class="checkbox-custom"></span>
            <span class="option-text">背景音楽を有効化</span>
          </label>
          <p class="option-help">ゲーム中に背景音楽を再生します</p>
        </div>

        <div class="option-item">
          <label class="option-label">
            <input
              v-model="enableSfx"
              type="checkbox"
              class="option-checkbox"
              @change="updateEnableSfx"
            />
            <span class="checkbox-custom"></span>
            <span class="option-text">効果音を有効化</span>
          </label>
          <p class="option-help">カードやボタンのクリック音などを再生します</p>
        </div>

        <div class="option-item">
          <label class="option-label">
            <input
              v-model="enableVoice"
              type="checkbox"
              class="option-checkbox"
              @change="updateEnableVoice"
            />
            <span class="checkbox-custom"></span>
            <span class="option-text">音声ガイドを有効化</span>
          </label>
          <p class="option-help">重要な通知や結果を音声で案内します</p>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4 class="section-title">サウンドテスト</h4>
      
      <div class="sound-test">
        <p class="test-description">
          サウンド設定をテストするために、各種音声を再生できます
        </p>
        
        <div class="test-buttons">
          <button
            class="test-button"
            :disabled="!enableBgm || masterVolume === 0"
            @click="testBgm"
          >
            <span class="test-icon">🎼</span>
            <span class="test-text">BGMテスト</span>
          </button>
          
          <button
            class="test-button"
            :disabled="!enableSfx || masterVolume === 0"
            @click="testCardSound"
          >
            <span class="test-icon">🃏</span>
            <span class="test-text">カード音</span>
          </button>
          
          <button
            class="test-button"
            :disabled="!enableSfx || masterVolume === 0"
            @click="testSuccessSound"
          >
            <span class="test-icon">✅</span>
            <span class="test-text">成功音</span>
          </button>
          
          <button
            class="test-button"
            :disabled="!enableSfx || masterVolume === 0"
            @click="testFailSound"
          >
            <span class="test-icon">❌</span>
            <span class="test-text">失敗音</span>
          </button>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h4 class="section-title">プリセット</h4>
      
      <div class="preset-buttons">
        <button class="preset-button" @click="applyPreset('silent')">
          <span class="preset-icon">🔇</span>
          <div class="preset-info">
            <span class="preset-name">サイレント</span>
            <span class="preset-desc">すべての音を無効化</span>
          </div>
        </button>
        
        <button class="preset-button" @click="applyPreset('minimal')">
          <span class="preset-icon">🔕</span>
          <div class="preset-info">
            <span class="preset-name">最小限</span>
            <span class="preset-desc">重要な効果音のみ</span>
          </div>
        </button>
        
        <button class="preset-button" @click="applyPreset('balanced')">
          <span class="preset-icon">🔊</span>
          <div class="preset-info">
            <span class="preset-name">バランス</span>
            <span class="preset-desc">標準的な設定</span>
          </div>
        </button>
        
        <button class="preset-button" @click="applyPreset('full')">
          <span class="preset-icon">🔊</span>
          <div class="preset-info">
            <span class="preset-name">フル</span>
            <span class="preset-desc">すべての音を最大化</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// サウンド設定状態
const masterVolume = ref(70)
const bgmVolume = ref(50)
const sfxVolume = ref(80)
const enableBgm = ref(true)
const enableSfx = ref(true)
const enableVoice = ref(false)

// 音量更新関数
function updateMasterVolume(): void {
  localStorage.setItem('masterVolume', masterVolume.value.toString())
  // 実際のサウンドシステムに音量を適用
  applyVolumeSettings()
}

function updateBgmVolume(): void {
  localStorage.setItem('bgmVolume', bgmVolume.value.toString())
  applyVolumeSettings()
}

function updateSfxVolume(): void {
  localStorage.setItem('sfxVolume', sfxVolume.value.toString())
  applyVolumeSettings()
}

function updateEnableBgm(): void {
  localStorage.setItem('enableBgm', enableBgm.value.toString())
  applyVolumeSettings()
}

function updateEnableSfx(): void {
  localStorage.setItem('enableSfx', enableSfx.value.toString())
  applyVolumeSettings()
}

function updateEnableVoice(): void {
  localStorage.setItem('enableVoice', enableVoice.value.toString())
  applyVolumeSettings()
}

// 音量設定を実際のサウンドシステムに適用
function applyVolumeSettings(): void {
  const finalMasterVolume = masterVolume.value / 100
  const finalBgmVolume = enableBgm.value ? (bgmVolume.value / 100) * finalMasterVolume : 0
  const finalSfxVolume = enableSfx.value ? (sfxVolume.value / 100) * finalMasterVolume : 0
  
  // サウンドマネージャーがあれば適用
  if (window.soundManager) {
    window.soundManager.setMasterVolume(finalMasterVolume)
    window.soundManager.setBgmVolume(finalBgmVolume)
    window.soundManager.setSfxVolume(finalSfxVolume)
  }
  
  console.log('音量設定を更新しました:', {
    master: finalMasterVolume,
    bgm: finalBgmVolume,
    sfx: finalSfxVolume
  })
}

// サウンドテスト関数
function testBgm(): void {
  console.log('BGMテストを再生')
  // 実際のBGMテスト音を再生
  if (window.soundManager) {
    window.soundManager.playTestBgm()
  }
}

function testCardSound(): void {
  console.log('カード音テストを再生')
  // カードのクリック音をテスト再生
  if (window.soundManager) {
    window.soundManager.play('cardClick')
  }
}

function testSuccessSound(): void {
  console.log('成功音テストを再生')
  // 成功音をテスト再生
  if (window.soundManager) {
    window.soundManager.play('success')
  }
}

function testFailSound(): void {
  console.log('失敗音テストを再生')
  // 失敗音をテスト再生
  if (window.soundManager) {
    window.soundManager.play('fail')
  }
}

// プリセット適用
function applyPreset(presetName: string): void {
  switch (presetName) {
    case 'silent':
      masterVolume.value = 0
      enableBgm.value = false
      enableSfx.value = false
      enableVoice.value = false
      break
    case 'minimal':
      masterVolume.value = 30
      bgmVolume.value = 20
      sfxVolume.value = 50
      enableBgm.value = false
      enableSfx.value = true
      enableVoice.value = false
      break
    case 'balanced':
      masterVolume.value = 70
      bgmVolume.value = 50
      sfxVolume.value = 80
      enableBgm.value = true
      enableSfx.value = true
      enableVoice.value = false
      break
    case 'full':
      masterVolume.value = 100
      bgmVolume.value = 80
      sfxVolume.value = 100
      enableBgm.value = true
      enableSfx.value = true
      enableVoice.value = true
      break
  }
  
  // 設定を保存
  updateMasterVolume()
  updateBgmVolume()
  updateSfxVolume()
  updateEnableBgm()
  updateEnableSfx()
  updateEnableVoice()
  
  console.log(`プリセット "${presetName}" を適用しました`)
}

// 初期化
onMounted(() => {
  // ローカルストレージから設定を復元
  const savedMasterVolume = localStorage.getItem('masterVolume')
  if (savedMasterVolume) {
    masterVolume.value = parseInt(savedMasterVolume)
  }
  
  const savedBgmVolume = localStorage.getItem('bgmVolume')
  if (savedBgmVolume) {
    bgmVolume.value = parseInt(savedBgmVolume)
  }
  
  const savedSfxVolume = localStorage.getItem('sfxVolume')
  if (savedSfxVolume) {
    sfxVolume.value = parseInt(savedSfxVolume)
  }
  
  const savedEnableBgm = localStorage.getItem('enableBgm')
  if (savedEnableBgm !== null) {
    enableBgm.value = savedEnableBgm === 'true'
  }
  
  const savedEnableSfx = localStorage.getItem('enableSfx')
  if (savedEnableSfx !== null) {
    enableSfx.value = savedEnableSfx === 'true'
  }
  
  const savedEnableVoice = localStorage.getItem('enableVoice')
  if (savedEnableVoice !== null) {
    enableVoice.value = savedEnableVoice === 'true'
  }
  
  // 設定を適用
  applyVolumeSettings()
})

// TypeScript型拡張（グローバルなsoundManagerを定義）
declare global {
  interface Window {
    soundManager?: {
      setMasterVolume(volume: number): void
      setBgmVolume(volume: number): void
      setSfxVolume(volume: number): void
      playTestBgm(): void
      play(soundName: string): void
    }
  }
}
</script>

<style scoped>
.sound-settings {
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

.volume-controls {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.volume-control {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.volume-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.volume-icon {
  font-size: 1.5rem;
}

.volume-label {
  color: #ffffff;
  font-weight: 600;
  flex: 1;
}

.volume-value {
  color: #4C6EF5;
  font-weight: bold;
  min-width: 40px;
  text-align: right;
}

.volume-slider-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.volume-slider {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.volume-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.volume-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.volume-indicators {
  display: flex;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.6);
}

.sound-options {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  color: #ffffff;
  font-weight: 500;
}

.option-checkbox {
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

.option-checkbox:checked + .checkbox-custom {
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  border-color: #4C6EF5;
}

.option-checkbox:checked + .checkbox-custom::after {
  opacity: 1;
}

.option-text {
  font-size: 1rem;
}

.option-help {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin: 0;
  margin-left: 3rem;
}

.sound-test {
  text-align: center;
}

.test-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.test-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.test-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.test-button:hover:not(:disabled) {
  border-color: rgba(76, 110, 245, 0.5);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.test-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-icon {
  font-size: 2rem;
}

.test-text {
  font-weight: 600;
}

.preset-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.preset-button {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.preset-button:hover {
  border-color: rgba(76, 110, 245, 0.5);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.preset-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.preset-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.preset-name {
  font-weight: bold;
  font-size: 1rem;
}

.preset-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .test-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .preset-buttons {
    grid-template-columns: 1fr;
  }
  
  .volume-header {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .test-buttons {
    grid-template-columns: 1fr;
  }
}
</style>