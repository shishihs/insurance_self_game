import type { 
  ICard, 
  CardType, 
  CardEffect,
  CardEffectType, 
  LifeCardCategory, 
  InsuranceType 
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
  }

  /**
   * カードの実効パワーを計算
   */
  calculateEffectivePower(bonuses: number = 0): number {
    return Math.max(0, this.power + bonuses)
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
    return new Card({
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
      penalty: this.penalty
    })
  }

  /**
   * カードの表示用テキストを生成
   */
  toDisplayString(): string {
    let display = `${this.name} (Power: ${this.power}, Cost: ${this.cost})`
    
    if (this.effects.length > 0) {
      display += '\nEffects:'
      this.effects.forEach(effect => {
        display += `\n  - ${effect.description}`
      })
    }
    
    return display
  }
}