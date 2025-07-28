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
 * カードエンティティ - ゲーム内のすべてのカードの基底クラス
 * 
 * このクラスは値オブジェクトを使用してビジネスルールを表現します：
 * - power: CardPower値オブジェクト（カードの効果値）
 * - cost: InsurancePremium値オブジェクト（保険カードの場合）
 * 
 * @implements {ICard} カードインターフェース
 * 
 * @example
 * // 人生カードの作成
 * const lifeCard = Card.createLifeCard('アルバイト収入', 1);
 * 
 * // 保険カードの作成
 * const insuranceCard = Card.createInsuranceCard('健康保険', 2);
 * 
 * // チャレンジカードの作成
 * const challengeCard = Card.createChallengeCard('結婚', 4);
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

  /**
   * Cardインスタンスを作成
   * @param {ICard} params - カードのパラメータ
   * @param {string} params.id - カードID
   * @param {string} params.name - カード名
   * @param {string} params.description - カードの説明
   * @param {CardType} params.type - カードタイプ
   * @param {number} params.power - カードのパワー
   * @param {number} params.cost - カードのコスト
   * @param {CardEffect[]} params.effects - カードの効果
   */
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
   * 後方互換性のためのgetter - カードのパワー値を取得
   * @returns {number} カードのパワー値
   */
  get power(): number {
    return this._power.getValue()
  }

  /**
   * カードのコストを取得
   * @returns {number} カードのコスト
   */
  get cost(): number {
    return this._cost.getValue()
  }

  /**
   * 値オブジェクトとしてのpower取得
   * @returns {CardPower} カードパワー値オブジェクト
   */
  getPower(): CardPower {
    return this._power
  }

  /**
   * 値オブジェクトとしてのcost取得
   * @returns {InsurancePremium} 保険料値オブジェクト
   */
  getCost(): InsurancePremium {
    return this._cost
  }

  /**
   * カードが特定の効果を持っているか判定
   * @param {CardEffectType} effectType - 確認する効果タイプ
   * @returns {boolean} 効果を持っている場合true
   */
  hasEffect(effectType: CardEffectType): boolean {
    return this.effects.some(effect => effect.type === effectType)
  }

  /**
   * 特定の効果を取得
   * @param {CardEffectType} effectType - 取得する効果タイプ
   * @returns {CardEffect | undefined} 効果オブジェクトまたはundefined
   */
  getEffect(effectType: CardEffectType): CardEffect | undefined {
    return this.effects.find(effect => effect.type === effectType)
  }

  /**
   * 保険カードかどうか判定
   * @returns {boolean} 保険カードの場合true
   */
  isInsurance(): boolean {
    return this.type === 'insurance'
  }

  /**
   * 定期保険かどうか判定
   * @returns {boolean} 定期保険の場合true
   */
  isTermInsurance(): boolean {
    return this.isInsurance() && this.durationType === 'term'
  }

  /**
   * 終身保険かどうか判定
   * @returns {boolean} 終身保険の場合true
   */
  isWholeLifeInsurance(): boolean {
    return this.isInsurance() && this.durationType === 'whole_life'
  }

  /**
   * Phase 4: 夢カードかどうか判定
   * @returns {boolean} 夢カードの場合true
   */
  isDreamCard(): boolean {
    return this.type === 'dream'
  }

  /**
   * カードのコピーを作成（一部のプロパティを更新可能）
   * @param {Partial<ICard>} [updates] - 更新するプロパティ
   * @returns {Card} 新しいCardインスタンス
   */
  copy(updates?: Partial<ICard>): Card {
    return new Card({
      ...this,
      power: this.power, // getter経由で取得
      cost: this.cost,   // getter経由で取得
      effects: [...this.effects], // 配列の深いコピー
      ...updates
    })
  }

  /**
   * カードのクローンを作成（後方互換性のため）
   * @returns {Card} カードの完全なコピー
   * @deprecated copy()メソッドの使用を推奨
   */
  clone(): Card {
    return this.copy()
  }

  /**
   * 残りターン数を減少させる（定期保険用）
   * @returns {Card} ターン数を減らした新しいCardインスタンス
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
   * @returns {boolean} 期限切れの場合true
   */
  isExpired(): boolean {
    if (!this.isTermInsurance()) {
      return false
    }
    return this.remainingTurns === 0
  }

  /**
   * パワーが指定値以上か判定（値オブジェクトを使用）
   * @param {number} threshold - 闾値
   * @returns {boolean} パワーが闾値以上の場合true
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

  /**
   * 効果的なパワーを計算（年齢ボーナス等を含む）
   */
  calculateEffectivePower(): number {
    let effectivePower = this.power

    // 保険カードの年齢ボーナスを適用
    if (this.isInsurance() && this.ageBonus) {
      effectivePower += this.ageBonus
    }

    return Math.max(0, effectivePower)
  }

  /**
   * ライフカードかどうか判定
   */
  isLifeCard(): boolean {
    return this.type === 'life'
  }

  /**
   * 保険カードかどうか判定（エイリアス）
   */
  isInsuranceCard(): boolean {
    return this.isInsurance()
  }

  /**
   * 落とし穴カードかどうか判定
   */
  isPitfallCard(): boolean {
    return this.type === 'pitfall'
  }

  /**
   * カードの表示用文字列を生成
   */
  toDisplayString(): string {
    let display = `${this.name} (${this.power})`
    
    if (this.effects.length > 0) {
      const effectDescriptions = this.effects.map(effect => effect.description).join(', ')
      display += ` - ${effectDescriptions}`
    }
    
    return display
  }

  /**
   * ターン数を減少させる（mutableな操作）
   */
  decrementTurn(): void {
    if (this.remainingTurns !== undefined && this.remainingTurns > 0) {
      this.remainingTurns--
    }
  }

  // === 静的ファクトリーメソッド（TDD: Green Phase） ===

  /**
   * ライフカードを作成
   */
  static createLifeCard(name: string, power: number): Card {
    const powerSign = power > 0 ? '+' : ''
    return new Card({
      id: `life_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `パワー: ${powerSign}${power}`,
      type: 'life',
      power,
      cost: 0,
      effects: []
    })
  }

  /**
   * チャレンジカードを作成
   */
  static createChallengeCard(name: string, power: number): Card {
    const card = new Card({
      id: `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `必要パワー: ${power}`,
      type: 'challenge',
      power,
      cost: 0,
      effects: []
    })
    
    return card
  }

  /**
   * 保険カードを作成
   */
  static createInsuranceCard(name: string, power: number, ...effects: CardEffect[]): Card {
    return new Card({
      id: `insurance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `保険カード - パワー: +${power}`,
      type: 'insurance',
      power,
      cost: 1,
      effects: effects
    })
  }
}