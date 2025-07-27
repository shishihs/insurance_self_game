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
import { CardPower } from '../valueObjects/CardPower'
import { InsurancePremium } from '../valueObjects/InsurancePremium'

/**
 * カードエンティティ
 * 
 * このクラスは値オブジェクトを使用してビジネスルールを表現します。
 * - power: CardPower値オブジェクト
 * - cost: InsurancePremium値オブジェクト（保険カードの場合）
 */
export class Card implements ICard {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: CardType
  private readonly _power: CardPower
  private readonly _cost: InsurancePremium
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
    
    // 値オブジェクトでラップ
    this._power = CardPower.create(params.power)
    this._cost = InsurancePremium.create(params.cost)
    
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
    
    // 保険期間のプロパティ
    if ('durationType' in params) {
      this.durationType = params.durationType
    }
    if ('remainingTurns' in params) {
      this.remainingTurns = params.remainingTurns
    }
    
    // Phase 4 夢カードのプロパティ
    if ('dreamCategory' in params) {
      this.dreamCategory = params.dreamCategory
    }
  }

  /**
   * 後方互換性のためのgetter
   * 既存のコードが動作するように、number型を返す
   */
  get power(): number {
    return this._power.getValue()
  }

  get cost(): number {
    return this._cost.getValue()
  }

  /**
   * 値オブジェクトとしてのpower取得
   */
  getPower(): CardPower {
    return this._power
  }

  /**
   * 値オブジェクトとしてのcost取得
   */
  getCost(): InsurancePremium {
    return this._cost
  }

  /**
   * カードが効果を持っているか判定
   */
  hasEffect(effectType: CardEffectType): boolean {
    return this.effects.some(effect => effect.type === effectType)
  }

  /**
   * 特定の効果を取得
   */
  getEffect(effectType: CardEffectType): CardEffect | undefined {
    return this.effects.find(effect => effect.type === effectType)
  }

  /**
   * 保険カードかどうか判定
   */
  isInsurance(): boolean {
    return this.type === 'insurance'
  }

  /**
   * 定期保険かどうか判定
   */
  isTermInsurance(): boolean {
    return this.isInsurance() && this.durationType === 'term'
  }

  /**
   * 終身保険かどうか判定
   */
  isWholeLifeInsurance(): boolean {
    return this.isInsurance() && this.durationType === 'whole_life'
  }

  /**
   * Phase 4: 夢カードかどうか判定
   */
  isDreamCard(): boolean {
    return this.type === 'dream'
  }

  /**
   * カードのコピーを作成（一部のプロパティを更新可能）
   */
  copy(updates?: Partial<ICard>): Card {
    return new Card({
      ...this,
      power: this.power, // getter経由で取得
      cost: this.cost,   // getter経由で取得
      ...updates
    })
  }

  /**
   * 残りターン数を減少させる（定期保険用）
   */
  decrementRemainingTurns(): Card {
    if (!this.isTermInsurance() || !this.remainingTurns) {
      return this
    }
    
    return this.copy({
      remainingTurns: Math.max(0, this.remainingTurns - 1)
    })
  }

  /**
   * 保険が有効期限切れかどうか判定
   */
  isExpired(): boolean {
    if (!this.isTermInsurance()) {
      return false
    }
    return this.remainingTurns === 0
  }

  /**
   * パワーが指定値以上か判定（値オブジェクトを使用）
   */
  hasPowerAtLeast(requiredPower: number): boolean {
    const required = CardPower.create(requiredPower)
    return this._power.isGreaterThanOrEqual(required)
  }

  /**
   * コストが支払い可能か判定（値オブジェクトを使用）
   */
  isAffordableWith(availableVitality: number): boolean {
    return this._cost.isAffordableWith(availableVitality)
  }
}