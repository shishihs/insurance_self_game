import type { 
  ICard, 
  CardType, 
  CardEffect,
  CardEffectType, 
  LifeCardCategory, 
  InsuranceType,
  InsuranceDurationType,
  DreamCategory
} from '../types/card.types'

/**
 * カードエンティティ
 */
export class Card implements ICard {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: CardType
  readonly power: number
  readonly cost: number
  readonly effects: CardEffect[]
  readonly imageUrl?: string
  readonly category?: LifeCardCategory
  readonly insuranceType?: InsuranceType
  readonly coverage?: number
  readonly penalty?: number
  // 保険カード用プロパティ
  readonly ageBonus?: number
  readonly durationType?: InsuranceDurationType
  remainingTurns?: number // 可変プロパティ（ターンごとに減少）
  // Phase 4 夢カード用プロパティ
  readonly dreamCategory?: DreamCategory

  constructor(params: ICard) {
    this.id = params.id
    this.name = params.name
    this.description = params.description
    this.type = params.type
    this.power = params.power
    this.cost = params.cost
    this.effects = params.effects
    this.imageUrl = params.imageUrl
    this.category = params.category
    this.insuranceType = params.insuranceType
    this.coverage = params.coverage
    this.penalty = params.penalty
    
    // 年齢ボーナスのプロパティ
    if ('ageBonus' in params) {
      this.ageBonus = params.ageBonus
    }
    
    // 保険期間種別と残りターン数
    if ('durationType' in params) {
      this.durationType = params.durationType
    }
    if ('remainingTurns' in params) {
      this.remainingTurns = params.remainingTurns
    }
    
    // Phase 4: 夢カードのカテゴリー
    if ('dreamCategory' in params) {
      this.dreamCategory = params.dreamCategory
    }
  }

  /**
   * カードの実効パワーを計算
   */
  calculateEffectivePower(bonuses: number = 0): number {
    // 年齢ボーナスを含めて計算
    const totalBonus = bonuses + (this.ageBonus || 0)
    return Math.max(0, this.power + totalBonus)
  }

  /**
   * カードが特定の効果を持っているか確認
   */
  hasEffect(effectType: CardEffectType): boolean {
    return this.effects.some(effect => effect.type === effectType)
  }

  /**
   * 人生カードかどうか
   */
  isLifeCard(): boolean {
    return this.type === 'life'
  }

  /**
   * 保険カードかどうか
   */
  isInsuranceCard(): boolean {
    return this.type === 'insurance'
  }

  /**
   * 落とし穴カードかどうか
   */
  isPitfallCard(): boolean {
    return this.type === 'pitfall'
  }

  /**
   * Phase 4: 夢カードかどうか
   */
  isDreamCard(): boolean {
    return this.dreamCategory !== undefined
  }

  /**
   * 定期保険かどうか
   */
  isTermInsurance(): boolean {
    return this.isInsuranceCard() && this.durationType === 'term'
  }

  /**
   * 終身保険かどうか
   */
  isWholeLifeInsurance(): boolean {
    return this.isInsuranceCard() && this.durationType === 'whole_life'
  }

  /**
   * 期限切れかどうか（定期保険のみ）
   */
  isExpired(): boolean {
    if (!this.isTermInsurance()) {
      return false
    }
    return this.remainingTurns !== undefined && this.remainingTurns <= 0
  }

  /**
   * ターン経過処理（定期保険の期限を1減らす）
   */
  decrementTurn(): void {
    if (this.isTermInsurance() && this.remainingTurns !== undefined && this.remainingTurns > 0) {
      this.remainingTurns--
    }
  }

  /**
   * 期限までの残りターン数を取得（表示用）
   */
  getRemainingTurnsDisplay(): string {
    if (!this.isTermInsurance() || this.remainingTurns === undefined) {
      return '終身'
    }
    if (this.remainingTurns <= 0) {
      return '期限切れ'
    }
    return `残り${this.remainingTurns}ターン`
  }

  /**
   * カードのコピーを作成
   */
  clone(): Card {
    const baseParams: ICard = {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      power: this.power,
      cost: this.cost,
      effects: [...this.effects],
      imageUrl: this.imageUrl,
      category: this.category,
      insuranceType: this.insuranceType,
      coverage: this.coverage,
      penalty: this.penalty,
      ageBonus: this.ageBonus || 0,
      durationType: this.durationType,
      remainingTurns: this.remainingTurns,
      dreamCategory: this.dreamCategory
    }
    
    return new Card(baseParams)
  }

  /**
   * 保険効果を適用（ダメージ軽減など）
   */
  applyInsuranceEffect(damage: number): number {
    if (!this.isInsuranceCard() || !this.coverage) {
      return damage
    }

    // シールド効果: ダメージを軽減
    const shieldEffect = this.effects.find(effect => effect.type === 'shield')
    if (shieldEffect && shieldEffect.value) {
      const reduction = Math.min(damage, shieldEffect.value)
      return Math.max(0, damage - reduction)
    }

    return damage
  }

  /**
   * カードの表示用テキストを生成
   */
  toDisplayString(): string {
    let display = `${this.name} (Power: ${this.power}, Cost: ${this.cost})`
    
    if (this.coverage) {
      display += `, Coverage: ${this.coverage}`
    }
    
    // 年齢ボーナスの表示
    if (this.ageBonus) {
      display += `, Age Bonus: +${this.ageBonus}`
    }
    
    // 保険期間の表示
    if (this.isInsuranceCard()) {
      display += `, 期間: ${this.getRemainingTurnsDisplay()}`
    }
    
    if (this.effects.length > 0) {
      display += '\nEffects:'
      this.effects.forEach(effect => {
        display += `\n  - ${effect.description}`
      })
    }
    
    return display
  }
  
}