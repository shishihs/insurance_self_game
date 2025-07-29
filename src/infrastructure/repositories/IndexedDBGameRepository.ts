/**
 * ゲームリポジトリのIndexedDB実装
 * 
 * ゲームデータの永続化をIndexedDBを使用して実現します。
 * InMemoryGameRepositoryの代替として、本番環境で使用されます。
 */

import type { IGameRepository } from '@/domain/repositories/IGameRepository'
import type { Game } from '@/domain/entities/Game'
import { IndexedDBManager, type SerializedGame } from '../storage/IndexedDBManager'
import { Game as GameEntity } from '@/domain/entities/Game'

export class IndexedDBGameRepository implements IGameRepository {
  private indexedDB: IndexedDBManager
  private cache: Map<string, Game> = new Map()
  private isInitialized = false
  
  constructor() {
    this.indexedDB = IndexedDBManager.getInstance()
  }
  
  /**
   * リポジトリを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      await this.indexedDB.initialize()
      this.isInitialized = true
      console.log('✅ IndexedDBGameRepository initialized')
    } catch (error) {
      console.error('❌ Failed to initialize IndexedDBGameRepository:', error)
      throw error
    }
  }
  
  async findById(id: string): Promise<Game | null> {
    await this.ensureInitialized()
    
    // キャッシュを確認
    if (this.cache.has(id)) {
      return this.cloneGame(this.cache.get(id)!)
    }
    
    // IndexedDBから検索
    try {
      const games = await this.indexedDB.searchGameHistory({ limit: 1000 })
      const serialized = games.find(g => g.id === id)
      
      if (serialized) {
        const game = await this.deserializeGame(serialized)
        this.cache.set(id, game)
        return this.cloneGame(game)
      }
      
      return null
    } catch (error) {
      console.error('findById error:', error)
      return null
    }
  }
  
  async save(game: Game): Promise<void> {
    await this.ensureInitialized()
    
    try {
      // キャッシュを更新
      this.cache.set(game.id, this.cloneGame(game))
      
      // IndexedDBに保存
      await this.indexedDB.addGameToHistory(game)
      
      console.log(`✅ Game saved: ${game.id}`)
    } catch (error) {
      console.error('save error:', error)
      throw new Error('ゲームの保存に失敗しました')
    }
  }
  
  async delete(id: string): Promise<void> {
    await this.ensureInitialized()
    
    // キャッシュから削除
    this.cache.delete(id)
    
    // IndexedDBからの削除は実装しない（履歴保持のため）
    console.log(`🗑️ Game removed from cache: ${id}`)
  }
  
  async findInProgressGames(): Promise<Game[]> {
    await this.ensureInitialized()
    
    try {
      const games = await this.indexedDB.searchGameHistory({
        status: 'in_progress',
        limit: 100
      })
      
      const inProgressGames: Game[] = []
      
      for (const serialized of games) {
        const game = await this.deserializeGame(serialized)
        inProgressGames.push(this.cloneGame(game))
      }
      
      return inProgressGames
    } catch (error) {
      console.error('findInProgressGames error:', error)
      return []
    }
  }
  
  async findLatestByUserId(userId: string): Promise<Game | null> {
    await this.ensureInitialized()
    
    try {
      // 最新のゲームを取得（日付でソート）
      const games = await this.indexedDB.searchGameHistory({
        limit: 1
      })
      
      if (games.length > 0) {
        const game = await this.deserializeGame(games[0])
        return this.cloneGame(game)
      }
      
      return null
    } catch (error) {
      console.error('findLatestByUserId error:', error)
      return null
    }
  }
  
  /**
   * 特定の条件でゲームを検索
   */
  async findByCriteria(criteria: {
    status?: string
    stage?: string
    minScore?: number
    maxScore?: number
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<Game[]> {
    await this.ensureInitialized()
    
    try {
      const serializedGames = await this.indexedDB.searchGameHistory(criteria)
      const games: Game[] = []
      
      for (const serialized of serializedGames) {
        const game = await this.deserializeGame(serialized)
        
        // 追加のフィルタリング（stageなど）
        if (criteria.stage && game.stage !== criteria.stage) {
          continue
        }
        
        games.push(this.cloneGame(game))
      }
      
      return games
    } catch (error) {
      console.error('findByCriteria error:', error)
      return []
    }
  }
  
  /**
   * 統計情報を取得
   */
  async getStatistics(): Promise<{
    totalGames: number
    inProgressGames: number
    completedGames: number
    averageScore: number
  }> {
    await this.ensureInitialized()
    
    try {
      const allGames = await this.indexedDB.searchGameHistory({ limit: 1000 })
      
      const stats = {
        totalGames: allGames.length,
        inProgressGames: allGames.filter(g => g.status === 'in_progress').length,
        completedGames: allGames.filter(g => g.status === 'victory' || g.status === 'game_over').length,
        averageScore: 0
      }
      
      if (stats.totalGames > 0) {
        const totalScore = allGames.reduce((sum, g) => sum + (g.score || 0), 0)
        stats.averageScore = totalScore / stats.totalGames
      }
      
      return stats
    } catch (error) {
      console.error('getStatistics error:', error)
      return {
        totalGames: 0,
        inProgressGames: 0,
        completedGames: 0,
        averageScore: 0
      }
    }
  }
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear()
    console.log('🧹 Game cache cleared')
  }
  
  /**
   * リポジトリのサイズ情報を取得
   */
  async getStorageInfo(): Promise<{
    cachedGames: number
    totalGames: number
    storageUsed: number
  }> {
    await this.ensureInitialized()
    
    const dbSize = await this.indexedDB.getDatabaseSize()
    const allGames = await this.indexedDB.searchGameHistory({ limit: 1000 })
    
    return {
      cachedGames: this.cache.size,
      totalGames: allGames.length,
      storageUsed: dbSize.used
    }
  }
  
  // === プライベートメソッド ===
  
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }
  
