import { Card } from './Card'
import type { CardEffect, DreamCategory } from '../types/card.types'
import { IdGenerator } from '../../common/IdGenerator'

/**
 * リスク・リワードチャレンジカード
 * 
 * 高リスク・高リワードの意思決定を促すチャレンジカード。
 * 失敗時のペナルティが大きいが、成功時の報酬も大きい。
 */
export class RiskRewardChallenge extends Card {
  readonly riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  readonly successBonus: number
  readonly failurePenalty: number
  readonly insuranceImmunity: boolean // 保険が効かないかどうか

  constructor(params: {
    name: string
    description: string
    power: number
    riskLevel: 'low' | 'medium' | 'high' | 'extreme'
    successBonus: number
    failurePenalty: number
    insuranceImmunity?: boolean
    dreamCategory?: DreamCategory
  }) {
    const effects: CardEffect[] = []
    
    // リスクレベルに応じた特殊効果
    if (params.riskLevel === 'extreme') {
      effects.push({
        type: 'special_action',
        value: 0,
        description: '保険効果無効化',
        condition: 'このチャレンジでは保険カードのパワーが無効'
      })
    }

    super({
      id: IdGenerator.generateCardId(),
      type: 'challenge',
      name: params.name,
      description: params.description,
      power: params.power,
      cost: 0,
      effects,
      dreamCategory: params.dreamCategory
    })

    this.riskLevel = params.riskLevel
    this.successBonus = params.successBonus
    this.failurePenalty = params.failurePenalty
    this.insuranceImmunity = params.insuranceImmunity || params.riskLevel === 'extreme'
  }

  /**
   * リスク倍率を取得
   */
  getRiskMultiplier(): number {
    const multipliers = {
      low: 1.2,
      medium: 1.5,
      high: 2.0,
      extreme: 3.0
    }
    return multipliers[this.riskLevel]
  }

  /**
   * 成功時の実際の報酬を計算
   */
  calculateActualReward(baseReward: number): number {
    return Math.floor(baseReward * this.getRiskMultiplier()) + this.successBonus
  }

  /**
   * 失敗時の実際のペナルティを計算
   */
  calculateActualPenalty(basePenalty: number): number {
    return Math.floor(basePenalty * this.getRiskMultiplier()) + this.failurePenalty
  }

  /**
   * リスクレベルの説明を取得
   */
  getRiskDescription(): string {
    const descriptions = {
      low: '低リスク: 少し危険だが、失敗してもダメージは軽い',
      medium: '中リスク: 成功と失敗のバランスが取れている',
      high: '高リスク: 失敗時のダメージが大きいが、報酬も魅力的',
      extreme: '極限リスク: 保険も効かない危険な挑戦。成功すれば大きな報酬'
    }
    return descriptions[this.riskLevel]
  }

  /**
   * チャレンジの詳細情報を取得
   */
  getChallengeDetails(): string {
    const details = [
      `必要パワー: ${this.power}`,
      `リスクレベル: ${this.riskLevel.toUpperCase()}`,
      `成功ボーナス: +${this.successBonus} 活力`,
      `失敗ペナルティ: -${this.failurePenalty} 活力`,
      this.insuranceImmunity ? '⚠️ 保険無効' : ''
    ].filter(Boolean)

    return details.join('\n')
  }

  /**
   * ファクトリーメソッド: リスクレベルに応じたチャレンジを作成
   */
  static createRiskChallenge(
    stage: 'youth' | 'middle' | 'fulfillment',
    riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  ): RiskRewardChallenge {
    const challengeTemplates = {
      youth: {
        low: {
          name: '新しいスポーツへの挑戦',
          description: '未経験の分野に挑戦する勇気',
          power: 5,
          successBonus: 2,
          failurePenalty: 1
        },
        medium: {
          name: '起業への第一歩',
          description: '安定を捨てて夢を追う決断',
          power: 7,
          successBonus: 5,
          failurePenalty: 3
        },
        high: {
          name: '海外留学',
          description: '未知の世界への大きな飛躍',
          power: 9,
          successBonus: 8,
          failurePenalty: 5
        },
        extreme: {
          name: '人生を賭けた大勝負',
          description: '全てを投げ打って挑む最大の挑戦',
          power: 12,
          successBonus: 15,
          failurePenalty: 10
        }
      },
      middle: {
        low: {
          name: '副業の開始',
          description: '新たな収入源への挑戦',
          power: 6,
          successBonus: 3,
          failurePenalty: 2
        },
        medium: {
          name: '独立開業',
          description: '会社を辞めて独立する決断',
          power: 9,
          successBonus: 7,
          failurePenalty: 5
        },
        high: {
          name: '大型投資',
          description: '将来を見据えた大胆な投資',
          power: 11,
          successBonus: 10,
          failurePenalty: 7
        },
        extreme: {
          name: '人生の大転換',
          description: '全てをリセットして新しい道へ',
          power: 15,
          successBonus: 20,
          failurePenalty: 15
        }
      },
      fulfillment: {
        low: {
          name: '新しい趣味への挑戦',
          description: '年齢に関係なく新しいことを始める',
          power: 7,
          successBonus: 4,
          failurePenalty: 2
        },
        medium: {
          name: 'ボランティア活動',
          description: '社会貢献への新たな一歩',
          power: 10,
          successBonus: 8,
          failurePenalty: 4
        },
        high: {
          name: '遺産の活用',
          description: '次世代への大きな投資',
          power: 13,
          successBonus: 12,
          failurePenalty: 8
        },
        extreme: {
          name: '人生最後の大冒険',
          description: '残された時間での究極の挑戦',
          power: 18,
          successBonus: 25,
          failurePenalty: 20
        }
      }
    }

    const template = challengeTemplates[stage][riskLevel]
    
    return new RiskRewardChallenge({
      ...template,
      riskLevel,
      dreamCategory: riskLevel === 'extreme' ? 'mixed' : 'physical'
    })
  }
}