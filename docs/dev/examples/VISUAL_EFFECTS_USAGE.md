# 革新的なUI要素と視覚効果の使用方法

このドキュメントでは、新しく実装された革新的なUI要素と視覚効果の使用方法を説明します。

## 📦 実装されたコンポーネント

### 1. WebGLパーティクルシステム

**ファイル:** `src/components/effects/ParticleSystem.vue`

**使用例:**
```vue
<template>
  <div class="container">
    <ParticleSystem 
      :particle-count="200"
      :color-palette="['#667eea', '#764ba2', '#f093fb']"
      intensity="medium"
      :speed="1.0"
      :reduce-motion="false"
      :enabled="true"
    />
    <div class="content">
      <!-- ゲームコンテンツ -->
    </div>
  </div>
</template>

<script setup>
import { ParticleSystem } from '@/components/effects'
</script>
```

### 2. パララックス背景

**ファイル:** `src/components/effects/ParallaxBackground.vue`

**使用例:**
```vue
<template>
  <ParallaxBackground 
    :scroll-speed="1"
    :enable-mouse-parallax="true"
    intensity="normal"
    theme="cosmic"
    :reduce-motion="false"
  >
    <div class="game-content">
      <!-- ゲームコンテンツがここに入る -->
    </div>
  </ParallaxBackground>
</template>

<script setup>
import { ParallaxBackground } from '@/components/effects'
</script>
```

### 3. グラスモーフィズムカード

**ファイル:** `src/components/effects/GlassmorphismCard.vue`

**使用例:**
```vue
<template>
  <GlassmorphismCard
    variant="primary"
    size="lg"
    :interactive="true"
    :elevated="false"
    :animated="true"
    :blur-intensity="12"
    :opacity="0.15"
    @click="handleCardClick"
    @hover="handleCardHover"
  >
    <h3>カードタイトル</h3>
    <p>カードの説明文</p>
  </GlassmorphismCard>
</template>

<script setup>
import { GlassmorphismCard } from '@/components/effects'

const handleCardClick = (event) => {
  console.log('カードがクリックされました', event)
}

const handleCardHover = (isHovered) => {
  console.log('ホバー状態:', isHovered)
}
</script>
```

### 4. ニューモーフィズムボタン

**ファイル:** `src/components/effects/NeumorphismButton.vue`

**使用例:**
```vue
<template>
  <div class="button-group">
    <NeumorphismButton
      variant="primary"
      size="md"
      :ripple-effect="true"
      @click="handlePrimaryAction"
    >
      <template #icon>
        <PlayIcon />
      </template>
      ゲーム開始
    </NeumorphismButton>
    
    <NeumorphismButton
      variant="secondary"
      size="md"
      :disabled="false"
      @click="handleSecondaryAction"
    >
      設定
    </NeumorphismButton>
  </div>
</template>

<script setup>
import { NeumorphismButton } from '@/components/effects'

const handlePrimaryAction = () => {
  console.log('プライマリアクション実行')
}

const handleSecondaryAction = () => {
  console.log('セカンダリアクション実行')
}
</script>
```

### 5. 動的グラデーション

**ファイル:** `src/components/effects/DynamicGradient.vue`

**使用例:**
```vue
<template>
  <DynamicGradient
    :colors="['#667eea', '#764ba2', '#f093fb', '#f5576c']"
    :direction="45"
    :animated="true"
    :interactive="true"
    :speed="1"
    :intensity="1"
    pattern="mesh"
    blend-mode="normal"
    class="background-gradient"
  >
    <div class="content-overlay">
      <!-- コンテンツ -->
    </div>
  </DynamicGradient>
</template>

<script setup>
import { DynamicGradient } from '@/components/effects'
</script>

<style scoped>
.background-gradient {
  width: 100%;
  height: 100vh;
}

.content-overlay {
  position: relative;
  z-index: 2;
  padding: 20px;
}
</style>
```

### 6. WebGLシェーダーエフェクト

**ファイル:** `src/components/effects/ShaderEffect.vue`

**使用例:**
```vue
<template>
  <div class="shader-container">
    <ShaderEffect
      effect="plasma"
      :interactive="true"
      :intensity="1.0"
      :speed="1.0"
      :colors="['#667eea', '#764ba2', '#f093fb', '#f5576c']"
      :resolution="1.0"
      class="shader-background"
    />
    <div class="content-layer">
      <!-- UIコンテンツ -->
    </div>
  </div>
</template>

<script setup>
import { ShaderEffect } from '@/components/effects'
</script>

<style scoped>
.shader-container {
  position: relative;
  width: 100%;
  height: 100vh;
}

.shader-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.content-layer {
  position: relative;
  z-index: 2;
}
</style>
```

### 7. 高度なマイクロインタラクション

**ファイル:** `src/components/effects/AdvancedMicroInteractions.vue`

