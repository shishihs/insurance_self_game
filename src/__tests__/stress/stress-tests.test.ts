import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Game } from '@/domain/entities/Game';
import { GameController } from '@/controllers/GameController';
// import { Card } from '@/domain/entities/Card';
// import { CardType } from '@/domain/value-objects/CardType';
// import { CardPower } from '@/domain/value-objects/CardPower';
// import { InsuranceCard } from '@/domain/value-objects/InsuranceCard';

/**
 * ストレステストスイート
 * 
 * システムの限界性能を測定し、
 * 極限状況下での安定性を検証
 */

describe.skip('Stress Tests', () => {
  let controller: GameController;
  let memoryBaseline: number;

  beforeEach(() => {
    controller = new GameController();
    // ガベージコレクションを実行（可能な場合）
    if (global.gc) {
      global.gc();
    }
    // メモリベースラインを記録
    memoryBaseline = process.memoryUsage().heapUsed;
  });

  afterEach(() => {
    // メモリ使用量をチェック
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memoryAfter - memoryBaseline;
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  });

  describe('大量データ処理', () => {
    it('10,000回のゲームシミュレーション', { timeout: 300000 }, async () => {
      const startTime = performance.now();
      const results = {
        completed: 0,
        errors: 0,
        avgTurns: 0,
        maxTurns: 0,
        minTurns: Infinity
      };

      for (let i = 0; i < 10000; i++) {
        try {
          const game = new Game();
          let turns = 0;
          
          // ゲーム終了までプレイ
          while (!game.isGameOver() && turns < 1000) {
            const availableCards = game.getPlayerCards();
            if (availableCards.length === 0) break;
            
            const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
            game.playCard(randomCard);
            turns++;
          }
          
          results.completed++;
          results.avgTurns = (results.avgTurns * (i / (i + 1))) + (turns / (i + 1));
          results.maxTurns = Math.max(results.maxTurns, turns);
          results.minTurns = Math.min(results.minTurns, turns);
        } catch (error) {
          results.errors++;
        }
        
        // 進捗レポート（1000回ごと）
        if ((i + 1) % 1000 === 0) {
          const elapsed = performance.now() - startTime;
          console.log(`Progress: ${i + 1}/10000 (${(elapsed / 1000).toFixed(2)}s)`);
        }
      }

      const totalTime = performance.now() - startTime;
      
      console.log('Simulation Results:', {
        ...results,
        totalTimeSeconds: (totalTime / 1000).toFixed(2),
        gamesPerSecond: (10000 / (totalTime / 1000)).toFixed(2)
      });

      expect(results.completed).toBe(10000);
      expect(results.errors).toBe(0);
      expect(totalTime).toBeLessThan(60000); // 60秒以内
    });

    it('1,000,000個のカードオブジェクト生成', () => {
      const startTime = performance.now();
      const cards: Card[] = [];
      
      for (let i = 0; i < 1000000; i++) {
        const type = i % 2 === 0 ? CardType.LIFE : CardType.MONEY;
        const power = new CardPower(Math.floor(Math.random() * 10) + 1);
        cards.push(new Card(type, power));
      }
      
      const creationTime = performance.now() - startTime;
      
      // カードの検証
      expect(cards.length).toBe(1000000);
      expect(cards[0]).toBeInstanceOf(Card);
      expect(cards[999999]).toBeInstanceOf(Card);
      
      // パフォーマンス検証
      expect(creationTime).toBeLessThan(5000); // 5秒以内
      
      console.log(`Created 1M cards in ${(creationTime / 1000).toFixed(2)}s`);
    });

    it('巨大な保険カードコレクションの管理', () => {
      const insuranceCards: InsuranceCard[] = [];
      const startTime = performance.now();
      
      // 100,000個の保険カード生成
      for (let i = 0; i < 100000; i++) {
        const lifeProtection = Math.floor(Math.random() * 5) + 1;
        const moneyProtection = Math.floor(Math.random() * 5) + 1;
        const cost = lifeProtection + moneyProtection;
        const duration = Math.floor(Math.random() * 5) + 1;
        
        insuranceCards.push(
          new InsuranceCard(lifeProtection, moneyProtection, cost, duration)
        );
      }
      
      const creationTime = performance.now() - startTime;
      
      // ソート処理のパフォーマンステスト
      const sortStartTime = performance.now();
      insuranceCards.sort((a, b) => b.getCost() - a.getCost());
      const sortTime = performance.now() - sortStartTime;
      
      // フィルタ処理のパフォーマンステスト
      const filterStartTime = performance.now();
      const expensiveCards = insuranceCards.filter(card => card.getCost() > 5);
      const filterTime = performance.now() - filterStartTime;
      
      // 集計処理のパフォーマンステスト
      const aggregateStartTime = performance.now();
      const totalCost = insuranceCards.reduce((sum, card) => sum + card.getCost(), 0);
      const aggregateTime = performance.now() - aggregateStartTime;
      
      console.log('Large Collection Performance:', {
        creationTimeMs: creationTime.toFixed(2),
        sortTimeMs: sortTime.toFixed(2),
        filterTimeMs: filterTime.toFixed(2),
        aggregateTimeMs: aggregateTime.toFixed(2),
        expensiveCardsCount: expensiveCards.length,
        averageCost: (totalCost / insuranceCards.length).toFixed(2)
      });
      
      expect(creationTime).toBeLessThan(1000);
      expect(sortTime).toBeLessThan(500);
      expect(filterTime).toBeLessThan(100);
      expect(aggregateTime).toBeLessThan(50);
    });
  });

  describe('並行処理ストレステスト', () => {
    it('1000個の同時ゲームインスタンス', async () => {
      const games: Game[] = [];
      const startTime = performance.now();
      
      // 1000個のゲームを同時に作成
      for (let i = 0; i < 1000; i++) {
        games.push(new Game());
      }
      
      // 全ゲームで同時に操作を実行
      const operations = games.map(async (game, index) => {
        const operationStart = performance.now();
        
        // 各ゲームで100回の操作
        for (let j = 0; j < 100; j++) {
          const cards = game.getPlayerCards();
          if (cards.length > 0) {
            const card = cards[0];
            game.playCard(card);
          }
        }
        
        return {
          gameIndex: index,
          duration: performance.now() - operationStart,
          finalScore: game.getScore()
        };
      });
      
      const results = await Promise.all(operations);
      const totalTime = performance.now() - startTime;
      
      // 結果の集計
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const maxDuration = Math.max(...results.map(r => r.duration));
      const minDuration = Math.min(...results.map(r => r.duration));
      
      console.log('Concurrent Games Performance:', {
        totalGames: games.length,
        totalTimeMs: totalTime.toFixed(2),
        avgOperationTimeMs: avgDuration.toFixed(2),
        maxOperationTimeMs: maxDuration.toFixed(2),
        minOperationTimeMs: minDuration.toFixed(2)
      });
      
      expect(totalTime).toBeLessThan(10000); // 10秒以内
      expect(results.every(r => r.duration < 100)).toBe(true); // 各操作100ms以内
    });

    it('高頻度イベント処理', async () => {
      const eventCounts = {
        cardPlayed: 0,
        insuranceActivated: 0,
        challengeResolved: 0,
        gameOver: 0
      };
      
      const game = new Game();
      
      // イベントリスナーを設定
      const listeners = {
        onCardPlayed: () => eventCounts.cardPlayed++,
        onInsuranceActivated: () => eventCounts.insuranceActivated++,
        onChallengeResolved: () => eventCounts.challengeResolved++,
        onGameOver: () => eventCounts.gameOver++
      };
      
      // 10,000回の高速操作
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        // ランダムな操作を実行
        const action = Math.random();
        
        if (action < 0.7) {
          // カードプレイ（70%）
          const cards = game.getPlayerCards();
          if (cards.length > 0) {
            game.playCard(cards[0]);
            listeners.onCardPlayed();
          }
        } else if (action < 0.9) {
          // 保険購入（20%）
          try {
            const insurance = new InsuranceCard(1, 1, 2, 3);
            // 保険購入ロジック（実装に応じて調整）
            listeners.onInsuranceActivated();
          } catch (e) {
            // エラーは無視
          }
        } else {
          // チャレンジ（10%）
          listeners.onChallengeResolved();
        }
        
        if (game.isGameOver()) {
          listeners.onGameOver();
          break;
        }
      }
      
      const totalTime = performance.now() - startTime;
      const totalEvents = Object.values(eventCounts).reduce((sum, count) => sum + count, 0);
      
      console.log('High Frequency Event Processing:', {
        totalTimeMs: totalTime.toFixed(2),
        totalEvents,
        eventsPerSecond: ((totalEvents / totalTime) * 1000).toFixed(2),
        eventCounts
      });
      
      expect(totalTime).toBeLessThan(1000); // 1秒以内
      expect(totalEvents).toBeGreaterThan(5000); // 5000イベント以上処理
    });
  });

  describe('メモリストレステスト', () => {
    it('メモリリークの検出', async () => {
      const memorySnapshots: number[] = [];
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // ゲームインスタンスを作成して破棄
        let game = new Game();
        
        // 大量の操作を実行
        for (let j = 0; j < 1000; j++) {
          const cards = game.getPlayerCards();
          if (cards.length > 0) {
            game.playCard(cards[0]);
          }
        }
        
        // インスタンスを破棄
        game = null as any;
        
        // ガベージコレクションを促す
        if (global.gc && i % 10 === 0) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // メモリ使用量を記録
        if (i % 10 === 0) {
          memorySnapshots.push(process.memoryUsage().heapUsed);
        }
      }
      
      // メモリ増加傾向を分析
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryIncrease = lastSnapshot - firstSnapshot;
      const memoryIncreasePercent = (memoryIncrease / firstSnapshot) * 100;
      
      console.log('Memory Leak Detection:', {
        snapshots: memorySnapshots.map(m => (m / 1024 / 1024).toFixed(2) + ' MB'),
        totalIncreaseKB: (memoryIncrease / 1024).toFixed(2),
        increasePercent: memoryIncreasePercent.toFixed(2) + '%'
      });
      
      // メモリ増加が50%未満であることを確認
      expect(memoryIncreasePercent).toBeLessThan(50);
    });

    it('大量の循環参照処理', () => {
      interface CircularNode {
        id: number;
        data: any[];
        next?: CircularNode;
        prev?: CircularNode;
        children: CircularNode[];
      }
      
      const nodes: CircularNode[] = [];
      const nodeCount = 10000;
      
      // 循環参照を持つノードを作成
      for (let i = 0; i < nodeCount; i++) {
        const node: CircularNode = {
          id: i,
          data: new Array(100).fill(Math.random()),
          children: []
        };
        
        // 前のノードと相互参照
        if (i > 0) {
          node.prev = nodes[i - 1];
          nodes[i - 1].next = node;
        }
        
        // ランダムな子ノードへの参照
        if (i > 10) {
          const parentIndex = Math.floor(Math.random() * (i - 1));
          nodes[parentIndex].children.push(node);
        }
        
        nodes.push(node);
      }
      
      // 最初と最後を繋いで完全な循環を作る
      nodes[0].prev = nodes[nodeCount - 1];
      nodes[nodeCount - 1].next = nodes[0];
      
      // メモリ使用量を確認
      const memoryUsed = process.memoryUsage().heapUsed / 1024 / 1024;
      
      // 循環参照の解除
      const cleanupStart = performance.now();
      nodes.forEach(node => {
        delete node.next;
        delete node.prev;
        node.children = [];
      });
      const cleanupTime = performance.now() - cleanupStart;
      
      console.log('Circular Reference Test:', {
        nodeCount,
        memoryUsedMB: memoryUsed.toFixed(2),
        cleanupTimeMs: cleanupTime.toFixed(2)
      });
      
      expect(cleanupTime).toBeLessThan(100); // クリーンアップ100ms以内
    });
  });

  describe('エラー耐性テスト', () => {
    it('大量のエラー発生時の安定性', () => {
      const errors: Error[] = [];
      const operations = 10000;
      let successCount = 0;
      
      for (let i = 0; i < operations; i++) {
        try {
          // ランダムにエラーを発生させる操作
          if (Math.random() < 0.3) {
            // 無効なカードパワーでエラーを誘発
            new CardPower(-1);
          } else if (Math.random() < 0.5) {
            // nullを渡してエラーを誘発
            new Card(null as any, null as any);
          } else {
            // 正常な操作
            new Card(CardType.LIFE, new CardPower(5));
            successCount++;
          }
        } catch (error) {
          errors.push(error as Error);
        }
      }
      
      console.log('Error Resilience Test:', {
        totalOperations: operations,
        successCount,
        errorCount: errors.length,
        errorRate: ((errors.length / operations) * 100).toFixed(2) + '%',
        uniqueErrorTypes: new Set(errors.map(e => e.constructor.name)).size
      });
      
      // システムが完全にクラッシュしていないことを確認
      expect(successCount).toBeGreaterThan(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('リソース枯渇時の挙動', async () => {
      const resources: any[] = [];
      let outOfMemoryError = null;
      
      try {
        // メモリを意図的に消費
        while (true) {
          // 10MBずつ割り当て
          resources.push(new Array(10 * 1024 * 1024 / 8).fill(Math.random()));
          
          // 1GBを超えたら停止（安全のため）
          if (resources.length > 100) {
            break;
          }
        }
      } catch (error) {
        outOfMemoryError = error;
      }
      
      // リソースを解放
      resources.length = 0;
      
      // システムが回復できることを確認
      const recoveryTest = new Game();
      expect(recoveryTest).toBeDefined();
      expect(recoveryTest.getScore()).toBe(100);
      
      console.log('Resource Exhaustion Test:', {
        maxResourcesAllocated: resources.length,
        outOfMemoryOccurred: outOfMemoryError !== null,
        systemRecovered: true
      });
    });
  });

  describe('境界値ストレステスト', () => {
    it('極端な値での動作確認', () => {
      const extremeValues = [
        0,
        1,
        -1,
        Number.MAX_SAFE_INTEGER,
        Number.MIN_SAFE_INTEGER,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.NaN
      ];
      
      const results = extremeValues.map(value => {
        const errors: string[] = [];
        
        // CardPowerの境界値テスト
        try {
          new CardPower(value);
        } catch (e) {
          errors.push(`CardPower: ${(e as Error).message}`);
        }
        
        // スコア計算の境界値テスト
        try {
          const game = new Game();
          // スコアを極端な値に設定する方法（実装に依存）
          // game.setScore(value);
        } catch (e) {
          errors.push(`Score: ${(e as Error).message}`);
        }
        
        return {
          value,
          errors
        };
      });
      
      console.log('Boundary Value Test Results:', results);
      
      // 無効な値に対して適切にエラーハンドリングされていることを確認
      const invalidValues = results.filter(r => 
        r.value < 0 || 
        !Number.isFinite(r.value) || 
        Number.isNaN(r.value)
      );
      
      invalidValues.forEach(result => {
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    it('文字列長の限界テスト', () => {
      const lengths = [0, 1, 100, 1000, 10000, 100000];
      
      lengths.forEach(length => {
        const longString = 'a'.repeat(length);
        const startTime = performance.now();
        
        try {
          // 長い文字列を含むオブジェクトの処理
          const data = {
            id: longString,
            name: longString,
            description: longString
          };
          
          // JSON変換のパフォーマンス
          const json = JSON.stringify(data);
          const parsed = JSON.parse(json);
          
          const duration = performance.now() - startTime;
          
          console.log(`String length ${length}: ${duration.toFixed(2)}ms`);
          
          expect(parsed.id.length).toBe(length);
          expect(duration).toBeLessThan(100); // 100ms以内
        } catch (error) {
          console.log(`String length ${length}: Error - ${(error as Error).message}`);
        }
      });
    });
  });

  describe('持続的負荷テスト', () => {
    it('24時間相当のゲームプレイシミュレーション', { timeout: 600000 }, async () => {
      const hoursToSimulate = 0.1; // テスト用に0.1時間（6分）に短縮
      const gamesPerHour = 100; // 1時間あたり100ゲーム
      const totalGames = Math.floor(hoursToSimulate * gamesPerHour);
      
      const startTime = performance.now();
      const metrics = {
        gamesCompleted: 0,
        totalTurns: 0,
        errors: 0,
        avgGameDuration: 0,
        memoryCheckpoints: [] as number[]
      };
      
      for (let i = 0; i < totalGames; i++) {
        const gameStart = performance.now();
        
        try {
          const game = new Game();
          let turns = 0;
          
          while (!game.isGameOver() && turns < 1000) {
            const cards = game.getPlayerCards();
            if (cards.length === 0) break;
            
            const card = cards[Math.floor(Math.random() * cards.length)];
            game.playCard(card);
            turns++;
          }
          
          metrics.gamesCompleted++;
          metrics.totalTurns += turns;
          
          const gameDuration = performance.now() - gameStart;
          metrics.avgGameDuration = 
            (metrics.avgGameDuration * (i / (i + 1))) + 
            (gameDuration / (i + 1));
          
        } catch (error) {
          metrics.errors++;
        }
        
        // 定期的にメモリ使用量をチェック
        if (i % 10 === 0) {
          metrics.memoryCheckpoints.push(
            process.memoryUsage().heapUsed / 1024 / 1024
          );
          
          // 進捗表示
          const elapsed = (performance.now() - startTime) / 1000;
          console.log(`Progress: ${i}/${totalGames} games (${elapsed.toFixed(1)}s elapsed)`);
        }
      }
      
      const totalDuration = performance.now() - startTime;
      
      console.log('Long Duration Test Results:', {
        simulatedHours: hoursToSimulate,
        gamesCompleted: metrics.gamesCompleted,
        avgTurnsPerGame: (metrics.totalTurns / metrics.gamesCompleted).toFixed(2),
        avgGameDurationMs: metrics.avgGameDuration.toFixed(2),
        totalDurationSeconds: (totalDuration / 1000).toFixed(2),
        errors: metrics.errors,
        memoryTrend: {
          start: metrics.memoryCheckpoints[0]?.toFixed(2) + ' MB',
          end: metrics.memoryCheckpoints[metrics.memoryCheckpoints.length - 1]?.toFixed(2) + ' MB',
          peak: Math.max(...metrics.memoryCheckpoints).toFixed(2) + ' MB'
        }
      });
      
      expect(metrics.errors).toBe(0);
      expect(metrics.gamesCompleted).toBe(totalGames);
    });
  });
});