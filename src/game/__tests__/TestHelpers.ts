/**
 * Phaserゲームテスト用ヘルパー関数
 */

import type Phaser from 'phaser'
import { vi } from 'vitest'

// Phaserモックオブジェクト作成用の型定義
export type MockedPhaser = {
  Scene: typeof Phaser.Scene
  GameObjects: {
    Container: typeof Phaser.GameObjects.Container
    Image: typeof Phaser.GameObjects.Image
    Text: typeof Phaser.GameObjects.Text
    Graphics: typeof Phaser.GameObjects.Graphics
    Particles: {
      ParticleEmitter: typeof Phaser.GameObjects.Particles.ParticleEmitter
    }
  }
  Tweens: {
    Tween: typeof Phaser.Tweens.Tween
  }
  Sound: {
    BaseSound: typeof Phaser.Sound.BaseSound
    WebAudioSound: typeof Phaser.Sound.WebAudioSound
  }
  Input: {
    Pointer: typeof Phaser.Input.Pointer
  }
  Events: {
    EventEmitter: typeof Phaser.Events.EventEmitter
  }
  Math: {
    Between: typeof Phaser.Math.Between
    FloatBetween: typeof Phaser.Math.FloatBetween
  }
  Game: typeof Phaser.Game
}

/**
 * Phaserシーンのモックを作成
 */
export function createMockScene(): Phaser.Scene {
  const mockScene = {
    add: {
      container: vi.fn(() => createMockContainer()),
      image: vi.fn(() => createMockImage()),
      text: vi.fn(() => createMockText()),
      graphics: vi.fn(() => createMockGraphics()),
      particles: vi.fn(() => ({
        createEmitter: vi.fn(() => createMockParticleEmitter())
      })),
      tween: vi.fn()
    },
    tweens: {
      add: vi.fn(() => createMockTween()),
      killTweensOf: vi.fn()
    },
    sound: {
      add: vi.fn(() => createMockSound()),
      play: vi.fn()
    },
    input: {
      on: vi.fn(),
      off: vi.fn(),
      setDraggable: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn()
    },
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn()
    },
    cameras: {
      main: {
        shake: vi.fn(),
        flash: vi.fn(),
        fade: vi.fn(),
        pan: vi.fn(),
        zoom: 1,
        scrollX: 0,
        scrollY: 0
      }
    },
    sys: {
      canvas: {
        width: 800,
        height: 600
      }
    },
    game: {
      device: {
        os: {
          android: false,
          iOS: false
        }
      },
      config: {
        width: 800,
        height: 600
      }
    },
    time: {
      delayedCall: vi.fn((delay, callback) => {
        setTimeout(callback, delay)
        return { remove: vi.fn() }
      })
    },
    scale: {
      width: 800,
      height: 600
    }
  } as unknown as Phaser.Scene

  return mockScene
}

/**
 * Phaserコンテナのモックを作成
 */
export function createMockContainer(): Phaser.GameObjects.Container {
  const container = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    alpha: 1,
    visible: true,
    list: [],
    add: vi.fn(),
    remove: vi.fn(),
    removeAll: vi.fn(),
    destroy: vi.fn(),
    setPosition: vi.fn(function(x: number, y: number) {
      this.x = x
      this.y = y
      return this
    }),
    setScale: vi.fn(function(x: number, y?: number) {
      this.scaleX = x
      this.scaleY = y ?? x
      return this
    }),
    setAlpha: vi.fn(function(alpha: number) {
      this.alpha = alpha
      return this
    }),
    setVisible: vi.fn(function(visible: boolean) {
      this.visible = visible
      return this
    }),
    setInteractive: vi.fn(() => container),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    once: vi.fn(),
    getBounds: vi.fn(() => ({
      x: 0,
      y: 0,
      width: 100,
      height: 100
    }))
  } as unknown as Phaser.GameObjects.Container

  return container
}

/**
 * Phaser画像のモックを作成
 */
export function createMockImage(): Phaser.GameObjects.Image {
  const image = {
    ...createMockContainer(),
    setTexture: vi.fn(),
    setFrame: vi.fn(),
    setTint: vi.fn()
  } as unknown as Phaser.GameObjects.Image

  return image
}

/**
 * Phaserテキストのモックを作成
 */
export function createMockText(): Phaser.GameObjects.Text {
  const text = {
    ...createMockContainer(),
    text: '',
    setText: vi.fn(function(value: string) {
      this.text = value
      return this
    }),
    setStyle: vi.fn(),
    setFontSize: vi.fn(),
    setColor: vi.fn()
  } as unknown as Phaser.GameObjects.Text

  return text
}

/**
 * Phaserグラフィックスのモックを作成
 */
export function createMockGraphics(): Phaser.GameObjects.Graphics {
  const graphics = {
    ...createMockContainer(),
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    lineStyle: vi.fn(),
    strokeRect: vi.fn(),
    strokeCircle: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    strokePath: vi.fn(),
    fillPath: vi.fn()
  } as unknown as Phaser.GameObjects.Graphics

  return graphics
}

/**
 * Phaserパーティクルエミッターのモックを作成
 */
export function createMockParticleEmitter(): Phaser.GameObjects.Particles.ParticleEmitter {
  const emitter = {
    active: true,
    visible: true,
    on: false,
    stop: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn(),
    setPosition: vi.fn(),
    setSpeed: vi.fn(),
    setScale: vi.fn(),
    setLifespan: vi.fn(),
    setQuantity: vi.fn()
  } as unknown as Phaser.GameObjects.Particles.ParticleEmitter

  return emitter
}

/**
 * Phaserトゥイーンのモックを作成
 */
export function createMockTween(): Phaser.Tweens.Tween {
  const tween = {
    isPlaying: vi.fn(() => false),
    isPaused: vi.fn(() => false),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    remove: vi.fn(),
    on: vi.fn()
  } as unknown as Phaser.Tweens.Tween

  return tween
}

/**
 * Phaserサウンドのモックを作成
 */
export function createMockSound(): Phaser.Sound.BaseSound {
  const sound = {
    play: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
    destroy: vi.fn(),
    setVolume: vi.fn(),
    setLoop: vi.fn(),
    isPlaying: false,
    volume: 1
  } as unknown as Phaser.Sound.BaseSound

  return sound
}

/**
 * Phaserポインターのモックを作成
 */
export function createMockPointer(): Phaser.Input.Pointer {
  const pointer = {
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    downX: 0,
    downY: 0,
    isDown: false,
    leftButtonDown: vi.fn(() => false),
    rightButtonDown: vi.fn(() => false),
    middleButtonDown: vi.fn(() => false)
  } as unknown as Phaser.Input.Pointer

  return pointer
}

/**
 * Phaserゲームのモックを作成
 */
export function createMockGame(): Phaser.Game {
  const game = {
    config: {
      width: 800,
      height: 600
    },
    device: {
      os: {
        android: false,
        iOS: false
      },
      input: {
        touch: false
      }
    },
    sound: {
      context: null,
      locked: false
    },
    scene: {
      scenes: []
    },
    destroy: vi.fn()
  } as unknown as Phaser.Game

  return game
}