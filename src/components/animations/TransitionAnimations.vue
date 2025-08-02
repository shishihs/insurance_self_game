<template>
  <div class="transition-animations">
    <!-- ページ遷移アニメーション -->
    <Transition
      :name="transitionType"
      mode="out-in"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <slot />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  type?: 'slide' | 'fade' | 'zoom' | 'flip' | 'elastic' | 'game-phase' | 'card-stack' | 'score-change'
  direction?: 'left' | 'right' | 'up' | 'down'
  duration?: number
  easing?: string
  intensity?: 'subtle' | 'normal' | 'dramatic'
}

const props = withDefaults(defineProps<Props>(), {
  type: 'fade',
  direction: 'right',
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  intensity: 'normal'
})

const transitionType = computed(() => {
  return `${props.type}-${props.direction}-${props.intensity}`
})

const onBeforeEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.transitionDuration = `${props.duration}ms`
  element.style.transitionTimingFunction = props.easing
}

const onEnter = (el: Element, done: () => void) => {
  // エンター時のロジック
  setTimeout(done, props.duration)
}

const onLeave = (el: Element, done: () => void) => {
  // リーブ時のロジック
  setTimeout(done, props.duration)
}
</script>

<style scoped>
/* =================================
   ページ遷移アニメーション基本設定
   ================================= */
