<template>
  <div class="environmental-effects">
    <!-- 天候レイヤー -->
    <div 
      class="weather-layer"
      :class="currentWeather"
      :style="weatherLayerStyle"
    >
      <!-- 雨エフェクト -->
      <div v-if="currentWeather === 'rain'" class="rain-container">
        <div
          v-for="drop in rainDrops"
          :key="drop.id"
          class="rain-drop"
          :style="drop.style"
        />
      </div>

      <!-- 雪エフェクト -->
      <div v-if="currentWeather === 'snow'" class="snow-container">
        <div
          v-for="flake in snowFlakes"
          :key="flake.id"
          class="snow-flake"
          :style="flake.style"
        >
          ❄
        </div>
      </div>

      <!-- 雲エフェクト -->
      <div class="clouds-container">
        <div
          v-for="cloud in clouds"
          :key="cloud.id"
          class="cloud"
          :class="cloud.type"
          :style="cloud.style"
        />
      </div>
    </div>

    <!-- 時間変化レイヤー -->
    <div 
      class="time-layer"
      :class="currentTimeOfDay"
      :style="timeLayerStyle"
    >
      <!-- 太陽 -->
      <div 
        v-if="showSun"
        class="sun"
        :style="sunStyle"
      >
        <div class="sun-rays">
          <div
            v-for="ray in sunRays"
            :key="ray.id"
            class="sun-ray"
            :style="ray.style"
          />
        </div>
      </div>

      <!-- 月 -->
      <div 
        v-if="showMoon"
        class="moon"
        :style="moonStyle"
      >
        <div class="moon-craters">
          <div class="crater crater-1" />
          <div class="crater crater-2" />
          <div class="crater crater-3" />
        </div>
      </div>

      <!-- 星 -->
      <div v-if="showStars" class="stars-container">
        <div
          v-for="star in stars"
          :key="star.id"
          class="star"
          :style="star.style"
        />
      </div>
    </div>

    <!-- 大気効果レイヤー -->
    <div 
      class="atmosphere-layer"
      :style="atmosphereStyle"
    >
      <!-- 霧エフェクト -->
      <div v-if="currentWeather === 'fog'" class="fog-container">
        <div
          v-for="fogBank in fogBanks"
          :key="fogBank.id"
          class="fog-bank"
          :style="fogBank.style"
        />
      </div>

      <!-- オーロラエフェクト -->
      <div v-if="showAurora" class="aurora-container">
        <div class="aurora aurora-1" />
        <div class="aurora aurora-2" />
        <div class="aurora aurora-3" />
      </div>
    </div>

    <!-- 季節エフェクト -->
    <div 
      class="season-layer"
      :class="currentSeason"
    >
      <!-- 桜の花びら（春） -->
      <div v-if="currentSeason === 'spring'" class="cherry-blossoms">
        <div
          v-for="petal in cherryPetals"
          :key="petal.id"
          class="cherry-petal"
          :style="petal.style"
        >
          🌸
        </div>
      </div>

      <!-- 落ち葉（秋） -->
      <div v-if="currentSeason === 'autumn'" class="falling-leaves">
        <div
          v-for="leaf in fallingLeaves"
          :key="leaf.id"
          class="falling-leaf"
          :style="leaf.style"
        >
          {{ leaf.emoji }}
        </div>
      </div>
    </div>

    <!-- コンテンツスロット -->
    <div class="content-layer">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

interface EnvironmentalEffectsProps {
  weather?: 'clear' | 'rain' | 'snow' | 'fog' | 'storm'
  timeOfDay?: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  intensity?: number
  autoTransition?: boolean
  transitionDuration?: number
  enableAurora?: boolean
  enableSeasonalEffects?: boolean
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<EnvironmentalEffectsProps>(), {
  weather: 'clear',
  timeOfDay: 'afternoon',
  season: 'summer',
  intensity: 1.0,
  autoTransition: false,
  transitionDuration: 60000, // 1分
  enableAurora: false,
  enableSeasonalEffects: true,
  reduceMotion: false
})

const emit = defineEmits<{
  weatherChanged: [weather: string]
  timeChanged: [timeOfDay: string]
  seasonChanged: [season: string]
}>()

const currentWeather = ref(props.weather)
const currentTimeOfDay = ref(props.timeOfDay)
const currentSeason = ref(props.season)
const currentTime = ref(new Date())

