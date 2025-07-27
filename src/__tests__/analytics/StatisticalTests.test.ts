import { describe, it, expect, beforeEach } from 'vitest'
import { StatisticalTests } from '@/analytics/StatisticalTests'
import { TestDataGenerator, StatisticalTestHelper, PerformanceTestHelper } from '../utils/TestHelpers'

describe('Statistical Analysis Accuracy Tests', () => {
  let statisticalTests: StatisticalTests

  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    statisticalTests = new StatisticalTests()
  })

  describe('Descriptive Statistics', () => {
    it('should calculate mean correctly', () => {
      const data = [1, 2, 3, 4, 5]
      const result = statisticalTests.calculateMean(data)
      
      expect(result).toBe(3)
    })

    it('should calculate median correctly for odd-length array', () => {
      const data = [1, 3, 5, 7, 9]
      const result = statisticalTests.calculateMedian(data)
      
      expect(result).toBe(5)
    })

    it('should calculate median correctly for even-length array', () => {
      const data = [1, 2, 3, 4]
      const result = statisticalTests.calculateMedian(data)
      
      expect(result).toBe(2.5)
    })

    it('should calculate standard deviation correctly', () => {
      const data = [2, 4, 6, 8, 10]
      const result = statisticalTests.calculateStandardDeviation(data)
      
      // Expected: sqrt(((2-6)² + (4-6)² + (6-6)² + (8-6)² + (10-6)²) / 5)
      // = sqrt((16 + 4 + 0 + 4 + 16) / 5) = sqrt(8) ≈ 2.828
      expect(result).toBeCloseTo(2.828, 3)
    })

    it('should calculate variance correctly', () => {
      const data = [1, 2, 3, 4, 5]
      const result = statisticalTests.calculateVariance(data)
      
      // Expected: ((1-3)² + (2-3)² + (3-3)² + (4-3)² + (5-3)²) / 5 = 10/5 = 2
      expect(result).toBe(2)
    })

    it('should calculate percentiles correctly', () => {
      const data = Array.from({ length: 100 }, (_, i) => i + 1) // 1 to 100
      
      const percentile25 = statisticalTests.calculatePercentile(data, 25)
      const percentile50 = statisticalTests.calculatePercentile(data, 50)
      const percentile75 = statisticalTests.calculatePercentile(data, 75)
      const percentile90 = statisticalTests.calculatePercentile(data, 90)
      
      expect(percentile25).toBeCloseTo(25.5, 1)
      expect(percentile50).toBeCloseTo(50.5, 1)
      expect(percentile75).toBeCloseTo(75.5, 1)
      expect(percentile90).toBeCloseTo(90.5, 1)
    })

    it('should handle edge cases gracefully', () => {
      // Empty array
      expect(() => statisticalTests.calculateMean([])).toThrow()
      
      // Single element
      expect(statisticalTests.calculateMean([5])).toBe(5)
      expect(statisticalTests.calculateMedian([5])).toBe(5)
      expect(statisticalTests.calculateStandardDeviation([5])).toBe(0)
      
      // Two elements
      expect(statisticalTests.calculateMean([3, 7])).toBe(5)
      expect(statisticalTests.calculateMedian([3, 7])).toBe(5)
    })
  })

  describe('Chi-Square Tests', () => {
    it('should perform chi-square goodness of fit test', () => {
      // Test if dice rolls follow uniform distribution
      const observed = [18, 22, 16, 14, 12, 18] // 6 categories
      const expected = [16.67, 16.67, 16.67, 16.67, 16.67, 16.67] // Uniform distribution
      
      const result = statisticalTests.chiSquareGoodnessOfFit(observed, expected)
      
      expect(result.chiSquare).toBeGreaterThan(0)
      expect(result.degreesOfFreedom).toBe(5) // 6 categories - 1
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
      expect(typeof result.significant).toBe('boolean')
    })

    it('should perform chi-square test of independence', () => {
      // 2x2 contingency table
      const contingencyTable = [
        [20, 30], // Row 1
        [25, 25]  // Row 2
      ]
      
      const result = statisticalTests.chiSquareIndependence(contingencyTable)
      
      expect(result.chiSquare).toBeGreaterThan(0)
      expect(result.degreesOfFreedom).toBe(1) // (2-1) * (2-1)
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('should calculate chi-square statistic correctly with known data', () => {
      // Test with known result
      const observed = [10, 20, 30]
      const expected = [20, 20, 20]
      
      const result = statisticalTests.chiSquareGoodnessOfFit(observed, expected)
      
      // Chi-square = (10-20)²/20 + (20-20)²/20 + (30-20)²/20 = 100/20 + 0 + 100/20 = 10
      expect(result.chiSquare).toBeCloseTo(10, 6)
      expect(result.degreesOfFreedom).toBe(2)
    })
  })

  describe('T-Tests', () => {
    it('should perform one-sample t-test correctly', () => {
      const sample = [23, 25, 28, 22, 24, 26, 27, 25, 24, 23]
      const populationMean = 20
      
      const result = statisticalTests.oneSampleTTest(sample, populationMean)
      
      expect(result.tStatistic).toBeGreaterThan(0) // Sample mean > population mean
      expect(result.degreesOfFreedom).toBe(9) // n - 1
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
      expect(typeof result.significant).toBe('boolean')
    })

    it('should perform two-sample t-test correctly', () => {
      const sample1 = [22, 24, 26, 23, 25, 27, 24, 23, 25, 24]
      const sample2 = [18, 20, 19, 21, 20, 18, 19, 20, 21, 19]
      
      const result = statisticalTests.twoSampleTTest(sample1, sample2)
      
      expect(result.tStatistic).toBeGreaterThan(0) // Sample1 mean > Sample2 mean
      expect(result.degreesOfFreedom).toBeGreaterThan(0)
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
      expect(typeof result.significant).toBe('boolean')
    })

    it('should perform paired t-test correctly', () => {
      const before = [20, 22, 24, 21, 23, 25, 22, 24, 23, 21]
      const after = [22, 24, 26, 23, 25, 27, 24, 26, 25, 23]
      
      const result = statisticalTests.pairedTTest(before, after)
      
      expect(result.tStatistic).toBeGreaterThan(0) // After > before
      expect(result.degreesOfFreedom).toBe(9) // n - 1
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('should handle equal samples in t-test', () => {
      const sample1 = [1, 2, 3, 4, 5]
      const sample2 = [1, 2, 3, 4, 5]
      
      const result = statisticalTests.twoSampleTTest(sample1, sample2)
      
      expect(result.tStatistic).toBeCloseTo(0, 6)
      expect(result.pValue).toBeGreaterThan(0.05) // Not significant
      expect(result.significant).toBe(false)
    })
  })

  describe('ANOVA (Analysis of Variance)', () => {
    it('should perform one-way ANOVA correctly', () => {
      const groups = [
        [23, 25, 27, 24, 26], // Group 1
        [20, 22, 21, 23, 19], // Group 2
        [18, 16, 17, 19, 15]  // Group 3
      ]
      
      const result = statisticalTests.oneWayANOVA(groups)
      
      expect(result.fStatistic).toBeGreaterThan(0)
      expect(result.betweenGroupsDF).toBe(2) // 3 groups - 1
      expect(result.withinGroupsDF).toBe(12) // 15 total - 3 groups
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
      expect(typeof result.significant).toBe('boolean')
    })

    it('should calculate F-statistic correctly for known data', () => {
      // Test with data where group means are clearly different
      const groups = [
        [10, 10, 10], // Mean = 10
        [20, 20, 20], // Mean = 20
        [30, 30, 30]  // Mean = 30
      ]
      
      const result = statisticalTests.oneWayANOVA(groups)
      
      expect(result.fStatistic).toBeGreaterThan(100) // Should be very large
      expect(result.significant).toBe(true)
      expect(result.pValue).toBeLessThan(0.001)
    })

    it('should handle equal groups in ANOVA', () => {
      const groups = [
        [5, 5, 5, 5],
        [5, 5, 5, 5],
        [5, 5, 5, 5]
      ]
      
      const result = statisticalTests.oneWayANOVA(groups)
      
      expect(result.fStatistic).toBeCloseTo(0, 6) // No variation between groups
      expect(result.significant).toBe(false)
    })
  })

  describe('Effect Size Calculations', () => {
    it('should calculate Cohen\'s d correctly', () => {
      const group1 = [1, 2, 3, 4, 5]
      const group2 = [3, 4, 5, 6, 7]
      
      const result = statisticalTests.cohensD(group1, group2)
      
      // Expected: (mean2 - mean1) / pooled_std
      // Mean1 = 3, Mean2 = 5, difference = 2
      // Both groups have same std, so Cohen's d should be around 1.26
      expect(result).toBeGreaterThan(1)
      expect(result).toBeLessThan(2)
    })

    it('should calculate eta-squared for ANOVA', () => {
      const groups = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]
      
      const anovaResult = statisticalTests.oneWayANOVA(groups)
      const etaSquared = statisticalTests.etaSquared(anovaResult)
      
      expect(etaSquared).toBeGreaterThan(0)
      expect(etaSquared).toBeLessThanOrEqual(1)
      expect(etaSquared).toBeCloseTo(1, 1) // Perfect separation
    })

    it('should calculate Pearson correlation coefficient', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10] // Perfect positive correlation
      
      const correlation = statisticalTests.pearsonCorrelation(x, y)
      
      expect(correlation).toBeCloseTo(1, 6) // Perfect positive correlation
    })

    it('should calculate negative correlation correctly', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [10, 8, 6, 4, 2] // Perfect negative correlation
      
      const correlation = statisticalTests.pearsonCorrelation(x, y)
      
      expect(correlation).toBeCloseTo(-1, 6) // Perfect negative correlation
    })
  })

  describe('Confidence Intervals', () => {
    it('should calculate confidence interval for mean', () => {
      const sample = [20, 22, 24, 21, 23, 25, 22, 24, 23, 21]
      const confidenceLevel = 0.95
      
      const ci = statisticalTests.confidenceIntervalMean(sample, confidenceLevel)
      
      expect(ci.lower).toBeLessThan(ci.upper)
      expect(ci.mean).toBeGreaterThan(ci.lower)
      expect(ci.mean).toBeLessThan(ci.upper)
      expect(ci.marginOfError).toBeGreaterThan(0)
    })

    it('should calculate confidence interval for proportion', () => {
      const successes = 60
      const trials = 100
      const confidenceLevel = 0.95
      
      const ci = statisticalTests.confidenceIntervalProportion(successes, trials, confidenceLevel)
      
      expect(ci.lower).toBeLessThan(ci.upper)
      expect(ci.proportion).toBe(0.6)
      expect(ci.proportion).toBeGreaterThan(ci.lower)
      expect(ci.proportion).toBeLessThan(ci.upper)
    })

    it('should calculate narrower intervals for higher sample sizes', () => {
      const smallSample = [1, 2, 3, 4, 5]
      const largeSample = Array.from({ length: 100 }, (_, i) => 2.5 + Math.sin(i) * 0.5)
      
      const smallCI = statisticalTests.confidenceIntervalMean(smallSample, 0.95)
      const largeCI = statisticalTests.confidenceIntervalMean(largeSample, 0.95)
      
      const smallWidth = smallCI.upper - smallCI.lower
      const largeWidth = largeCI.upper - largeCI.lower
      
      expect(largeWidth).toBeLessThan(smallWidth)
    })
  })

  describe('Regression Analysis', () => {
    it('should perform simple linear regression', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10] // y = 2x
      
      const result = statisticalTests.simpleLinearRegression(x, y)
      
      expect(result.slope).toBeCloseTo(2, 6)
      expect(result.intercept).toBeCloseTo(0, 6)
      expect(result.rSquared).toBeCloseTo(1, 6) // Perfect fit
      expect(result.correlation).toBeCloseTo(1, 6)
    })

    it('should calculate regression with intercept', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [3, 5, 7, 9, 11] // y = 2x + 1
      
      const result = statisticalTests.simpleLinearRegression(x, y)
      
      expect(result.slope).toBeCloseTo(2, 6)
      expect(result.intercept).toBeCloseTo(1, 6)
      expect(result.rSquared).toBeCloseTo(1, 6)
    })

    it('should handle noisy data in regression', () => {
      // Generate noisy linear relationship
      const x = Array.from({ length: 50 }, (_, i) => i + 1)
      const y = x.map(val => 2 * val + 3 + (Math.random() - 0.5) * 2) // y = 2x + 3 + noise
      
      const result = statisticalTests.simpleLinearRegression(x, y)
      
      expect(result.slope).toBeCloseTo(2, 0) // Within 1 of expected
      expect(result.intercept).toBeCloseTo(3, 0) // Within 1 of expected
      expect(result.rSquared).toBeGreaterThan(0.8) // Strong relationship despite noise
    })
  })

  describe('Normality Tests', () => {
    it('should perform Shapiro-Wilk test approximation', () => {
      // Generate normally distributed data
      const normalData = Array.from({ length: 30 }, () => {
        // Box-Muller transformation for normal distribution
        const u1 = Math.random()
        const u2 = Math.random()
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      })
      
      const result = statisticalTests.shapiroWilkTest(normalData)
      
      expect(result.wStatistic).toBeGreaterThan(0)
      expect(result.wStatistic).toBeLessThanOrEqual(1)
      expect(result.pValue).toBeGreaterThan(0)
      expect(result.pValue).toBeLessThanOrEqual(1)
    })

    it('should detect non-normal distribution', () => {
      // Highly skewed data
      const skewedData = [1, 1, 1, 1, 1, 2, 2, 3, 10, 20, 50, 100]
      
      const result = statisticalTests.shapiroWilkTest(skewedData)
      
      expect(result.wStatistic).toBeLessThan(0.9) // Low W statistic indicates non-normality
      expect(result.significant).toBe(true) // Reject normality
    })
  })

  describe('Performance and Accuracy Tests', () => {
    it('should calculate statistics efficiently for large datasets', async () => {
      const largeDataset = Array.from({ length: 10000 }, () => Math.random() * 100)
      
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'large_dataset_stats',
        () => {
          statisticalTests.calculateMean(largeDataset)
          statisticalTests.calculateStandardDeviation(largeDataset)
          statisticalTests.calculateMedian(largeDataset)
        }
      )
      
      expect(timeMs).toBeLessThan(100) // Should be fast even for large datasets
    })

    it('should maintain numerical precision', () => {
      // Test with very small numbers
      const smallNumbers = [0.0001, 0.0002, 0.0003, 0.0004, 0.0005]
      
      const mean = statisticalTests.calculateMean(smallNumbers)
      const std = statisticalTests.calculateStandardDeviation(smallNumbers)
      
      expect(mean).toBeCloseTo(0.0003, 6)
      expect(std).toBeGreaterThan(0)
      expect(std).toBeLessThan(0.001)
      
      // Test with very large numbers
      const largeNumbers = [1e6, 2e6, 3e6, 4e6, 5e6]
      
      const largeMean = statisticalTests.calculateMean(largeNumbers)
      const largeStd = statisticalTests.calculateStandardDeviation(largeNumbers)
      
      expect(largeMean).toBeCloseTo(3e6, -5) // Precision to 5 decimal places from the right
      expect(largeStd).toBeGreaterThan(0)
    })

    it('should validate against known statistical distributions', () => {
      // Test chi-square distribution properties
      const degreesOfFreedom = 5
      const chiSquareValues = Array.from({ length: 1000 }, () => {
        // Generate chi-square distributed values (sum of squared normal variables)
        let sum = 0
        for (let i = 0; i < degreesOfFreedom; i++) {
          const normal = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random())
          sum += normal * normal
        }
        return sum
      })
      
      const mean = statisticalTests.calculateMean(chiSquareValues)
      const variance = statisticalTests.calculateVariance(chiSquareValues)
      
      // Chi-square with df=5 should have mean=5 and variance=10
      expect(mean).toBeCloseTo(degreesOfFreedom, 0)
      expect(variance).toBeCloseTo(2 * degreesOfFreedom, 0)
    })
  })

  describe('Cross-Validation and Robustness', () => {
    it('should produce consistent results across multiple runs', () => {
      const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      
      const runs = 10
      const means: number[] = []
      const stds: number[] = []
      
      for (let i = 0; i < runs; i++) {
        means.push(statisticalTests.calculateMean(testData))
        stds.push(statisticalTests.calculateStandardDeviation(testData))
      }
      
      // All runs should produce identical results
      const uniqueMeans = new Set(means)
      const uniqueStds = new Set(stds)
      
      expect(uniqueMeans.size).toBe(1)
      expect(uniqueStds.size).toBe(1)
    })

    it('should handle missing values gracefully', () => {
      const dataWithNaN = [1, 2, NaN, 4, 5]
      const dataWithInfinity = [1, 2, Infinity, 4, 5]
      
      expect(() => statisticalTests.calculateMean(dataWithNaN)).toThrow()
      expect(() => statisticalTests.calculateMean(dataWithInfinity)).toThrow()
    })

    it('should validate input parameters', () => {
      // Invalid confidence levels
      expect(() => statisticalTests.confidenceIntervalMean([1, 2, 3], 0)).toThrow()
      expect(() => statisticalTests.confidenceIntervalMean([1, 2, 3], 1)).toThrow()
      expect(() => statisticalTests.confidenceIntervalMean([1, 2, 3], 1.5)).toThrow()
      
      // Invalid percentiles
      expect(() => statisticalTests.calculatePercentile([1, 2, 3], -1)).toThrow()
      expect(() => statisticalTests.calculatePercentile([1, 2, 3], 101)).toThrow()
    })
  })
})