  /**
   * SerializedGameからGameインスタンスを復元
   */
  private async deserializeGame(serialized: SerializedGame): Promise<Game> {
    try {
      const gameState = JSON.parse(serialized.data)
      
      // Gameインスタンスを作成
      const game = new GameEntity(gameState.config)
      
      // 基本プロパティを復元
      Object.assign(game, {
        id: gameState.id,
        status: gameState.status,
        phase: gameState.phase,
        stage: gameState.stage,
        turn: gameState.turn,
        vitality: gameState.vitality,
        maxVitality: gameState.maxVitality,
        insuranceBurden: gameState.insuranceBurden,
        startedAt: serialized.startedAt,
        completedAt: serialized.completedAt
      })
      
      // 統計情報を復元
      if (gameState.stats) {
        game.stats = { ...gameState.stats }
      }
      
      // カード情報を復元
      if (gameState.hand) {
        game.hand = gameState.hand.map((cardData: any) => ({
          id: cardData.id,
          name: cardData.name,
          type: cardData.type,
          power: cardData.power,
          cost: cardData.cost || 0,
          description: cardData.description || '',
          rarity: cardData.rarity || 'common',
          stage: cardData.stage || 'youth',
          insuranceType: cardData.insuranceType,
          durationType: cardData.durationType,
          imageUrl: cardData.imageUrl,
          effect: cardData.effect
        }))
      }
      
      if (gameState.selectedCards) {
        game.selectedCards = gameState.selectedCards.map((cardData: any) => ({
          id: cardData.id,
          name: cardData.name,
          type: cardData.type,
          power: cardData.power,
          cost: cardData.cost || 0,
          description: cardData.description || '',
          rarity: cardData.rarity || 'common',
          stage: cardData.stage || 'youth',
          insuranceType: cardData.insuranceType,
          durationType: cardData.durationType,
          imageUrl: cardData.imageUrl,
          effect: cardData.effect
        }))
      }
      
      if (gameState.insuranceCards) {
        game.insuranceCards = gameState.insuranceCards.map((cardData: any) => ({
          id: cardData.id,
          name: cardData.name,
          type: cardData.type,
          power: cardData.power,
          cost: cardData.cost || 0,
          description: cardData.description || '',
          rarity: cardData.rarity || 'common',
          stage: cardData.stage || 'youth',
          insuranceType: cardData.insuranceType,
          durationType: cardData.durationType,
          imageUrl: cardData.imageUrl,
          effect: cardData.effect,
          remainingTurns: cardData.remainingTurns
        }))
      }
      
      if (gameState.currentChallenge) {
        game.currentChallenge = {
          id: gameState.currentChallenge.id,
          name: gameState.currentChallenge.name,
          type: gameState.currentChallenge.type,
          power: gameState.currentChallenge.power,
          cost: gameState.currentChallenge.cost || 0,
          description: gameState.currentChallenge.description || '',
          rarity: gameState.currentChallenge.rarity || 'common',
          stage: gameState.currentChallenge.stage || 'youth',
          insuranceType: gameState.currentChallenge.insuranceType,
          durationType: gameState.currentChallenge.durationType,
          imageUrl: gameState.currentChallenge.imageUrl,
          effect: gameState.currentChallenge.effect
        }
      }
      
      return game
    } catch (error) {
      console.error('deserializeGame error:', error)
      throw new Error('ゲームデータの復元に失敗しました')
    }
  }
  
  /**
   * ゲームオブジェクトをクローン（防御的コピー）
   */
  private cloneGame(game: Game): Game {
    // 簡易的なディープクローン
    // 実際のプロダクションコードでは、より堅牢な実装が必要
    return JSON.parse(JSON.stringify(game))
  }
}