// エフェクト要素の配列
const rainDrops = ref<any[]>([])
const snowFlakes = ref<any[]>([])
const clouds = ref<any[]>([])
const stars = ref<any[]>([])
const sunRays = ref<any[]>([])
const fogBanks = ref<any[]>([])
const cherryPetals = ref<any[]>([])
const fallingLeaves = ref<any[]>([])

const animationId: number | null = null
let transitionInterval: number | null = null

// 計算されたプロパティ
const showSun = computed(() => {
  return ['dawn', 'morning', 'noon', 'afternoon'].includes(currentTimeOfDay.value)
})

const showMoon = computed(() => {
  return ['evening', 'night'].includes(currentTimeOfDay.value)
})

const showStars = computed(() => {
  return ['evening', 'night', 'dawn'].includes(currentTimeOfDay.value)
})

const showAurora = computed(() => {
  return props.enableAurora && currentTimeOfDay.value === 'night' && 
         ['winter', 'autumn'].includes(currentSeason.value)
})

// スタイル計算
const weatherLayerStyle = computed(() => {
  const baseOpacity = props.reduceMotion ? 0.3 : 0.6
  
  switch (currentWeather.value) {
    case 'rain':
      return {
        background: 'linear-gradient(180deg, rgba(100, 116, 139, 0.3) 0%, rgba(71, 85, 105, 0.2) 100%)',
        opacity: baseOpacity * props.intensity
      }
    case 'snow':
      return {
        background: 'linear-gradient(180deg, rgba(241, 245, 249, 0.4) 0%, rgba(226, 232, 240, 0.3) 100%)',
        opacity: baseOpacity * props.intensity
      }
    case 'fog':
      return {
        background: 'rgba(156, 163, 175, 0.4)',
        opacity: baseOpacity * props.intensity
      }
    case 'storm':
      return {
        background: 'linear-gradient(180deg, rgba(55, 65, 81, 0.5) 0%, rgba(31, 41, 55, 0.4) 100%)',
        opacity: baseOpacity * props.intensity
      }
    default:
      return { opacity: 0 }
  }
})

const timeLayerStyle = computed(() => {
  const timeColors = {
    dawn: 'linear-gradient(180deg, rgba(251, 207, 232, 0.3) 0%, rgba(254, 202, 202, 0.2) 50%, rgba(255, 237, 213, 0.1) 100%)',
    morning: 'linear-gradient(180deg, rgba(254, 240, 138, 0.2) 0%, rgba(187, 247, 208, 0.1) 100%)',
    noon: 'linear-gradient(180deg, rgba(147, 197, 253, 0.2) 0%, rgba(196, 181, 253, 0.1) 100%)',
    afternoon: 'linear-gradient(180deg, rgba(251, 207, 232, 0.2) 0%, rgba(254, 215, 170, 0.1) 100%)',
    evening: 'linear-gradient(180deg, rgba(252, 165, 165, 0.3) 0%, rgba(167, 139, 250, 0.2) 50%, rgba(30, 58, 138, 0.1) 100%)',
    night: 'linear-gradient(180deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.3) 100%)'
  }

  return {
    background: timeColors[currentTimeOfDay.value],
    transition: props.reduceMotion ? 'none' : `all ${props.transitionDuration / 1000}s ease-in-out`
  }
})

const atmosphereStyle = computed(() => ({
  opacity: props.intensity,
  transition: props.reduceMotion ? 'none' : 'opacity 0.5s ease'
}))

const sunStyle = computed(() => {
  const positions = {
    dawn: { left: '10%', top: '70%' },
    morning: { left: '25%', top: '30%' },
    noon: { left: '50%', top: '10%' },
    afternoon: { left: '75%', top: '30%' }
  }

  const pos = positions[currentTimeOfDay.value as keyof typeof positions] || positions.noon

  return {
    left: pos.left,
    top: pos.top,
    transform: 'translate(-50%, -50%)',
    transition: props.reduceMotion ? 'none' : `all ${props.transitionDuration / 1000}s ease-in-out`
  }
})

const moonStyle = computed(() => {
  const positions = {
    evening: { left: '80%', top: '20%' },
    night: { left: '50%', top: '15%' }
  }

  const pos = positions[currentTimeOfDay.value as keyof typeof positions] || positions.night

  return {
    left: pos.left,
    top: pos.top,
    transform: 'translate(-50%, -50%)',
    transition: props.reduceMotion ? 'none' : `all ${props.transitionDuration / 1000}s ease-in-out`
  }
})

