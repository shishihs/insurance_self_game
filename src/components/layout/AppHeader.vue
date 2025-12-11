<template>
  <header class="app-header">
    <div class="hero-section">
      <!-- 浮遊パーティクル -->
      <div class="particles-container">
        <div class="particle" v-for="n in 20" :key="n" :style="particleStyle(n)"></div>
      </div>
      <!-- スターダスト -->
      <div class="stardust-container">
        <div class="stardust" v-for="n in 15" :key="'star' + n" :style="stardustStyle(n)"></div>
      </div>
      <div class="hero-background">
        <div class="hero-orb hero-orb-1"></div>
        <div class="hero-orb hero-orb-2"></div>
        <div class="hero-orb hero-orb-3"></div>
      </div>
      <div class="hero-content">
        <div class="brand-logo pulse">
          <div class="logo-glow"></div>
          <span class="logo-icon">🛡️</span>
        </div>
        <h1 class="hero-title bounce-in" style="animation-delay: 0.2s;">
          人生充実ゲーム
        </h1>
        <p class="hero-subtitle bounce-in" style="animation-delay: 0.4s;">
          Life Fulfillment - 生命保険を「人生の味方」として描く
        </p>
        <div class="hero-accent bounce-in" style="animation-delay: 0.6s;">
          <span class="accent-icon">✨</span>
          <span class="accent-text">一人の時間を、最高の冒険に</span>
          <span class="accent-icon">✨</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// パーティクルのスタイルを動的に生成
const particleStyle = (n: number) => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${n * 0.3}s`,
  animationDuration: `${3 + Math.random() * 4}s`,
  width: `${4 + Math.random() * 6}px`,
  height: `${4 + Math.random() * 6}px`,
  opacity: 0.3 + Math.random() * 0.5
})

// スターダストのスタイル
const stardustStyle = (n: number) => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${n * 0.5}s`,
  animationDuration: `${2 + Math.random() * 3}s`
})
</script>

<style scoped>
/* ===========================================
   ヘッダー専用スタイル
   ========================================= */

.app-header {
  text-align: center;
  padding: var(--space-lg) 0 var(--space-md);
  position: relative;
  overflow: hidden;
}

.hero-section {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

/* パーティクルコンテナ */
.particles-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.9) 0%, rgba(168, 85, 247, 0.6) 50%, transparent 70%);
  border-radius: 50%;
  animation: particle-float linear infinite;
  filter: blur(1px);
}

@keyframes particle-float {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) rotate(720deg);
    opacity: 0;
  }
}

/* スターダスト */
.stardust-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
}

.stardust {
  position: absolute;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  animation: twinkle ease-in-out infinite;
  box-shadow: 
    0 0 6px 2px rgba(255, 255, 255, 0.6),
    0 0 12px 4px rgba(129, 140, 248, 0.4);
}

@keyframes twinkle {
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

/* 背景装飾 */
.hero-background {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  opacity: 0.2;
}

.hero-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  animation: float 20s infinite ease-in-out;
}

.hero-orb-1 {
  width: 400px;
  height: 400px;
  background: var(--brand-gradient-primary);
  top: -20%;
  left: -10%;
  animation-delay: 0s;
}

.hero-orb-2 {
  width: 300px;
  height: 300px;
  background: var(--brand-gradient-soft);
  bottom: -20%;
  right: -10%;
  animation-delay: 7s;
}

.hero-orb-3 {
  width: 250px;
  height: 250px;
  background: var(--vitality-high);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.brand-logo {
  display: inline-block;
  margin-bottom: var(--space-md);
  position: relative;
}

.logo-icon {
  font-size: 4rem;
  line-height: 1;
  display: block;
  filter: drop-shadow(0 4px 20px rgba(129, 140, 248, 0.4));
  position: relative;
  z-index: 2;
}

.logo-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.4) 0%, transparent 70%);
  filter: blur(20px);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.3);
    opacity: 0.6;
  }
}

.hero-title {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 800;
  margin-bottom: var(--space-md);
  position: relative;
  
  background: var(--brand-gradient-hero);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: gradient-shift 8s ease-in-out infinite;
  
  text-decoration: none;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* タイトルのシマーエフェクト */
.hero-title::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0% {
    left: -100%;
  }
  50%, 100% {
    left: 100%;
  }
}

@keyframes gradient-shift {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.hero-subtitle {
  font-size: clamp(1rem, 3vw, 1.375rem);
  color: rgba(209, 213, 219, 0.9);
  margin-bottom: var(--space-lg);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.01em;
}

.hero-accent {
  font-size: clamp(0.9rem, 2.5vw, 1.15rem);
  color: rgba(129, 140, 248, 0.9);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 9999px;
  backdrop-filter: blur(10px);
  margin-bottom: var(--space-lg);
}

.accent-icon {
  font-size: 1.2em;
  filter: brightness(1.2);
}

.accent-text {
  letter-spacing: 0.02em;
}

/* 統計情報 */
.hero-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xl);
  margin-top: var(--space-xl);
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: var(--font-weight-bold);
  background: var(--brand-gradient-soft);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: var(--space-xs);
}

.stat-label {
  display: block;
  font-size: clamp(0.75rem, 2vw, 0.875rem);
  color: rgba(156, 163, 175, 0.8);
  font-weight: var(--font-weight-medium);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, transparent, rgba(129, 140, 248, 0.3), transparent);
}

/* アニメーション */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  60% {
    opacity: 1;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.pulse {
  animation: pulse 2s ease-in-out infinite;
}

.bounce-in {
  animation: bounce-in 0.8s ease-out both;
  /* フォールバック: アニメーション失敗時は表示される */
  opacity: 1;
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .pulse,
  .bounce-in {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .app-header {
    padding: var(--space-sm) 0;
  }
  
  .logo-icon {
    font-size: 3rem;
  }
  
  .logo-glow {
    width: 80px;
    height: 80px;
  }
  
  .hero-stats {
    gap: var(--space-lg);
    margin-top: var(--space-lg);
  }
  
  .stat-divider {
    height: 30px;
  }
  
  .hero-orb {
    filter: blur(40px);
  }
  
  .hero-orb-1 {
    width: 250px;
    height: 250px;
  }
  
  .hero-orb-2 {
    width: 200px;
    height: 200px;
  }
  
  .hero-orb-3 {
    width: 150px;
    height: 150px;
  }
}

@media (max-width: 375px) {
  .hero-title {
    font-size: 2rem;
    line-height: 1.2;
  }
  
  .hero-subtitle {
    font-size: var(--text-base);
    line-height: 1.5;
  }
}
</style>