.transition-animations {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* =================================
   フェードトランジション
   ================================= */
.fade-left-enter-active,
.fade-right-enter-active,
.fade-up-enter-active,
.fade-down-enter-active,
.fade-left-leave-active,
.fade-right-leave-active,
.fade-up-leave-active,
.fade-down-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.fade-left-enter-from,
.fade-right-enter-from,
.fade-up-enter-from,
.fade-down-enter-from {
  opacity: 0;
}

.fade-left-leave-to,
.fade-right-leave-to,
.fade-up-leave-to,
.fade-down-leave-to {
  opacity: 0;
}

/* =================================
   スライドトランジション
   ================================= */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.slide-left-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.slide-down-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* =================================
   ズームトランジション
   ================================= */
.zoom-left-enter-active,
.zoom-right-enter-active,
.zoom-up-enter-active,
.zoom-down-enter-active,
.zoom-left-leave-active,
.zoom-right-leave-active,
.zoom-up-leave-active,
.zoom-down-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.zoom-left-enter-from,
.zoom-right-enter-from,
.zoom-up-enter-from,
.zoom-down-enter-from {
  transform: scale(0.8);
  opacity: 0;
}

.zoom-left-leave-to,
.zoom-right-leave-to,
.zoom-up-leave-to,
.zoom-down-leave-to {
  transform: scale(1.2);
  opacity: 0;
}

/* =================================
   フリップトランジション
   ================================= */
.flip-left-enter-active,
.flip-left-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.flip-left-enter-from {
  transform: rotateY(-90deg);
  opacity: 0;
}

.flip-left-leave-to {
  transform: rotateY(90deg);
  opacity: 0;
}

.flip-right-enter-active,
.flip-right-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.flip-right-enter-from {
  transform: rotateY(90deg);
  opacity: 0;
}

.flip-right-leave-to {
  transform: rotateY(-90deg);
  opacity: 0;
}

/* =================================
   エラスティックトランジション
   ================================= */
.elastic-left-enter-active,
.elastic-right-enter-active,
.elastic-up-enter-active,
.elastic-down-enter-active {
  transition: all var(--transition-duration, 600ms) cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.elastic-left-leave-active,
.elastic-right-leave-active,
.elastic-up-leave-active,
.elastic-down-leave-active {
  transition: all var(--transition-duration, 300ms) var(--transition-easing, cubic-bezier(0.4, 0, 0.2, 1));
}

.elastic-left-enter-from,
.elastic-right-enter-from,
.elastic-up-enter-from,
.elastic-down-enter-from {
  transform: scale(0.5);
  opacity: 0;
}

.elastic-left-leave-to,
.elastic-right-leave-to,
.elastic-up-leave-to,
.elastic-down-leave-to {
  transform: scale(0.8);
  opacity: 0;
}

/* =================================
   レスポンシブアニメーション
   ================================= */
@media (max-width: 768px) {
  .slide-left-enter-from,
  .slide-right-enter-from,
  .slide-up-enter-from,
  .slide-down-enter-from {
    /* モバイルでは控えめなアニメーション */
    transform: translateX(0) scale(0.95);
  }
}

/* =================================
   ゲーム状態変化トランジション
   ================================= */

/* ゲームフェーズ遷移 */
.game-phase-up-normal-enter-active,
.game-phase-up-normal-leave-active {
  transition: all 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.game-phase-up-subtle-enter-active,
.game-phase-up-subtle-leave-active {
  transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
}

.game-phase-up-dramatic-enter-active,
.game-phase-up-dramatic-leave-active {
  transition: all 800ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.game-phase-up-normal-enter-from,
.game-phase-up-subtle-enter-from,
.game-phase-up-dramatic-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.game-phase-up-normal-leave-to,
.game-phase-up-subtle-leave-to,
.game-phase-up-dramatic-leave-to {
  opacity: 0;
  transform: translateY(-30px) scale(1.05);
}

/* カードスタック遷移 */
.card-stack-up-normal-enter-active,
.card-stack-up-normal-leave-active {
  transition: all 500ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card-stack-up-normal-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9) rotateX(15deg);
}

.card-stack-up-normal-leave-to {
  opacity: 0;
  transform: translateY(-20px) scale(1.1) rotateX(-15deg);
}

/* スコア変更アニメーション */
.score-change-up-normal-enter-active {
  transition: all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.score-change-up-normal-leave-active {
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.score-change-up-normal-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.score-change-up-normal-leave-to {
  opacity: 0;
  transform: scale(1.2);
}

.score-change-up-dramatic-enter-active {
  animation: score-pop-in 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes score-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-5deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.15) rotate(2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

/* =================================
   レスポンシブゲームアニメーション
   ================================= */
@media (max-width: 768px) {
  .game-phase-up-normal-enter-from,
  .game-phase-up-subtle-enter-from,
  .game-phase-up-dramatic-enter-from,
  .card-stack-up-normal-enter-from {
    /* モバイルでは控えめなアニメーション */
    transform: translateY(15px) scale(0.98);
  }
  
  .game-phase-up-normal-leave-to,
  .game-phase-up-subtle-leave-to,
  .game-phase-up-dramatic-leave-to,
  .card-stack-up-normal-leave-to {
    transform: translateY(-15px) scale(1.02);
  }
}

/* =================================
   モーション削減設定
   ================================= */
@media (prefers-reduced-motion: reduce) {
  .fade-left-enter-active,
  .fade-right-enter-active,
  .fade-up-enter-active,
  .fade-down-enter-active,
  .fade-left-leave-active,
  .fade-right-leave-active,
  .fade-up-leave-active,
  .fade-down-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active,
  .slide-down-enter-active,
  .slide-down-leave-active,
  .zoom-left-enter-active,
  .zoom-right-enter-active,
  .zoom-up-enter-active,
  .zoom-down-enter-active,
  .zoom-left-leave-active,
  .zoom-right-leave-active,
  .zoom-up-leave-active,
  .zoom-down-leave-active,
  .flip-left-enter-active,
  .flip-left-leave-active,
  .flip-right-enter-active,
  .flip-right-leave-active,
  .elastic-left-enter-active,
  .elastic-right-enter-active,
  .elastic-up-enter-active,
  .elastic-down-enter-active,
  .elastic-left-leave-active,
  .elastic-right-leave-active,
  .elastic-up-leave-active,
  .elastic-down-leave-active,
  .game-phase-up-normal-enter-active,
  .game-phase-up-subtle-enter-active,
  .game-phase-up-dramatic-enter-active,
  .game-phase-up-normal-leave-active,
  .game-phase-up-subtle-leave-active,
  .game-phase-up-dramatic-leave-active,
  .card-stack-up-normal-enter-active,
  .card-stack-up-normal-leave-active,
  .score-change-up-normal-enter-active,
  .score-change-up-normal-leave-active,
  .score-change-up-dramatic-enter-active {
    transition: opacity 200ms ease !important;
    transform: none !important;
    animation: none !important;
  }

  .slide-left-enter-from,
  .slide-right-enter-from,
  .slide-up-enter-from,
  .slide-down-enter-from,
  .slide-left-leave-to,
  .slide-right-leave-to,
  .slide-up-leave-to,
  .slide-down-leave-to,
  .zoom-left-enter-from,
  .zoom-right-enter-from,
  .zoom-up-enter-from,
  .zoom-down-enter-from,
  .zoom-left-leave-to,
  .zoom-right-leave-to,
  .zoom-up-leave-to,
  .zoom-down-leave-to,
  .flip-left-enter-from,
  .flip-right-enter-from,
  .flip-left-leave-to,
  .flip-right-leave-to,
  .elastic-left-enter-from,
  .elastic-right-enter-from,
  .elastic-up-enter-from,
  .elastic-down-enter-from,
  .elastic-left-leave-to,
  .elastic-right-leave-to,
  .elastic-up-leave-to,
  .elastic-down-leave-to,
  .game-phase-up-normal-enter-from,
  .game-phase-up-subtle-enter-from,
  .game-phase-up-dramatic-enter-from,
  .game-phase-up-normal-leave-to,
  .game-phase-up-subtle-leave-to,
  .game-phase-up-dramatic-leave-to,
  .card-stack-up-normal-enter-from,
  .card-stack-up-normal-leave-to,
  .score-change-up-normal-enter-from,
  .score-change-up-normal-leave-to {
    transform: none !important;
  }
}
</style>