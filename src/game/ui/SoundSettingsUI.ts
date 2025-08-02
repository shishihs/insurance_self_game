import type { IntegratedSoundManager } from '../systems/IntegratedSoundManager'

/**
 * サウンド設定UI
 * 音量調整、サウンドON/OFF、詳細設定を提供
 */
export class SoundSettingsUI {
  private readonly scene: Phaser.Scene
  private readonly soundManager: IntegratedSoundManager
  private readonly container: Phaser.GameObjects.Container
  private isVisible: boolean = false
  
  private background!: Phaser.GameObjects.Rectangle
  private titleText!: Phaser.GameObjects.Text
  private closeButton!: Phaser.GameObjects.Text
  
  // スライダー要素
  private masterSlider!: VolumeSlider
  private sfxSlider!: VolumeSlider
  private bgmSlider!: VolumeSlider
  
  // トグルボタン
  private soundToggle!: ToggleButton
  
  constructor(scene: Phaser.Scene, soundManager: IntegratedSoundManager) {
    this.scene = scene
    this.soundManager = soundManager
    this.container = scene.add.container(0, 0)
    this.container.setVisible(false)
    this.container.setDepth(1000)
    
    this.createUI()
  }
  
  /**
   * UIを作成
   */
  private createUI(): void {
    const centerX = this.scene.cameras.main.width / 2
    const centerY = this.scene.cameras.main.height / 2
    
    // 背景
    this.background = this.scene.add.rectangle(
      centerX, centerY, 400, 300,
      0x000000, 0.9
    )
    this.container.add(this.background)
    
    // 枠線
    const border = this.scene.add.rectangle(
      centerX, centerY, 400, 300
    )
    border.setStrokeStyle(2, 0xffffff)
    this.container.add(border)
    
    // タイトル
    this.titleText = this.scene.add.text(
      centerX, centerY - 120,
      'サウンド設定',
      {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }
    )
    this.titleText.setOrigin(0.5)
    this.container.add(this.titleText)
    
    // 閉じるボタン
    this.closeButton = this.scene.add.text(
      centerX + 180, centerY - 130,
      '×',
      {
        fontSize: '28px',
        fontFamily: 'Arial',
        color: '#ffffff'
      }
    )
    this.closeButton.setOrigin(0.5)
    this.closeButton.setInteractive({ useHandCursor: true })
    this.closeButton.on('pointerdown', () => {
      this.soundManager.playSFX('buttonClick')
      this.hide()
    })
    this.closeButton.on('pointerover', () => {
      this.closeButton.setColor('#ff6666')
      this.soundManager.playSFX('buttonHover')
    })
    this.closeButton.on('pointerout', () => {
      this.closeButton.setColor('#ffffff')
    })
    this.container.add(this.closeButton)
    
    // サウンドON/OFFトグル
    this.soundToggle = new ToggleButton(
      this.scene,
      centerX, centerY - 70,
      'サウンド',
      this.soundManager.isEnabled(),
      (enabled) => {
        this.soundManager.setEnabled(enabled)
        this.updateSliderStates()
      }
    )
    this.container.add(this.soundToggle.container)
    
    // マスターボリュームスライダー
    const debugInfo = this.soundManager.getDebugInfo()
    this.masterSlider = new VolumeSlider(
      this.scene,
      centerX, centerY - 20,
      'マスター音量',
      debugInfo.masterVolume,
      (value) => {
        this.soundManager.setMasterVolume(value)
        this.soundManager.playSFX('buttonClick')
      }
    )
    this.container.add(this.masterSlider.container)
    
    // 効果音ボリュームスライダー
    this.sfxSlider = new VolumeSlider(
      this.scene,
      centerX, centerY + 30,
      '効果音',
      debugInfo.sfxVolume,
      (value) => {
        this.soundManager.setSFXVolume(value)
        this.soundManager.playSFX('buttonClick')
      }
    )
    this.container.add(this.sfxSlider.container)
    
    // BGMボリュームスライダー
    this.bgmSlider = new VolumeSlider(
      this.scene,
      centerX, centerY + 80,
      'BGM',
      debugInfo.bgmVolume,
      (value) => {
        this.soundManager.setBGMVolume(value)
      }
    )
    this.container.add(this.bgmSlider.container)
    
    // キーボードショートカット説明
    const shortcutText = this.scene.add.text(
      centerX, centerY + 120,
      'M: サウンドON/OFF  -/+: 音量調整',
      {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#888888'
      }
    )
    shortcutText.setOrigin(0.5)
    this.container.add(shortcutText)
  }
  
  /**
   * スライダーの有効/無効状態を更新
   */
  private updateSliderStates(): void {
    const enabled = this.soundManager.isEnabled()
    this.masterSlider.setEnabled(enabled)
    this.sfxSlider.setEnabled(enabled)
    this.bgmSlider.setEnabled(enabled)
  }
  
  /**
   * UIを表示
   */
  show(): void {
    if (!this.isVisible) {
      this.isVisible = true
      this.container.setVisible(true)
      
      // フェードイン
      this.container.setAlpha(0)
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        duration: 200,
        ease: 'Power2'
      })
      
