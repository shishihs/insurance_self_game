<template>
  <div class="reward-animations-container">
    <!-- 成功時のフルスクリーンエフェクト -->
    <Teleport to="body">
      <div
        v-if="currentReward"
        class="fullscreen-reward-overlay"
        :class="currentReward.type"
      >
        <!-- 背景エフェクト -->
        <div class="reward-background">
          <div
            v-for="particle in backgroundParticles"
            :key="particle.id"
            class="background-particle"
            :style="particle.style"
          />
        </div>

        <!-- メインアニメーション -->
        <div class="reward-main-content">
          <!-- アイコン/イラスト -->
          <div class="reward-icon-container">
            <div class="reward-icon" :class="currentReward.type">
              <component :is="getRewardIcon(currentReward.type)" />
            </div>
            <div class="reward-glow" />
          </div>

          <!-- テキスト -->
          <div class="reward-text-container">
            <h2 class="reward-title">{{ currentReward.title }}</h2>
            <p class="reward-message">{{ currentReward.message }}</p>
            <div v-if="currentReward.stats" class="reward-stats">
              <div
                v-for="stat in currentReward.stats"
                :key="stat.label"
                class="reward-stat"
              >
                <span class="stat-value">{{ stat.value }}</span>
                <span class="stat-label">{{ stat.label }}</span>
              </div>
            </div>
          </div>

          <!-- アクションボタン -->
          <div v-if="currentReward.actions" class="reward-actions">
            <button
              v-for="action in currentReward.actions"
              :key="action.id"
              class="reward-action-button"
              :class="action.variant"
              @click="handleAction(action)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>

        <!-- 閉じるボタン -->
        <button
          class="reward-close-button"
          @click="closeReward"
          :aria-label="$t('common.close', '閉じる')"
        >
          <CloseIcon />
        </button>
      </div>
    </Teleport>

    <!-- コンフェッティ効果 -->
    <canvas
      v-if="showConfetti"
      ref="confettiCanvasRef"
      class="confetti-canvas"
    />

    <!-- 花火エフェクト -->
    <canvas
      v-if="showFireworks"
      ref="fireworksCanvasRef"
      class="fireworks-canvas"
    />

    <!-- 流れ星エフェクト -->
    <div v-if="showShootingStars" class="shooting-stars">
      <div
        v-for="star in shootingStars"
        :key="star.id"
        class="shooting-star"
        :style="star.style"
      />
    </div>

    <!-- インラインリワード（小さなアニメーション） -->
    <div
      v-for="inlineReward in inlineRewards"
      :key="inlineReward.id"
      class="inline-reward"
      :class="inlineReward.type"
      :style="inlineReward.style"
    >
      <div class="inline-reward-content">
        <component :is="getInlineRewardIcon(inlineReward.type)" />
        <span class="inline-reward-text">{{ inlineReward.text }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

// アイコンコンポーネント
const TrophyIcon = { template: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 2h12v2H6V2zm0 4v8a8 8 0 0 0 16 0V6H6zm7 13h2v2h-2v-2zm-4 0h2v2H9v-2zm8 0h2v2h-2v-2z"/></svg>' }
const StarIcon = { template: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' }
const HeartIcon = { template: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' }
const XIcon = { template: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>' }
const CloseIcon = XIcon

interface RewardData {
  id: string
  type: 'success' | 'achievement' | 'milestone' | 'perfect' | 'combo' | 'failure'
  title: string
  message: string
  duration?: number
  stats?: { label: string; value: string | number }[]
  actions?: { id: string; label: string; variant: 'primary' | 'secondary'; action: () => void }[]
}

interface ParticleData {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  style: Record<string, string>
}

interface InlineRewardData {
  id: string
  type: 'points' | 'bonus' | 'combo' | 'achievement'
  text: string
  x: number
  y: number
  style: Record<string, string>
}

interface RewardAnimationsProps {
  autoCloseDelay?: number
  enableSound?: boolean
  particleCount?: number
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<RewardAnimationsProps>(), {
  autoCloseDelay: 5000,
  enableSound: true,
  particleCount: 100,
  reduceMotion: false
})

const emit = defineEmits<{
  rewardShown: [reward: RewardData]
  rewardClosed: [rewardId: string]
  actionClicked: [actionId: string, rewardId: string]
}>()

const confettiCanvasRef = ref<HTMLCanvasElement>()
const fireworksCanvasRef = ref<HTMLCanvasElement>()

const currentReward = ref<RewardData | null>(null)
const showConfetti = ref(false)
const showFireworks = ref(false)
const showShootingStars = ref(false)

const backgroundParticles = ref<ParticleData[]>([])
const shootingStars = ref<ParticleData[]>([])
const inlineRewards = ref<InlineRewardData[]>([])

let confettiAnimationId: number | null = null
let fireworksAnimationId: number | null = null
let autoCloseTimeout: number | null = null

// コンフェッティアニメーション
const initConfetti = () => {
  if (!confettiCanvasRef.value || props.reduceMotion) return

  const canvas = confettiCanvasRef.value
  const ctx = canvas.getContext('2d')!
  const particles: any[] = []

  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  // パーティクル生成
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3', '#54a0ff']
  
  for (let i = 0; i < props.particleCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -10,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 3 + 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      gravity: Math.random() * 0.1 + 0.1
    })
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    particles.forEach((particle, index) => {
      // 更新
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += particle.gravity
      particle.rotation += particle.rotationSpeed

      // 境界チェック
      if (particle.y > canvas.height + 50) {
        particles.splice(index, 1)
        return
      }

      // 描画
      ctx.save()
      ctx.translate(particle.x, particle.y)
      ctx.rotate(particle.rotation * Math.PI / 180)
      ctx.fillStyle = particle.color
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size)
      ctx.restore()
    })

    if (particles.length > 0) {
      confettiAnimationId = requestAnimationFrame(animate)
    } else {
      showConfetti.value = false
    }
  }

  animate()

  return () => {
    window.removeEventListener('resize', resizeCanvas)
  }
}

// 花火アニメーション
const initFireworks = () => {
  if (!fireworksCanvasRef.value || props.reduceMotion) return

  const canvas = fireworksCanvasRef.value
  const ctx = canvas.getContext('2d')!
  const fireworks: any[] = []

  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  const createFirework = (x: number, y: number) => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#feca57', '#ff9ff3']
    const particleCount = 30

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount
      const velocity = Math.random() * 3 + 2
      
      fireworks.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: Math.random() * 0.02 + 0.01,
        size: Math.random() * 3 + 2
      })
    }
  }

  // 複数の花火を作成
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      createFirework(
        Math.random() * canvas.width,
        Math.random() * canvas.height * 0.6 + canvas.height * 0.2
      )
    }, i * 500)
  }

  const animate = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    fireworks.forEach((particle, index) => {
      // 更新
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vy += 0.1 // 重力
      particle.life -= particle.decay

      if (particle.life <= 0) {
        fireworks.splice(index, 1)
        return
      }

      // 描画
      ctx.save()
      ctx.globalAlpha = particle.life
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    if (fireworks.length > 0) {
      fireworksAnimationId = requestAnimationFrame(animate)
    } else {
      showFireworks.value = false
    }
  }

  animate()

  return () => {
    window.removeEventListener('resize', resizeCanvas)
  }
}