// エフェクト生成関数
const generateRainDrops = () => {
  if (props.reduceMotion) return

  rainDrops.value = []
  const dropCount = Math.floor(100 * props.intensity)

  for (let i = 0; i < dropCount; i++) {
    const drop = {
      id: `rain_${i}`,
      style: {
        position: 'absolute',
        left: `${Math.random() * 100}%`,
        top: `${-Math.random() * 20}%`,
        width: '2px',
        height: `${Math.random() * 20 + 10}px`,
        background: 'linear-gradient(180deg, rgba(147, 197, 253, 0.8), rgba(59, 130, 246, 0.4))',
        borderRadius: '1px',
        animation: `rainFall ${Math.random() * 1 + 0.5}s linear infinite`,
        animationDelay: `${Math.random() * 2}s`
      }
    }
    rainDrops.value.push(drop)
  }
}

const generateSnowFlakes = () => {
  if (props.reduceMotion) return

  snowFlakes.value = []
  const flakeCount = Math.floor(50 * props.intensity)

  for (let i = 0; i < flakeCount; i++) {
    const flake = {
      id: `snow_${i}`,
      style: {
        position: 'absolute',
        left: `${Math.random() * 100}%`,
        top: `${-Math.random() * 20}%`,
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: `${Math.random() * 10 + 10}px`,
        animation: `snowFall ${Math.random() * 3 + 2}s linear infinite`,
        animationDelay: `${Math.random() * 3}s`
      }
    }
    snowFlakes.value.push(flake)
  }
}

const generateClouds = () => {
  clouds.value = []
  const cloudCount = Math.floor(8 * props.intensity)

  for (let i = 0; i < cloudCount; i++) {
    const cloud = {
      id: `cloud_${i}`,
      type: Math.random() > 0.5 ? 'light' : 'medium',
      style: {
        position: 'absolute',
        left: `${Math.random() * 120 - 10}%`,
        top: `${Math.random() * 30}%`,
        width: `${Math.random() * 80 + 60}px`,
        height: `${Math.random() * 40 + 30}px`,
        borderRadius: '50px',
        animation: props.reduceMotion ? 'none' : `cloudFloat ${Math.random() * 20 + 30}s linear infinite`,
        animationDelay: `${Math.random() * 10}s`
      }
    }
    clouds.value.push(cloud)
  }
}

const generateStars = () => {
  stars.value = []
  const starCount = Math.floor(100 * props.intensity)

  for (let i = 0; i < starCount; i++) {
    const star = {
      id: `star_${i}`,
      style: {
        position: 'absolute',
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 50}%`,
        width: `${Math.random() * 3 + 1}px`,
        height: `${Math.random() * 3 + 1}px`,
        background: 'white',
        borderRadius: '50%',
        boxShadow: '0 0 6px rgba(255, 255, 255, 0.8)',
        animation: props.reduceMotion ? 'none' : `starTwinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 3}s`
      }
    }
    stars.value.push(star)
  }
}

const generateSunRays = () => {
  sunRays.value = []
  
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30) - 90
    const ray = {
      id: `ray_${i}`,
      style: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '3px',
        height: '20px',
        background: 'linear-gradient(180deg, rgba(251, 191, 36, 0.8), transparent)',
        borderRadius: '2px',
        transformOrigin: '50% 0%',
        transform: `translate(-50%, -100%) rotate(${angle}deg)`,
        animation: props.reduceMotion ? 'none' : `sunRayRotate 8s linear infinite`
      }
    }
    sunRays.value.push(ray)
  }
}

const generateSeasonalEffects = () => {
  if (!props.enableSeasonalEffects || props.reduceMotion) return

  // 春の桜
  if (currentSeason.value === 'spring') {
    cherryPetals.value = []
    const petalCount = Math.floor(30 * props.intensity)

    for (let i = 0; i < petalCount; i++) {
      const petal = {
        id: `petal_${i}`,
        style: {
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${-Math.random() * 20}%`,
          fontSize: `${Math.random() * 8 + 12}px`,
          animation: `petalFall ${Math.random() * 4 + 3}s linear infinite`,
          animationDelay: `${Math.random() * 5}s`
        }
      }
      cherryPetals.value.push(petal)
    }
  }

  // 秋の落ち葉
  if (currentSeason.value === 'autumn') {
    fallingLeaves.value = []
    const leafCount = Math.floor(25 * props.intensity)
    const leafEmojis = ['🍂', '🍁', '🍃']

    for (let i = 0; i < leafCount; i++) {
      const leaf = {
        id: `leaf_${i}`,
        emoji: leafEmojis[Math.floor(Math.random() * leafEmojis.length)],
        style: {
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: `${-Math.random() * 20}%`,
          fontSize: `${Math.random() * 8 + 15}px`,
          animation: `leafFall ${Math.random() * 5 + 4}s linear infinite`,
          animationDelay: `${Math.random() * 4}s`
        }
      }
      fallingLeaves.value.push(leaf)
    }
  }
}

