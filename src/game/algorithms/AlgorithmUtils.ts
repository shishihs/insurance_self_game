import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'
import { GameAlgorithmIntegrator, type IntegratorConfig } from './GameAlgorithmIntegrator'

/**
 * アルゴリズム設定プリセット
 */
export const ALGORITHM_PRESETS = {
  /**
   * 初心者向け設定
   */
  BEGINNER: {
    shuffle: {
      intensity: 3,
      biasControl: {
        maxConsecutiveByType: {
          'life': 4,
          'insurance': 3,
          'pitfall': 1,
          'challenge': 2
        },
        powerDistribution: {
          lowPowerRatio: 0.5,
          mediumPowerRatio: 0.4,
          highPowerRatio: 0.1,
          tolerance: 0.15
        }
      }
    },
    optimization: {
      playerLevel: 25,
      targetDifficulty: 0.3,
      maxCombinations: 5,
      balanceWeights: {
        powerBalance: 0.4,
        typeDiversity: 0.3,
        costEfficiency: 0.2,
        riskDistribution: 0.05,
        synergyBonus: 0.05
      }
    },
    ai: {
      thinkingDepth: 500,
      timeLimit: 3000,
      difficultyLevel: 3,
      personality: {
        aggressiveness: 0.3,
        cautiousness: 0.8,
        adventurousness: 0.2,
        rationality: 0.9,
        adaptability: 0.7
      }
    },
    probability: {
      baseProbabilities: {
        'life': 0.50,
        'insurance': 0.30,
        'challenge': 0.15,
        'skill': 0.04,
        'combo': 0.01,
        'legendary': 0.00
      },
      biasPreventionStrength: 0.9,
      experienceOptimizationLevel: 0.9
    },
    debugMode: false
  } as IntegratorConfig,

  /**
   * 標準設定
   */
  STANDARD: {
    shuffle: {
      intensity: 5,
      biasControl: {
        maxConsecutiveByType: {
          'life': 3,
          'insurance': 2,
          'pitfall': 1,
          'challenge': 2
        },
        powerDistribution: {
          lowPowerRatio: 0.4,
          mediumPowerRatio: 0.4,
          highPowerRatio: 0.2,
          tolerance: 0.1
        }
      }
    },
    optimization: {
      playerLevel: 50,
      targetDifficulty: 0.6,
      maxCombinations: 10,
      balanceWeights: {
        powerBalance: 0.25,
        typeDiversity: 0.20,
        costEfficiency: 0.20,
        riskDistribution: 0.15,
        synergyBonus: 0.20
      }
    },
    ai: {
      thinkingDepth: 1000,
      timeLimit: 5000,
      difficultyLevel: 5,
      personality: {
        aggressiveness: 0.5,
        cautiousness: 0.5,
        adventurousness: 0.4,
        rationality: 0.8,
        adaptability: 0.6
      }
    },
    probability: {
      baseProbabilities: {
        'life': 0.40,
        'insurance': 0.25,
        'challenge': 0.20,
        'skill': 0.10,
        'combo': 0.03,
        'legendary': 0.02
      },
      biasPreventionStrength: 0.7,
      experienceOptimizationLevel: 0.8
    },
    debugMode: false
  } as IntegratorConfig,

  /**
   * 上級者向け設定
   */
  EXPERT: {
    shuffle: {
      intensity: 8,
      biasControl: {
        maxConsecutiveByType: {
          'life': 2,
          'insurance': 2,
          'pitfall': 2,
          'challenge': 3
        },
        powerDistribution: {
          lowPowerRatio: 0.3,
          mediumPowerRatio: 0.4,
          highPowerRatio: 0.3,
          tolerance: 0.05
        }
      }
    },
    optimization: {
      playerLevel: 80,
      targetDifficulty: 0.8,
      maxCombinations: 15,
      balanceWeights: {
        powerBalance: 0.15,
        typeDiversity: 0.15,
        costEfficiency: 0.25,
        riskDistribution: 0.25,
        synergyBonus: 0.20
      }
    },
    ai: {
      thinkingDepth: 2000,
      timeLimit: 8000,
      difficultyLevel: 8,
      personality: {
        aggressiveness: 0.7,
        cautiousness: 0.3,
        adventurousness: 0.8,
        rationality: 0.9,
        adaptability: 0.8
      }
    },
    probability: {
      baseProbabilities: {
        'life': 0.30,
        'insurance': 0.25,
        'challenge': 0.25,
        'skill': 0.15,
        'combo': 0.04,
        'legendary': 0.01
      },
      biasPreventionStrength: 0.5,
      experienceOptimizationLevel: 0.6
    },
    debugMode: false
  } as IntegratorConfig,

  /**
   * デバッグ用設定
   */
  DEBUG: {
    shuffle: {
      intensity: 10,
      enableStatisticalValidation: true,
      biasControl: {
        maxConsecutiveByType: {
          'life': 1,
          'insurance': 1,
          'pitfall': 1,
          'challenge': 1
        }
      }
    },
    optimization: {
      playerLevel: 50,
      targetDifficulty: 0.5,
      maxCombinations: 20
    },
    ai: {
      thinkingDepth: 500,
      timeLimit: 10000,
      difficultyLevel: 5,
      debugMode: true
    },
    probability: {
      debugMode: true,
      enableLearning: true,
      enableDynamicAdjustment: true
    },
    debugMode: true
  } as IntegratorConfig
}