// 流れ星生成
const createShootingStars = () => {
  if (props.reduceMotion) return

  showShootingStars.value = true
  shootingStars.value = []

  for (let i = 0; i < 8; i++) {
    const star = {
      id: `star_${Date.now()}_${i}`,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 1,
      maxLife: 60,
      color: '#ffffff',
      size: Math.random() * 4 + 2,
      style: {
        position: 'fixed',
        left: '0px',
        top: '0px',
        width: '4px',
        height: '4px',
        pointerEvents: 'none',
        zIndex: '10000'
      }
    }

    shootingStars.value.push(star)

    // アニメーション
    const animateStar = () => {
      star.x += star.vx
      star.y += star.vy
      star.life -= 1

      star.style.left = `${star.x}px`
      star.style.top = `${star.y}px`
      star.style.opacity = (star.life / star.maxLife).toString()

      if (star.life > 0) {
        requestAnimationFrame(animateStar)
      }
    }

    setTimeout(animateStar, i * 200)
  }

  setTimeout(() => {
    showShootingStars.value = false
    shootingStars.value = []
  }, 3000)
}

// リワード表示
const showReward = (rewardData: RewardData) => {
  currentReward.value = rewardData
  emit('rewardShown', rewardData)

  // 背景パーティクルの生成
  if (!props.reduceMotion) {
    createBackgroundParticles()
  }

  // タイプに応じたエフェクト
  nextTick(() => {
    switch (rewardData.type) {
      case 'success':
      case 'achievement':
        if (!props.reduceMotion) {
          showConfetti.value = true
          initConfetti()
        }
        break
      case 'perfect':
      case 'milestone':
        if (!props.reduceMotion) {
          showFireworks.value = true
          initFireworks()
          createShootingStars()
        }
        break
    }
  })

  // 自動クローズ
  if (props.autoCloseDelay > 0) {
    autoCloseTimeout = window.setTimeout(() => {
      closeReward()
    }, props.autoCloseDelay)
  }
}

