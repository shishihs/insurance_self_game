<template>
  <div 
    ref="gameContainer"
    class="responsive-game-interface"
    :class="interfaceClasses"
    :style="interfaceStyles"
  >
    <!-- レスポンシブヘッダー -->
    <header class="game-header" :style="headerStyles">
      <div class="header-content">
        <!-- ゲームタイトル -->
        <h1 class="game-title" :style="titleStyles">
          {{ gameTitle }}
        </h1>
        
        <!-- ゲーム統計（コンパクト表示） -->
        <div class="game-stats" v-if="showStats">
          <div class="stat-item">
            <Icon name="heart" />
            <span :style="statTextStyles">{{ vitality }}</span>
          </div>
          <div class="stat-item">
            <Icon name="clock" />
            <span :style="statTextStyles">{{ turn }}</span>
          </div>
          <div class="stat-item" v-if="containerState?.width && containerState.width > 480">
            <Icon name="cards" />
            <span :style="statTextStyles">{{ cardsInHand }}</span>
          </div>
        </div>
      </div>
    </header>
    
    <!-- メインゲームエリア -->
    <main class="game-main" :style="mainStyles">
      <!-- ゲームボード -->
      <section 
        class="game-board"
        :class="boardClasses"
        :style="boardStyles"
      >
        <slot name="game-board" :container-state="containerState" :viewport="viewportInfo" />
      </section>
      
      <!-- サイドパネル（デスクトップ時） -->
      <aside 
        v-if="showSidebar"
        class="game-sidebar"
        :style="sidebarStyles"
      >
        <slot name="sidebar" :container-state="containerState" />
      </aside>
    </main>
    
    <!-- モバイル用ボトムナビ -->
    <nav 
      v-if="isMobileLayout"
      class="mobile-bottom-nav"
      :style="bottomNavStyles"
    >
      <slot name="mobile-nav" :container-state="containerState" />
    </nav>
    
    <!-- フローティングアクション -->
    <div 
      v-if="showFloatingActions"
      class="floating-actions"
      :style="floatingStyles"
    >
      <slot name="floating-actions" />
    </div>
    
    <!-- 適応型通知エリア -->
    <div 
      class="notification-area"
      :class="notificationClasses"
      :style="notificationStyles"
    >
      <slot name="notifications" />
    </div>
    
    <!-- レスポンシブオーバーレイ -->
    <div 
      v-if="showOverlay"
      class="responsive-overlay"
      :style="overlayStyles"
    >
      <slot name="overlay" :close-overlay="closeOverlay" />
    </div>
    
    <!-- デバッグ情報（開発時のみ） -->
    <div 
      v-if="showDebugInfo"
      class="debug-info"
    >
      <details>
        <summary>レスポンシブデバッグ</summary>
        <pre>{{ debugInfo }}</pre>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useViewport } from '../../utils/responsive/ViewportManager'
import { useResponsiveContainer } from '../../utils/responsive/ResponsiveContainer'
import { useMultilingualLayout } from '../../utils/responsive/MultilingualLayoutManager'

// Props
interface Props {
  gameTitle?: string
  vitality?: number
  turn?: number
  cardsInHand?: number
  showStats?: boolean
  showSidebar?: boolean
  showFloatingActions?: boolean
  showOverlay?: boolean
  showDebugInfo?: boolean
  adaptiveLayout?: boolean
  optimizeForTouch?: boolean
  language?: string
}

const props = withDefaults(defineProps<Props>(), {
  gameTitle: '人生充実ゲーム',
  vitality: 100,
  turn: 1,
  cardsInHand: 5,
  showStats: true,
  showSidebar: true,
  showFloatingActions: true,
  showOverlay: false,
  showDebugInfo: false,
  adaptiveLayout: true,
  optimizeForTouch: true,
  language: 'ja'
})

// Emits
const emit = defineEmits<{
  layoutChange: [layout: string]
  breakpointChange: [breakpoint: string]
  orientationChange: [orientation: string]
  overlayClose: []
}>()

// Refs
const gameContainer = ref<HTMLElement>()

// Composables
const { viewportInfo, matches, getValue } = useViewport()
const { containerState } = useResponsiveContainer(gameContainer, {
  type: 'size',
  observeResize: true
})
const { 
  currentLanguage, 
  setLanguage, 
  calculateResponsiveTextSize,
  currentLanguageInfo 
} = useMultilingualLayout()

// Reactive state
const currentLayout = ref<'mobile' | 'tablet' | 'desktop'>('desktop')

