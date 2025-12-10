/**
 * 保険システムのバランス調整用定数
 * Issue #24: 保険効果の過度な強力さを緩和するための設定
 */

/**
 * 保険によるダメージ軽減の上限値
 * 1枚の保険カードで軽減できる最大ダメージ量
 */
export const MAX_DAMAGE_REDUCTION_PER_INSURANCE = 50

/**
 * 保険によるダメージ軽減の合計上限値
 * 複数の保険を持っていても、これ以上はダメージを軽減できない
 */
export const MAX_TOTAL_DAMAGE_REDUCTION = 100

/**
 * 保険効果の段階的な適用レート
 * カバレッジ値に対する実際の軽減率
 */
export const INSURANCE_EFFECTIVENESS_RATE = 0.5 // 50%の効果

/**
 * 保険の最小ダメージ保証
 * どんなに保険があっても、最低限このダメージは受ける
 */
export const MINIMUM_DAMAGE_AFTER_INSURANCE = 1