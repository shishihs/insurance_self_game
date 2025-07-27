import { Card } from '../entities/Card'
import type { 
  LifeCardCategory, 
  InsuranceType, 
  GameStage,
  DreamCategory
} from '../types/card.types'
import type { InsuranceTypeChoice } from '../types/game.types'

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
   * 年齢ボーナスを計算
   */
  private static calculateAgeBonus(stage: GameStage): number {
    switch(stage) {
      case 'middle': return 0.5
      case 'fulfillment': return 1.0
      default: return 0
    }
  }

  /**
   * カード配列から実際のカードを生成
   */
  private static createCardsFromDefinitions<T extends { name: string }>(definitions: T[], createFn: (def: T) => Card): Card[] {
    return definitions.map(def => createFn(def))
  }

  /**
   * 初期デッキ用の人生カードを生成
   */
  static createStarterLifeCards(): Card[] {
    const starterCardDefinitions = [
      // 健康カード
      { name: '朝のジョギング', description: '健康的な一日の始まり', category: 'health' as LifeCardCategory, power: 2, cost: 1 },
      { name: '栄養バランスの良い食事', description: '体調管理の基本', category: 'health' as LifeCardCategory, power: 3, cost: 2 },
      // キャリアカード
      { name: '新しいスキルの習得', description: '成長への投資', category: 'career' as LifeCardCategory, power: 3, cost: 2 },
      { name: 'チームワーク', description: '仲間との協力', category: 'career' as LifeCardCategory, power: 2, cost: 1 },
      // 家族カード
      { name: '家族との団らん', description: '心の充電', category: 'family' as LifeCardCategory, power: 2, cost: 1 },
      // 趣味カード
      { name: '趣味の時間', description: 'リフレッシュタイム', category: 'hobby' as LifeCardCategory, power: 2, cost: 1 },
      // 金融カード
      { name: '計画的な貯蓄', description: '将来への備え', category: 'finance' as LifeCardCategory, power: 3, cost: 2 }
    ]

    return this.createCardsFromDefinitions(starterCardDefinitions, def => this.createLifeCard(def))
  }

  /**
   * 基本的な保険カードを生成（簡素化版：すべて終身保険、永続効果）
   */
  static createBasicInsuranceCards(stage: GameStage = 'youth'): Card[] {
    const ageBonus = this.calculateAgeBonus(stage)
    
    const basicInsuranceDefinitions = [
      { name: '医療保険', description: '病気やケガに備える永続保障', insuranceType: 'medical' as InsuranceType, power: 4, cost: 3, coverage: 100 },
      { name: '生命保険', description: '家族を守る永続保障', insuranceType: 'life' as InsuranceType, power: 5, cost: 4, coverage: 200 },
      { name: '収入保障保険', description: '働けなくなった時の永続保障', insuranceType: 'income' as InsuranceType, power: 4, cost: 3, coverage: 150 }
    ]

    return this.createCardsFromDefinitions(basicInsuranceDefinitions, def => 
      this.createInsuranceCard({ ...def, ageBonus })
    )
  }

  /**
   * 拡張保険カードを生成（簡素化版：すべて永続効果）
   */
  static createExtendedInsuranceCards(stage: GameStage = 'youth'): Card[] {
    const extendedCards: Card[] = []
    
    // 年齢ボーナスの設定
    const ageBonus = this.calculateAgeBonus(stage)
    
    // 基本保険カード
    const baseInsurances = [
      { name: '医療保険', insuranceType: 'medical' as InsuranceType, power: 5, cost: 4, coverage: 100 },
      { name: '生命保険', insuranceType: 'life' as InsuranceType, power: 6, cost: 5, coverage: 200 },
      { name: '収入保障保険', insuranceType: 'income' as InsuranceType, power: 5, cost: 4, coverage: 150 }
    ]
    
    // 基本保険カードを追加
    const baseCards = this.createCardsFromDefinitions(baseInsurances, insurance => 
      this.createInsuranceCard({
        name: insurance.name,
        description: `${insurance.name}の永続保障`,
        insuranceType: insurance.insuranceType,
        power: insurance.power,
        cost: insurance.cost,
        coverage: insurance.coverage,
        ageBonus: ageBonus
      })
    )
    extendedCards.push(...baseCards)

    // 追加の特殊保険カード
    const additionalInsurances = [
      { name: '傷害保険', insuranceType: 'medical' as InsuranceType, power: 4, cost: 3, coverage: 80 },
      { name: '就業不能保険', insuranceType: 'income' as InsuranceType, power: 7, cost: 6, coverage: 250 },
      { name: '介護保険', insuranceType: 'medical' as InsuranceType, power: 6, cost: 5, coverage: 180 },
      { name: 'がん保険', insuranceType: 'medical' as InsuranceType, power: 5, cost: 4, coverage: 120 },
      { name: '個人年金保険', insuranceType: 'income' as InsuranceType, power: 4, cost: 4, coverage: 100 },
      { name: '学資保険', insuranceType: 'life' as InsuranceType, power: 4, cost: 3, coverage: 90 }
    ]
    
    // 追加保険カードを追加
    const additionalCards = this.createCardsFromDefinitions(additionalInsurances, insurance => 
      this.createInsuranceCard({
        name: insurance.name,
        description: `${insurance.name}の永続保障`,
        insuranceType: insurance.insuranceType,
        power: insurance.power,
        cost: insurance.cost,
        coverage: insurance.coverage,
        ageBonus: ageBonus
      })
    )
    extendedCards.push(...additionalCards)

    return extendedCards
  }

  /**
   * 保険種類選択肢を生成（定期保険と終身保険の選択肢）
   */
  static createInsuranceTypeChoices(stage: GameStage = 'youth'): InsuranceTypeChoice[] {
    const choices: InsuranceTypeChoice[] = []
    
    // 年齢ボーナスの設定
    const ageBonus = this.calculateAgeBonus(stage)
    
    // 基本保険タイプの定義
    const baseInsuranceTypes = [
      { 
        type: 'medical' as InsuranceType, 
        name: '医療保険', 
        description: '病気やケガに備える保障',
        power: 5, 
        baseCost: 4, 
        coverage: 100 
      },
      { 
        type: 'life' as InsuranceType, 
        name: '生命保険', 
        description: '家族を守る保障',
        power: 6, 
        baseCost: 5, 
        coverage: 200 
      },
      { 
        type: 'income' as InsuranceType, 
        name: '収入保障保険', 
        description: '働けなくなった時の保障',
        power: 5, 
        baseCost: 4, 
        coverage: 150 
      }
    ]
    
    // 3つからランダムに選択（重複なし）
    const availableTypes = [...baseInsuranceTypes]
    for (let i = 0; i < 3 && availableTypes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTypes.length)
      const selectedType = availableTypes.splice(randomIndex, 1)[0]
      
      // 定期保険の期間設定（10ターン）
      const termDuration = 10
      
      // 定期保険のコスト（基本コストの70%）
      const termCost = Math.ceil(selectedType.baseCost * 0.7)
      
      // 終身保険のコスト（基本コスト）
      const wholeLifeCost = selectedType.baseCost
      
      const choice: InsuranceTypeChoice = {
        insuranceType: selectedType.type,
        name: selectedType.name,
        description: selectedType.description,
        baseCard: {
          name: selectedType.name,
          description: selectedType.description,
          type: 'insurance',
          power: selectedType.power,
          cost: selectedType.baseCost, // ベースコスト
          insuranceType: selectedType.type,
          coverage: selectedType.coverage,
          effects: [{
            type: 'shield',
            value: selectedType.coverage,
            description: `${selectedType.coverage}ポイントの保障`
          }],
          ageBonus: ageBonus
        },
        termOption: {
          cost: termCost,
          duration: termDuration,
          description: `${termDuration}ターン限定の保障（低コスト）`
        },
        wholeLifeOption: {
          cost: wholeLifeCost,
          description: '生涯にわたる永続保障（高コスト）'
        }
      }
      
      choices.push(choice)
    }
    
    return choices
  }

  /**
   * 定期保険カードを作成
   */
  static createTermInsuranceCard(choice: InsuranceTypeChoice): Card {
    return new Card({
      id: this.generateId(),
      type: 'insurance',
      name: `定期${choice.name}`,
      description: `${choice.baseCard.description}（${choice.termOption.duration}ターン限定）`,
      power: choice.baseCard.power,
      cost: choice.termOption.cost,
      insuranceType: choice.insuranceType,
      coverage: choice.baseCard.coverage,
      effects: choice.baseCard.effects,
      ageBonus: choice.baseCard.ageBonus,
      durationType: 'term',
      remainingTurns: choice.termOption.duration
    })
  }

  /**
   * 終身保険カードを作成
   */
  static createWholeLifeInsuranceCard(choice: InsuranceTypeChoice): Card {
    return new Card({
      id: this.generateId(),
      type: 'insurance',
      name: `終身${choice.name}`,
      description: `${choice.baseCard.description}（永続保障）`,
      power: choice.baseCard.power,
      cost: choice.wholeLifeOption.cost,
      insuranceType: choice.insuranceType,
      coverage: choice.baseCard.coverage,
      effects: choice.baseCard.effects,
      ageBonus: choice.baseCard.ageBonus,
      durationType: 'whole_life'
    })
  }

  /**
   * チャレンジカードを生成
   */
  static createChallengeCards(stage: GameStage): Card[] {
    const challengeDefinitionsByStage = {
      youth: [
        { name: '就職活動', description: '新たなキャリアの始まり', power: 5, dreamCategory: 'physical' as DreamCategory },
        { name: '一人暮らし', description: '独立への第一歩', power: 4, dreamCategory: 'physical' as DreamCategory },
        { name: '資格試験', description: 'スキルアップのチャンス', power: 6, dreamCategory: 'intellectual' as DreamCategory }
      ],
      middle: [
        { name: '子育て', description: '家族の成長', power: 8, dreamCategory: 'physical' as DreamCategory },
        { name: '住宅購入', description: '大きな決断', power: 10, dreamCategory: 'physical' as DreamCategory },
        { name: '親の介護', description: '家族の支え合い', power: 9, dreamCategory: 'mixed' as DreamCategory }
      ],
      fulfillment: [
        { name: '定年退職', description: '新しい人生のスタート', power: 12, dreamCategory: 'intellectual' as DreamCategory },
        { name: '健康管理', description: '健やかな老後のために', power: 11, dreamCategory: 'mixed' as DreamCategory }
      ]
    }

    const definitions = challengeDefinitionsByStage[stage] || challengeDefinitionsByStage.fulfillment
    return this.createCardsFromDefinitions(definitions, def => this.createChallengeCard(def))
  }

  /**
   * 落とし穴カードを生成
   */
  static createPitfallCards(): Card[] {
    const pitfallDefinitions = [
      { name: '急な入院', description: '予期せぬ医療費', power: 0, penalty: 3 },
      { name: '失業', description: '収入の途絶', power: 0, penalty: 4 },
      { name: '事故', description: '予期せぬトラブル', power: 0, penalty: 2 }
    ]

    return this.createCardsFromDefinitions(pitfallDefinitions, def => this.createPitfallCard(def))
  }

  /**
   * 人生カードを作成（テスト用にpublicインスタンスメソッドも追加）
   */
  createLifeCard(params: {
    category: LifeCardCategory
    basePower: number
    baseCost: number
  }): Card {
    return CardFactory.createLifeCard({
      name: `テスト${params.category}カード`,
      description: `${params.category}のテストカード`,
      category: params.category,
      power: params.basePower,
      cost: params.baseCost
    })
  }

  /**
   * 人生カードを作成（静的メソッド）
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
   * 保険カードを作成（Phase 2対応）
   */
  private static createInsuranceCard(params: {
    name: string
    description: string
    insuranceType: InsuranceType
    power: number
    cost: number
    coverage: number
    ageBonus?: number
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
      }],
      ageBonus: params.ageBonus || 0
    })
  }

  /**
   * チャレンジカードを作成
   */
  private static createChallengeCard(params: {
    name: string
    description: string
    power: number
    dreamCategory?: DreamCategory
  }): Card {
    return new Card({
      id: this.generateId(),
      type: 'challenge', // チャレンジカード専用タイプ
      name: params.name,
      description: params.description,
      power: params.power,
      cost: 0,
      effects: [],
      dreamCategory: params.dreamCategory
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