// Computed properties
const isMobileLayout = computed(() => 
  viewportInfo.value?.deviceType === 'mobile' || 
  matches('sm:below') ||
  (containerState.value && containerState.value.width < 640)
)

const isTabletLayout = computed(() => 
  viewportInfo.value?.deviceType === 'tablet' ||
  matches('lg:below') && !isMobileLayout.value
)

const isDesktopLayout = computed(() => 
  !isMobileLayout.value && !isTabletLayout.value
)

const isLandscape = computed(() => 
  viewportInfo.value?.orientation === 'landscape'
)

const isTouchDevice = computed(() => 
  viewportInfo.value?.hasTouch
)

const safeDimensions = computed(() => {
  if (!viewportInfo.value) return { width: 0, height: 0 }
  
  const { safeAreaInsets, width, height } = viewportInfo.value
  return {
    width: width - safeAreaInsets.left - safeAreaInsets.right,
    height: height - safeAreaInsets.top - safeAreaInsets.bottom
  }
})

// Interface classes
const interfaceClasses = computed(() => ({
  'mobile-layout': isMobileLayout.value,
  'tablet-layout': isTabletLayout.value,
  'desktop-layout': isDesktopLayout.value,
  'landscape-mode': isLandscape.value,
  'portrait-mode': !isLandscape.value,
  'touch-device': isTouchDevice.value,
  'high-dpi': viewportInfo.value?.devicePixelRatio && viewportInfo.value.devicePixelRatio > 1.5,
  [`lang-${currentLanguage.value}`]: true,
  [`breakpoint-${viewportInfo.value?.breakpoint}`]: true
}))

// Dynamic styles
const interfaceStyles = computed(() => {
  const styles: Record<string, string> = {}
  
  if (viewportInfo.value) {
    const { safeAreaInsets } = viewportInfo.value
    
    // セーフエリア対応
    styles['--safe-area-top'] = `${safeAreaInsets.top}px`
    styles['--safe-area-right'] = `${safeAreaInsets.right}px`
    styles['--safe-area-bottom'] = `${safeAreaInsets.bottom}px`
    styles['--safe-area-left'] = `${safeAreaInsets.left}px`
    
    // DPI対応
    styles['--pixel-ratio'] = String(viewportInfo.value.devicePixelRatio)
    
    // コンテナ情報
    if (containerState.value) {
      styles['--container-width'] = `${containerState.value.width}px`
      styles['--container-height'] = `${containerState.value.height}px`
    }
  }
  
  return styles
})

const headerStyles = computed(() => {
  const containerWidth = containerState.value?.width || 400
  
  return {
    padding: getValue({
      xs: '8px 12px',
      sm: '12px 16px',
      md: '16px 20px',
      lg: '20px 24px',
      base: '16px 20px'
    }),
    minHeight: getValue({
      xs: '48px',
      sm: '56px',
      md: '64px',
      base: '56px'
    })
  }
})

const titleStyles = computed(() => {
  if (!containerState.value || !currentLanguageInfo.value) {
    return {}
  }
  
  const responsiveSize = calculateResponsiveTextSize(
    20, // base size
    containerState.value.width,
    props.gameTitle,
    { preferredAspectRatio: 16/9 }
  )
  
  return {
    fontSize: `${responsiveSize?.fontSize}px`,
    lineHeight: `${responsiveSize?.lineHeight}px`,
    letterSpacing: `${responsiveSize?.letterSpacing}px`
  }
})

const statTextStyles = computed(() => {
  const baseSize = getValue({
    xs: 12,
    sm: 14,
    md: 16,
    base: 14
  })
  
  return {
    fontSize: `${baseSize}px`,
    fontWeight: getValue({
      xs: '500',
      sm: '500',
      md: '400',
      base: '500'
    })
  }
})

const mainStyles = computed(() => ({
  display: 'flex',
  flexDirection: getValue({
    xs: 'column',
    sm: 'column',
    md: isLandscape.value ? 'row' : 'column',
    lg: 'row',
    base: 'column'
  }) as 'row' | 'column',
  gap: getValue({
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    base: '12px'
  }),
  padding: getValue({
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    base: '12px'
  })
}))

const boardClasses = computed(() => ({
  'board-mobile': isMobileLayout.value,
  'board-tablet': isTabletLayout.value,
  'board-desktop': isDesktopLayout.value,
  'board-landscape': isLandscape.value && isMobileLayout.value
}))