**使用例:**
```vue
<template>
  <AdvancedMicroInteractions
    :magnetic-enabled="true"
    :trail-enabled="true"
    :magnetic-strength="0.3"
    :trail-intensity="1.0"
    :particle-count="50"
    ref="microInteractionsRef"
    @magnetic-attract="handleMagneticAttract"
    @trail-update="handleTrailUpdate"
  >
    <div class="interactive-content">
      <button 
        ref="magneticButtonRef"
        class="magnetic-button"
        @click="showFloatingMessage"
      >
        磁気吸着ボタン
      </button>
    </div>
  </AdvancedMicroInteractions>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { AdvancedMicroInteractions } from '@/components/effects'

const microInteractionsRef = ref()
const magneticButtonRef = ref()

const handleMagneticAttract = (element, distance) => {
  console.log('磁気吸着:', element, distance)
}

const handleTrailUpdate = (particleCount) => {
  console.log('パーティクル数:', particleCount)
}

const showFloatingMessage = (event) => {
  microInteractionsRef.value?.showFloatingMessage(
    '成功！', 
    event.clientX, 
    event.clientY, 
    'success'
  )
}

onMounted(() => {
  // ボタンに磁気効果を追加
  if (magneticButtonRef.value) {
    microInteractionsRef.value?.addMagneticElement(magneticButtonRef.value, 0.5)
  }
})
</script>
```

### 8. リワードアニメーション

**ファイル:** `src/components/effects/RewardAnimations.vue`

**使用例:**
```vue
<template>
  <div class="container">
    <RewardAnimations
      ref="rewardAnimationsRef"
      :auto-close-delay="5000"
      :enable-sound="true"
      :particle-count="100"
      @reward-shown="handleRewardShown"
      @reward-closed="handleRewardClosed"
      @action-clicked="handleActionClicked"
    />
    
    <button @click="showSuccessReward">成功報酬を表示</button>
    <button @click="showInlinePoints">ポイント獲得を表示</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { RewardAnimations } from '@/components/effects'

const rewardAnimationsRef = ref()

const showSuccessReward = () => {
  rewardAnimationsRef.value?.showReward({
    id: 'success_1',
    type: 'success',
    title: 'ステージクリア！',
    message: '素晴らしいプレイでした！',
    stats: [
      { label: 'スコア', value: '1,250' },
      { label: 'ボーナス', value: '+300' }
    ],
    actions: [
      {
        id: 'continue',
        label: '次のステージへ',
        variant: 'primary',
        action: () => console.log('次のステージへ')
      },
      {
        id: 'retry',
        label: 'もう一度',
        variant: 'secondary',
        action: () => console.log('リトライ')
      }
    ]
  })
}

const showInlinePoints = () => {
  rewardAnimationsRef.value?.showInlineReward(
    'points',
    '+50 Points',
    window.innerWidth / 2,
    window.innerHeight / 2
  )
}

const handleRewardShown = (reward) => {
  console.log('報酬表示:', reward)
}

const handleRewardClosed = (rewardId) => {
  console.log('報酬クローズ:', rewardId)
}

const handleActionClicked = (actionId, rewardId) => {
  console.log('アクション実行:', actionId, rewardId)
}
</script>
```

### 9. 環境エフェクト

**ファイル:** `src/components/effects/EnvironmentalEffects.vue`

**使用例:**
```vue
<template>
  <EnvironmentalEffects
    ref="environmentalRef"
    weather="rain"
    time-of-day="evening"
    season="autumn"
    :intensity="1.0"
    :auto-transition="true"
    :transition-duration="60000"
    :enable-aurora="true"
    :enable-seasonal-effects="true"
    @weather-changed="handleWeatherChanged"
    @time-changed="handleTimeChanged"
    @season-changed="handleSeasonChanged"
  >
    <div class="game-world">
      <!-- ゲームコンテンツ -->
    </div>
  </EnvironmentalEffects>
  
  <div class="controls">
    <button @click="changeWeather('snow')">雪にする</button>
    <button @click="changeTime('night')">夜にする</button>
    <button @click="changeSeason('winter')">冬にする</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { EnvironmentalEffects } from '@/components/effects'

const environmentalRef = ref()

const changeWeather = (weather) => {
  environmentalRef.value?.changeWeather(weather)
}

const changeTime = (timeOfDay) => {
  environmentalRef.value?.changeTimeOfDay(timeOfDay)
}

const changeSeason = (season) => {
  environmentalRef.value?.changeSeason(season)
}

const handleWeatherChanged = (weather) => {
  console.log('天候変化:', weather)
}

const handleTimeChanged = (timeOfDay) => {
  console.log('時刻変化:', timeOfDay)
}

const handleSeasonChanged = (season) => {
  console.log('季節変化:', season)
}
</script>
```

### 10. テーマシステム

**ファイル:** `src/components/themes/ThemeSelector.vue`

**使用例:**
```vue
<template>
  <div class="theme-controls">
    <ThemeSelector
      :show-custom-colors="true"
      :compact="false"
      @theme-changed="handleThemeChanged"
      @preferences-changed="handlePreferencesChanged"
    />
  </div>
</template>

<script setup>
import { ThemeSelector } from '@/components/themes'

const handleThemeChanged = (theme) => {
  console.log('テーマ変更:', theme.name)
}

const handlePreferencesChanged = (preferences) => {
  console.log('設定変更:', preferences)
}
</script>
```

