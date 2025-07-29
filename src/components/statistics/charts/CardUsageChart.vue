<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">🃏 カード使用統計</h3>
    <div class="chart-controls">
      <select v-model="viewMode" @change="updateChart" class="mode-selector">
        <option value="type">カード種別</option>
        <option value="frequency">使用頻度</option>
        <option value="effectiveness">効果別</option>
      </select>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="usage-details">
      <div class="detail-header">
        <span>詳細分析</span>
      </div>
      <div class="detail-list">
        <div 
          v-for="(count, cardType) in sortedData" 
          :key="cardType"
          class="detail-item"
        >
          <div class="card-type">
            <span class="type-icon">{{ getCardTypeIcon(cardType) }}</span>
            <span class="type-name">{{ getCardTypeName(cardType) }}</span>
          </div>
          <div class="usage-stats">
            <span class="usage-count">{{ count }}回</span>
            <span class="usage-percentage">{{ getUsagePercentage(count) }}%</span>
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
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Chart.jsの登録
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
)

interface Props {
  data: Record<string, number>
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)
const viewMode = ref<'type' | 'frequency' | 'effectiveness'>('type')

// カード種別の設定
const CARD_TYPE_CONFIG = {
  life: { name: 'ライフカード', icon: '💫', color: 'rgb(34, 197, 94)' },
  challenge: { name: 'チャレンジカード', icon: '⚔️', color: 'rgb(239, 68, 68)' },
  insurance: { name: '保険カード', icon: '🛡️', color: 'rgb(59, 130, 246)' },
  dream: { name: '夢カード', icon: '✨', color: 'rgb(168, 85, 247)' },
  action: { name: 'アクションカード', icon: '🎯', color: 'rgb(251, 191, 36)' },
  event: { name: 'イベントカード', icon: '🎪', color: 'rgb(236, 72, 153)' }
}

const totalUsage = computed(() => {
  return Object.values(props.data || {}).reduce((sum, count) => sum + count, 0)
})

const sortedData = computed(() => {
  if (!props.data) return {}
  
  const entries = Object.entries(props.data)
  
  switch (viewMode.value) {
    case 'frequency':
      return Object.fromEntries(entries.sort(([,a], [,b]) => b - a))
    case 'effectiveness':
      // 効果の計算（簡易版）
      return Object.fromEntries(entries.sort(([typeA, countA], [typeB, countB]) => {
        const effA = calculateEffectiveness(typeA, countA)
        const effB = calculateEffectiveness(typeB, countB)
        return effB - effA
      }))
    case 'type':
    default:
      return props.data
  }
})

const getCardTypeName = (cardType: string): string => {
  return CARD_TYPE_CONFIG[cardType as keyof typeof CARD_TYPE_CONFIG]?.name || cardType
}

const getCardTypeIcon = (cardType: string): string => {
  return CARD_TYPE_CONFIG[cardType as keyof typeof CARD_TYPE_CONFIG]?.icon || '🎴'
}

const getCardTypeColor = (cardType: string): string => {
  return CARD_TYPE_CONFIG[cardType as keyof typeof CARD_TYPE_CONFIG]?.color || 'rgb(107, 114, 128)'
}

const getUsagePercentage = (count: number): string => {
  if (totalUsage.value === 0) return '0'
  return ((count / totalUsage.value) * 100).toFixed(1)
}

const calculateEffectiveness = (cardType: string, count: number): number => {
  // 簡易的な効果計算
  const typeMultipliers = {
    life: 1.2,
    insurance: 1.1,
    dream: 1.3,
    action: 1.0,
    challenge: 0.8,
    event: 0.9
  }
  
  const multiplier = typeMultipliers[cardType as keyof typeof typeMultipliers] || 1.0
  return count * multiplier
}

// チャートの初期化
const initChart = () => {
  if (!chartCanvas.value || !props.data) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  const chartType = viewMode.value === 'type' ? 'doughnut' : 'bar'
  
  chartInstance.value = new Chart(ctx, {
    type: chartType,
    data: {
      labels: [],
      datasets: [{
        label: 'カード使用回数',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 2
      }]
    },
    options: getChartOptions()
  })
  
  updateChart()
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
        display: viewMode.value === 'type',
        position: 'bottom' as const,
        labels: {
          color: 'white',
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(75, 85, 99, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const cardType = Object.keys(sortedData.value)[context.dataIndex]
            const count = context.parsed || context.parsed.y
            const percentage = getUsagePercentage(count)
            const effectiveness = calculateEffectiveness(cardType, count)
            
            return [
              `${getCardTypeName(cardType)}: ${count}回`,
              `使用率: ${percentage}%`,
              `効果度: ${effectiveness.toFixed(1)}`
            ]
          }
        }
      }
    }
  }
  
  if (viewMode.value === 'type') {
    return {
      ...baseOptions,
      cutout: '50%',
      elements: {
        arc: {
          borderWidth: 2
        }
      }
    }
  } else {
    return {
      ...baseOptions,
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)',
            maxRotation: 45
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)'
          },
          title: {
            display: true,
            text: viewMode.value === 'frequency' ? '使用回数' : '効果度',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        }
      },
      elements: {
        bar: {
          borderRadius: 4
        }
      }
    }
  }
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value || !props.data) return
  
  const cardTypes = Object.keys(sortedData.value)
  const counts = Object.values(sortedData.value)
  const colors = cardTypes.map(type => getCardTypeColor(type))
  const labels = cardTypes.map(type => getCardTypeName(type))
  
  // データに応じた値の計算
  let chartData = counts
  if (viewMode.value === 'effectiveness') {
    chartData = cardTypes.map((type, index) => calculateEffectiveness(type, counts[index]))
  }
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = chartData
  chartInstance.value.data.datasets[0].backgroundColor = colors.map(color => 
    color.replace('rgb', 'rgba').replace(')', ', 0.7)')
  )
  chartInstance.value.data.datasets[0].borderColor = colors
  
  // チャートタイプの変更
  const newType = viewMode.value === 'type' ? 'doughnut' : 'bar'
  if (chartInstance.value.config.type !== newType) {
    chartInstance.value.destroy()
    initChart()
    return
  }
  
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

watch(() => viewMode.value, () => {
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
  height: 300px;
}

.usage-details {
  @apply mt-4 bg-gray-700 rounded-lg p-4;
}

.detail-header {
  @apply text-white font-medium mb-3 pb-2 border-b border-gray-600;
}

.detail-list {
  @apply space-y-2 max-h-32 overflow-y-auto;
}

.detail-item {
  @apply flex justify-between items-center py-2;
}

.card-type {
  @apply flex items-center gap-2;
}

.type-icon {
  @apply text-lg;
}

.type-name {
  @apply text-gray-200 text-sm;
}

.usage-stats {
  @apply flex gap-3 text-sm;
}

.usage-count {
  @apply text-white font-medium;
}

.usage-percentage {
  @apply text-blue-400;
}
</style>