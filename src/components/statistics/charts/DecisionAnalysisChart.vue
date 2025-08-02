<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">⏱️ 決定時間分析</h3>
    <div class="chart-controls">
      <select v-model="analysisMode" @change="updateChart" class="mode-selector">
        <option value="timeline">時系列変化</option>
        <option value="distribution">分布分析</option>
        <option value="average">平均推移</option>
      </select>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="decision-insights">
      <div class="insight-grid">
        <div class="insight-item">
          <div class="insight-icon">🎯</div>
          <div class="insight-content">
            <div class="insight-label">平均決定時間</div>
            <div class="insight-value">{{ averageDecisionTime.toFixed(1) }}秒</div>
          </div>
        </div>
        <div class="insight-item">
          <div class="insight-icon">⚡</div>
          <div class="insight-content">
            <div class="insight-label">最速決定</div>
            <div class="insight-value">{{ fastestDecision.toFixed(1) }}秒</div>
          </div>
        </div>
        <div class="insight-item">
          <div class="insight-icon">🤔</div>
          <div class="insight-content">
            <div class="insight-label">最長思考</div>
            <div class="insight-value">{{ slowestDecision.toFixed(1) }}秒</div>
          </div>
        </div>
        <div class="insight-item">
          <div class="insight-icon">📈</div>
          <div class="insight-content">
            <div class="insight-label">決定トレンド</div>
            <div class="insight-value">{{ decisionTrend }}</div>
          </div>
        </div>
      </div>
      <div class="analysis-summary">
        <div class="summary-title">パフォーマンス分析</div>
        <div class="summary-content">{{ performanceAnalysis }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'

// Chart.jsの登録
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DecisionTimeData {
  turn: number
  decisionTime: number
}

interface Props {
  data: DecisionTimeData[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)
const analysisMode = ref<'timeline' | 'distribution' | 'average'>('timeline')

// 計算されたプロパティ
const averageDecisionTime = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  const total = props.data.reduce((sum, item) => sum + item.decisionTime, 0)
  return total / props.data.length
})

const fastestDecision = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return Math.min(...props.data.map(item => item.decisionTime))
})

const slowestDecision = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return Math.max(...props.data.map(item => item.decisionTime))
})

const decisionTrend = computed(() => {
  if (!props.data || props.data.length < 2) return '不明'
  
  const firstHalf = props.data.slice(0, Math.floor(props.data.length / 2))
  const secondHalf = props.data.slice(Math.floor(props.data.length / 2))
  
  const firstAvg = firstHalf.reduce((sum, item) => sum + item.decisionTime, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, item) => sum + item.decisionTime, 0) / secondHalf.length
  
  const difference = secondAvg - firstAvg
  if (Math.abs(difference) < 0.5) return '安定'
  return difference > 0 ? '慎重化' : '迅速化'
})

const performanceAnalysis = computed(() => {
  if (!props.data || props.data.length === 0) return 'データが不足しています'
  
  const avg = averageDecisionTime.value
  
  if (avg < 3) {
    return '非常に迅速な決定を行っています。直感的なプレイスタイルです。'
  } if (avg < 8) {
    return 'バランスの取れた決定時間です。適度に考えてプレイしています。'
  } if (avg < 15) {
    return '慎重に考えてからプレイしています。戦略的なアプローチです。'
  } 
    return '非常に慎重なプレイスタイルです。より素早い決定も検討してみてください。'
  
})

// 分布データの生成
const distributionData = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  const bins = [0, 2, 5, 10, 15, 20, 30, Infinity]
  const labels = ['0-2秒', '2-5秒', '5-10秒', '10-15秒', '15-20秒', '20-30秒', '30秒以上']
  
  const distribution = bins.slice(0, -1).map((min, index) => {
    const max = bins[index + 1]
    const count = props.data.filter(item => 
      item.decisionTime >= min && item.decisionTime < max
    ).length
    return { label: labels[index], count }
  })
  
  return distribution
})

// 移動平均データの生成
const movingAverageData = computed(() => {
  if (!props.data || props.data.length < 3) return []
  
  const windowSize = 3
  const result = []
  
  for (let i = windowSize - 1; i < props.data.length; i++) {
    const window = props.data.slice(i - windowSize + 1, i + 1)
    const average = window.reduce((sum, item) => sum + item.decisionTime, 0) / windowSize
    result.push({
      turn: props.data[i].turn,
      average
    })
  }
  
  return result
})

