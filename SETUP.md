# SETUP.md
**環境構築ガイド - ゼロから始める開発環境**

## 🛠️ 必要なツール

### 必須ツール
- **Node.js** (v20.0.0以上)
- **Git** (v2.0以上)
- **pnpm** (v8.0以上) または npm

### 推奨ツール
- **VS Code** + 拡張機能
  - Vue - Official
  - TypeScript Vue Plugin (Volar)
  - ESLint
  - Prettier
  - GitLens
- **Chrome** または **Firefox** (開発者ツール用)

## 🚀 クイックスタート（5分で開始）

### 1. リポジトリのクローンまたは作成
```bash
# 新規作成の場合
mkdir life-fulfillment-game
cd life-fulfillment-game
git init

# 既存リポジトリの場合
git clone https://github.com/[username]/life-fulfillment-game.git
cd life-fulfillment-game
```

### 2. 初期ファイル作成
```bash
# プロジェクト構造を一括作成
mkdir -p src/{domain,application,infrastructure,presentation}
mkdir -p src/domain/{models,services,repositories}
mkdir -p src/presentation/{components,composables,stores}
mkdir -p public/assets/{images,sounds}
mkdir -p docs
mkdir -p scripts

# 必須ファイルをコピー（以下の内容を各ファイルに）
```

### 3. package.json作成
```json
{
  "name": "life-fulfillment-game",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "format": "prettier --write .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "principles": "cat docs/PRINCIPLES.md",
    "task:complete": "node scripts/task-complete.js"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "phaser": "^3.80.0",
    "pinia": "^2.2.0",
    "@vueuse/core": "^10.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "@vue/test-utils": "^2.4.0",
    "@vitest/coverage-v8": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.20.0",
    "prettier": "^3.2.0",
    "typescript": "^5.6.0",
    "unocss": "^0.58.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "vue-tsc": "^2.0.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

### 4. 依存関係のインストール
```bash
# pnpm推奨
pnpm install

# npmの場合
npm install
```

### 5. 設定ファイル作成

#### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "paths": {
      "@/*": ["./src/*"],
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

#### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@domain': resolve(__dirname, './src/domain'),
      '@application': resolve(__dirname, './src/application'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
      '@presentation': resolve(__dirname, './src/presentation'),
    }
  },
  base: process.env.NODE_ENV === 'production' ? '/life-fulfillment-game/' : '/',
  server: {
    port: 5173,
    open: true
  }
})
```

#### .gitignore
```
# Dependencies
node_modules
.pnpm-store

# Build
dist
dist-ssr
*.local

# Editor
.vscode/*
!.vscode/extensions.json
.idea
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS
.DS_Store
Thumbs.db

# Env
.env
.env.local
.env.*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Tests
coverage
.nyc_output

# Misc
*.tsbuildinfo
```

### 6. 開発サーバー起動
```bash
# 開発サーバー起動
pnpm dev

# ブラウザが自動で開く
# http://localhost:5173
```

## 📁 プロジェクト構造

```
life-fulfillment-game/
├── docs/                    # ドキュメント
│   ├── CLAUDE.md           # プロジェクトビジョン
│   ├── PRINCIPLES.md       # 開発原則
│   ├── TECH_SPEC.md        # 技術仕様
│   ├── ROADMAP.md          # 開発計画
│   ├── DEVELOPMENT.md      # 開発ガイド
│   ├── SETUP.md            # このファイル
│   └── GAME_DESIGN.md      # ゲーム仕様
├── public/                  # 静的ファイル
│   └── assets/
│       ├── images/         # 画像
│       └── sounds/         # 音声
├── src/                     # ソースコード
│   ├── domain/             # ドメイン層（ビジネスロジック）
│   │   ├── models/         # エンティティ・値オブジェクト
│   │   ├── services/       # ドメインサービス
│   │   └── repositories/   # リポジトリインターフェース
│   ├── application/        # アプリケーション層
│   │   ├── usecases/       # ユースケース
│   │   └── dto/            # データ転送オブジェクト
│   ├── infrastructure/     # インフラ層
│   │   ├── repositories/   # リポジトリ実装
│   │   └── game-engine/    # Phaser統合
│   ├── presentation/       # プレゼンテーション層
│   │   ├── components/     # Vueコンポーネント
│   │   ├── composables/    # Vue Composables
│   │   └── stores/         # Pinia Stores
│   ├── shared/             # 共有コード
│   │   ├── types/          # 型定義
│   │   └── utils/          # ユーティリティ
│   ├── App.vue             # ルートコンポーネント
│   └── main.ts             # エントリーポイント
├── scripts/                 # スクリプト
│   └── task-complete.js    # タスク完了フック
├── tests/                   # テスト
│   ├── unit/               # ユニットテスト
│   └── e2e/                # E2Eテスト
├── index.html              # HTMLエントリー
├── package.json            # 依存関係
├── tsconfig.json           # TypeScript設定
├── vite.config.ts          # Vite設定
├── vitest.config.ts        # Vitest設定
├── uno.config.ts           # UnoCSS設定
└── README.md               # プロジェクト説明
```