/**
 * 簡単にアルゴリズムシステムを作成するファクトリー関数
 */
export function createAlgorithmSystem(
  preset: keyof typeof ALGORITHM_PRESETS = 'STANDARD',
  customConfig?: Partial<IntegratorConfig>
): GameAlgorithmIntegrator {
  const baseConfig = ALGORITHM_PRESETS[preset]
  const finalConfig = customConfig 
    ? mergeConfigs(baseConfig, customConfig)
    : baseConfig

  return new GameAlgorithmIntegrator(finalConfig)
}

/**
 * プレイヤーレベルに基づいて最適な設定を選択
 */
export function selectOptimalPreset(playerLevel: number): keyof typeof ALGORITHM_PRESETS {
  if (playerLevel <= 30) return 'BEGINNER'
  if (playerLevel <= 70) return 'STANDARD'
  return 'EXPERT'
}

/**
 * ゲームステージに基づいてカード確率を調整
 */
export function adjustProbabilitiesForStage(
  baseProbabilities: Record<string, number>,
  stage: GameStage
): Record<string, number> {
  const adjusted = { ...baseProbabilities }
  
  switch (stage) {
    case 'youth':
      // 若年期は基本カードを多めに
      adjusted['life'] *= 1.3
      adjusted['insurance'] *= 0.7
      adjusted['challenge'] *= 0.9
      break
      
    case 'middle':
      // 中年期はバランス良く、保険重視
      adjusted['insurance'] *= 1.4
      adjusted['challenge'] *= 1.1
      break
      
    case 'fulfillment':
      // 充実期は高難度カード多めに
      adjusted['challenge'] *= 1.3
      adjusted['skill'] *= 1.5
      adjusted['legendary'] *= 2.0
      break
  }
  
  // 正規化
  const total = Object.values(adjusted).reduce((sum, prob) => sum + prob, 0)
  Object.keys(adjusted).forEach(key => {
    adjusted[key] /= total
  })
  
  return adjusted
}

/**
 * カードの複雑度を計算
 */
export function calculateCardComplexity(card: Card): number {
  let complexity = 0
  
  // 基本複雑度
  complexity += Math.min(5, card.power / 2)
  complexity += Math.min(3, card.cost)
  
  // 効果による複雑度
  complexity += card.effects.length * 2
  
  // タイプによる複雑度
  const typeComplexity = {
    'life': 1,
    'insurance': 3,
    'challenge': 2,
    'skill': 4,
    'combo': 5,
    'legendary': 6
  }[card.type] || 2
  
  complexity += typeComplexity
  
  // 特殊プロパティによる複雑度
  if (card.skillProperties) complexity += 3
  if (card.comboProperties) complexity += 4
  if (card.eventProperties) complexity += 2
  
  return Math.min(10, complexity)
}

/**
 * プレイヤーの習熟度に基づいてカードプールをフィルタリング
 */
export function filterCardsBySkillLevel(
  cards: Card[],
  playerLevel: number,
  maxComplexity?: number
): Card[] {
  const skillBasedMaxComplexity = maxComplexity || Math.min(10, 3 + Math.floor(playerLevel / 15))
  
  return cards.filter(card => {
    const complexity = calculateCardComplexity(card)
    return complexity <= skillBasedMaxComplexity
  })
}

/**
 * カードの相性度を計算
 */