// チャートの初期化
const initChart = () => {
  if (!chartCanvas.value || !props.data || props.data.length === 0) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  chartInstance.value = new Chart(ctx, {
    type: getChartType(),
    data: getChartData(),
    options: getChartOptions()
  })
}

// チャートタイプの取得
const getChartType = () => {
  switch (analysisMode.value) {
    case 'distribution':
      return 'bar'
    case 'average':
    case 'timeline':
    default:
      return 'line'
  }
}

// チャートデータの取得
const getChartData = () => {
  switch (analysisMode.value) {
    case 'distribution':
      return {
        labels: distributionData.value.map(item => item.label),
        datasets: [{
          label: '決定回数',
          data: distributionData.value.map(item => item.count),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderRadius: 4
        }]
      }
      
    case 'average':
      return {
        labels: movingAverageData.value.map(item => `ターン${item.turn}`),
        datasets: [{
          label: '移動平均（3ターン）',
          data: movingAverageData.value.map(item => item.average),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(34, 197, 94)',
          pointBorderColor: 'white',
          pointBorderWidth: 2
        }]
      }
      
    case 'timeline':
    default:
      return {
        labels: props.data.map(item => `ターン${item.turn}`),
        datasets: [
          {
            label: '決定時間',
            data: props.data.map(item => item.decisionTime),
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgb(168, 85, 247)',
            pointBorderColor: 'white',
            pointBorderWidth: 2
          },
          {
            label: '平均ライン',
            data: props.data.map(() => averageDecisionTime.value),
            borderColor: 'rgb(251, 191, 36)',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0
          }
        ]
      }
  }
}

// チャートオプションの取得
const getChartOptions = () => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: 'white',
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        },
        ticks: {
          color: 'rgba(209, 213, 219, 0.8)'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.3)'
        },
        ticks: {
          color: 'rgba(209, 213, 219, 0.8)',
          callback: (value: any) => {
            return analysisMode.value === 'distribution' 
              ? `${value}回`
              : `${value}秒`
          }
        },
        title: {
          display: true,
          text: analysisMode.value === 'distribution' ? '決定回数' : '時間（秒）',
          color: 'rgba(209, 213, 219, 0.8)'
        }
      }
    }
  }
  
  if (analysisMode.value !== 'distribution') {
    return {
      ...baseOptions,
      elements: {
        point: {
          radius: 4,
          hoverRadius: 6
        }
      }
    }
  }
  
  return baseOptions
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value) {
    initChart()
    return
  }
  
  const newType = getChartType()
  if (chartInstance.value.config.type !== newType) {
    chartInstance.value.destroy()
    initChart()
    return
  }
  
  chartInstance.value.data = getChartData()
  chartInstance.value.options = getChartOptions()
  chartInstance.value.update('active')
}

// チャートの破棄
const destroyChart = () => {
  if (chartInstance.value) {
    chartInstance.value.destroy()
    chartInstance.value = null
  }
}

// ライフサイクル
onMounted(() => {
  initChart()
})

onUnmounted(() => {
  destroyChart()
})

// データとモード変更の監視
watch(() => props.data, () => {
  updateChart()
}, { deep: true })

watch(() => analysisMode.value, () => {
  updateChart()
})
</script>

<style scoped>
.chart-wrapper {
  @apply w-full h-full flex flex-col;
}

.chart-title {
  @apply text-lg font-semibold text-white mb-2 flex items-center gap-2;
}

.chart-controls {
  @apply flex justify-end mb-4;
}

.mode-selector {
  @apply px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm;
}

.chart-container {
  @apply flex-1 min-h-0 relative;
  height: 250px;
}

.decision-insights {
  @apply mt-4 space-y-4;
}

.insight-grid {
  @apply grid grid-cols-2 lg:grid-cols-4 gap-3;
}

.insight-item {
  @apply flex items-center gap-3 p-3 bg-gray-700 rounded-lg;
}

.insight-icon {
  @apply text-2xl;
}

.insight-content {
  @apply flex-1;
}

.insight-label {
  @apply text-gray-300 text-xs;
}

.insight-value {
  @apply text-white font-bold text-lg;
}

.analysis-summary {
  @apply p-4 bg-gray-700 rounded-lg;
}

.summary-title {
  @apply text-white font-medium mb-2;
}

.summary-content {
  @apply text-gray-300 text-sm leading-relaxed;
}
</style>