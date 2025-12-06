import { Card } from '../entities/Card'
import type {
  CardEffect,
  DreamCategory,
  GameStage,
  InsuranceType,
  LifeCardCategory,
  RewardType,
  SkillRarity,
  InsuranceEffectType,
  IAdvancedCard
} from '../types/card.types'
import type { InsuranceTypeChoice } from '../types/game.types'
import { IdGenerator } from '../../common/IdGenerator'
import { RiskRewardChallenge } from '../entities/RiskRewardChallenge'

/**
 * カードファクトリー
 * ゲーム用のカードを生成する
 */
export class CardFactory {

  /**
   * 年齢ボーナスを計算
   */
  private static calculateAgeBonus(stage: GameStage): number {
    switch (stage) {
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
        ageBonus
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
        ageBonus
      })
    )
    extendedCards.push(...additionalCards)

    return extendedCards
  }

  /**
   * 多様な効果タイプの保険カードを生成
   */
  static createDiverseInsuranceCards(stage: GameStage = 'youth'): Card[] {
    const cards: Card[] = []
    const ageBonus = this.calculateAgeBonus(stage)

    // 攻撃型保険
    cards.push(new Card({
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: '攻撃特化生命保険',
      description: 'チャレンジ時に大きなパワーを提供',
      power: 8,
      cost: 5,
      insuranceType: 'life',
      insuranceEffectType: 'offensive',
      coverage: 150,
      effects: [],
      ageBonus,
      durationType: 'whole_life'
    }))

    // 防御型保険
    cards.push(new Card({
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: '防御特化医療保険',
      description: 'ダメージを軽減する防御的保障',
      power: 0,
      cost: 4,
      insuranceType: 'medical',
      insuranceEffectType: 'defensive',
      coverage: 100,
      effects: [{
        type: 'damage_reduction',
        value: 3,
        description: 'ダメージを3ポイント軽減'
      }],
      ageBonus: 0,
      durationType: 'whole_life'
    }))

    // 回復型保険
    cards.push(new Card({
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: '回復特化健康保険',
      description: '毎ターン活力を回復',
      power: 0,
      cost: 3,
      insuranceType: 'health',
      insuranceEffectType: 'recovery',
      coverage: 80,
      effects: [{
        type: 'turn_heal',
        value: 2,
        description: '毎ターン終了時に2点回復'
      }],
      ageBonus: 0,
      durationType: 'whole_life'
    }))

    // 特化型保険
    cards.push(new Card({
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: '仕事特化収入保障保険',
      description: '仕事関連のチャレンジに特化',
      power: 3,
      cost: 4,
      insuranceType: 'income',
      insuranceEffectType: 'specialized',
      coverage: 120,
      effects: [{
        type: 'challenge_bonus',
        value: 5,
        description: '「就職」「明進」チャレンジ時+5パワー',
        condition: '就職,明進,転職,仕事'
      }],
      ageBonus,
      durationType: 'whole_life'
    }))

    // 包括型保険
    cards.push(new Card({
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: 'オールインワン総合保険',
      description: '複数の効果を持つ高コスト保障',
      power: 3,
      cost: 7,
      insuranceType: 'life',
      insuranceEffectType: 'comprehensive',
      coverage: 200,
      effects: [
        {
          type: 'power_boost',
          value: 3,
          description: 'パワー+3'
        },
        {
          type: 'damage_reduction',
          value: 2,
          description: 'ダメージ-2'
        },
        {
          type: 'turn_heal',
          value: 1,
          description: '毎ターン+1回復'
        }
      ],
      ageBonus,
      durationType: 'whole_life'
    }))

    return cards
  }

  /**
   * 保険種類選択肢を生成（定期保険と終身保険の選択肢）
   */
  static createInsuranceTypeChoices(stage: GameStage = 'youth'): InsuranceTypeChoice[] {
    const choices: InsuranceTypeChoice[] = []

    // 年齢ボーナスの設定
    const ageBonus = this.calculateAgeBonus(stage)

    // 多様な保険タイプの定義（効果タイプ付き）
    const baseInsuranceTypes = [
      {
        type: 'medical' as InsuranceType,
        name: '医療保険',
        description: '病気やケガに備える保障',
        power: 5,
        baseCost: 4,
        coverage: 100,
        effectType: 'offensive' as InsuranceEffectType
      },
      {
        type: 'life' as InsuranceType,
        name: '生命保険',
        description: '家族を守る保障',
        power: 6,
        baseCost: 5,
        coverage: 200,
        effectType: 'offensive' as InsuranceEffectType
      },
      {
        type: 'income' as InsuranceType,
        name: '収入保障保険',
        description: '働けなくなった時の保障',
        power: 5,
        baseCost: 4,
        coverage: 150,
        effectType: 'offensive' as InsuranceEffectType
      },
      {
        type: 'health' as InsuranceType,
        name: '防御型健康保険',
        description: 'ダメージを軽減する防御的保障',
        power: 0,
        baseCost: 3,
        coverage: 80,
        effectType: 'defensive' as InsuranceEffectType
      },
      {
        type: 'disability' as InsuranceType,
        name: '回復型障害保険',
        description: '定期的に活力を回復',
        power: 0,
        baseCost: 3,
        coverage: 60,
        effectType: 'recovery' as InsuranceEffectType
      }
    ]

    // 3つからランダムに選択（重複なし）
    const availableTypes = [...baseInsuranceTypes]
    for (let i = 0; i < 3 && availableTypes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableTypes.length)
      const selectedType = availableTypes.splice(randomIndex, 1)[0]!

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
          insuranceEffectType: selectedType.effectType,
          effects: [{
            type: 'shield',
            value: selectedType.coverage,
            description: `${selectedType.coverage}ポイントの保障`
          }],
          ageBonus
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
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: `定期${choice.name}`,
      description: `${choice.baseCard.description}（${choice.termOption.duration}ターン限定）`,
      power: choice.baseCard.power,
      cost: choice.termOption.cost,
      insuranceType: choice.insuranceType,
      coverage: choice.baseCard.coverage,
      effects: choice.baseCard.effects,
      ageBonus: choice.baseCard.ageBonus,
      insuranceEffectType: choice.baseCard.insuranceEffectType,
      durationType: 'term',
      remainingTurns: choice.termOption.duration
    } as any)
  }

  /**
   * 終身保険カードを作成
   */
  static createWholeLifeInsuranceCard(choice: InsuranceTypeChoice): Card {
    return new Card({
      id: IdGenerator.generateCardId(),
      type: 'insurance',
      name: `終身${choice.name}`,
      description: `${choice.baseCard.description}（永続保障）`,
      power: choice.baseCard.power,
      cost: choice.wholeLifeOption.cost,
      insuranceType: choice.insuranceType,
      coverage: choice.baseCard.coverage,
      effects: choice.baseCard.effects,
      ageBonus: choice.baseCard.ageBonus,
      insuranceEffectType: choice.baseCard.insuranceEffectType,
      durationType: 'whole_life'
    } as any)
  }

  /**
   * チャレンジカードを生成
   */
  static createChallengeCards(stage: GameStage): Card[] {
    const challengeDefinitionsByStage = {
      youth: [
        // 基本チャレンジ（難易度: 低）
        { name: 'アルバイト探し', description: '初めての収入を得る', power: 3, dreamCategory: 'physical' as DreamCategory },
        { name: '一人暮らし', description: '独立への第一歩', power: 4, dreamCategory: 'physical' as DreamCategory },
        { name: '資格試験', description: 'スキルアップのチャンス', power: 5, dreamCategory: 'intellectual' as DreamCategory },
        { name: '就職活動', description: '新たなキャリアの始まり', power: 6, dreamCategory: 'physical' as DreamCategory },
        // 中級チャレンジ
        { name: '恋人との別れ', description: '初めての大きな失意', power: 5, dreamCategory: 'mixed' as DreamCategory },
        { name: '転職活動', description: 'キャリアの分岐点', power: 6, dreamCategory: 'intellectual' as DreamCategory }
      ],
      middle: [
        // 基本チャレンジ（難易度: 中） - Issue #23: 難易度を調整
        { name: '結婚資金', description: '新しい家族のスタート', power: 5, dreamCategory: 'mixed' as DreamCategory },
        { name: '子育て', description: '家族の成長', power: 6, dreamCategory: 'physical' as DreamCategory },
        { name: '両親の健康', description: '家族の支え合い', power: 6, dreamCategory: 'mixed' as DreamCategory },
        { name: '住宅購入', description: '大きな決断', power: 7, dreamCategory: 'physical' as DreamCategory },
        // 高難度チャレンジ
        { name: '親の介護', description: '家族の責任', power: 8, dreamCategory: 'mixed' as DreamCategory },
        { name: '教育資金', description: '子供の将来への投資', power: 7, dreamCategory: 'intellectual' as DreamCategory }
      ],
      fulfillment: [
        // 基本チャレンジ（難易度: 高） - Issue #23: 難易度を調整
        { name: '健康管理', description: '健やかな老後のために', power: 7, dreamCategory: 'mixed' as DreamCategory },
        { name: '趣味の充実', description: '人生の新たな楽しみ', power: 7, dreamCategory: 'intellectual' as DreamCategory },
        { name: '社会貢献', description: '経験を活かした活動', power: 8, dreamCategory: 'mixed' as DreamCategory },
        { name: '定年退職', description: '新しい人生のスタート', power: 9, dreamCategory: 'intellectual' as DreamCategory },
        // 最高難度チャレンジ
        { name: '遺産相続', description: '家族への最後の贈り物', power: 10, dreamCategory: 'intellectual' as DreamCategory },
        { name: '健康上の大きな試練', description: '人生最大の挑戦', power: 11, dreamCategory: 'physical' as DreamCategory }
      ]
    }

    const definitions = challengeDefinitionsByStage[stage] || challengeDefinitionsByStage.fulfillment

    // ステージごとに適切な難易度のチャレンジを選択
    // ランダムに3-4枚選ぶが、難易度のバランスを考慮
    const shuffled = [...definitions].sort(() => Math.random() - 0.5)
    const selectedCount = 3 + Math.floor(Math.random() * 2) // 3-4枚
    const selected = shuffled.slice(0, selectedCount)

    const normalChallenges = this.createCardsFromDefinitions(selected, def => this.createChallengeCard(def))

    // リスク・リワードチャレンジを追加（20%の確率）
    const riskChallenges = this.createRiskRewardChallenges(stage)

    return [...normalChallenges, ...riskChallenges]
  }

  /**
   * 夢カード（最終目標）を生成
   */
  static createDreamCards(): Card[] {
    const dreamDefinitions = [
      { name: '世界一周旅行', description: '未知の世界を体験する', power: 50, dreamCategory: 'physical' as DreamCategory },
      { name: '本の出版', description: '自分の知識を世に残す', power: 50, dreamCategory: 'intellectual' as DreamCategory },
      { name: '幸せな家庭', description: '愛に満ちた生活', power: 50, dreamCategory: 'mixed' as DreamCategory },
      { name: '起業して成功', description: '自分のビジネスを持つ', power: 60, dreamCategory: 'mixed' as DreamCategory },
      { name: '隠居生活', description: '静かで穏やかな余生', power: 45, dreamCategory: 'physical' as DreamCategory }
    ]

    return this.createCardsFromDefinitions(dreamDefinitions, def => this.createChallengeCard(def))
  }

  /**
   * リスク・リワードチャレンジを生成
   */
  static createRiskRewardChallenges(stage: GameStage): Card[] {
    const challenges: Card[] = []

    // ステージに応じたリスクレベルの分布
    const riskDistribution = {
      youth: { low: 0.5, medium: 0.3, high: 0.15, extreme: 0.05 },
      middle: { low: 0.3, medium: 0.4, high: 0.2, extreme: 0.1 },
      fulfillment: { low: 0.2, medium: 0.3, high: 0.3, extreme: 0.2 }
    }

    const distribution = riskDistribution[stage as 'youth' | 'middle' | 'fulfillment'] || riskDistribution.youth

    // 各リスクレベルのチャレンジを生成（確率に基づく）
    const random = Math.random()

    if (random < 0.2) { // 20%の確率でリスクチャレンジを追加
      let riskLevel: 'low' | 'medium' | 'high' | 'extreme'
      const levelRandom = Math.random()

      if (levelRandom < distribution.low) {
        riskLevel = 'low'
      } else if (levelRandom < distribution.low + distribution.medium) {
        riskLevel = 'medium'
      } else if (levelRandom < distribution.low + distribution.medium + distribution.high) {
        riskLevel = 'high'
      } else {
        riskLevel = 'extreme'
      }

      const riskChallenge = RiskRewardChallenge.createRiskChallenge(
        stage as 'youth' | 'middle' | 'fulfillment',
        riskLevel
      )

      challenges.push(riskChallenge)
    }

    return challenges
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
      id: IdGenerator.generateCardId(),
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
      id: IdGenerator.generateCardId(),
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
    // チャレンジの難易度に基づいて報酬タイプを決定
    const rewardType = this.determineRewardType(params.power, params.dreamCategory)

    return new Card({
      id: IdGenerator.generateCardId(),
      type: params.dreamCategory ? 'dream' : 'challenge', // 夢カテゴリがある場合はdreamタイプ
      name: params.name,
      description: params.description,
      power: params.power,
      cost: 0,
      effects: [],
      dreamCategory: params.dreamCategory,
      rewardType // 報酬タイプを追加
    } as any)
  }

  /**
   * チャレンジの難易度と種類に基づいて報酬タイプを決定
   */
  private static determineRewardType(power: number, dreamCategory?: DreamCategory): RewardType {
    // 夢カードの場合は活力回復
    if (dreamCategory) {
      return 'vitality'
    }

    // パワーレベルに基づいて報酬を決定
    if (power <= 3) {
      return 'insurance' // 低難易度：保険獲得
    } if (power <= 6) {
      return 'insurance' // 中難易度：保険獲得（基本）
    }
    return 'card' // 高難易度：追加カード獲得

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
      id: IdGenerator.generateCardId(),
      type: 'trouble',
      name: params.name,
      description: params.description,
      power: params.power,
      cost: 0,
      penalty: params.penalty,
      effects: []
    })
  }



  /**
   * 汎用カード作成（テスト用）
   */
  static createCard(params: {
    base: { name: string, type: string, description: string, id?: string },
    variant: string,
    effects?: any[]
  }): Card {
    const { base, effects } = params
    return new Card({
      id: base.id || IdGenerator.generateCardId(),
      type: base.type as any,
      name: base.name,
      description: base.description,
      power: 0,
      cost: 0,
      effects: effects || []
    } as any)
  }

  /**
   * 老化カードを作成
   */
  static createAgingCards(count: number): Card[] {
    const cards: Card[] = []
    for (let i = 0; i < count; i++) {
      cards.push(new Card({
        id: IdGenerator.generateCardId(),
        type: 'aging',
        name: '老化',
        description: '年齢による衰え。使用不可。',
        power: 0,
        cost: 0,
        effects: [{
          type: 'aging_penalty',
          value: 0,
          description: '手札にあると活力が減少する可能性がある'
        }]
      }))
    }
    return cards
  }

  /**
   * 最終試練カードを作成
   */
  static createFinalChallengeCard(): Card {
    return new Card({
      id: IdGenerator.generateCardId(),
      type: 'final_challenge',
      name: '人生の総決算',
      description: 'これまでの人生のすべてを賭けた最後の挑戦',
      power: 0, // Dynamic power based on calculation
      cost: 0,
      effects: []
    })
  }

  /**
   * スキルカードを生成
   */
  static createSkillCards(stage: GameStage = 'youth'): Card[] {
    const skillDefinitionsByStage = {
      youth: [
        { name: '集中力', description: '集中して取り組む能力', rarity: 'common' as SkillRarity, power: 3, cooldown: 0 },
        { name: 'コミュニケーション', description: '人との関わりを深める', rarity: 'common' as SkillRarity, power: 4, cooldown: 1 },
        { name: 'リーダーシップ', description: 'チームを率いる力', rarity: 'rare' as SkillRarity, power: 6, cooldown: 2 },
        { name: '創造性', description: '新しいアイデアを生み出す', rarity: 'epic' as SkillRarity, power: 8, cooldown: 3 }
      ],
      middle: [
        { name: '戦略的思考', description: '長期的な視点で考える', rarity: 'rare' as SkillRarity, power: 7, cooldown: 2 },
        { name: 'メンタリング', description: '後輩を指導する能力', rarity: 'rare' as SkillRarity, power: 6, cooldown: 1 },
        { name: '危機管理', description: 'リスクを予測し対処する', rarity: 'epic' as SkillRarity, power: 9, cooldown: 3 },
        { name: 'イノベーション', description: '革新的な変化を起こす', rarity: 'legendary' as SkillRarity, power: 12, cooldown: 4 }
      ],
      fulfillment: [
        { name: '人生の知恵', description: '経験から得た深い洞察', rarity: 'epic' as SkillRarity, power: 10, cooldown: 2 },
        { name: 'レガシー構築', description: '次世代への価値ある遺産', rarity: 'legendary' as SkillRarity, power: 15, cooldown: 5 },
        { name: '精神的平和', description: '内なる調和と安定', rarity: 'legendary' as SkillRarity, power: 13, cooldown: 3 }
      ]
    }

    const definitions = skillDefinitionsByStage[stage] || skillDefinitionsByStage.youth
    return this.createCardsFromDefinitions(definitions, def =>
      Card.createSkillCard(def.name, def.rarity, def.power, def.cooldown)
    )
  }

  /**
   * コンボカードを生成
   */
  static createComboCards(): Card[] {
    const comboDefinitions = [
      {
        name: 'ワークライフバランス',
        power: 2,
        requiredCards: ['career', 'family'],
        comboBonus: 4,
        description: 'キャリアと家族の調和'
      },
      {
        name: '健康的な成功',
        power: 3,
        requiredCards: ['health', 'finance'],
        comboBonus: 5,
        description: '健康と経済的安定の両立'
      },
      {
        name: '充実した人生',
        power: 4,
        requiredCards: ['hobby', 'family', 'career'],
        comboBonus: 8,
        description: '趣味・家族・キャリアの三位一体'
      }
    ]

    return this.createCardsFromDefinitions(comboDefinitions, def =>
      Card.createComboCard(def.name, def.power, def.requiredCards, def.comboBonus)
    )
  }

  /**
   * イベントカードを生成
   */
  static createEventCards(stage: GameStage = 'youth'): Card[] {
    const eventDefinitionsByStage = {
      youth: [
        { name: '新年の抱負', description: '新しい年への決意', power: 5, duration: 3, globalEffect: false },
        { name: '就職ブーム', description: '雇用機会の増加', power: 4, duration: 2, globalEffect: true },
        { name: '健康ブーム', description: '健康への意識向上', power: 3, duration: 4, globalEffect: true }
      ],
      middle: [
        { name: '経済成長期', description: '社会全体の活況', power: 6, duration: 3, globalEffect: true },
        { name: '家族の絆', description: '家族関係の深化', power: 7, duration: 2, globalEffect: false },
        { name: '技術革新', description: 'テクノロジーの進歩', power: 8, duration: 4, globalEffect: true }
      ],
      fulfillment: [
        { name: '人生の総決算', description: '経験の統合と成熟', power: 10, duration: 2, globalEffect: false },
        { name: '世代交代', description: '次世代への継承', power: 9, duration: 3, globalEffect: true }
      ]
    }

    const definitions = eventDefinitionsByStage[stage] || eventDefinitionsByStage.youth
    return this.createCardsFromDefinitions(definitions, def =>
      Card.createEventCard(def.name, def.power, def.duration, def.globalEffect)
    )
  }

  /**
   * レジェンダリーカードを生成（アンロック制）
   */
  static createLegendaryCards(): Card[] {
    const legendaryDefinitions = [
      {
        name: '人生の達人',
        power: 20,
        unlockCondition: '全ステージで50回以上成功',
        description: '人生経験の集大成'
      },
      {
        name: '運命を変える決断',
        power: 25,
        unlockCondition: '連続10回チャレンジ成功',
        description: '人生を劇的に変える瞬間'
      },
      {
        name: '完璧な調和',
        power: 30,
        unlockCondition: '全カテゴリのカードを50枚以上獲得',
        description: 'すべての側面が完璧にバランスした状態'
      }
    ]

    return this.createCardsFromDefinitions(legendaryDefinitions, def =>
      Card.createLegendaryCard(def.name, def.power, def.unlockCondition)
    )
  }
}