const generateFogBanks = () => {
  if (props.reduceMotion) return

  fogBanks.value = []
  const bankCount = Math.floor(5 * props.intensity)

  for (let i = 0; i < bankCount; i++) {
    const bank = {
      id: `fog_${i}`,
      style: {
        position: 'absolute',
        left: `${Math.random() * 120 - 10}%`,
        bottom: `${Math.random() * 30}%`,
        width: `${Math.random() * 200 + 150}px`,
        height: `${Math.random() * 60 + 40}px`,
        background: 'rgba(156, 163, 175, 0.6)',
        borderRadius: '50px',
        filter: 'blur(8px)',
        animation: `fogDrift ${Math.random() * 30 + 20}s linear infinite`,
        animationDelay: `${Math.random() * 10}s`
      }
    }
    fogBanks.value.push(bank)
  }
}

// 自動遷移
const startAutoTransition = () => {
  if (!props.autoTransition) return

  transitionInterval = window.setInterval(() => {
    // 時間の進行
    const timeSequence = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night']
    const currentIndex = timeSequence.indexOf(currentTimeOfDay.value)
    const nextIndex = (currentIndex + 1) % timeSequence.length
    
    currentTimeOfDay.value = timeSequence[nextIndex]
    emit('timeChanged', currentTimeOfDay.value)

    // 天候の変化（確率的）
    if (Math.random() < 0.3) {
      const weatherOptions = ['clear', 'rain', 'snow', 'fog']
      const newWeather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)]
      changeWeather(newWeather)
    }

    // エフェクトの再生成
    generateAllEffects()
  }, props.transitionDuration)
}

// エフェクト管理
const generateAllEffects = () => {
  generateClouds()
  generateStars()
  generateSunRays()
  
  switch (currentWeather.value) {
    case 'rain':
      generateRainDrops()
      break
    case 'snow':
      generateSnowFlakes()
      break
    case 'fog':
      generateFogBanks()
      break
  }

  generateSeasonalEffects()
}

// 公開メソッド
const changeWeather = (weather: string) => {
  currentWeather.value = weather
  emit('weatherChanged', weather)
  generateAllEffects()
}

const changeTimeOfDay = (timeOfDay: string) => {
  currentTimeOfDay.value = timeOfDay
  emit('timeChanged', timeOfDay)
  generateAllEffects()
}

const changeSeason = (season: string) => {
  currentSeason.value = season
  emit('seasonChanged', season)
  generateSeasonalEffects()
}

// エクスポート
defineExpose({
  changeWeather,
  changeTimeOfDay,
  changeSeason
})

onMounted(() => {
  generateAllEffects()
  
  if (props.autoTransition) {
    startAutoTransition()
  }
})