const boardStyles = computed(() => {
  const styles: Record<string, any> = {
    flex: getValue({
      xs: '1',
      sm: '1',
      md: isLandscape.value ? '1' : '1',
      lg: props.showSidebar ? '1' : '1',
      base: '1'
    }),
    minHeight: getValue({
      xs: '300px',
      sm: '400px',
      md: '500px',
      lg: '600px',
      base: '400px'
    })
  }
  
  // アスペクト比の維持
  if (containerState.value) {
    const aspectRatio = containerState.value.aspectRatio
    if (aspectRatio < 1) { // 縦長の場合
      styles.maxWidth = '100%'
    }
  }
  
  return styles
})

const sidebarStyles = computed(() => ({
  width: getValue({
    md: '280px',
    lg: '320px',
    xl: '360px',
    base: '300px'
  }),
  minWidth: getValue({
    md: '240px',
    lg: '280px',
    base: '240px'
  }),
  display: getValue({
    xs: 'none',
    sm: 'none',
    md: isLandscape.value ? 'block' : 'none',
    lg: 'block',
    base: 'none'
  })
}))

const bottomNavStyles = computed(() => ({
  height: getValue({
    xs: '60px',
    sm: '68px',
    base: '60px'
  }),
  padding: getValue({
    xs: '8px 12px',
    sm: '12px 16px',
    base: '8px 12px'
  }),
  paddingBottom: `calc(${getValue({
    xs: '8px',
    sm: '12px',
    base: '8px'
  })} + var(--safe-area-bottom))`
}))

const floatingStyles = computed(() => ({
  position: 'fixed',
  bottom: `calc(${getValue({
    xs: '80px',
    sm: '88px',
    base: '80px'
  })} + var(--safe-area-bottom))`,
  right: `calc(${getValue({
    xs: '16px',
    sm: '20px',
    md: '24px',
    base: '16px'
  })} + var(--safe-area-right))`,
  zIndex: '1000'
}))

const notificationClasses = computed(() => ({
  'notifications-mobile': isMobileLayout.value,
  'notifications-desktop': isDesktopLayout.value,
  'notifications-top': !isMobileLayout.value,
  'notifications-bottom': isMobileLayout.value
}))

const notificationStyles = computed(() => {
  if (isMobileLayout.value) {
    return {
      position: 'fixed',
      bottom: `calc(${getValue({
        xs: '70px',
        sm: '78px',
        base: '70px'
      })} + var(--safe-area-bottom))`,
      left: `calc(${getValue({
        xs: '12px',
        sm: '16px',
        base: '12px'
      })} + var(--safe-area-left))`,
      right: `calc(${getValue({
        xs: '12px',
        sm: '16px',
        base: '12px'
      })} + var(--safe-area-right))`,
      zIndex: '999'
    }
  }
  
  return {
    position: 'fixed',
    top: `calc(${getValue({
      md: '80px',
      lg: '90px',
      base: '80px'
    })} + var(--safe-area-top))`,
    right: `calc(${getValue({
      md: '20px',
      lg: '24px',
      base: '20px'
    })} + var(--safe-area-right))`,
    maxWidth: '400px',
    zIndex: '999'
  }
})

const overlayStyles = computed(() => ({
  position: 'fixed',
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  background: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: '10000',
  padding: `calc(var(--safe-area-top) + 20px) calc(var(--safe-area-right) + 20px) calc(var(--safe-area-bottom) + 20px) calc(var(--safe-area-left) + 20px)`
}))

const debugInfo = computed(() => ({
  viewport: viewportInfo.value,
  container: containerState.value,
  layout: currentLayout.value,
  language: currentLanguage.value,
  responsive_values: {
    isMobile: isMobileLayout.value,
    isTablet: isTabletLayout.value,
    isDesktop: isDesktopLayout.value,
    isLandscape: isLandscape.value,
    isTouch: isTouchDevice.value
  }
}))

// Methods
const closeOverlay = () => {
  emit('overlayClose')
}

const updateLayout = () => {
  let newLayout: typeof currentLayout.value = 'desktop'
  
  if (isMobileLayout.value) {
    newLayout = 'mobile'
  } else if (isTabletLayout.value) {
    newLayout = 'tablet'
  }
  
  if (currentLayout.value !== newLayout) {
    currentLayout.value = newLayout
    emit('layoutChange', newLayout)
  }
}

