<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">🧭 戦略パターン分析</h3>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="patterns-analysis">
      <div class="pattern-list">
        <div 
          v-for="pattern in sortedPatterns" 
          :key="`${pattern.situation}_${pattern.choice}`"
          class="pattern-item"
          :class="{ 'high-success': pattern.successRate >= 0.7, 'low-success': pattern.successRate < 0.4 }"
        >
          <div class="pattern-header">
            <div class="pattern-situation">{{ formatSituation(pattern.situation) }}</div>
            <div class="pattern-choice">{{ formatChoice(pattern.choice) }}</div>
          </div>
          <div class="pattern-stats">
            <div class="stat">
              <span class="label">頻度:</span>
              <span class="value">{{ pattern.frequency }}回</span>
            </div>
            <div class="stat">
              <span class="label">成功率:</span>
              <span class="value">{{ (pattern.successRate * 100).toFixed(1) }}%</span>
            </div>
            <div class="pattern-recommendation">
              {{ getRecommendation(pattern) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Chart.jsの登録
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface DecisionPattern {
  situation: string
  choice: string
  frequency: number
  successRate: number
}

interface Props {
  data: DecisionPattern[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)

// 計算されたプロパティ
const sortedPatterns = computed(() => {
  return [...(props.data || [])].sort((a, b) => {
    // 成功率の高い順、同じなら頻度の高い順
    if (b.successRate !== a.successRate) {
      return b.successRate - a.successRate
    }
    return b.frequency - a.frequency
  })
})

// フォーマット関数
const formatSituation = (situation: string): string => {
  const situationMap: Record<string, string> = {
    'youth_high_vitality': '青年期・高活力',
    'youth_low_vitality': '青年期・低活力',
    'middle_high_vitality': '中年期・高活力',
    'middle_low_vitality': '中年期・低活力',
    'fulfillment_high_vitality': '充実期・高活力',
    'fulfillment_low_vitality': '充実期・低活力'
  }
  
  return situationMap[situation] || situation
}

const formatChoice = (choice: string): string => {
  const choiceMap: Record<string, string> = {
    'with_insurance': '保険あり',
    'no_insurance': '保険なし',
    'aggressive': '積極的',
    'conservative': '保守的',
    'balanced': 'バランス型'
  }
  
  return choiceMap[choice] || choice
}

const getRecommendation = (pattern: DecisionPattern): string => {
  if (pattern.successRate >= 0.8) {
    return '👍 優秀な戦略です'
  } else if (pattern.successRate >= 0.6) {
    return '😊 良好な戦略です'
  } else if (pattern.successRate >= 0.4) {
    return '😐 改善の余地があります'
  } else {
    return '🤔 戦略の見直しを検討'
  }
}

// チャートの初期化
const initChart = () => {
  if (!chartCanvas.value || !props.data || props.data.length === 0) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  // 散布図でパターンを表示（頻度 vs 成功率）
  const datasets = createDatasets()
  
  chartInstance.value = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'top',
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
          borderWidth: 1,
          callbacks: {
            title: () => '',
            label: (context) => {
              const pattern = props.data[context.dataIndex]
              return [
                `状況: ${formatSituation(pattern.situation)}`,
                `選択: ${formatChoice(pattern.choice)}`,
                `頻度: ${pattern.frequency}回`,
                `成功率: ${(pattern.successRate * 100).toFixed(1)}%`
              ]
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)'
          },
          title: {
            display: true,
            text: '使用頻度',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        },
        y: {
          beginAtZero: true,
          max: 1,
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)',
            callback: (value) => `${(Number(value) * 100).toFixed(0)}%`
          },
          title: {
            display: true,
            text: '成功率',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        }
      },
      elements: {
        point: {
          radius: 8,
          hoverRadius: 10
        }
      }
    }
  })
}

// データセットの作成
const createDatasets = () => {
  if (!props.data) return []
  
  // 状況別にグループ化
  const situationGroups: Record<string, DecisionPattern[]> = {}
  props.data.forEach(pattern => {
    const situation = pattern.situation.split('_')[0] // youth, middle, fulfillment
    if (!situationGroups[situation]) {
      situationGroups[situation] = []
    }
    situationGroups[situation].push(pattern)
  })
  
  const colors = {
    youth: 'rgb(34, 197, 94)',
    middle: 'rgb(251, 191, 36)',
    fulfillment: 'rgb(168, 85, 247)'
  }
  
  return Object.entries(situationGroups).map(([situation, patterns]) => ({
    label: formatSituation(`${situation}_high_vitality`).split('・')[0], // ステージ名のみ
    data: patterns.map(pattern => ({
      x: pattern.frequency,
      y: pattern.successRate
    })),
    backgroundColor: colors[situation as keyof typeof colors] || 'rgb(107, 114, 128)',
    borderColor: colors[situation as keyof typeof colors] || 'rgb(107, 114, 128)',
    pointRadius: patterns.map(pattern => Math.max(6, pattern.frequency / 2)), // 頻度に応じてサイズ調整
    pointHoverRadius: patterns.map(pattern => Math.max(8, pattern.frequency / 2 + 2))
  }))
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value || !props.data) return
  
  const datasets = createDatasets()
  chartInstance.value.data.datasets = datasets
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

// データ変更の監視
watch(() => props.data, () => {
  updateChart()
}, { deep: true })
</script>

<style scoped>
.chart-wrapper {
  @apply w-full h-full flex flex-col;
}

.chart-title {
  @apply text-lg font-semibold text-white mb-4 flex items-center gap-2;
}

.chart-container {
  @apply flex-1 min-h-0 relative;
  height: 300px;
}

.patterns-analysis {
  @apply mt-4;
}

.pattern-list {
  @apply space-y-3 max-h-40 overflow-y-auto;
}

.pattern-item {
  @apply p-3 bg-gray-700 rounded-lg border-l-4 border-gray-500;
}

.pattern-item.high-success {
  @apply border-green-500;
}

.pattern-item.low-success {
  @apply border-red-500;
}

.pattern-header {
  @apply flex justify-between items-center mb-2;
}

.pattern-situation {
  @apply text-white font-medium;
}

.pattern-choice {
  @apply text-blue-400 text-sm;
}

.pattern-stats {
  @apply flex justify-between items-center text-sm;
}

.stat {
  @apply flex gap-1;
}

.stat .label {
  @apply text-gray-300;
}

.stat .value {
  @apply text-white font-medium;
}

.pattern-recommendation {
  @apply text-xs;
}
</style>