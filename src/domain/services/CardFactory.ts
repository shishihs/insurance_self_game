import { Card } from '../entities/Card'
import type { LifeCardCategory, InsuranceType, GameStage } from '../types/card.types'

/**
 * カードファクトリー
 * ゲーム用のカードを生成する
 */
export class CardFactory {
  private static cardIdCounter = 0

  /**
   * ユニークなカードIDを生成
   */
  private static generateId(): string {
    return `card_${Date.now()}_${this.cardIdCounter++}`
  }

  /**
   * 初期デッキ用の人生カードを生成
   */
  static createStarterLifeCards(): Card[] {
    const cards: Card[] = []

    // 健康カード
    cards.push(this.createLifeCard({
      name: '朝のジョギング',
      description: '健康的な一日の始まり',
      category: 'health',
      power: 2,
      cost: 1
    }))

    cards.push(this.createLifeCard({
      name: '栄養バランスの良い食事',
      description: '体調管理の基本',
      category: 'health',
      power: 3,
      cost: 2
    }))

    // キャリアカード
    cards.push(this.createLifeCard({
      name: '新しいスキルの習得',
      description: '成長への投資',
      category: 'career',
      power: 3,
      cost: 2
    }))

    cards.push(this.createLifeCard({
      name: 'チームワーク',
      description: '仲間との協力',
      category: 'career',
      power: 2,
      cost: 1
    }))

    // 家族カード
    cards.push(this.createLifeCard({
      name: '家族との団らん',
      description: '心の充電',
      category: 'family',
      power: 2,
      cost: 1
    }))

    // 趣味カード
    cards.push(this.createLifeCard({
      name: '趣味の時間',
      description: 'リフレッシュタイム',
      category: 'hobby',
      power: 2,
      cost: 1
    }))

    // 金融カード
    cards.push(this.createLifeCard({
      name: '計画的な貯蓄',
      description: '将来への備え',
      category: 'finance',
      power: 3,
      cost: 2
    }))

    return cards
  }

  /**
   * 基本的な保険カードを生成
   */
  static createBasicInsuranceCards(): Card[] {
    const cards: Card[] = []

    cards.push(this.createInsuranceCard({
      name: '医療保険',
      description: '病気やケガに備える',
      insuranceType: 'medical',
      power: 4,
      cost: 3,
      coverage: 100
    }))

    cards.push(this.createInsuranceCard({
      name: '生命保険',
      description: '家族を守る保障',
      insuranceType: 'life',
      power: 5,
      cost: 4,
      coverage: 200
    }))

    cards.push(this.createInsuranceCard({
      name: '収入保障保険',
      description: '働けなくなった時の備え',
      insuranceType: 'income',
      power: 4,
      cost: 3,
      coverage: 150
    }))

    return cards
  }

  /**
   * チャレンジカードを生成
   */
  static createChallengeCards(stage: GameStage): Card[] {
    const cards: Card[] = []

    if (stage === 'youth') {
      // 青年期のチャレンジ
      cards.push(this.createChallengeCard({
        name: '就職活動',
        description: '新たなキャリアの始まり',
        power: 5
      }))

      cards.push(this.createChallengeCard({
        name: '一人暮らし',
        description: '独立への第一歩',
        power: 4
      }))

      cards.push(this.createChallengeCard({
        name: '資格試験',
        description: 'スキルアップのチャンス',
        power: 6
      }))
    } else if (stage === 'middle') {
      // 中年期のチャレンジ
      cards.push(this.createChallengeCard({
        name: '子育て',
        description: '家族の成長',
        power: 8
      }))

      cards.push(this.createChallengeCard({
        name: '住宅購入',
        description: '大きな決断',
        power: 10
      }))

      cards.push(this.createChallengeCard({
        name: '親の介護',
        description: '家族の支え合い',
        power: 9
      }))
    } else {
      // 充実期のチャレンジ
      cards.push(this.createChallengeCard({
        name: '定年退職',
        description: '新しい人生のスタート',
        power: 12
      }))

      cards.push(this.createChallengeCard({
        name: '健康管理',
        description: '健やかな老後のために',
        power: 11
      }))
    }

    return cards
  }

  /**
   * 落とし穴カードを生成
   */
  static createPitfallCards(): Card[] {
    const cards: Card[] = []

    cards.push(this.createPitfallCard({
      name: '急な入院',
      description: '予期せぬ医療費',
      power: 0,
      penalty: 3
    }))

    cards.push(this.createPitfallCard({
      name: '失業',
      description: '収入の途絶',
      power: 0,
      penalty: 4
    }))

    cards.push(this.createPitfallCard({
      name: '事故',
      description: '予期せぬトラブル',
      power: 0,
      penalty: 2
    }))

    return cards
  }

  /**
   * 人生カードを作成
   */
  private static createLifeCard(params: {
    name: string
    description: string
    category: LifeCardCategory
    power: number
    cost: number
  }): Card {
    return new Card({
      id: this.generateId(),
      type: 'life',
      name: params.name,
      description: params.description,
      power: params.power,
      cost: params.cost,
      category: params.category,
      effects: []
    })
  }

  /**
   * 保険カードを作成
   */
  private static createInsuranceCard(params: {
    name: string
    description: string
    insuranceType: InsuranceType
    power: number
    cost: number
    coverage: number
  }): Card {
    return new Card({
      id: this.generateId(),
      type: 'insurance',
      name: params.name,
      description: params.description,
      power: params.power,
      cost: params.cost,
      insuranceType: params.insuranceType,
      coverage: params.coverage,
      effects: [{
        type: 'shield',
        value: params.coverage,
        description: `${params.coverage}ポイントの保障`
      }]
    })
  }

  /**
   * チャレンジカードを作成
   */
  private static createChallengeCard(params: {
    name: string
    description: string
    power: number
  }): Card {
    return new Card({
      id: this.generateId(),
      type: 'life', // チャレンジカードも人生カードの一種
      name: params.name,
      description: params.description,
      power: params.power,
      cost: 0,
      effects: []
    })
  }

  /**
   * 落とし穴カードを作成
   */
  private static createPitfallCard(params: {
    name: string
    description: string
    power: number
    penalty: number
  }): Card {
    return new Card({
      id: this.generateId(),
      type: 'pitfall',
      name: params.name,
      description: params.description,
      power: params.power,
      cost: 0,
      penalty: params.penalty,
      effects: []
    })
  }
}