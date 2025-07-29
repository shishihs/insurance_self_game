import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { StatisticsDataService, type StatisticsData, type RealtimeStatistics, type StatisticsFilter } from '../domain/services/StatisticsDataService'
import type { Game } from '../domain/entities/Game'

/**
 * 統計データ管理のためのコンポーザブル
 * Vueコンポーネントから統計機能を簡単に利用できるようにする
 */
export function useStatistics() {
  const statisticsService = StatisticsDataService.getInstance()
  
  // リアクティブな統計データ
  const statisticsData = ref<StatisticsData | null>(null)
  const realtimeData = ref<RealtimeStatistics | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // フィルター設定
  const filters = reactive<StatisticsFilter>({})
  
  // 自動更新設定
  const autoUpdate = ref(true)
  const updateInterval = ref(30000) // 30秒
  
  let updateTimer: number | null = null
  let unsubscribe: (() => void) | null = null
  
  // 統計データの取得
  const fetchStatistics = async (customFilter?: StatisticsFilter) => {
    loading.value = true
    error.value = null
    
    try {
      const filter = customFilter || filters
      statisticsData.value = statisticsService.generateStatistics(filter)
      realtimeData.value = statisticsService.getRealtimeStatistics()
    } catch (err) {
      error.value = `統計データの取得に失敗しました: ${err}`
      console.error('Statistics fetch error:', err)
    } finally {
      loading.value = false
    }
  }
  
  // ゲームトラッキングの開始
  const startGameTracking = (game: Game) => {
    try {
      statisticsService.startGameTracking(game)
      realtimeData.value = statisticsService.getRealtimeStatistics()
    } catch (err) {
      error.value = `ゲームトラッキングの開始に失敗しました: ${err}`
      console.error('Game tracking start error:', err)
    }
  }
  
  // ターンデータの更新
  const updateTurnData = (game: Game, decisionTime?: number) => {
    try {
      statisticsService.updateTurnData(game, decisionTime)
      realtimeData.value = statisticsService.getRealtimeStatistics()
    } catch (err) {
      error.value = `ターンデータの更新に失敗しました: ${err}`
      console.error('Turn data update error:', err)
    }
  }
  
  // ゲームトラッキングの終了
  const finishGameTracking = (game: Game) => {
    try {
      statisticsService.finishGameTracking(game)
      // 統計データを再取得
      fetchStatistics()
    } catch (err) {
      error.value = `ゲームトラッキングの終了に失敗しました: ${err}`
      console.error('Game tracking finish error:', err)
    }
  }
  
  // フィルターの適用
  const applyFilter = (newFilter: Partial<StatisticsFilter>) => {
    Object.assign(filters, newFilter)
    fetchStatistics()
  }
  
  // フィルターのクリア
  const clearFilters = () => {
    Object.keys(filters).forEach(key => {
      delete (filters as any)[key]
    })
    fetchStatistics()
  }
  
  // データのエクスポート
  const exportData = (format: 'json' | 'csv' = 'json'): string => {
    try {
      return statisticsService.exportData(format)
    } catch (err) {
      error.value = `データエクスポートに失敗しました: ${err}`
      console.error('Data export error:', err)
      return ''
    }
  }
  
  // CSVダウンロード
  const downloadCSV = (filename?: string) => {
    try {
      const csvData = exportData('csv')
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `game-statistics-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      error.value = `CSVダウンロードに失敗しました: ${err}`
      console.error('CSV download error:', err)
    }
  }
  
  // JSONダウンロード
  const downloadJSON = (filename?: string) => {
    try {
      const jsonData = exportData('json')
      const blob = new Blob([jsonData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `game-statistics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      error.value = `JSONダウンロードに失敗しました: ${err}`
      console.error('JSON download error:', err)
    }
  }
  
  // 自動更新の開始
  const startAutoUpdate = () => {
    if (autoUpdate.value && !updateTimer) {
      updateTimer = window.setInterval(() => {
        fetchStatistics()
      }, updateInterval.value)
    }
  }
  
  // 自動更新の停止
  const stopAutoUpdate = () => {
    if (updateTimer) {
      clearInterval(updateTimer)
      updateTimer = null
    }
  }
  
  // 統計の購読
  const subscribeToUpdates = () => {
    unsubscribe = statisticsService.subscribe((data) => {
      statisticsData.value = data
    })
  }
  
  // 購読の解除
  const unsubscribeFromUpdates = () => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }
  
  // 計算されたプロパティ
  const hasData = computed(() => {
    return statisticsData.value !== null && statisticsData.value.totalGames > 0
  })
  
  const hasRealtimeData = computed(() => {
    return realtimeData.value !== null
  })
  
  const isTracking = computed(() => {
    return realtimeData.value?.currentSession !== undefined
  })
  
  // 基本的な統計指標
  const basicMetrics = computed(() => {
    if (!statisticsData.value) return null
    
    const data = statisticsData.value
    return {
      totalGames: data.totalGames,
      winRate: data.completedGames > 0 ? (data.victoryGames / data.completedGames) * 100 : 0,
      challengeSuccessRate: data.challengeSuccessRate,
      averagePlayTime: data.averageGameDuration,
      favoriteCardType: data.favoriteCardTypes[0] || 'なし'
    }
  })
  
  // パフォーマンストレンド
  const performanceTrend = computed(() => {
    if (!statisticsData.value) return null
    
    return {
      improvement: statisticsData.value.recentTrends.performanceImprovement,
      playTimeChange: statisticsData.value.recentTrends.playTimeIncrease,
      difficultyPreference: statisticsData.value.recentTrends.difficultyPreference
    }
  })
  
  // リアルタイム指標
  const realtimeMetrics = computed(() => {
    if (!realtimeData.value) return null
    
    const session = realtimeData.value.currentSession
    const live = realtimeData.value.live
    
    return {
      sessionDuration: Date.now() - session.startTime.getTime(),
      gamesPlayed: session.gamesPlayed,
      currentStreak: session.currentStreak,
      sessionScore: session.sessionScore,
      currentVitality: live.vitalityOverTime[live.vitalityOverTime.length - 1]?.vitality || 0,
      recentDecisionTime: live.decisionTimes[live.decisionTimes.length - 1]?.decisionTime || 0
    }
  })
  
  // ライフサイクル管理
  const initialize = () => {
    subscribeToUpdates()
    fetchStatistics()
    if (autoUpdate.value) {
      startAutoUpdate()
    }
  }
  
  const cleanup = () => {
    stopAutoUpdate()
    unsubscribeFromUpdates()
  }
  
  // 自動初期化と清理 (オプション)
  onMounted(() => {
    // 自動初期化はしない（明示的な呼び出しを推奨）
  })
  
  onUnmounted(() => {
    cleanup()
  })
  
  return {
    // リアクティブデータ
    statisticsData,
    realtimeData,
    loading,
    error,
    filters,
    autoUpdate,
    updateInterval,
    
    // 計算されたプロパティ
    hasData,
    hasRealtimeData,
    isTracking,
    basicMetrics,
    performanceTrend,
    realtimeMetrics,
    
    // メソッド
    initialize,
    cleanup,
    fetchStatistics,
    startGameTracking,
    updateTurnData,
    finishGameTracking,
    applyFilter,
    clearFilters,
    exportData,
    downloadCSV,
    downloadJSON,
    startAutoUpdate,
    stopAutoUpdate,
    subscribeToUpdates,
    unsubscribeFromUpdates
  }
}