export function calculateCardSynergy(cards: Card[]): number {
  let synergyScore = 0
  
  // タイプ別シナジー
  const typeCounts: Record<string, number> = {}
  cards.forEach(card => {
    typeCounts[card.type] = (typeCounts[card.type] || 0) + 1
  })
  
  // 2枚以上の同タイプでボーナス
  Object.values(typeCounts).forEach(count => {
    if (count >= 2) {
      synergyScore += count * 10
    }
  })
  
  // コンボカードのシナジー
  cards.forEach(card => {
    if (card.comboProperties) {
      const requiredTypes = card.comboProperties.requiredCards
      const hasAllRequired = requiredTypes.every(reqType => 
        cards.some(c => c.type === reqType || c.category === reqType)
      )
      if (hasAllRequired) {
        synergyScore += card.comboProperties.comboBonus * 2
      }
    }
  })
  
  // パワーバランスボーナス
  const powers = cards.map(card => card.power)
  const avgPower = powers.reduce((sum, power) => sum + power, 0) / powers.length
  const variance = powers.reduce((sum, power) => sum + (power - avgPower)**2, 0) / powers.length
  
  // 適度な分散にボーナス
  if (variance > 2 && variance < 8) {
    synergyScore += 15
  }
  
  return synergyScore
}

/**
 * ゲーム状況に基づく推奨アクションを生成
 */
export function generateGameplayRecommendations(
  cards: Card[],
  playerVitality: number,
  currentChallenge?: Card
): string[] {
  const recommendations: string[] = []
  
  // 活力チェック
  if (playerVitality < 3) {
    recommendations.push('活力が少ないため、回復効果のあるカードや低コストカードの使用を推奨します')
  }
  
  // チャレンジ対策
  if (currentChallenge) {
    const totalPower = cards.reduce((sum, card) => sum + card.power, 0)
    const powerGap = currentChallenge.power - totalPower
    
    if (powerGap > 0) {
      recommendations.push(`チャレンジクリアにはあと${powerGap}パワー必要です`)
    } else {
      recommendations.push('現在の手札でチャレンジをクリア可能です')
    }
  }
  
  // 手札構成の分析
  const typeCount = cards.reduce<Record<string, number>>((count, card) => {
    count[card.type] = (count[card.type] || 0) + 1
    return count
  }, {})
  
  if (typeCount['insurance'] === 0) {
    recommendations.push('保険カードがありません。リスクに備えることを推奨します')
  }
  
  if (typeCount['life'] > 5) {
    recommendations.push('人生カードが多すぎます。バランスの調整を推奨します')
  }
  
  // シナジー分析
  const synergyScore = calculateCardSynergy(cards)
  if (synergyScore > 50) {
    recommendations.push('優秀なカードシナジーが形成されています。積極的に活用しましょう')
  } else if (synergyScore < 20) {
    recommendations.push('カード間のシナジーが不足しています。組み合わせを見直してみましょう')
  }
  
  return recommendations
}

/**
 * パフォーマンス最適化のためのメモ化ユーティリティ
 */
export class PerformanceCache {
  private readonly cache = new Map<string, { value: any; timestamp: number }>()
  private readonly ttl: number

  constructor(ttlMs: number = 60000) { // デフォルト1分
    this.ttl = ttlMs
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }
    
    return entry.value
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * デバッグ用のパフォーマンス測定
 */
export class PerformanceProfiler {
  private measurements: Record<string, number[]> = {}

  startMeasurement(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (!this.measurements[name]) {
        this.measurements[name] = []
      }
      
      this.measurements[name].push(duration)
    }
  }

  getStatistics(name: string): {
    count: number
    average: number
    min: number
    max: number
    total: number
  } | undefined {
    const measurements = this.measurements[name]
    if (!measurements || measurements.length === 0) {
      return undefined
    }

    const total = measurements.reduce((sum, time) => sum + time, 0)
    const average = total / measurements.length
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)

    return {
      count: measurements.length,
      average,
      min,
      max,
      total
    }
  }

  getAllStatistics(): Record<string, ReturnType<PerformanceProfiler['getStatistics']>> {
    const result: Record<string, any> = {}
    
    Object.keys(this.measurements).forEach(name => {
      result[name] = this.getStatistics(name)
    })
    
    return result
  }

  reset(): void {
    this.measurements = {}
  }
}

// ヘルパー関数

/**
 * 設定オブジェクトを深くマージ
 */
function mergeConfigs(base: IntegratorConfig, override: Partial<IntegratorConfig>): IntegratorConfig {
  const result = { ...base }
  
  Object.keys(override).forEach(key => {
    if (typeof override[key as keyof IntegratorConfig] === 'object' && 
        override[key as keyof IntegratorConfig] !== null) {
      result[key as keyof IntegratorConfig] = {
        ...base[key as keyof IntegratorConfig],
        ...override[key as keyof IntegratorConfig]
      } as any
    } else {
      result[key as keyof IntegratorConfig] = override[key as keyof IntegratorConfig] as any
    }
  })
  
  return result
}

/**
 * グローバルパフォーマンスプロファイラー（デバッグ用）
 */
export const globalProfiler = new PerformanceProfiler()

/**
 * グローバルキャッシュ（パフォーマンス最適化用）
 */
export const globalCache = new PerformanceCache()