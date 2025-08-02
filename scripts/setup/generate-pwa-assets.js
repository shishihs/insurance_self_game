/**
 * PWAアセット生成スクリプト
 * 
 * ベースアイコンから各種サイズのアイコンを生成
 * 注: 実際の実行にはsharpやjimp等の画像処理ライブラリが必要
 */

import { createCanvas } from 'canvas'
import fs from 'fs'
import path from 'path'

// アイコンサイズ定義
const ICON_SIZES = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

// スプラッシュスクリーンサイズ（iOS）
const SPLASH_SIZES = [
  { width: 828, height: 1792, name: 'splash-828x1792.png' },
  { width: 1242, height: 2688, name: 'splash-1242x2688.png' },
]

/**
 * ベースアイコンを生成（仮のロゴ）
 */
function generateBaseIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  
  // 背景
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#667eea')
  gradient.addColorStop(1, '#764ba2')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  
  // 円形の背景
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2)
  ctx.fill()
  
  // テキスト「充」
  ctx.fillStyle = '#667eea'
  ctx.font = `bold ${size * 0.4}px "Noto Sans JP", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('充', size / 2, size / 2)
  
  return canvas
}

/**
 * スプラッシュスクリーンを生成
 */
function generateSplashScreen(width, height, name) {
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // 背景グラデーション
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#1F2937')
  gradient.addColorStop(1, '#111827')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  // ロゴアイコン
  const iconSize = Math.min(width, height) * 0.3
  const iconCanvas = generateBaseIcon(iconSize)
  ctx.drawImage(
    iconCanvas,
    (width - iconSize) / 2,
    (height - iconSize) / 2 - height * 0.1,
    iconSize,
    iconSize
  )
  
  // タイトルテキスト
  ctx.fillStyle = 'white'
  ctx.font = `bold ${width * 0.06}px "Noto Sans JP", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('人生充実ゲーム', width / 2, height / 2 + height * 0.15)
  
  // サブタイトル
  ctx.font = `${width * 0.03}px "Noto Sans JP", sans-serif`
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillText('Life Fulfillment', width / 2, height / 2 + height * 0.2)
  
  return canvas
}

/**
 * アセットを生成
 */
async function generateAssets() {
  const publicDir = path.resolve(process.cwd(), 'public')
  
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }
  
  // アイコンの生成
  console.log('Generating icons...')
  for (const { size, name } of ICON_SIZES) {
    const canvas = generateBaseIcon(size)
    const buffer = canvas.toBuffer('image/png')
    const filePath = path.join(publicDir, name)
    fs.writeFileSync(filePath, buffer)
    console.log(`✓ Generated ${name} (${size}x${size})`)
  }
  
  // スプラッシュスクリーンの生成
  console.log('\nGenerating splash screens...')
  for (const { width, height, name } of SPLASH_SIZES) {
    const canvas = generateSplashScreen(width, height, name)
    const buffer = canvas.toBuffer('image/png')
    const filePath = path.join(publicDir, name)
    fs.writeFileSync(filePath, buffer)
    console.log(`✓ Generated ${name} (${width}x${height})`)
  }
  
  // ショートカット用アイコンの生成
  console.log('\nGenerating shortcut icons...')
  
  // プレイアイコン
  const playIcon = createCanvas(96, 96)
  const playCtx = playIcon.getContext('2d')
  playCtx.fillStyle = '#4CAF50'
  playCtx.fillRect(0, 0, 96, 96)
  playCtx.fillStyle = 'white'
  playCtx.beginPath()
  playCtx.moveTo(35, 25)
  playCtx.lineTo(70, 48)
  playCtx.lineTo(35, 71)
  playCtx.closePath()
  playCtx.fill()
  fs.writeFileSync(
    path.join(publicDir, 'icon-play-96x96.png'),
    playIcon.toBuffer('image/png')
  )
  console.log('✓ Generated icon-play-96x96.png')
  
  // チュートリアルアイコン
  const tutorialIcon = createCanvas(96, 96)
  const tutorialCtx = tutorialIcon.getContext('2d')
  tutorialCtx.fillStyle = '#2196F3'
  tutorialCtx.fillRect(0, 0, 96, 96)
  tutorialCtx.fillStyle = 'white'
  tutorialCtx.font = 'bold 48px sans-serif'
  tutorialCtx.textAlign = 'center'
  tutorialCtx.textBaseline = 'middle'
  tutorialCtx.fillText('?', 48, 48)
  fs.writeFileSync(
    path.join(publicDir, 'icon-tutorial-96x96.png'),
    tutorialIcon.toBuffer('image/png')
  )
  console.log('✓ Generated icon-tutorial-96x96.png')
  
  console.log('\n✨ All PWA assets generated successfully!')
}

// 実行
generateAssets().catch(console.error)