/**
 * ゲーム統合用のシンプルなフック
 * ゲームコンポーネントで簡単に統計トラッキングを行うため
 */
export function useGameStatistics() {
  const {
    startGameTracking,
    updateTurnData,
    finishGameTracking,
    realtimeData,
    realtimeMetrics,
    isTracking
  } = useStatistics()
  
  // 決定時間の測定
  const decisionStartTime = ref<number | null>(null)
  
  const startDecisionTimer = () => {
    decisionStartTime.value = Date.now()
  }
  
  const endDecisionTimer = (game: Game) => {
    if (decisionStartTime.value) {
      const decisionTime = (Date.now() - decisionStartTime.value) / 1000
      updateTurnData(game, decisionTime)
      decisionStartTime.value = null
    } else {
      updateTurnData(game)
    }
  }
  
  const cancelDecisionTimer = () => {
    decisionStartTime.value = null
  }
  
  return {
    // 統計データ
    realtimeData,
    realtimeMetrics,
    isTracking,
    
    // ゲーム統合メソッド
    startGameTracking,
    finishGameTracking,
    
    // 決定時間測定
    startDecisionTimer,
    endDecisionTimer,
    cancelDecisionTimer,
    
    // ターンデータ更新（決定時間なし）
    updateTurnData: (game: Game) => updateTurnData(game)
  }
}

/**
 * 統計ダッシュボード用のフック
 * ダッシュボードコンポーネントで使用する機能をまとめたもの
 */
export function useStatisticsDashboard() {
  const {
    statisticsData,
    realtimeData,
    loading,
    error,
    filters,
    hasData,
    hasRealtimeData,
    basicMetrics,
    performanceTrend,
    initialize,
    cleanup,
    fetchStatistics,
    applyFilter,
    clearFilters,
    downloadCSV,
    downloadJSON,
    autoUpdate,
    startAutoUpdate,
    stopAutoUpdate
  } = useStatistics()
  
  // ダッシュボード専用の設定
  const activeTab = ref('overview')
  const showFilters = ref(false)
  
  // フィルタープリセット
  const filterPresets = {
    today: {
      dateRange: {
        start: new Date(new Date().setHours(0, 0, 0, 0)),
        end: new Date()
      }
    },
    thisWeek: {
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    },
    thisMonth: {
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      }
    }
  }
  
  const applyPreset = (preset: keyof typeof filterPresets) => {
    applyFilter(filterPresets[preset])
  }
  
  // ダッシュボードの初期化
  const initializeDashboard = () => {
    initialize()
  }
  
  // リフレッシュ
  const refresh = () => {
    fetchStatistics()
  }
  
  return {
    // 基本データ
    statisticsData,
    realtimeData,
    loading,
    error,
    hasData,
    hasRealtimeData,
    basicMetrics,
    performanceTrend,
    
    // UI状態
    activeTab,
    showFilters,
    filters,
    autoUpdate,
    
    // メソッド
    initializeDashboard,
    cleanup,
    refresh,
    applyFilter,
    clearFilters,
    applyPreset,
    downloadCSV,
    downloadJSON,
    startAutoUpdate,
    stopAutoUpdate,
    
    // フィルタープリセット
    filterPresets
  }
}