## 🎨 完全統合例

すべてのエフェクトを組み合わせた例：

```vue
<template>
  <div class="immersive-game-container">
    <!-- 環境エフェクト（最背面） -->
    <EnvironmentalEffects
      ref="environmentalRef"
      :auto-transition="true"
      :enable-seasonal-effects="true"
      class="environment-layer"
    >
      <!-- パララックス背景 -->
      <ParallaxBackground
        theme="cosmic"
        intensity="normal"
        :enable-mouse-parallax="true"
        class="parallax-layer"
      >
        <!-- 動的グラデーション -->
        <DynamicGradient
          pattern="mesh"
          :animated="true"
          :interactive="true"
          class="gradient-layer"
        >
          <!-- WebGLシェーダー -->
          <ShaderEffect
            effect="plasma"
            :interactive="true"
            :intensity="0.3"
            class="shader-layer"
          />
          
          <!-- パーティクルシステム -->
          <ParticleSystem
            :particle-count="150"
            intensity="medium"
            class="particle-layer"
          />
          
          <!-- マイクロインタラクション -->
          <AdvancedMicroInteractions
            :magnetic-enabled="true"
            :trail-enabled="true"
            ref="microInteractionsRef"
          >
            <!-- ゲームUI -->
            <div class="game-ui">
              <GlassmorphismCard
                variant="primary"
                size="lg"
                :interactive="true"
                :animated="true"
                class="game-panel"
              >
                <h2>人生充実ゲーム</h2>
                <p>革新的な視覚体験をお楽しみください</p>
                
                <div class="button-group">
                  <NeumorphismButton
                    variant="primary" 
                    size="lg"
                    @click="startGame"
                  >
                    <template #icon>
                      <PlayIcon />
                    </template>
                    ゲーム開始
                  </NeumorphismButton>
                  
                  <NeumorphismButton
                    variant="secondary"
                    size="lg"
                    @click="showSettings"
                  >
                    設定
                  </NeumorphismButton>
                </div>
              </GlassmorphismCard>
              
              <!-- テーマ選択 -->
              <ThemeSelector
                :show-custom-colors="true"
                class="theme-selector"
              />
            </div>
          </AdvancedMicroInteractions>
        </DynamicGradient>
      </ParallaxBackground>
    </EnvironmentalEffects>
    
    <!-- リワードアニメーション -->
    <RewardAnimations ref="rewardAnimationsRef" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  ParticleSystem,
  ParallaxBackground,
  GlassmorphismCard,
  NeumorphismButton,
  DynamicGradient,
  ShaderEffect,
  AdvancedMicroInteractions,
  RewardAnimations,
  EnvironmentalEffects
} from '@/components/effects'
import { ThemeSelector } from '@/components/themes'

const microInteractionsRef = ref()
const rewardAnimationsRef = ref()
const environmentalRef = ref()

const startGame = () => {
  // ゲーム開始エフェクト
  rewardAnimationsRef.value?.showReward({
    id: 'game_start',
    type: 'success',
    title: 'ゲーム開始！',
    message: '素晴らしい冒険の始まりです'
  })
  
  // 環境を昼に変更
  environmentalRef.value?.changeTimeOfDay('morning')
  environmentalRef.value?.changeWeather('clear')
}

const showSettings = () => {
  microInteractionsRef.value?.showFloatingMessage(
    '設定画面',
    window.innerWidth / 2,
    window.innerHeight / 2,
    'info'
  )
}
</script>

<style scoped>
.immersive-game-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.environment-layer,
.parallax-layer,
.gradient-layer,
.shader-layer,
.particle-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.game-ui {
  position: relative;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}

.game-panel {
  max-width: 500px;
  text-align: center;
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

.theme-selector {
  position: fixed;
  top: 20px;
  right: 20px;
}

@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }
  
  .game-panel {
    max-width: 90vw;
  }
}
</style>
```

## 🎯 パフォーマンス考慮事項

1. **GPU加速の活用**: WebGLエフェクトは自動的にGPU加速を利用
2. **アニメーション最適化**: `will-change`プロパティを適切に設定
3. **レスポンシブ対応**: 画面サイズに応じた自動調整
4. **アクセシビリティ**: `prefers-reduced-motion`の自動検出と対応
5. **メモリ管理**: 自動的なクリーンアップとリソース解放

## 🔧 カスタマイゼーション

各コンポーネントは高度にカスタマイズ可能です：

- **色彩**: カラーパレットの変更
- **アニメーション**: 速度と強度の調整
- **インタラクション**: マウス・タッチ対応の設定
- **パフォーマンス**: デバイス性能に応じた自動調整
- **アクセシビリティ**: 障害者対応機能の有効化

## 📱 レスポンシブ対応

すべてのコンポーネントは以下をサポート：

- **モバイルファースト**: タッチインタラクション最適化
- **タブレット対応**: 中間サイズでの適切な表示
- **デスクトップ強化**: マウスホバーエフェクト
- **高DPI対応**: Retinaディスプレイでの鮮明表示

この革新的なUI要素システムにより、insurance_gameは業界最高水準の視覚体験を提供できます。