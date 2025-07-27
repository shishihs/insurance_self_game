import type { 
  ICard, 
  CardType, 
  CardEffect,
  CardEffectType, 
  LifeCardCategory, 
  InsuranceType,
  InsuranceDurationType,
  InsuranceCardData
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
  // Phase 2 拡張保険カード用プロパティ
  readonly durationType?: InsuranceDurationType
  readonly remainingTurns?: number
  readonly ageBonus?: number

  constructor(params: ICard | InsuranceCardData) {
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
    
    // InsuranceCardData固有のプロパティ
    if ('durationType' in params) {
      this.durationType = params.durationType
      this.remainingTurns = params.remainingTurns
      this.ageBonus = params.ageBonus
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
   * カードのコピーを作成
   */
  clone(): Card {
    const baseParams: ICard | InsuranceCardData = {
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
      ...(this.durationType && {
        durationType: this.durationType,
        remainingTurns: this.remainingTurns,
        ageBonus: this.ageBonus || 0
      })
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
    
    // Phase 2: 保険期間の表示
    if (this.durationType) {
      display += `, Type: ${this.durationType === 'whole_life' ? '終身' : '定期'}`
      if (this.durationType === 'term' && this.remainingTurns !== undefined) {
        display += ` (残り${this.remainingTurns}ターン)`
      }
    }
    
    // 年齢ボーナスの表示
    if (this.ageBonus) {
      display += `, Age Bonus: +${this.ageBonus}`
    }
    
    if (this.effects.length > 0) {
      display += '\nEffects:'
      this.effects.forEach(effect => {
        display += `\n  - ${effect.description}`
      })
    }
    
    return display
  }
  
  /**
   * 定期保険のターン数を減らす
   */
  decrementRemainingTurns(): Card | null {
    if (this.durationType !== 'term' || this.remainingTurns === undefined) {
      return this
    }
    
    const newRemainingTurns = this.remainingTurns - 1
    if (newRemainingTurns <= 0) {
      // 期限切れ
      return null
    }
    
    // 新しいカードインスタンスを返す
    const params: InsuranceCardData = {
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
      durationType: this.durationType,
      remainingTurns: newRemainingTurns,
      ageBonus: this.ageBonus || 0
    }
    
    return new Card(params)
  }
}