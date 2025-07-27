import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DropZoneManager, type DropZone } from '../DropZoneManager'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'

// Phaserモックの設定
const mockScene = {
  add: {
    graphics: vi.fn(() => ({
      setPosition: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis(),
      clear: vi.fn().mockReturnThis(),
      fillStyle: vi.fn().mockReturnThis(),
      fillRoundedRect: vi.fn().mockReturnThis(),
      strokeRoundedRect: vi.fn().mockReturnThis(),
      fillCircle: vi.fn().mockReturnThis(),
      destroy: vi.fn()
    }))
  },
  tweens: {
    add: vi.fn(),
    killTweensOf: vi.fn()
  },
  time: {
    now: 0
  }
} as any

const mockGame = {
  currentChallenge: null,
  phase: 'setup',
  config: { tutorialEnabled: false },
  insuranceCards: [],
  placeChallengeCard: vi.fn(),
  discardCard: vi.fn()
} as any

describe('DropZoneManager', () => {
  let dropZoneManager: DropZoneManager
  let mockCard: Card
  let mockContainer: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockScene.time.now = 0
    
    dropZoneManager = new DropZoneManager(mockScene, mockGame)
    
    mockCard = {
      id: 'test-card',
      name: 'Test Card',
      type: 'life',
      power: 5,
      cost: 2
    } as Card

    mockContainer = {
      x: 100,
      y: 100,
      getData: vi.fn().mockReturnValue(mockCard),
      setScale: vi.fn().mockReturnThis(),
      setAlpha: vi.fn().mockReturnThis(),
      setDepth: vi.fn().mockReturnThis()
    }
  })

  afterEach(() => {
    dropZoneManager.destroy()
  })

  describe('Zone Registration', () => {
    it('should register a new drop zone', () => {
      const zone: DropZone = {
        id: 'test-zone',
        type: 'challenge',
        bounds: new Phaser.Geom.Rectangle(0, 0, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(zone)
      expect(dropZoneManager.getZone('test-zone')).toBe(zone)
    })

    it('should throw error when registering duplicate zone id', () => {
      const zone: DropZone = {
        id: 'duplicate-zone',
        type: 'challenge',
        bounds: new Phaser.Geom.Rectangle(0, 0, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(zone)
      expect(() => dropZoneManager.registerZone(zone)).toThrow()
    })

    it('should unregister zones properly', () => {
      const zone: DropZone = {
        id: 'removable-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(0, 0, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 5,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(zone)
      dropZoneManager.unregisterZone('removable-zone')
      expect(dropZoneManager.getZone('removable-zone')).toBeUndefined()
    })
  })

  describe('Drag State Management', () => {
    it('should track drag state correctly', () => {
      expect(dropZoneManager.getDragState().isDragging).toBe(false)

      dropZoneManager.startDrag(mockContainer)
      const dragState = dropZoneManager.getDragState()
      
      expect(dragState.isDragging).toBe(true)
      expect(dragState.draggedCard).toBe(mockContainer)
      expect(dragState.startTime).toBeDefined()
      expect(dragState.startPosition).toEqual({ x: 100, y: 100 })
    })

    it('should reset drag state on end', () => {
      dropZoneManager.startDrag(mockContainer)
      expect(dropZoneManager.getDragState().isDragging).toBe(true)

      const result = dropZoneManager.endDrag(100, 100)
      expect(dropZoneManager.getDragState().isDragging).toBe(false)
      expect(result.success).toBe(false) // No zones registered
    })
  })

  describe('Collision Detection', () => {
    beforeEach(() => {
      // Register test zones
      const challengeZone: DropZone = {
        id: 'challenge',
        type: 'challenge',
        bounds: new Phaser.Geom.Rectangle(50, 50, 100, 100),
        isValid: (card: Card, game: Game) => {
          return game.currentChallenge !== null && !game.currentChallenge.isCardPlaced
        },
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 80
      }

      const discardZone: DropZone = {
        id: 'discard',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(200, 50, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 5,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(challengeZone)
      dropZoneManager.registerZone(discardZone)
    })

    it('should detect zones within bounds', () => {
      dropZoneManager.startDrag(mockContainer)
      
      // Point inside discard zone
      const nearestZone = dropZoneManager.updateDrag(250, 100)
      expect(nearestZone).toBe('discard')
    })

    it('should respect zone priority', () => {
      // Create overlapping zones with different priorities
      const highPriorityZone: DropZone = {
        id: 'high-priority',
        type: 'special',
        bounds: new Phaser.Geom.Rectangle(240, 90, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 15, // Higher than discard zone (5)
        magneticDistance: 80
      }

      dropZoneManager.registerZone(highPriorityZone)
      dropZoneManager.startDrag(mockContainer)
      
      // Point in overlapping area - should prefer high priority zone
      const nearestZone = dropZoneManager.updateDrag(260, 120)
      expect(nearestZone).toBe('high-priority')
    })

    it('should handle invalid zones correctly', () => {
      mockGame.currentChallenge = null // Challenge zone will be invalid
      
      dropZoneManager.startDrag(mockContainer)
      
      // Point inside challenge zone, but zone is invalid
      const nearestZone = dropZoneManager.updateDrag(100, 100)
      expect(nearestZone).toBeNull()
    })
  })

  describe('Performance Optimization', () => {
    it('should throttle drag updates based on CHECK_INTERVAL', () => {
      dropZoneManager.startDrag(mockContainer)
      
      // First update
      mockScene.time.now = 0
      const result1 = dropZoneManager.updateDrag(100, 100)
      
      // Immediate second update (should be throttled)
      mockScene.time.now = 5 // Less than CHECK_INTERVAL (16ms)
      const result2 = dropZoneManager.updateDrag(110, 110)
      
      // Results should be the same due to throttling
      expect(result1).toBe(result2)
    })

    it('should process updates after CHECK_INTERVAL', () => {
      const discardZone: DropZone = {
        id: 'discard',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(200, 50, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 5,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(discardZone)
      dropZoneManager.startDrag(mockContainer)
      
      // First update
      mockScene.time.now = 0
      dropZoneManager.updateDrag(100, 100)
      
      // Update after CHECK_INTERVAL
      mockScene.time.now = 20 // Greater than CHECK_INTERVAL (16ms)
      const result = dropZoneManager.updateDrag(250, 100)
      
      expect(result).toBe('discard')
    })
  })

  describe('Rectangle vs Circle Distance Performance', () => {
    it('should use efficient rectangle collision detection', () => {
      const zone: DropZone = {
        id: 'test-zone',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(100, 100, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 50
      }

      dropZoneManager.registerZone(zone)
      dropZoneManager.startDrag(mockContainer)

      // Point inside rectangle bounds
      const insideResult = dropZoneManager.updateDrag(150, 150)
      expect(insideResult).toBe('test-zone')

      // Point outside rectangle but within magnetic distance
      const magneticResult = dropZoneManager.updateDrag(170, 170)
      expect(magneticResult).toBe('test-zone')

      // Point far outside magnetic distance
      const outsideResult = dropZoneManager.updateDrag(300, 300)
      expect(outsideResult).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle drag end without active drag', () => {
      const result = dropZoneManager.endDrag(100, 100)
      expect(result.success).toBe(false)
      expect(result.error).toBe('No drag in progress')
    })

    it('should handle onDrop errors gracefully', () => {
      const errorZone: DropZone = {
        id: 'error-zone',
        type: 'challenge',
        bounds: new Phaser.Geom.Rectangle(90, 90, 120, 120),
        isValid: () => true,
        onDrop: () => { throw new Error('Drop failed') },
        priority: 10,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(errorZone)
      dropZoneManager.startDrag(mockContainer)
      
      const result = dropZoneManager.endDrag(100, 100)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Drop failed')
    })
  })

  describe('Memory Management', () => {
    it('should clean up resources on destroy', () => {
      const zone: DropZone = {
        id: 'cleanup-test',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(0, 0, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(zone)
      expect(dropZoneManager.getAllZones().size).toBe(1)

      dropZoneManager.destroy()
      expect(dropZoneManager.getAllZones().size).toBe(0)
    })

    it('should destroy zone highlights on cleanup', () => {
      const zone: DropZone = {
        id: 'highlight-test',
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(0, 0, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: 10,
        magneticDistance: 80
      }

      dropZoneManager.registerZone(zone)
      const registeredZone = dropZoneManager.getZone('highlight-test')
      
      dropZoneManager.destroy()
      expect(registeredZone?.highlight?.destroy).toHaveBeenCalled()
    })
  })
})

describe('DropZone Performance Benchmarks', () => {
  let dropZoneManager: DropZoneManager
  
  beforeEach(() => {
    dropZoneManager = new DropZoneManager(mockScene, mockGame)
    
    // Register multiple zones for performance testing
    for (let i = 0; i < 10; i++) {
      const zone: DropZone = {
        id: `zone-${i}`,
        type: 'discard',
        bounds: new Phaser.Geom.Rectangle(i * 50, i * 50, 100, 100),
        isValid: () => true,
        onDrop: vi.fn(),
        priority: i,
        magneticDistance: 80
      }
      dropZoneManager.registerZone(zone)
    }
  })

  afterEach(() => {
    dropZoneManager.destroy()
  })

  it('should handle many zones efficiently', () => {
    const mockContainer = {
      x: 100,
      y: 100,
      getData: vi.fn().mockReturnValue(mockCard)
    }

    dropZoneManager.startDrag(mockContainer as any)
    
    const startTime = performance.now()
    
    // Simulate rapid drag updates
    for (let i = 0; i < 100; i++) {
      mockScene.time.now = i * 20 // Each update is 20ms apart
      dropZoneManager.updateDrag(i * 2, i * 2)
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    // Should complete within reasonable time (less than 100ms for 100 updates)
    expect(duration).toBeLessThan(100)
  })

  it('should throttle updates effectively', () => {
    const mockContainer = {
      x: 100,
      y: 100,
      getData: vi.fn().mockReturnValue(mockCard)
    }

    dropZoneManager.startDrag(mockContainer as any)
    
    const updateSpy = vi.spyOn(dropZoneManager as any, 'findNearestValidZone')
    
    // Rapid updates within throttle window
    mockScene.time.now = 0
    dropZoneManager.updateDrag(100, 100)
    dropZoneManager.updateDrag(101, 101)
    dropZoneManager.updateDrag(102, 102)
    
    // Should only call findNearestValidZone once due to throttling
    expect(updateSpy).toHaveBeenCalledTimes(1)
  })
})