onUnmounted(() => {
  if (transitionInterval) {
    clearInterval(transitionInterval)
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.environmental-effects {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.weather-layer,
.time-layer,
.atmosphere-layer,
.season-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.weather-layer {
  z-index: 1;
}

.time-layer {
  z-index: 2;
}

.atmosphere-layer {
  z-index: 3;
}

.season-layer {
  z-index: 4;
}

.content-layer {
  position: relative;
  z-index: 10;
}

/* 雨エフェクト */
.rain-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.rain-drop {
  position: absolute;
  pointer-events: none;
}

/* 雪エフェクト */
.snow-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.snow-flake {
  position: absolute;
  pointer-events: none;
  user-select: none;
}

/* 雲エフェクト */
.clouds-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.cloud {
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(2px);
}

.cloud.light {
  background: rgba(255, 255, 255, 0.6);
}

.cloud.medium {
  background: rgba(200, 200, 220, 0.7);
}

/* 太陽 */
.sun {
  position: absolute;
  width: 60px;
  height: 60px;
  background: radial-gradient(circle, #fbbf24 0%, #f59e0b 70%, transparent 100%);
  border-radius: 50%;
  box-shadow: 0 0 40px rgba(251, 191, 36, 0.6);
}

.sun-rays {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.sun-ray {
  position: absolute;
}

/* 月 */
.moon {
  position: absolute;
  width: 50px;
  height: 50px;
  background: radial-gradient(circle at 30% 30%, #f3f4f6 0%, #e5e7eb 100%);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(243, 244, 246, 0.4);
}

.moon-craters {
  position: relative;
  width: 100%;
  height: 100%;
}

.crater {
  position: absolute;
  background: rgba(156, 163, 175, 0.3);
  border-radius: 50%;
}

.crater-1 {
  width: 8px;
  height: 8px;
  top: 15%;
  left: 25%;
}

.crater-2 {
  width: 6px;
  height: 6px;
  top: 45%;
  right: 20%;
}

.crater-3 {
  width: 4px;
  height: 4px;
  bottom: 25%;
  left: 40%;
}

/* 星 */
.stars-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.star {
  position: absolute;
}

/* 霧エフェクト */
.fog-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.fog-bank {
  position: absolute;
}

/* オーロラエフェクト */
.aurora-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.aurora {
  position: absolute;
  top: 0;
  width: 100%;
  height: 60%;
  opacity: 0.6;
  filter: blur(2px);
  animation: auroraWave 8s ease-in-out infinite;
}

.aurora-1 {
  background: linear-gradient(180deg, transparent 0%, rgba(34, 197, 94, 0.3) 50%, transparent 100%);
  animation-delay: 0s;
}

.aurora-2 {
  background: linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.3) 50%, transparent 100%);
  animation-delay: 2s;
}

.aurora-3 {
  background: linear-gradient(180deg, transparent 0%, rgba(167, 139, 250, 0.3) 50%, transparent 100%);
  animation-delay: 4s;
}

/* 季節エフェクト */
.cherry-blossoms,
.falling-leaves {
  position: relative;
  width: 100%;
  height: 100%;
}

.cherry-petal,
.falling-leaf {
  position: absolute;
  pointer-events: none;
  user-select: none;
}

/* アニメーション */
@keyframes rainFall {
  to {
    transform: translateY(100vh);
    opacity: 0;
  }
}

@keyframes snowFall {
  to {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

@keyframes cloudFloat {
  from {
    transform: translateX(-100px);
  }
  to {
    transform: translateX(calc(100vw + 100px));
  }
}

@keyframes starTwinkle {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes sunRayRotate {
  from {
    transform: translate(-50%, -100%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -100%) rotate(360deg);
  }
}

@keyframes fogDrift {
  from {
    transform: translateX(-200px);
    opacity: 0;
  }
  50% {
    opacity: 0.6;
  }
  to {
    transform: translateX(calc(100vw + 200px));
    opacity: 0;
  }
}

@keyframes auroraWave {
  0%, 100% {
    transform: skewX(0deg) scaleY(1);
  }
  25% {
    transform: skewX(-5deg) scaleY(0.8);
  }
  50% {
    transform: skewX(0deg) scaleY(1.1);
  }
  75% {
    transform: skewX(5deg) scaleY(0.9);
  }
}

@keyframes petalFall {
  to {
    transform: translateY(100vh) rotate(360deg) translateX(50px);
  }
}

@keyframes leafFall {
  to {
    transform: translateY(100vh) rotate(180deg) translateX(-30px);
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .rain-drop,
  .snow-flake,
  .cloud,
  .star,
  .sun-ray,
  .fog-bank,
  .aurora,
  .cherry-petal,
  .falling-leaf {
    animation: none !important;
  }
  
  .weather-layer,
  .time-layer {
    opacity: 0.3 !important;
  }
}

/* パフォーマンス最適化 */
.environmental-effects {
  will-change: auto;
}

.rain-drop,
.snow-flake,
.cherry-petal,
.falling-leaf {
  will-change: transform;
}

.cloud,
.fog-bank {
  will-change: transform;
}

.aurora {
  will-change: transform, opacity;
}
</style>