## 🎮 最初のゲーム作成

### 1. エントリーポイント（index.html）
```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>人生充実ゲーム - Life Fulfillment</title>
  <meta name="description" content="一人の時間を最高の冒険に変える、人生充実カードゲーム">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 2. main.ts
```typescript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'uno.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// 開発環境でのデバッグ用
if (import.meta.env.DEV) {
  console.log('🎮 人生充実ゲーム開発モード')
  console.log('📚 PRINCIPLES.mdを忘れずに！')
}
```

### 3. App.vue（OKボタンゲーム）
```vue
<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all hover:scale-105">
      <h1 class="text-4xl font-bold text-center mb-2 text-gray-800">
        人生充実ゲーム
      </h1>
      <p class="text-center text-gray-600 mb-8">
        〜 一人の時間を、最高の冒険に 〜
      </p>
      
      <div class="text-center">
        <div class="text-8xl font-bold mb-8 text-blue-600 animate-pulse">
          {{ count }}
        </div>
        
        <button 
          @click="handleClick"
          class="bg-blue-500 text-white text-xl px-8 py-4 rounded-full hover:bg-blue-600 transform transition-all hover:scale-110 active:scale-95 shadow-lg"
        >
          OK! 👍
        </button>
        
        <button 
          @click="handleReset"
          class="ml-4 bg-gray-400 text-white px-6 py-4 rounded-full hover:bg-gray-500 transition-all"
        >
          リセット
        </button>
        
        <div class="mt-8 text-gray-600">
          <p>クリック数: {{ count }}回</p>
          <p v-if="message" class="mt-2 text-green-600 font-bold animate-bounce">
            {{ message }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const count = ref(0)
const message = ref('')

const handleClick = () => {
  count.value++
  
  // マイルストーンメッセージ
  if (count.value === 10) {
    message.value = '🎉 10回達成！その調子！'
  } else if (count.value === 50) {
    message.value = '🚀 50回！素晴らしい！'
  } else if (count.value === 100) {
    message.value = '🏆 100回！マスター認定！'
  } else {
    message.value = ''
  }
}

const handleReset = () => {
  if (count.value > 0 && confirm('本当にリセットしますか？')) {
    count.value = 0
    message.value = 'リセットしました'
    setTimeout(() => {
      message.value = ''
    }, 2000)
  }
}

// 開発用ログ
watch(count, (newCount) => {
  if (import.meta.env.DEV) {
    console.log(`Count: ${newCount}`)
  }
})
</script>
```

### 4. UnoCSS設定（uno.config.ts）
```typescript
import { defineConfig, presetUno, presetAttributify } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  theme: {
    animation: {
      keyframes: {
        pulse: '{0%, 100% {opacity: 1} 50% {opacity: 0.5}}',
        bounce: '{0%, 100% {transform: translateY(0)} 50% {transform: translateY(-10px)}}'
      }
    }
  }
})
```

## 🚨 トラブルシューティング

### よくあるエラーと解決方法

#### 1. "Cannot find module" エラー
```bash
# node_modulesを削除して再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. TypeScriptエラー
```bash
# 型定義を再生成
pnpm type-check

# VS Codeの場合、TypeScriptサーバーを再起動
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

#### 3. Viteのポートが使用中
```bash
# 別のポートで起動
pnpm dev -- --port 3000

# または既存プロセスを終了
lsof -ti:5173 | xargs kill
```

#### 4. pnpmがインストールされていない
```bash
# npm経由でインストール
npm install -g pnpm

# またはnpmを使用
npm install
npm run dev
```

## ✅ セットアップ完了チェックリスト

- [ ] Node.js v20以上がインストールされている
- [ ] Gitがインストールされている
- [ ] プロジェクトフォルダが作成されている
- [ ] 依存関係がインストールされている
- [ ] 開発サーバーが起動する（pnpm dev）
- [ ] ブラウザでOKボタンゲームが表示される
- [ ] OKボタンをクリックすると数字が増える
- [ ] コンソールにエラーが出ていない

## 🎯 次のステップ

1. **GitHub リポジトリ作成**
   ```bash
   git add .
   git commit -m "feat: プロジェクト初期設定とOKボタンゲーム"
   git remote add origin https://github.com/[username]/life-fulfillment-game.git
   git push -u origin main
   ```

2. **GitHub Pages設定**
   - リポジトリのSettings → Pages
   - Source: GitHub Actions を選択
   - `.github/workflows/deploy.yml`を作成（ROADMAP.md参照）

3. **開発開始**
   - ROADMAP.mdに従って開発を進める
   - 各タスク完了時にPRINCIPLES.mdを確認

---

**🎮 準備完了！素晴らしいゲームを作りましょう！**