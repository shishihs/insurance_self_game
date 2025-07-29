<template>
  <header class="app-header">
    <div class="hero-section">
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
        <div class="hero-stats bounce-in" style="animation-delay: 0.8s;">
          <div class="stat-item">
            <span class="stat-value">100+</span>
            <span class="stat-label">イベントカード</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">7</span>
            <span class="stat-label">人生ステージ</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">∞</span>
            <span class="stat-label">プレイパターン</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// ヘッダーは純粋なプレゼンテーション層
// プロップスやイベントは不要
</script>

<style scoped>
/* ===========================================
   ヘッダー専用スタイル
   ========================================= */

.app-header {
  text-align: center;
  padding: var(--space-2xl) 0;
  position: relative;
  overflow: hidden;
}

.hero-section {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  position: relative;
}

/* 背景装飾 */
.hero-background {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  opacity: 0.15;
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
  margin-bottom: var(--space-lg);
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
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 800;
  margin-bottom: var(--space-md);
  
  background: var(--brand-gradient-hero);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: gradient-shift 8s ease-in-out infinite;
  
  filter: drop-shadow(0 4px 20px rgba(102, 126, 234, 0.3));
  line-height: 1.1;
  letter-spacing: -0.02em;
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
  margin-bottom: var(--space-xl);
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
  margin-bottom: var(--space-xl);
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
  margin-top: var(--space-2xl);
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
  animation: bounce-in 0.8s ease-out forwards;
  opacity: 0;
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .pulse,
  .bounce-in {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .app-header {
    padding: var(--space-xl) 0;
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
    margin-top: var(--space-xl);
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