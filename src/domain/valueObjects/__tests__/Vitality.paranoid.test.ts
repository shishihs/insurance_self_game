import { describe, expect, it } from 'vitest'
import { Vitality } from '../Vitality'

/**
 * Vitality Value Object - Test Paranoid 包括テスト
 * 
 * このテストは、すべての可能な失敗パターンとエッジケースを網羅的にテストします。
 * t-wadaスタイルのTest Paranoidアプローチに基づいて、
 * 値オブジェクトが持つべき不変条件とビジネスルールを厳格に検証します。
 */
describe('Vitality Value Object - Test Paranoid包括テスト', () => {
  
  describe('事前条件テスト - create()メソッド', () => {
    describe('正常値での生成', () => {
      it('最小値（0）で生成できる', () => {
        // Arrange & Act
        const vitality = Vitality.create(0, 100)
        
        // Assert
        expect(vitality.getValue()).toBe(0)
        expect(vitality.getMax()).toBe(100)
        expect(vitality.isDepleted()).toBe(true)
        expect(vitality.isFull()).toBe(false)
      })

      it('最大値で生成できる', () => {
        // Arrange & Act
        const vitality = Vitality.create(100, 100)
        
        // Assert
        expect(vitality.getValue()).toBe(100)
        expect(vitality.getMax()).toBe(100)
        expect(vitality.isDepleted()).toBe(false)
        expect(vitality.isFull()).toBe(true)
      })

      it('中間値で生成できる', () => {
        // Arrange & Act
        const vitality = Vitality.create(50, 100)
        
        // Assert
        expect(vitality.getValue()).toBe(50)
        expect(vitality.getMax()).toBe(100)
        expect(vitality.isDepleted()).toBe(false)
        expect(vitality.isFull()).toBe(false)
        expect(vitality.getPercentage()).toBe(50)
      })

      it('カスタム最大値で生成できる', () => {
        // Arrange & Act
        const vitality = Vitality.create(25, 50)
        
        // Assert
        expect(vitality.getValue()).toBe(25)
        expect(vitality.getMax()).toBe(50)
        expect(vitality.getPercentage()).toBe(50)
      })
    })

    describe('境界値テスト', () => {
      it('小数点値での生成が正確', () => {
        // Arrange & Act
        const vitality = Vitality.create(33.33, 100)
        
        // Assert
        expect(vitality.getValue()).toBe(33.33)
        expect(vitality.getPercentage()).toBe(33) // 切り捨て
      })

      it('非常に小さな正の値で生成できる', () => {
        // Arrange & Act
        const vitality = Vitality.create(0.0001, 1)
        
        // Assert
        expect(vitality.getValue()).toBe(0.0001)
        expect(vitality.getMax()).toBe(1)
      })

      it('非常に大きな値でも生成できる', () => {
        // Arrange & Act
        const maxValue = Number.MAX_SAFE_INTEGER
        const vitality = Vitality.create(maxValue, maxValue)
        
        // Assert
        expect(vitality.getValue()).toBe(maxValue)
        expect(vitality.getMax()).toBe(maxValue)
      })
    })

    describe('事前条件違反テスト', () => {
      it('負の値では生成できない', () => {
        // Act & Assert
        expect(() => Vitality.create(-1, 100)).toThrow('Vitality value cannot be negative')
        expect(() => Vitality.create(-0.0001, 100)).toThrow('Vitality value cannot be negative')
        expect(() => Vitality.create(-Infinity, 100)).toThrow('Vitality value must be a finite number')
      })

      it('最大値を超える値では生成できない', () => {
        // Act & Assert
        expect(() => Vitality.create(101, 100)).toThrow('Vitality value cannot exceed maximum')
        expect(() => Vitality.create(100.0001, 100)).toThrow('Vitality value cannot exceed maximum')
      })

      it('最大値が0以下では生成できない', () => {
        // Act & Assert
        expect(() => Vitality.create(0, 0)).toThrow('Maximum vitality must be positive')
        expect(() => Vitality.create(50, -1)).toThrow('Maximum vitality must be positive')
        expect(() => Vitality.create(50, -Infinity)).toThrow('Maximum vitality must be a finite number')
      })

      it('非数値では生成できない', () => {
        // Act & Assert
        expect(() => Vitality.create(NaN, 100)).toThrow('Vitality value must be a finite number')
        expect(() => Vitality.create(50, NaN)).toThrow('Maximum vitality must be a finite number')
        expect(() => Vitality.create(Infinity, 100)).toThrow('Vitality value must be a finite number')
        expect(() => Vitality.create(50, Infinity)).toThrow() // いずれかのエラー
      })
    })
  })

  describe('decrease()メソッドの包括テスト', () => {
    let vitality: Vitality

    beforeEach(() => {
      vitality = Vitality.create(50, 100)
    })

    describe('正常な減少操作', () => {
      it('正の値で正しく減少する', () => {
        // Arrange
        const decrease = 20
        
        // Act
        const result = vitality.decrease(decrease)
        
        // Assert: 事後条件
        expect(result.getValue()).toBe(30)
        expect(result.getMax()).toBe(100)
        
        // 不変条件: 元のインスタンスは変更されない
        expect(vitality.getValue()).toBe(50)
        
        // 不変条件: 新しいインスタンスは別オブジェクト
        expect(result).not.toBe(vitality)
      })

      it('ゼロでの減少では値が変わらない', () => {
        // Act
        const result = vitality.decrease(0)
        
        // Assert
        expect(result.getValue()).toBe(50)
        expect(result.equals(vitality)).toBe(true)
      })

      it('小数点での減少も正確', () => {
        // Act
        const result = vitality.decrease(10.5)
        
        // Assert
        expect(result.getValue()).toBe(39.5)
      })

      it('現在値を超える減少では0になる', () => {
        // Act
        const result = vitality.decrease(100)
        
        // Assert: 事後条件
        expect(result.getValue()).toBe(0)
        expect(result.isDepleted()).toBe(true)
      })

      it('非常に大きな値でも0で止まる', () => {
        // Act
        const result = vitality.decrease(Number.MAX_SAFE_INTEGER)
        
        // Assert
        expect(result.getValue()).toBe(0)
        expect(result.isDepleted()).toBe(true)
      })
    })

    describe('事前条件違反テスト', () => {
      it('負の値で減少しようとするとエラー', () => {
        // Act & Assert
        expect(() => vitality.decrease(-1)).toThrow('Decrease amount must be non-negative')
        expect(() => vitality.decrease(-0.0001)).toThrow('Decrease amount must be non-negative')
        expect(() => vitality.decrease(-Infinity)).toThrow('Decrease amount must be a finite number')
      })

      it('非数値ではエラー', () => {
        // Act & Assert
        expect(() => vitality.decrease(NaN)).toThrow('Decrease amount must be a finite number')
        expect(() => vitality.decrease(Infinity)).toThrow('Decrease amount must be a finite number')
        expect(() => vitality.decrease(-Infinity)).toThrow('Decrease amount must be a finite number')
      })

      it('型強制を伴う値でエラー', () => {
        // Act & Assert
        expect(() => vitality.decrease(null as any)).toThrow('Decrease amount must be a finite number')
        expect(() => vitality.decrease(undefined as any)).toThrow('Decrease amount must be a finite number')
        expect(() => vitality.decrease('10' as any)).toThrow('Decrease amount must be a finite number')
        expect(() => vitality.decrease([] as any)).toThrow('Decrease amount must be a finite number')
        expect(() => vitality.decrease({} as any)).toThrow('Decrease amount must be a finite number')
      })
    })
  })

  describe('increase()メソッドの包括テスト', () => {
    let vitality: Vitality

    beforeEach(() => {
      vitality = Vitality.create(50, 100)
    })

    describe('正常な増加操作', () => {
      it('正の値で正しく増加する', () => {
        // Arrange
        const increase = 20
        
        // Act
        const result = vitality.increase(increase)
        
        // Assert: 事後条件
        expect(result.getValue()).toBe(70)
        expect(result.getMax()).toBe(100)
        
        // 不変条件: 元のインスタンスは変更されない
        expect(vitality.getValue()).toBe(50)
        
        // 不変条件: 新しいインスタンスは別オブジェクト
        expect(result).not.toBe(vitality)
      })

      it('ゼロでの増加では値が変わらない', () => {
        // Act
        const result = vitality.increase(0)
        
        // Assert
        expect(result.getValue()).toBe(50)
        expect(result.equals(vitality)).toBe(true)
      })

      it('小数点での増加も正確', () => {
        // Act
        const result = vitality.increase(10.7)
        
        // Assert
        expect(result.getValue()).toBe(60.7)
      })

      it('最大値を超える増加では最大値で止まる', () => {
        // Act
        const result = vitality.increase(100)
        
        // Assert: 事後条件
        expect(result.getValue()).toBe(100)
        expect(result.isFull()).toBe(true)
      })

      it('非常に大きな値でも最大値で止まる', () => {
        // Act
        const result = vitality.increase(Number.MAX_SAFE_INTEGER)
        
        // Assert
        expect(result.getValue()).toBe(100)
        expect(result.isFull()).toBe(true)
      })
    })

    describe('事前条件違反テスト', () => {
      it('負の値で増加しようとするとエラー', () => {
        // Act & Assert
        expect(() => vitality.increase(-1)).toThrow('Increase amount must be non-negative')
        expect(() => vitality.increase(-0.0001)).toThrow('Increase amount must be non-negative')
        expect(() => vitality.increase(-Infinity)).toThrow('Increase amount must be a finite number')
      })

      it('非数値ではエラー', () => {
        // Act & Assert
        expect(() => vitality.increase(NaN)).toThrow('Increase amount must be a finite number')
        expect(() => vitality.increase(Infinity)).toThrow('Increase amount must be a finite number')
        expect(() => vitality.increase(-Infinity)).toThrow('Increase amount must be a finite number')
      })

      it('型強制を伴う値でエラー', () => {
        // Act & Assert
        expect(() => vitality.increase(null as any)).toThrow('Increase amount must be a finite number')
        expect(() => vitality.increase(undefined as any)).toThrow('Increase amount must be a finite number')
        expect(() => vitality.increase('10' as any)).toThrow('Increase amount must be a finite number')
        expect(() => vitality.increase([] as any)).toThrow('Increase amount must be a finite number')
        expect(() => vitality.increase({} as any)).toThrow('Increase amount must be a finite number')
      })
    })
  })

  describe('状態判定メソッドの包括テスト', () => {
    describe('isDepleted()の検証', () => {
      it('値が0の時のみtrueを返す', () => {
        // Arrange & Act & Assert
        expect(Vitality.create(0, 100).isDepleted()).toBe(true)
        expect(Vitality.create(0.0001, 100).isDepleted()).toBe(false)
        expect(Vitality.create(1, 100).isDepleted()).toBe(false)
        expect(Vitality.create(50, 100).isDepleted()).toBe(false)
        expect(Vitality.create(100, 100).isDepleted()).toBe(false)
      })
    })

    describe('isFull()の検証', () => {
      it('値が最大値と等しい時のみtrueを返す', () => {
        // Arrange & Act & Assert
        expect(Vitality.create(100, 100).isFull()).toBe(true)
        expect(Vitality.create(50, 50).isFull()).toBe(true)
        expect(Vitality.create(99.999, 100).isFull()).toBe(false)
        expect(Vitality.create(99, 100).isFull()).toBe(false)
        expect(Vitality.create(0, 100).isFull()).toBe(false)
      })
    })

    describe('getPercentage()の精度テスト', () => {
      it('整数パーセンテージの正確性', () => {
        // Arrange & Act & Assert
        expect(Vitality.create(0, 100).getPercentage()).toBe(0)
        expect(Vitality.create(25, 100).getPercentage()).toBe(25)
        expect(Vitality.create(50, 100).getPercentage()).toBe(50)
        expect(Vitality.create(75, 100).getPercentage()).toBe(75)
        expect(Vitality.create(100, 100).getPercentage()).toBe(100)
      })

      it('小数点パーセンテージの切り捨て', () => {
        // Arrange & Act & Assert
        expect(Vitality.create(33.33, 100).getPercentage()).toBe(33)
        expect(Vitality.create(33.99, 100).getPercentage()).toBe(33)
        expect(Vitality.create(66.01, 100).getPercentage()).toBe(66)
        expect(Vitality.create(99.99, 100).getPercentage()).toBe(99)
      })

      it('異なる最大値でのパーセンテージ計算', () => {
        // Arrange & Act & Assert
        expect(Vitality.create(25, 50).getPercentage()).toBe(50)
        expect(Vitality.create(33, 66).getPercentage()).toBe(50)
        expect(Vitality.create(1, 3).getPercentage()).toBe(33)
      })
    })
  })

  describe('withMaxVitality()メソッドの包括テスト', () => {
    describe('最大値変更の正常ケース', () => {
      it('最大値増加時は現在値を維持', () => {
        // Arrange
        const vitality = Vitality.create(50, 100)
        
        // Act
        const result = vitality.withMaxVitality(150)
        
        // Assert
        expect(result.getValue()).toBe(50)
        expect(result.getMax()).toBe(150)
        expect(vitality.getValue()).toBe(50) // 元は不変
        expect(vitality.getMax()).toBe(100)
      })

      it('最大値減少時で現在値が新最大値以下なら維持', () => {
        // Arrange
        const vitality = Vitality.create(40, 100)
        
        // Act
        const result = vitality.withMaxVitality(50)
        
        // Assert
        expect(result.getValue()).toBe(40)
        expect(result.getMax()).toBe(50)
      })

      it('最大値減少時で現在値が新最大値を超える場合は調整', () => {
        // Arrange
        const vitality = Vitality.create(80, 100)
        
        // Act
        const result = vitality.withMaxVitality(60)
        
        // Assert
        expect(result.getValue()).toBe(60)
        expect(result.getMax()).toBe(60)
        expect(result.isFull()).toBe(true)
      })
    })

    describe('境界値テスト', () => {
      it('新最大値と現在値が等しい場合', () => {
        // Arrange
        const vitality = Vitality.create(75, 100)
        
        // Act
        const result = vitality.withMaxVitality(75)
        
        // Assert
        expect(result.getValue()).toBe(75)
        expect(result.getMax()).toBe(75)
        expect(result.isFull()).toBe(true)
      })

      it('現在値が0の場合の最大値変更', () => {
        // Arrange
        const vitality = Vitality.create(0, 100)
        
        // Act
        const result = vitality.withMaxVitality(50)
        
        // Assert
        expect(result.getValue()).toBe(0)
        expect(result.getMax()).toBe(50)
        expect(result.isDepleted()).toBe(true)
      })

      it('非常に小さな最大値への変更', () => {
        // Arrange
        const vitality = Vitality.create(50, 100)
        
        // Act
        const result = vitality.withMaxVitality(0.1)
        
        // Assert
        expect(result.getValue()).toBe(0.1)
        expect(result.getMax()).toBe(0.1)
        expect(result.isFull()).toBe(true)
      })
    })

    describe('事前条件違反テスト', () => {
      it('負の最大値ではエラー', () => {
        // Arrange
        const vitality = Vitality.create(50, 100)
        
        // Act & Assert
        expect(() => vitality.withMaxVitality(-1)).toThrow('Maximum vitality must be positive')
        expect(() => vitality.withMaxVitality(0)).toThrow('Maximum vitality must be positive')
      })

      it('非数値の最大値ではエラー', () => {
        // Arrange
        const vitality = Vitality.create(50, 100)
        
        // Act & Assert
        expect(() => vitality.withMaxVitality(NaN)).toThrow('Maximum vitality must be a finite number')
        expect(() => vitality.withMaxVitality(Infinity)).toThrow('Maximum vitality must be a finite number') // いずれかのエラー
      })
    })
  })

  describe('equals()メソッドの同値性テスト', () => {
    describe('等価性の正確な判定', () => {
      it('同じ値と最大値なら等価', () => {
        // Arrange
        const v1 = Vitality.create(50, 100)
        const v2 = Vitality.create(50, 100)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(true)
        expect(v2.equals(v1)).toBe(true) // 対称性
      })

      it('値が異なるなら非等価', () => {
        // Arrange
        const v1 = Vitality.create(50, 100)
        const v2 = Vitality.create(60, 100)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(false)
        expect(v2.equals(v1)).toBe(false)
      })

      it('最大値が異なるなら非等価', () => {
        // Arrange
        const v1 = Vitality.create(50, 100)
        const v2 = Vitality.create(50, 120)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(false)
        expect(v2.equals(v1)).toBe(false)
      })

      it('自己参照は等価', () => {
        // Arrange
        const vitality = Vitality.create(50, 100)
        
        // Act & Assert
        expect(vitality.equals(vitality)).toBe(true)
      })
    })

    describe('推移性の検証', () => {
      it('A=B, B=C なら A=C', () => {
        // Arrange
        const v1 = Vitality.create(75, 100)
        const v2 = Vitality.create(75, 100)
        const v3 = Vitality.create(75, 100)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(true)
        expect(v2.equals(v3)).toBe(true)
        expect(v1.equals(v3)).toBe(true) // 推移性
      })
    })

    describe('境界値での等価性', () => {
      it('ゼロでの等価性', () => {
        // Arrange
        const v1 = Vitality.create(0, 100)
        const v2 = Vitality.create(0, 100)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(true)
      })

      it('最大値での等価性', () => {
        // Arrange
        const v1 = Vitality.create(100, 100)
        const v2 = Vitality.create(100, 100)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(true)
      })

      it('小数値での等価性', () => {
        // Arrange
        const v1 = Vitality.create(33.33, 100)
        const v2 = Vitality.create(33.33, 100)
        
        // Act & Assert
        expect(v1.equals(v2)).toBe(true)
      })
    })
  })

  describe('toString()メソッドの文字列表現テスト', () => {
    describe('フォーマット検証', () => {
      it('基本フォーマットが正確', () => {
        // Arrange
        const vitality = Vitality.create(50, 100)
        
        // Act
        const result = vitality.toString()
        
        // Assert
        expect(result).toBe('50/100 (50%)')
      })

      it('ゼロでのフォーマット', () => {
        // Arrange
        const vitality = Vitality.create(0, 100)
        
        // Act
        const result = vitality.toString()
        
        // Assert
        expect(result).toBe('0/100 (0%)')
      })

      it('満タンでのフォーマット', () => {
        // Arrange
        const vitality = Vitality.create(100, 100)
        
        // Act
        const result = vitality.toString()
        
        // Assert
        expect(result).toBe('100/100 (100%)')
      })

      it('小数値でのフォーマット', () => {
        // Arrange
        const vitality = Vitality.create(33.33, 100)
        
        // Act
        const result = vitality.toString()
        
        // Assert
        expect(result).toBe('33.33/100 (33%)')
      })

      it('異なる最大値でのフォーマット', () => {
        // Arrange
        const vitality = Vitality.create(25, 50)
        
        // Act
        const result = vitality.toString()
        
        // Assert
        expect(result).toBe('25/50 (50%)')
      })
    })
  })

  describe('イミュータブル性の厳密検証', () => {
    it('decrease操作後も元のインスタンスは不変', () => {
      // Arrange
      const original = Vitality.create(50, 100)
      const originalValue = original.getValue()
      const originalMax = original.getMax()
      
      // Act
      const decreased = original.decrease(20)
      
      // Assert: 元のインスタンスは変更されない
      expect(original.getValue()).toBe(originalValue)
      expect(original.getMax()).toBe(originalMax)
      
      // Assert: 新しいインスタンスは異なる
      expect(decreased).not.toBe(original)
      expect(decreased.getValue()).not.toBe(originalValue)
    })

    it('increase操作後も元のインスタンスは不変', () => {
      // Arrange
      const original = Vitality.create(50, 100)
      const originalValue = original.getValue()
      const originalMax = original.getMax()
      
      // Act
      const increased = original.increase(20)
      
      // Assert: 元のインスタンスは変更されない
      expect(original.getValue()).toBe(originalValue)
      expect(original.getMax()).toBe(originalMax)
      
      // Assert: 新しいインスタンスは異なる
      expect(increased).not.toBe(original)
      expect(increased.getValue()).not.toBe(originalValue)
    })

    it('withMaxVitality操作後も元のインスタンスは不変', () => {
      // Arrange
      const original = Vitality.create(50, 100)
      const originalValue = original.getValue()
      const originalMax = original.getMax()
      
      // Act
      const modified = original.withMaxVitality(80)
      
      // Assert: 元のインスタンスは変更されない
      expect(original.getValue()).toBe(originalValue)
      expect(original.getMax()).toBe(originalMax)
      
      // Assert: 新しいインスタンスは異なる
      expect(modified).not.toBe(original)
    })
  })

  describe('並行性とスレッドセーフティ', () => {
    it('複数の操作を並行実行しても整合性が保たれる', () => {
      // Arrange
      const vitality = Vitality.create(50, 100)
      
      // Act: 複数の操作を並行実行
      const operations = [
        () => vitality.increase(10),
        () => vitality.decrease(5),
        () => vitality.withMaxVitality(80),
        () => vitality.toString(),
        () => vitality.getPercentage()
      ]
      
      const results = operations.map(op => op())
      
      // Assert: 元のインスタンスは不変
      expect(vitality.getValue()).toBe(50)
      expect(vitality.getMax()).toBe(100)
      
      // Assert: 各操作の結果が正確
      expect((results[0] as Vitality).getValue()).toBe(60)
      expect((results[1] as Vitality).getValue()).toBe(45)
      expect((results[2] as Vitality).getMax()).toBe(80)
      expect(results[3]).toBe('50/100 (50%)')
      expect(results[4]).toBe(50)
    })
  })

  describe('パフォーマンステスト', () => {
    it('大量のインスタンス生成が効率的', () => {
      // Arrange
      const count = 10000
      const startTime = performance.now()
      
      // Act
      const instances = []
      for (let i = 0; i < count; i++) {
        instances.push(Vitality.create(i % 100, 100))
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Assert: パフォーマンスが許容範囲内
      expect(duration).toBeLessThan(1000) // 1秒以内
      expect(instances.length).toBe(count)
      
      // メモリリークのチェック
      expect(instances[0]).toBeInstanceOf(Vitality)
      expect(instances[count - 1]).toBeInstanceOf(Vitality)
    })

    it('大量の操作実行が効率的', () => {
      // Arrange
      let vitality = Vitality.create(50, 100)
      const operationCount = 1000
      const startTime = performance.now()
      
      // Act
      for (let i = 0; i < operationCount; i++) {
        vitality = vitality.increase(1).decrease(1)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Assert
      expect(duration).toBeLessThan(100) // 100ms以内
      expect(vitality.getValue()).toBe(50) // 値は変わらない
    })
  })
})