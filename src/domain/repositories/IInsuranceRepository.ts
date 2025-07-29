import type { Insurance, InsuranceId } from '../aggregates/insurance'

/**
 * 保険リポジトリインターフェース
 * 
 * 保険集約の永続化に関する操作を定義します。
 */
export interface IInsuranceRepository {
  /**
   * IDで保険を取得
   */
  findById(id: InsuranceId): Promise<Insurance | null>

  /**
   * 保険を保存
   */
  save(insurance: Insurance): Promise<void>

  /**
   * ゲームIDでアクティブな保険を取得
   */
  findActiveByGameId(gameId: string): Promise<Insurance[]>

  /**
   * ゲームIDで全ての保険を取得（期限切れ含む）
   */
  findAllByGameId(gameId: string): Promise<Insurance[]>

  /**
   * 保険を削除
   */
  delete(id: InsuranceId): Promise<void>

  /**
   * 期限切れの保険を取得
   */
  findExpiredByGameId(gameId: string): Promise<Insurance[]>
}