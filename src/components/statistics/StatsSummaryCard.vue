<template>
  <div class="stats-summary-card">
    <div class="card-header">
      <div class="card-icon">{{ icon }}</div>
      <h3 class="card-title">{{ title }}</h3>
    </div>
    
    <div class="stats-list">
      <div 
        v-for="stat in stats" 
        :key="stat.label"
        class="stat-item"
      >
        <div class="stat-info">
          <span class="stat-label">{{ stat.label }}</span>
          <div class="stat-value-row">
            <span class="stat-value">{{ stat.value }}</span>
            <span 
              v-if="stat.trend" 
              :class="['stat-trend', getTrendClass(stat.trend)]"
            >
              {{ stat.trend }}
            </span>
          </div>
        </div>
        <div 
          v-if="stat.percentage !== undefined" 
          class="stat-progress"
        >
          <div 
            class="progress-bar"
            :style="{ width: `${stat.percentage}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StatItem {
  label: string
  value: string
  trend?: string
  percentage?: number
}

interface Props {
  title: string
  icon: string
  stats: StatItem[]
}

defineProps<Props>()

const getTrendClass = (trend: string): string => {
  if (trend.includes('↗') || trend === '+') return 'trend-up'
  if (trend.includes('↘') || trend === '-') return 'trend-down'
  return 'trend-neutral'
}
</script>

<style scoped>
.stats-summary-card {
  @apply bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors;
}

.card-header {
  @apply flex items-center gap-3 mb-4;
}

.card-icon {
  @apply text-2xl;
}

.card-title {
  @apply text-lg font-semibold text-white;
}

.stats-list {
  @apply space-y-3;
}

.stat-item {
  @apply space-y-2;
}

.stat-info {
  @apply flex justify-between items-start;
}

.stat-label {
  @apply text-sm text-gray-300;
}

.stat-value-row {
  @apply flex items-center gap-2;
}

.stat-value {
  @apply text-xl font-bold text-white;
}

.stat-trend {
  @apply text-sm font-medium;
}

.trend-up {
  @apply text-green-400;
}

.trend-down {
  @apply text-red-400;
}

.trend-neutral {
  @apply text-gray-400;
}

.stat-progress {
  @apply w-full bg-gray-700 rounded-full h-2;
}

.progress-bar {
  @apply bg-blue-500 h-2 rounded-full transition-all duration-300;
}
</style>