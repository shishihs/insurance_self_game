import { describe, it, expect, beforeEach } from 'vitest'
import { GameAnalytics } from '@/analytics/GameAnalytics'
import { TestDataGenerator, PerformanceTestHelper, StatisticalTestHelper } from '../utils/TestHelpers'
import type { GameConfig, PlayerStats } from '@/domain/types/game.types'
import type { GameResultSummary } from '@/benchmark/MassiveBenchmark'
import type { GameStage } from '@/domain/types/card.types'

describe('Game Analytics Deep Tests', () => {
  let gameAnalytics: GameAnalytics
  let testConfig: GameConfig
  let mockGameData: GameResultSummary[]

  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    testConfig = TestDataGenerator.createTestGameConfig()
    gameAnalytics = new GameAnalytics()
    
    // Generate mock game data for analysis
    mockGameData = Array.from({ length: 100 }, (_, index) => {
      const totalChallenges = Math.floor(Math.random() * 10) + 1
      const successfulChallenges = Math.floor(Math.random() * totalChallenges)
      const failedChallenges = totalChallenges - successfulChallenges
      
      return {
        gameId: index,
        workerId: index % 4,
        outcome: Math.random() > 0.5 ? 'victory' : 'game_over' as 'victory' | 'game_over',
        stats: {
          totalChallenges: totalChallenges,
          successfulChallenges: successfulChallenges,
          failedChallenges: failedChallenges,
          cardsAcquired: Math.floor(Math.random() * 20),
          highestVitality: Math.floor(Math.random() * 100) + 20,
          turnsPlayed: Math.floor(Math.random() * 15) + 5,
          challengesCompleted: successfulChallenges,
          challengesFailed: failedChallenges,
          finalVitality: Math.floor(Math.random() * 100),
          finalInsuranceBurden: Math.floor(Math.random() * 50),
          score: Math.floor(Math.random() * 1000) + 100
        },
        duration: Math.floor(Math.random() * 300) + 60,
        strategy: 'balanced',
        stage: 'youth'
      }
    })
  })

  describe('Game Balance Analysis', () => {
    it('should analyze win rate distribution', () => {
      const analysis = gameAnalytics.analyzeWinRateDistribution(mockGameData)
      
      expect(analysis.mean).toBeGreaterThanOrEqual(0)
      expect(analysis.mean).toBeLessThanOrEqual(1)
      expect(analysis.median).toBeGreaterThanOrEqual(0)
      expect(analysis.median).toBeLessThanOrEqual(1)
      expect(analysis.standardDeviation).toBeGreaterThanOrEqual(0)
      expect(typeof analysis.standardDeviation).toBe('number')
    })

    it('should identify optimal game length', () => {
      const analysis = gameAnalytics.analyzeOptimalGameLength(mockGameData)
      
      expect(analysis.optimalLength).toBeGreaterThan(0)
      expect(analysis.averageLength).toBeGreaterThan(0)
      expect(typeof analysis.optimalLength).toBe('number')
      expect(typeof analysis.averageLength).toBe('number')
      
      // Optimal turn count should be within reasonable range
      expect(analysis.optimalLength).toBeLessThanOrEqual(20)
    })

    it('should analyze challenge difficulty balance', () => {
      const challengeData = mockGameData.map((game, index) => {
        const total = game.stats.challengesCompleted + game.stats.challengesFailed
        return {
          challengeId: `challenge_${index}`,
          successRate: total === 0 ? 0 : game.stats.challengesCompleted / total,
          attemptCount: total,
          stage: game.stage as GameStage
        }
      })
      
      const analysis = gameAnalytics.analyzeChallengeBalance(challengeData)
      
      expect(analysis.balanceScore).toBeDefined()
      expect(analysis.balanceScore).toBeGreaterThanOrEqual(0)
      expect(analysis.balanceScore).toBeLessThanOrEqual(100)
      expect(analysis.recommendations).toBeDefined()
      expect(Array.isArray(analysis.recommendations)).toBe(true)
    })

    it('should detect overpowered strategies', () => {
      // Create biased data where one strategy dominates
      const biasedData = mockGameData.map((game, index) => ({
        ...game,
        strategy: index < 70 ? 'aggressive' : 'defensive',
        score: index < 70 ? game.score + 500 : game.score // Aggressive strategy gets bonus
      }))
      
      const analysis = gameAnalytics.detectOverpoweredStrategies(biasedData)
      
      expect(analysis.strategyPerformance).toBeDefined()
      expect(analysis.dominantStrategies).toBeDefined()
      expect(analysis.balanceScore).toBeGreaterThanOrEqual(0)
      expect(analysis.balanceScore).toBeLessThanOrEqual(1)
      
      // Should detect the aggressive strategy as dominant
      expect(analysis.dominantStrategies.length).toBeGreaterThan(0)
    })

    it('should calculate game balance metrics', () => {
      const metrics = gameAnalytics.calculateBalanceMetrics(mockGameData)
      
      expect(metrics.giniCoefficient).toBeGreaterThanOrEqual(0)
      expect(metrics.giniCoefficient).toBeLessThanOrEqual(1)
      expect(metrics.varianceInOutcomes).toBeGreaterThanOrEqual(0)
      expect(metrics.playerProgression).toBeDefined()
      expect(metrics.difficultyProgression).toBeDefined()
      
      // Balanced game should have moderate Gini coefficient
      expect(metrics.giniCoefficient).toBeLessThan(0.8) // Not too unequal
    })
  })

  describe('Player Behavior Analysis', () => {
    it('should analyze decision patterns', () => {
      const decisionData = mockGameData.map(game => ({
        playerId: `player_${Math.floor(Math.random() * 50)}`,
        decisions: Array.from({ length: game.totalTurns }, (_, turn) => ({
          turn,
          cardSelected: Math.floor(Math.random() * 5),
          timeToDecide: Math.random() * 10 + 1,
          outcomeSuccess: Math.random() > 0.3
        }))
      }))
      
      const analysis = gameAnalytics.analyzeDecisionPatterns(decisionData)
      
      expect(analysis.averageDecisionTime).toBeGreaterThan(0)
      expect(analysis.decisionTimeDistribution).toBeDefined()
      expect(analysis.cardSelectionFrequency).toBeDefined()
      expect(analysis.learningCurve).toBeDefined()
      expect(analysis.playerTypes).toBeDefined()
    })

    it('should identify player archetypes', () => {
      const playerData = Array.from({ length: 50 }, (_, i) => ({
        playerId: `player_${i}`,
        gamesPlayed: Math.floor(Math.random() * 20) + 1,
        averageScore: Math.random() * 1000 + 200,
        preferredStrategy: ['aggressive', 'defensive', 'balanced'][Math.floor(Math.random() * 3)],
        riskTolerance: Math.random(),
        sessionLength: Math.random() * 120 + 10 // minutes
      }))
      
      const archetypes = gameAnalytics.identifyPlayerArchetypes(playerData)
      
      expect(archetypes.length).toBeGreaterThan(0)
      archetypes.forEach(archetype => {
        expect(archetype.name).toBeDefined()
        expect(archetype.characteristics).toBeDefined()
        expect(archetype.percentage).toBeGreaterThan(0)
        expect(archetype.percentage).toBeLessThanOrEqual(100)
      })
      
      // Total percentage should approximately equal 100%
      const totalPercentage = archetypes.reduce((sum, arch) => sum + arch.percentage, 0)
      expect(totalPercentage).toBeCloseTo(100, 0)
    })

    it('should analyze learning progression', () => {
      const progressionData = Array.from({ length: 30 }, (_, gameIndex) => ({
        gameNumber: gameIndex + 1,
        score: 200 + gameIndex * 15 + Math.random() * 50, // Increasing trend with noise
        completionTime: 300 - gameIndex * 5 + Math.random() * 30, // Decreasing trend
        mistakeCount: Math.max(0, 8 - gameIndex * 0.2 + Math.random() * 2),
        strategyComplexity: Math.min(10, gameIndex * 0.3 + Math.random())
      }))
      
      const analysis = gameAnalytics.analyzeLearningProgression(progressionData)
      
      expect(analysis.learningRate).toBeDefined()
      expect(analysis.skillCeiling).toBeGreaterThan(0)
      expect(analysis.plateauPoint).toBeGreaterThan(0)
      expect(analysis.improvementTrends).toBeDefined()
      
      // Should detect positive learning trend
      expect(analysis.learningRate).toBeGreaterThan(0)
    })

    it('should calculate player engagement metrics', () => {
      const engagementData = Array.from({ length: 100 }, (_, i) => ({
        playerId: `player_${i}`,
        sessionsPerWeek: Math.random() * 7 + 1,
        averageSessionLength: Math.random() * 60 + 15,
        retentionDays: Math.floor(Math.random() * 30) + 1,
        completionRate: Math.random() * 0.4 + 0.6, // 60-100%
        socialInteractions: Math.floor(Math.random() * 10)
      }))
      
      const metrics = gameAnalytics.calculateEngagementMetrics(engagementData)
      
      expect(metrics.averageRetention).toBeGreaterThan(0)
      expect(metrics.averageRetention).toBeLessThanOrEqual(30)
      expect(metrics.sessionFrequency).toBeGreaterThan(0)
      expect(metrics.engagementScore).toBeGreaterThanOrEqual(0)
      expect(metrics.engagementScore).toBeLessThanOrEqual(100)
      expect(metrics.churnRisk).toBeDefined()
    })
  })

  describe('Performance Optimization Analysis', () => {
    it('should identify performance bottlenecks', async () => {
      // Simulate performance data from multiple games
      const performanceData = Array.from({ length: 50 }, () => ({
        gameId: `game_${Math.random().toString(36).substr(2, 9)}`,
        initializationTime: Math.random() * 100 + 50,
        renderingTime: Math.random() * 20 + 5,
        inputProcessingTime: Math.random() * 10 + 2,
        memoryUsage: Math.random() * 100 + 20,
        frameRate: Math.random() * 30 + 30,
        loadingTime: Math.random() * 200 + 100
      }))
      
      const analysis = gameAnalytics.analyzePerformanceBottlenecks(performanceData)
      
      expect(analysis.bottleneckAreas).toBeDefined()
      expect(analysis.bottleneckAreas.length).toBeGreaterThan(0)
      expect(analysis.performanceScore).toBeGreaterThanOrEqual(0)
      expect(analysis.performanceScore).toBeLessThanOrEqual(100)
      expect(analysis.optimizationPriorities).toBeDefined()
      expect(analysis.benchmarkComparison).toBeDefined()
    })

    it('should analyze memory usage patterns', () => {
      const memoryData = Array.from({ length: 100 }, (_, i) => ({
        timestamp: i * 1000,
        heapUsed: 50 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
        heapTotal: 100 + Math.sin(i * 0.05) * 20,
        external: Math.random() * 10 + 5,
        gcEvents: Math.random() > 0.9 ? 1 : 0
      }))
      
      const analysis = gameAnalytics.analyzeMemoryPatterns(memoryData)
      
      expect(analysis.averageUsage).toBeGreaterThan(0)
      expect(analysis.peakUsage).toBeGreaterThanOrEqual(analysis.averageUsage)
      expect(analysis.memoryLeaks).toBeDefined()
      expect(analysis.gcFrequency).toBeGreaterThanOrEqual(0)
      expect(analysis.optimizationSuggestions).toBeDefined()
    })

    it('should benchmark against baseline performance', async () => {
      // Create baseline performance data
      const baselineData = Array.from({ length: 20 }, () => ({
        executionTime: 100 + Math.random() * 20,
        memoryUsage: 50 + Math.random() * 10,
        renderTime: 16.67 + Math.random() * 2 // ~60fps
      }))
      
      // Create current performance data (slightly degraded)
      const currentData = Array.from({ length: 20 }, () => ({
        executionTime: 110 + Math.random() * 25,
        memoryUsage: 55 + Math.random() * 15,
        renderTime: 18 + Math.random() * 3
      }))
      
      const comparison = gameAnalytics.benchmarkPerformance(currentData, baselineData)
      
      expect(comparison.performanceRatio).toBeGreaterThan(0)
      expect(comparison.regressionAreas).toBeDefined()
      expect(comparison.improvementAreas).toBeDefined()
      expect(comparison.overallScore).toBeGreaterThanOrEqual(0)
      expect(comparison.overallScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Data Mining and Pattern Discovery', () => {
    it('should discover hidden patterns in game data', () => {
      // Create data with hidden patterns
      const patternData = mockGameData.map((game, index) => ({
        ...game,
        timeOfDay: (index % 24), // Hour of day
        dayOfWeek: (index % 7), // Day of week
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        playerLevel: Math.floor(index / 10) + 1
      }))
      
      const patterns = gameAnalytics.discoverPatterns(patternData)
      
      expect(patterns.temporalPatterns).toBeDefined()
      expect(patterns.correlations).toBeDefined()
      expect(patterns.anomalies).toBeDefined()
      expect(patterns.significantFindings).toBeDefined()
      expect(patterns.significantFindings.length).toBeGreaterThan(0)
    })

    it('should perform clustering analysis', () => {
      const clusteringData = mockGameData.map(game => [
        game.finalVitality,
        game.finalInsuranceBurden,
        game.score,
        game.totalTurns
      ])
      
      const clusters = gameAnalytics.performClustering(clusteringData, 3)
      
      expect(clusters.length).toBe(3)
      clusters.forEach(cluster => {
        expect(cluster.centroid).toBeDefined()
        expect(cluster.points).toBeDefined()
        expect(cluster.points.length).toBeGreaterThan(0)
        expect(cluster.cohesion).toBeGreaterThanOrEqual(0)
      })
      
      // All points should be assigned to clusters
      const totalPoints = clusters.reduce((sum, cluster) => sum + cluster.points.length, 0)
      expect(totalPoints).toBe(mockGameData.length)
    })

    it('should identify seasonal trends', () => {
      // Create data spanning multiple time periods
      const timeSeriesData = Array.from({ length: 365 }, (_, day) => ({
        date: new Date(2023, 0, day + 1),
        playerCount: 1000 + Math.sin(day * 2 * Math.PI / 7) * 200 + Math.random() * 100, // Weekly pattern
        averageScore: 500 + Math.sin(day * 2 * Math.PI / 30) * 50 + Math.random() * 50, // Monthly pattern
        engagementRate: 0.7 + Math.sin(day * 2 * Math.PI / 365) * 0.1 + Math.random() * 0.1 // Yearly pattern
      }))
      
      const trends = gameAnalytics.identifySeasonalTrends(timeSeriesData)
      
      expect(trends.weeklyPattern).toBeDefined()
      expect(trends.monthlyPattern).toBeDefined()
      expect(trends.yearlyPattern).toBeDefined()
      expect(trends.peakPeriods).toBeDefined()
      expect(trends.trendStrength).toBeGreaterThanOrEqual(0)
      expect(trends.trendStrength).toBeLessThanOrEqual(1)
    })

    it('should predict future trends using historical data', () => {
      // Create trending data
      const historicalData = Array.from({ length: 100 }, (_, i) => ({
        period: i + 1,
        value: 100 + i * 2 + Math.sin(i * 0.1) * 10 + Math.random() * 5,
        confidence: Math.random() * 0.2 + 0.8
      }))
      
      const predictions = gameAnalytics.predictTrends(historicalData, 10) // Predict next 10 periods
      
      expect(predictions.length).toBe(10)
      predictions.forEach((prediction, index) => {
        expect(prediction.period).toBe(101 + index)
        expect(prediction.predictedValue).toBeGreaterThan(0)
        expect(prediction.confidence).toBeGreaterThan(0)
        expect(prediction.confidence).toBeLessThanOrEqual(1)
        expect(prediction.upperBound).toBeGreaterThan(prediction.predictedValue)
        expect(prediction.lowerBound).toBeLessThan(prediction.predictedValue)
      })
    })
  })

  describe('A/B Testing and Experimentation', () => {
    it('should analyze A/B test results', () => {
      const aGroupData = Array.from({ length: 50 }, () => ({
        converted: Math.random() > 0.4, // 60% conversion rate
        value: Math.random() * 100 + 50,
        engagementTime: Math.random() * 30 + 20
      }))
      
      const bGroupData = Array.from({ length: 50 }, () => ({
        converted: Math.random() > 0.3, // 70% conversion rate
        value: Math.random() * 120 + 60,
        engagementTime: Math.random() * 35 + 25
      }))
      
      const analysis = gameAnalytics.analyzeABTest(aGroupData, bGroupData)
      
      expect(analysis.statisticalSignificance).toBeDefined()
      expect(analysis.conversionRateDifference).toBeDefined()
      expect(analysis.confidenceInterval).toBeDefined()
      expect(analysis.recommendedAction).toBeDefined()
      expect(analysis.pValue).toBeGreaterThan(0)
      expect(analysis.pValue).toBeLessThanOrEqual(1)
    })

    it('should calculate statistical power for experiments', () => {
      const powerAnalysis = gameAnalytics.calculateStatisticalPower({
        sampleSizeA: 100,
        sampleSizeB: 100,
        effectSize: 0.3,
        alpha: 0.05
      })
      
      expect(powerAnalysis.power).toBeGreaterThan(0)
      expect(powerAnalysis.power).toBeLessThanOrEqual(1)
      expect(powerAnalysis.minimumSampleSize).toBeGreaterThan(0)
      expect(powerAnalysis.detectedEffectSize).toBeGreaterThan(0)
      expect(powerAnalysis.recommendation).toBeDefined()
    })

    it('should design optimal experiment parameters', () => {
      const experimentDesign = gameAnalytics.designExperiment({
        expectedEffectSize: 0.2,
        desiredPower: 0.8,
        significanceLevel: 0.05,
        baselineConversionRate: 0.15
      })
      
      expect(experimentDesign.recommendedSampleSize).toBeGreaterThan(0)
      expect(experimentDesign.experimentDuration).toBeGreaterThan(0)
      expect(experimentDesign.minimumDetectableEffect).toBeGreaterThan(0)
      expect(experimentDesign.stratificationRecommendations).toBeDefined()
    })
  })

  describe('Machine Learning Preparation', () => {
    it('should prepare features for ML models', () => {
      const features = gameAnalytics.prepareMLFeatures(mockGameData)
      
      expect(features.featureMatrix).toBeDefined()
      expect(features.featureNames).toBeDefined()
      expect(features.targetVariable).toBeDefined()
      expect(features.featureMatrix.length).toBe(mockGameData.length)
      
      // Each row should have same number of features
      if (features.featureMatrix.length > 1) {
        const featureCount = features.featureMatrix[0].length
        features.featureMatrix.forEach(row => {
          expect(row.length).toBe(featureCount)
        })
      }
      
      expect(features.featureNames.length).toBe(features.featureMatrix[0]?.length || 0)
    })

    it('should normalize features for ML', () => {
      const rawFeatures = [
        [100, 0.5, 1000],
        [200, 0.8, 2000],
        [150, 0.3, 1500],
        [50, 0.9, 500]
      ]
      
      const normalized = gameAnalytics.normalizeFeatures(rawFeatures)
      
      expect(normalized.features).toBeDefined()
      expect(normalized.scalingParameters).toBeDefined()
      expect(normalized.features.length).toBe(rawFeatures.length)
      
      // Normalized features should be roughly in [0, 1] range for min-max scaling
      normalized.features.forEach(row => {
        row.forEach(value => {
          expect(value).toBeGreaterThanOrEqual(-3) // Allow for z-score normalization
          expect(value).toBeLessThanOrEqual(3)
        })
      })
    })

    it('should split data for training and testing', () => {
      const splitData = gameAnalytics.splitDataset(mockGameData, 0.8, 0.1, 0.1)
      
      expect(splitData.training).toBeDefined()
      expect(splitData.validation).toBeDefined()
      expect(splitData.testing).toBeDefined()
      
      const totalSplit = splitData.training.length + splitData.validation.length + splitData.testing.length
      expect(totalSplit).toBe(mockGameData.length)
      
      // Check approximate ratios
      const trainRatio = splitData.training.length / mockGameData.length
      const valRatio = splitData.validation.length / mockGameData.length
      const testRatio = splitData.testing.length / mockGameData.length
      
      expect(trainRatio).toBeCloseTo(0.8, 1)
      expect(valRatio).toBeCloseTo(0.1, 1)
      expect(testRatio).toBeCloseTo(0.1, 1)
    })
  })

  describe('Real-time Analytics', () => {
    it('should process streaming game data', () => {
      const streamProcessor = gameAnalytics.createStreamProcessor({
        windowSize: 100,
        updateInterval: 1000,
        metrics: ['score', 'completion_time', 'engagement']
      })
      
      expect(streamProcessor).toBeDefined()
      expect(streamProcessor.addData).toBeDefined()
      expect(streamProcessor.getCurrentMetrics).toBeDefined()
      expect(streamProcessor.getAlerts).toBeDefined()
      
      // Add some streaming data
      for (let i = 0; i < 50; i++) {
        streamProcessor.addData({
          timestamp: Date.now() + i * 1000,
          score: Math.random() * 1000,
          completion_time: Math.random() * 300,
          engagement: Math.random()
        })
      }
      
      const metrics = streamProcessor.getCurrentMetrics()
      expect(metrics).toBeDefined()
      expect(metrics.count).toBe(50)
      expect(metrics.averages).toBeDefined()
      expect(metrics.trends).toBeDefined()
    })

    it('should detect anomalies in real-time data', () => {
      const anomalyDetector = gameAnalytics.createAnomalyDetector({
        sensitivity: 0.95,
        windowSize: 50,
        baseline: mockGameData.slice(0, 30)
      })
      
      expect(anomalyDetector).toBeDefined()
      
      // Test normal data
      const normalPoint = TestDataGenerator.createTestPlayerStats()
      const normalResult = anomalyDetector.detectAnomaly(normalPoint)
      expect(normalResult.isAnomaly).toBe(false)
      expect(normalResult.score).toBeGreaterThanOrEqual(0)
      expect(normalResult.score).toBeLessThanOrEqual(1)
      
      // Test anomalous data
      const anomalousPoint = TestDataGenerator.createTestPlayerStats({
        score: 10000, // Unusually high score
        finalVitality: -50 // Invalid vitality
      })
      const anomalousResult = anomalyDetector.detectAnomaly(anomalousPoint)
      expect(anomalousResult.isAnomaly).toBe(true)
      expect(anomalousResult.score).toBeGreaterThan(0.5)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        gameId: i,
        workerId: i % 4,
        outcome: Math.random() > 0.5 ? 'victory' : 'game_over' as 'victory' | 'game_over',
        stats: TestDataGenerator.createTestPlayerStats({ turnsPlayed: i % 10 + 1 }),
        duration: 180,
        strategy: 'balanced',
        stage: 'youth'
      }))
      
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'large_dataset_analysis',
        () => {
          gameAnalytics.analyzeWinRateDistribution(largeDataset)
          gameAnalytics.calculateBalanceMetrics(largeDataset)
        }
      )
      
      expect(timeMs).toBeLessThan(5000) // Should complete within 5 seconds
      console.log(`Analyzed 10K games in ${timeMs.toFixed(2)}ms`)
    })

    it('should maintain accuracy with varying data sizes', () => {
      const dataSizes = [10, 100, 1000]
      const accuracyResults: number[] = []
      
      dataSizes.forEach(size => {
        const dataset = Array.from({ length: size }, (_, i) => ({
          gameId: i,
          workerId: i % 4,
          outcome: Math.random() > 0.5 ? 'victory' : 'game_over' as 'victory' | 'game_over',
          stats: TestDataGenerator.createTestPlayerStats(),
          duration: 180,
          strategy: 'balanced',
          stage: 'youth'
        }))
        
        const analysis = gameAnalytics.analyzeWinRateDistribution(dataset)
        accuracyResults.push(analysis.overallWinRate)
      })
      
      // Results should be consistent across different sizes
      const stats = StatisticalTestHelper.calculateStats(accuracyResults)
      expect(stats.standardDeviation).toBeLessThan(0.2) // Low variance indicates consistency
    })

    it('should parallelize analysis for large datasets', async () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        gameId: i,
        workerId: i % 4,
        outcome: Math.random() > 0.5 ? 'victory' : 'game_over' as 'victory' | 'game_over',
        stats: TestDataGenerator.createTestPlayerStats(),
        duration: 180,
        strategy: 'balanced',
        stage: 'youth'
      }))
      
      const { timeMs: parallelTime } = await PerformanceTestHelper.measureExecutionTime(
        'parallel_analysis',
        () => gameAnalytics.analyzeParallel(largeDataset, 4) // 4 worker threads
      )
      
      const { timeMs: sequentialTime } = await PerformanceTestHelper.measureExecutionTime(
        'sequential_analysis',
        () => gameAnalytics.analyzeSequential(largeDataset)
      )
      
      // Parallel should be faster for large datasets
      expect(parallelTime).toBeLessThan(sequentialTime * 0.8)
      console.log(`Parallel: ${parallelTime.toFixed(2)}ms, Sequential: ${sequentialTime.toFixed(2)}ms`)
    })
  })
})