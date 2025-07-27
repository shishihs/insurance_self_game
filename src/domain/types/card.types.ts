/**
 * カード種別
 */
export type CardType = 'life' | 'insurance' | 'pitfall'

/**
 * カードカテゴリー（人生カード用）
 */
export type LifeCardCategory = 
  | 'health'    // 健康
  | 'career'    // キャリア
  | 'family'    // 家族
  | 'hobby'     // 趣味
  | 'finance'   // 金融

/**
 * 保険種別（保険カード用）
 */
export type InsuranceType = 
  | 'life'      // 生命保険
  | 'medical'   // 医療保険
  | 'accident'  // 傷害保険
  | 'income'    // 収入保障保険
  | 'asset'     // 資産形成保険

/**
 * 保険期間種別
 */
export type InsuranceDurationType = 
  | 'term'       // 定期保険（期限あり）
  | 'whole_life' // 終身保険（期限なし）


/**
 * 夢カードカテゴリー
 */
export type DreamCategory = 'physical' | 'intellectual' | 'mixed'

/**
 * カード効果タイプ
 */
export type CardEffectType = 
  | 'power_boost'       // パワー増加
  | 'draw_cards'        // カードドロー
  | 'heal'              // 活力回復
  | 'shield'            // 防御
  | 'special_action'    // 特殊行動

/**
 * ゲームステージ
 */
export type GameStage = 'youth' | 'middle' | 'fulfillment'

/**
 * 難易度
 */
export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert'

/**
 * カード効果
 */
export interface CardEffect {
  type: CardEffectType
  value: number
  description: string
  condition?: string // 発動条件
}

/**
 * カードインターフェース
 */
export interface ICard {
  id: string
  name: string
  description: string
  type: CardType
  power: number
  cost: number
  effects: CardEffect[]
  imageUrl?: string
  
  // 人生カード固有
  category?: LifeCardCategory
  
  // 保険カード固有
  insuranceType?: InsuranceType
  coverage?: number // 保障額
  durationType?: InsuranceDurationType // 保険期間種別
  remainingTurns?: number // 定期保険の残りターン数（定期保険のみ）
  
  // 落とし穴カード固有
  penalty?: number // ペナルティ値
  
  // 保険カード用年齢ボーナス
  ageBonus?: number
  
  // Phase 4: 夢カード固有
  dreamCategory?: DreamCategory
}


/**
 * 夢カードインターフェース
 */
export interface DreamCard extends ICard {
  category: DreamCategory
  baseRequiredPower: number
  ageAdjustment: number // 年齢調整値
}