// Watchers
watch(viewportInfo, (newInfo, oldInfo) => {
  if (!newInfo) return
  
  updateLayout()
  
  if (oldInfo && newInfo.breakpoint !== oldInfo.breakpoint) {
    emit('breakpointChange', newInfo.breakpoint)
  }
  
  if (oldInfo && newInfo.orientation !== oldInfo.orientation) {
    emit('orientationChange', newInfo.orientation)
  }
}, { deep: true })

watch(() => props.language, (newLang) => {
  if (newLang) {
    setLanguage(newLang)
  }
})

// Lifecycle
onMounted(() => {
  updateLayout()
  
  if (props.language) {
    setLanguage(props.language)
  }
})

// Expose public methods
defineExpose({
  containerState,
  viewportInfo,
  isMobileLayout,
  isTabletLayout,
  isDesktopLayout,
  currentLayout,
  updateLayout
})
</script>

<style scoped>
.responsive-game-interface {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  overflow: hidden;
  position: relative;
}

/* ヘッダースタイル */
.game-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.game-title {
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-stats {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 14px;
}

.stat-item svg {
  width: 16px;
  height: 16px;
}

/* メインコンテンツ */
.game-main {
  flex: 1;
  min-height: 0;
  position: relative;
}

.game-board {
  background: var(--bg-primary);
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.game-sidebar {
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-light);
  overflow-y: auto;
  flex-shrink: 0;
}

/* モバイルボトムナビ */
.mobile-bottom-nav {
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-light);
  flex-shrink: 0;
  position: relative;
  z-index: 100;
}

/* 通知エリア */
.notification-area {
  pointer-events: none;
}

.notification-area > * {
  pointer-events: auto;
}

/* レスポンシブオーバーレイ */
.responsive-overlay {
  backdrop-filter: blur(4px);
}

/* デバッグ情報 */
.debug-info {
  position: fixed;
  top: calc(var(--safe-area-top) + 10px);
  left: calc(var(--safe-area-left) + 10px);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px;
  border-radius: 4px;
  font-size: 10px;
  font-family: monospace;
  z-index: 9999;
  max-width: 300px;
  max-height: 200px;
  overflow: auto;
}

.debug-info summary {
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 8px;
}

.debug-info pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* レイアウト特化スタイル */
.mobile-layout {
  --base-padding: 12px;
  --element-gap: 8px;
  --touch-target: 48px;
}

.tablet-layout {
  --base-padding: 16px;
  --element-gap: 12px;
  --touch-target: 44px;
}

.desktop-layout {
  --base-padding: 20px;
  --element-gap: 16px;
  --touch-target: 40px;
}

/* 向き対応 */
.landscape-mode.mobile-layout .game-main {
  flex-direction: row;
}

.landscape-mode.mobile-layout .mobile-bottom-nav {
  display: none;
}

/* タッチデバイス対応 */
.touch-device {
  --min-touch-target: var(--touch-target);
}

.touch-device * {
  min-height: var(--min-touch-target);
  min-width: var(--min-touch-target);
}

/* 高DPI対応 */
.high-dpi {
  --border-width: 0.5px;
}

.high-dpi .game-header,
.high-dpi .mobile-bottom-nav {
  border-width: var(--border-width);
}

/* ボードレイアウト */
.board-mobile {
  border-radius: 0;
  margin: 0;
}

.board-tablet {
  border-radius: 12px;
}

.board-desktop {
  border-radius: 16px;
}

.board-landscape {
  height: calc(100vh - var(--safe-area-top) - var(--safe-area-bottom) - 120px);
}

/* 言語特化スタイル */
.lang-ja .game-title {
  font-family: 'Noto Sans JP', sans-serif;
  letter-spacing: 0.05em;
}

.lang-en .game-title {
  font-family: 'Inter', sans-serif;
  letter-spacing: -0.02em;
}

/* アニメーション */
.responsive-overlay {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* メディアクエリによる追加調整 */
@media (max-width: 640px) {
  .game-stats .stat-item:nth-child(n+3) {
    display: none;
  }
}

@media (max-height: 600px) and (orientation: landscape) {
  .game-header {
    padding-top: 8px;
    padding-bottom: 8px;
  }
  
  .game-title {
    font-size: 18px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .responsive-overlay {
    animation: none;
  }
}

/* コンテナクエリ（対応ブラウザのみ） */
@container (max-width: 400px) {
  .game-stats {
    gap: 8px;
  }
  
  .stat-item {
    font-size: 12px;
  }
}

@container (min-width: 800px) {
  .game-board {
    border-radius: 20px;
  }
}
</style>