      this.soundManager.playSFX('dialogOpen')
    }
  }
  
  /**
   * UIを非表示
   */
  hide(): void {
    if (this.isVisible) {
      this.isVisible = false
      
      // フェードアウト
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          this.container.setVisible(false)
        }
      })
      
      this.soundManager.playSFX('dialogClose')
    }
  }
  
  /**
   * 表示/非表示を切り替え
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide()
    } else {
      this.show()
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.container.destroy()
  }
}

/**
 * ボリュームスライダーコンポーネント
 */
class VolumeSlider {
  container: Phaser.GameObjects.Container
  private readonly scene: Phaser.Scene
  private readonly label: Phaser.GameObjects.Text
  private readonly track: Phaser.GameObjects.Rectangle
  private readonly thumb: Phaser.GameObjects.Circle
  private readonly valueText: Phaser.GameObjects.Text
  private value: number
  private readonly onChange: (value: number) => void
  private enabled: boolean = true
  
  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    labelText: string,
    initialValue: number,
    onChange: (value: number) => void
  ) {
    this.scene = scene
    this.value = initialValue
    this.onChange = onChange
    this.container = scene.add.container(x, y)
    
    // ラベル
    this.label = scene.add.text(-150, 0, labelText, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#ffffff'
    })
    this.label.setOrigin(0, 0.5)
    this.container.add(this.label)
    
    // トラック
    this.track = scene.add.rectangle(50, 0, 200, 4, 0x444444)
    this.container.add(this.track)
    
    // つまみ
    const thumbX = -50 + (this.value * 200)
    this.thumb = scene.add.circle(thumbX, 0, 10, 0xffffff)
    this.thumb.setInteractive({ useHandCursor: true, draggable: true })
    this.container.add(this.thumb)
    
    // 値表示
    this.valueText = scene.add.text(170, 0, `${Math.round(this.value * 100)}%`, {
      fontSize: '14px',
      fontFamily: 'Arial',
      color: '#ffffff'
    })
    this.valueText.setOrigin(0, 0.5)
    this.container.add(this.valueText)
    
    // ドラッグ処理
    this.thumb.on('drag', (pointer: Phaser.Input.Pointer, dragX: number) => {
      if (!this.enabled) return
      
      // スライダーの範囲内に制限
      const clampedX = Phaser.Math.Clamp(dragX, -50, 150)
      this.thumb.x = clampedX
      
      // 値を計算
      this.value = (clampedX + 50) / 200
      this.valueText.setText(`${Math.round(this.value * 100)}%`)
      
      // コールバック呼び出し
      this.onChange(this.value)
    })
    
    // ホバー効果
    this.thumb.on('pointerover', () => {
      if (this.enabled) {
        this.thumb.setScale(1.2)
      }
    })
    this.thumb.on('pointerout', () => {
      this.thumb.setScale(1)
    })
  }
  
  /**
   * 有効/無効を設定
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    const alpha = enabled ? 1 : 0.3
    this.label.setAlpha(alpha)
    this.track.setAlpha(alpha)
    this.thumb.setAlpha(alpha)
    this.valueText.setAlpha(alpha)
    
    if (enabled) {
      this.thumb.setInteractive()
    } else {
      this.thumb.disableInteractive()
    }
  }
}

/**
 * トグルボタンコンポーネント
 */
class ToggleButton {
  container: Phaser.GameObjects.Container
  private readonly scene: Phaser.Scene
  private readonly label: Phaser.GameObjects.Text
  private readonly switchBg: Phaser.GameObjects.Rectangle
  private readonly switchThumb: Phaser.GameObjects.Circle
  private value: boolean
  private readonly onChange: (value: boolean) => void
  
  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    labelText: string,
    initialValue: boolean,
    onChange: (value: boolean) => void
  ) {
    this.scene = scene
    this.value = initialValue
    this.onChange = onChange
    this.container = scene.add.container(x, y)
    
    // ラベル
    this.label = scene.add.text(-100, 0, labelText, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#ffffff'
    })
    this.label.setOrigin(0, 0.5)
    this.container.add(this.label)
    
    // スイッチ背景
    this.switchBg = scene.add.rectangle(60, 0, 60, 30, this.value ? 0x4CAF50 : 0x666666)
    this.switchBg.setInteractive({ useHandCursor: true })
    this.container.add(this.switchBg)
    
    // スイッチつまみ
    const thumbX = this.value ? 75 : 45
    this.switchThumb = scene.add.circle(thumbX, 0, 12, 0xffffff)
    this.container.add(this.switchThumb)
    
    // クリック処理
    this.switchBg.on('pointerdown', () => {
      this.toggle()
    })
    
    // ホバー効果
    this.switchBg.on('pointerover', () => {
      this.switchBg.setScale(1.05)
    })
    this.switchBg.on('pointerout', () => {
      this.switchBg.setScale(1)
    })
  }
  
  /**
   * 値を切り替え
   */
  private toggle(): void {
    this.value = !this.value
    
    // アニメーション
    this.scene.tweens.add({
      targets: this.switchThumb,
      x: this.value ? 75 : 45,
      duration: 200,
      ease: 'Power2'
    })
    
    // 色を変更
    this.switchBg.setFillStyle(this.value ? 0x4CAF50 : 0x666666)
    
    // コールバック呼び出し
    this.onChange(this.value)
  }
}