// 背景パーティクル生成
const createBackgroundParticles = () => {
  backgroundParticles.value = []
  
  for (let i = 0; i < 20; i++) {
    const particle: ParticleData = {
      id: `bg_particle_${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 1,
      maxLife: 120,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      size: Math.random() * 8 + 4,
      style: {
        position: 'absolute',
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: `${Math.random() * 8 + 4}px`,
        height: `${Math.random() * 8 + 4}px`,
        backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
        borderRadius: '50%',
        opacity: '0.7',
        animation: 'floatParticle 4s ease-in-out infinite',
        animationDelay: `${Math.random() * 2}s`
      }
    }

    backgroundParticles.value.push(particle)
  }
}

// インラインリワード表示
const showInlineReward = (
  type: InlineRewardData['type'],
  text: string,
  x: number,
  y: number
) => {
  const inlineReward: InlineRewardData = {
    id: `inline_${Date.now()}_${Math.random()}`,
    type,
    text,
    x,
    y,
    style: {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%) scale(0)',
      zIndex: '9999',
      pointerEvents: 'none',
      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
    }
  }

  inlineRewards.value.push(inlineReward)

  // アニメーション開始
  nextTick(() => {
    inlineReward.style.transform = 'translate(-50%, -50%) scale(1) translateY(-20px)'
    inlineReward.style.opacity = '1'
  })

  // 自動削除
  setTimeout(() => {
    inlineReward.style.opacity = '0'
    inlineReward.style.transform = 'translate(-50%, -50%) scale(0.8) translateY(-40px)'
    
    setTimeout(() => {
      inlineRewards.value = inlineRewards.value.filter(r => r.id !== inlineReward.id)
    }, 600)
  }, 2000)

  return inlineReward.id
}

// リワードを閉じる
const closeReward = () => {
  if (!currentReward.value) return

  const rewardId = currentReward.value.id
  currentReward.value = null
  
  // タイムアウトをクリア
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout)
    autoCloseTimeout = null
  }

  // エフェクトを停止
  showConfetti.value = false
  showFireworks.value = false
  showShootingStars.value = false
  
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId)
    confettiAnimationId = null
  }
  
  if (fireworksAnimationId) {
    cancelAnimationFrame(fireworksAnimationId)
    fireworksAnimationId = null
  }

  emit('rewardClosed', rewardId)
}

// アクション処理
const handleAction = (action: any) => {
  emit('actionClicked', action.id, currentReward.value!.id)
  action.action()
}

// アイコン取得
const getRewardIcon = (type: string) => {
  switch (type) {
    case 'success': return StarIcon
    case 'achievement': return TrophyIcon
    case 'perfect': return HeartIcon
    default: return StarIcon
  }
}

const getInlineRewardIcon = (type: string) => {
  switch (type) {
    case 'points': return StarIcon
    case 'bonus': return TrophyIcon
    case 'combo': return HeartIcon
    default: return StarIcon
  }
}

// 公開メソッド
defineExpose({
  showReward,
  showInlineReward,
  closeReward
})

onUnmounted(() => {
  if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId)
  if (fireworksAnimationId) cancelAnimationFrame(fireworksAnimationId)
  if (autoCloseTimeout) clearTimeout(autoCloseTimeout)
})
</script>

<style scoped>
.reward-animations-container {
  position: relative;
}

.fullscreen-reward-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: overlayFadeIn 0.5s ease-out;
}

.reward-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.background-particle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.7;
}

.reward-main-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 500px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  backdrop-filter: blur(16px);
  animation: contentSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.reward-icon-container {
  position: relative;
  margin-bottom: 24px;
}

.reward-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 40px;
  position: relative;
  z-index: 2;
  animation: iconBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.reward-icon.success {
  background: linear-gradient(135deg, #10b981, #34d399);
}

.reward-icon.achievement {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.reward-icon.perfect {
  background: linear-gradient(135deg, #ec4899, #f472b6);
}

.reward-glow {
  position: absolute;
  top: -10px;
  left: -10px;
  right: -10px;
  bottom: -10px;
  background: inherit;
  border-radius: 50%;
  opacity: 0.3;
  z-index: 1;
  animation: glowPulse 2s ease-in-out infinite;
}

.reward-text-container {
  margin-bottom: 32px;
}

.reward-title {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
  animation: textSlideUp 0.6s ease-out 0.2s both;
}

.reward-message {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: 16px;
  animation: textSlideUp 0.6s ease-out 0.3s both;
}

.reward-stats {
  display: flex;
  gap: 24px;
  justify-content: center;
  animation: textSlideUp 0.6s ease-out 0.4s both;
}

.reward-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fbbf24;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reward-actions {
  display: flex;
  gap: 16px;
  animation: buttonsSlideUp 0.6s ease-out 0.5s both;
}

.reward-action-button {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reward-action-button.primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.reward-action-button.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.reward-action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.reward-close-button {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reward-close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.confetti-canvas,
.fireworks-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

.shooting-stars {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9998;
}

.shooting-star {
  position: absolute;
  width: 4px;
  height: 4px;
  background: linear-gradient(135deg, #ffffff, #fbbf24);
  border-radius: 50%;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}

.inline-reward {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
}

.inline-reward-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.8);
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.inline-reward.points {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(52, 211, 153, 0.9));
}

.inline-reward.bonus {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.9), rgba(251, 191, 36, 0.9));
}

.inline-reward.combo {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.9), rgba(244, 114, 182, 0.9));
}

/* アニメーション */
@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes contentSlideIn {
  from {
    opacity: 0;
    transform: translateY(50px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes iconBounce {
  0% {
    transform: scale(0) rotate(-180deg);
  }
  50% {
    transform: scale(1.2) rotate(-90deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}

@keyframes textSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes buttonsSlideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes floatParticle {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .fullscreen-reward-overlay,
  .reward-main-content,
  .reward-icon,
  .reward-glow,
  .reward-title,
  .reward-message,
  .reward-stats,
  .reward-actions,
  .background-particle,
  .inline-reward-content {
    animation: none !important;
    transition: none !important;
  }
  
  .confetti-canvas,
  .fireworks-canvas,
  .shooting-stars {
    display: none;
  }
}

/* レスポンシブ */
@media (max-width: 640px) {
  .reward-main-content {
    max-width: 90vw;
    padding: 24px;
  }
  
  .reward-title {
    font-size: 24px;
  }
  
  .reward-message {
    font-size: 16px;
  }
  
  .reward-stats {
    gap: 16px;
  }
  
  .reward-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .reward-action-button {
    width: 100%;
  }
}
</style>