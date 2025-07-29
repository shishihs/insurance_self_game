<template>
  <header class="app-header">
    <div class="hero-section">
      <div class="brand-logo pulse">
        <span class="logo-icon">🌟</span>
      </div>
      <h1 class="hero-title bounce-in" style="animation-delay: 0.2s;">
        人生充実ゲーム
      </h1>
      <p class="hero-subtitle bounce-in" style="animation-delay: 0.4s;">
        Life Fulfillment - 生命保険を「人生の味方」として描く
      </p>
      <div class="hero-accent bounce-in" style="animation-delay: 0.6s;">
        ✨ 一人の時間を、最高の冒険に ✨
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
  padding: var(--space-xl) 0;
}

.hero-section {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.brand-logo {
  display: inline-block;
  margin-bottom: var(--space-md);
}

.logo-icon {
  font-size: 3rem;
  line-height: 1;
  display: block;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  margin-bottom: var(--space-md);
  
  background: var(--primary-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  text-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: clamp(1rem, 3vw, 1.25rem);
  color: rgb(156, 163, 175);
  margin-bottom: var(--space-xl);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.hero-accent {
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  color: rgba(129, 140, 248, 0.8);
  font-weight: 500;
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
    padding: var(--space-lg) 0;
  }
  
  .logo-icon {
    font-size: 2.5rem;
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