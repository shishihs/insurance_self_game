# TECH_SPEC.md
**一人用カードゲーム - 技術仕様書**

## 🎯 技術スタック概要

### 確定技術構成
```
Frontend: Vue 3.5 + TypeScript 5.8 + Vite 5
Game Engine: Phaser 3.90 (カード操作・アニメーション・ドラッグ&ドロップ)
Audio: Web Audio API (ファイル不要の高品質サウンド生成)
State: Vue 3 Composition API + Domain Models
Architecture: DDD (Domain-Driven Design) + サービスレイヤーパターン
Styling: CSS Variables + レスポンシブデザイン
Build: Vite + TypeScript (strict mode)
Deploy: GitHub Pages + GitHub Actions
Testing: Vitest + Playwright (E2E) + CUIテストシステム
Development: CUIツール + パフォーマンス解析
```

## 📐 アーキテクチャ設計

### ドメイン駆動設計（DDD）構造
```
src/
├── domain/                    # ビジネスロジック層
│   ├── entities/              # エンティティ（メインビジネスオブジェクト）
│   │   ├── Card.ts           # カードエンティティ
│   │   ├── Deck.ts           # デッキエンティティ
│   │   └── Game.ts           # ゲームエンティティ（中核）
│   ├── valueObjects/          # 値オブジェクト（不変）
│   │   ├── CardPower.ts      # カードパワー
│   │   ├── Vitality.ts       # 活力（体力）
│   │   └── InsurancePremium.ts # 保険料
│   ├── services/              # ドメインサービス（ビジネスロジック）
│   │   ├── CardFactory.ts          # カード生成
│   │   ├── CardManager.ts          # カード管理
│   │   ├── ChallengeResolutionService.ts # チャレンジ解決
│   │   ├── GameStageManager.ts     # ステージ管理
│   │   ├── InsuranceExpirationManager.ts # 保険期限管理
│   │   └── InsurancePremiumCalculationService.ts # 保険料計算
│   ├── aggregates/            # 集約ルート
│   │   ├── challenge/         # チャレンジ集約
│   │   └── insurance/         # 保険集約
│   ├── repositories/          # リポジトリインターフェース
│   │   ├── IGameRepository.ts
│   │   ├── IChallengeRepository.ts
│   │   └── IInsuranceRepository.ts
│   └── types/                 # ドメイン型定義
│       ├── card.types.ts
│       ├── game.types.ts
│       └── tutorial.types.ts
├── game/                      # Phaserゲームエンジン統合層
│   ├── scenes/                # Phaserシーン
│   │   ├── BaseScene.ts       # ベースシーン
│   │   ├── PreloadScene.ts    # アセットロード
│   │   ├── MainMenuScene.ts   # メインメニュー
│   │   └── GameScene.ts       # メインゲーム
│   ├── systems/               # ゲームシステム
│   │   ├── DropZoneManager.ts # ドラッグ&ドロップシステム
│   │   ├── TutorialManager.ts # チュートリアルシステム
│   │   ├── SoundManager.ts    # サウンド管理
│   │   └── AnimationManager.ts # アニメーション管理
│   ├── ui/                    # ゲームUIコンポーネント
│   │   ├── TutorialOverlay.ts # チュートリアルオーバーレイ
│   │   ├── SaveLoadMenu.ts    # セーブ/ロードUI
│   │   └── StatisticsPanel.ts # 統計表示
│   ├── config/                # ゲーム設定
│   │   └── gameConfig.ts      # Phaser設定
│   └── renderers/             # レンダリング系
│       └── PhaserGameRenderer.ts # Phaserレンダラー
├── components/                # Vueコンポーネント層
│   ├── GameCanvas.vue         # メインゲームコンポーネント
│   ├── accessibility/         # アクセシビリティ対応
│   └── animations/            # UIアニメーション
├── cui/                       # CUI開発ツール層
│   ├── cli.ts                 # メインCLI
│   ├── PlaytestGameController.ts # テストコントローラー
│   ├── modes/                 # CUIモード
│   │   ├── DemoMode.ts        # デモモード
│   │   ├── BenchmarkMode.ts   # ベンチマークモード
│   │   └── DebugMode.ts       # デバッグモード
│   └── renderers/             # CUIレンダラー
│       └── InteractiveCUIRenderer.ts # インタラクティブレンダラー
├── controllers/               # コントローラー層
│   ├── GameController.ts      # メインゲームコントローラー
│   └── GameValidator.ts       # ゲーム状態検証
├── analytics/                 # 解析・統計系
│   ├── GameAnalytics.ts       # ゲーム解析
│   └── StatisticalTests.ts    # 統計テスト
├── performance/               # パフォーマンス系
│   ├── GamePerformanceAnalyzer.ts # パフォーマンス解析
│   └── MemoryProfiler.ts     # メモリプロファイラー
└── common/                    # 共通ユーティリティ
    ├── IdGenerator.ts         # ID生成ユーティリティ
    └── types/                 # 共通型定義
```

## 🏗️ ドメインモデル設計

### Card（カード）
```typescript
// domain/models/card/Card.ts
export abstract class Card {
  constructor(
    private readonly id: CardId,
    private readonly name: string,
    private readonly description: string,
    private readonly cardType: CardType
  ) {}

  abstract calculatePower(): number;
  
  abstract applyEffect(game: Game): void;
}

// domain/models/card/LifeCard.ts
export class LifeCard extends Card {
  constructor(
    id: CardId,
    name: string,
    description: string,
    private readonly power: number
  ) {
    super(id, name, description, CardType.Life);
  }

  calculatePower(): number {
    return this.power;
  }

  applyEffect(game: Game): void {
    // 基本的な人生カードは特殊効果なし
  }
}

// domain/models/card/InsuranceCard.ts
export class InsuranceCard extends Card {
  constructor(
    id: CardId,
    name: string,
    description: string,
    private readonly basePower: number,
    private readonly effect: CardEffect
  ) {
    super(id, name, description, CardType.Insurance);
  }

  calculatePower(): number {
    return this.basePower;
  }

  applyEffect(game: Game): void {
    this.effect.apply(game);
  }
}

// domain/models/card/types.ts
export enum CardType {
  Life = 'LIFE',           // 人生カード
  Insurance = 'INSURANCE', // 保険カード
  Challenge = 'CHALLENGE', // チャレンジカード
  Pitfall = 'PITFALL',     // 落とし穴カード
  Dream = 'DREAM'          // 夢カード
}

export interface CardEffect {
  apply(game: Game): void;
  getDescription(): string;
}
```

### Game（ゲーム）
```typescript
// domain/models/game/Game.ts
export class Game {
  private _state: GameState;
  private _stage: LifeStage;
  private _playerDeck: PlayerDeck;
  private _challengeDeck: ChallengeDeck;
  private _vitality: Vitality;
  private _score: Score;

  constructor(
    private readonly id: GameId,
    private readonly difficulty: Difficulty
  ) {
    this._state = GameState.NotStarted;
    this._stage = LifeStage.Youth; // 青年期
    this._playerDeck = PlayerDeck.createInitialDeck();
    this._challengeDeck = ChallengeDeck.create();
    this._vitality = new Vitality(20); // 初期活力
    this._score = Score.zero();
  }

  start(): void {
    if (this._state !== GameState.NotStarted) {
      throw new InvalidOperationError('Game already started');
    }
    
    this._playerDeck.shuffle();
    this._challengeDeck.shuffle();
    this._state = GameState.InProgress;
    this.emit(new GameStartedEvent(this.id));
  }

  attemptChallenge(challengeId: CardId, selectedCards: CardId[]): ChallengeResult {
    this.ensureInProgress();
    
    const challenge = this._challengeDeck.findChallenge(challengeId);
    const requiredPower = challenge.getRequiredPower(this._stage);
    const actualPower = this.calculatePower(selectedCards);
    
    if (actualPower >= requiredPower) {
      // 成功: 保険カードを獲得
      const insuranceCard = challenge.transformToInsurance();
      this._playerDeck.addCard(insuranceCard);
      this.emit(new ChallengeSucceededEvent(this.id, challengeId));
      return ChallengeResult.success(insuranceCard);
    } else {
      // 失敗: 活力を失う
      const vitalityLoss = requiredPower - actualPower;
      this._vitality.decrease(vitalityLoss);
      this.emit(new ChallengeFailedEvent(this.id, challengeId, vitalityLoss));
      return ChallengeResult.failure(vitalityLoss);
    }
  }

  advanceStage(): void {
    if (this._challengeDeck.isEmpty()) {
      this._stage = this._stage.next();
      this._challengeDeck.refillForStage(this._stage);
      this.addPitfallCard();
      this.emit(new StageAdvancedEvent(this.id, this._stage));
    }
  }
}

// domain/models/game/types.ts
export enum LifeStage {
  Youth = 'YOUTH',       // 青年期 20-30代
  Middle = 'MIDDLE',     // 中年期 30-50代
  Maturity = 'MATURITY'  // 充実期 50-65代
}

export enum Difficulty {
  Newcomer = 1,   // 新入社員
  Veteran = 2,    // 中堅社員
  Manager = 3,    // 管理職
  Executive = 4   // 経営者
}
```

### ドメインサービス
```typescript
// domain/services/GameService.ts
export class GameService {
  constructor(
    private readonly gameRepository: IGameRepository,
    private readonly shuffleService: DeckShuffleService
  ) {}

  async createNewGame(rules: GameRules): Promise<Game> {
    const gameId = GameId.generate();
    const game = new Game(gameId, rules);
    
    await this.gameRepository.save(game);
    return game;
  }

  async makeMove(gameId: GameId, move: Move): Promise<MoveResult> {
    const game = await this.gameRepository.findById(gameId);
    const result = game.processMove(move);
    
    await this.gameRepository.save(game);
    return result;
  }
}
```

## 🎮 UI/UX技術仕様

### Vue 3 コンポーネント構成
```typescript
// presentation/components/game/GameBoard.vue
<template>
  <div class="game-board">
    <div ref="phaserContainer" class="phaser-container" />
    <GameUI 
      :score="gameState.score"
      :moves="gameState.moves"
      @action="handleAction"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGame } from '@/presentation/composables/useGame'
import { initPhaserGame } from '@/infrastructure/game-engine'

const phaserContainer = ref<HTMLDivElement>()
const { gameState, executeMove } = useGame()

onMounted(() => {
  initPhaserGame(phaserContainer.value!, {
    onCardClick: (cardId) => executeMove({ type: 'PLAY_CARD', cardId }),
    onDeckClick: () => executeMove({ type: 'DRAW_CARD' })
  })
})
</script>
```

### Phaser 3 統合
```typescript
// infrastructure/game-engine/PhaserGameScene.ts
export class GameScene extends Phaser.Scene {
  private cardSprites: Map<string, CardSprite> = new Map()
  
  constructor(private gameAdapter: GameAdapter) {
    super({ key: 'GameScene' })
  }

  create() {
    this.setupBoard()
    this.createCardAnimations()
    this.setupInteractions()
  }

  private createCardAnimations() {
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: (tween) => {
        const value = tween.getValue()
        // カードフリップアニメーション
      }
    })
  }
}
```

### Pinia Store
```typescript
// presentation/stores/gameStore.ts
export const useGameStore = defineStore('game', () => {
  // State
  const currentGame = ref<GameDTO | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Services
  const gameService = inject(GameServiceKey)!

  // Actions
  async function startNewGame() {
    isLoading.value = true
    error.value = null
    
    try {
      const game = await gameService.createNewGame(defaultRules)
      currentGame.value = GameDTO.fromDomain(game)
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  async function playCard(cardId: string) {
    if (!currentGame.value) return
    
    const result = await gameService.makeMove(
      currentGame.value.id,
      { type: 'PLAY_CARD', cardId }
    )
    
    if (result.success) {
      currentGame.value = await gameService.getGame(currentGame.value.id)
    }
  }

  return {
    // State
    currentGame: readonly(currentGame),
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Computed
    score: computed(() => currentGame.value?.score ?? 0),
    isGameOver: computed(() => currentGame.value?.state === 'GAME_OVER'),
    
    // Actions
    startNewGame,
    playCard,
    drawCard
  }
})
```

## 🧪 テスト戦略

### 単体テスト
- **ドメインロジック**: Game.ts, Card.ts の純粋関数テスト
- **コントローラー**: GameController のフロー制御テスト
- **レンダラー**: MockRenderer でのインターフェーステスト

#### 統合テスト（実装済み）
- ✅ **CUI統合**: cui-playtest.mjs による実ゲームフロー確認
- ✅ **GUI統合**: unified-game-launcher.mjs GUI モードでの動作確認
- ✅ **依存関係**: GameController ⇄ GameRenderer ⇄ 各UI実装の接続確認
- ✅ **ドメイン共有**: CUI/GUI両方で同一 Game.ts ロジック使用確認

### ドメイン層テスト
```typescript
// domain/models/card/Card.test.ts
describe('Card', () => {
  it('should flip face up/down', () => {
    const card = new Card(
      CardId.generate(),
      Suit.Hearts,
      Rank.Ace
    )
    
    expect(card.isFaceUp).toBe(false)
    card.flip()
    expect(card.isFaceUp).toBe(true)
  })
  
  it('should match cards with same suit or rank', () => {
    const card1 = new Card(CardId.generate(), Suit.Hearts, Rank.Ace)
    const card2 = new Card(CardId.generate(), Suit.Hearts, Rank.King)
    const card3 = new Card(CardId.generate(), Suit.Spades, Rank.Ace)
    
    expect(card1.matches(card2)).toBe(true) // same suit
    expect(card1.matches(card3)).toBe(true) // same rank
  })
})
```

### 統合テスト
```typescript
// application/usecases/StartNewGame.test.ts
describe('StartNewGame UseCase', () => {
  it('should create and start a new game', async () => {
    const repository = new InMemoryGameRepository()
    const useCase = new StartNewGame(repository)
    
    const result = await useCase.execute({ rules: defaultRules })
    
    expect(result.success).toBe(true)
    expect(result.game).toBeDefined()
    expect(result.game.state).toBe('IN_PROGRESS')
  })
})
```

## 🚀 ビルド・デプロイ設定

### Vite設定
```typescript
// vite.config.ts
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
  base: '/solo-boardgame/', // GitHub Pages用
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          'phaser': ['phaser'],
          'vue': ['vue', 'pinia'],
        }
      }
    }
  }
})
```

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Type check
        run: pnpm type-check
        
      - name: Run tests
        run: pnpm test
        
      - name: Build
        run: pnpm build
        
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 📋 開発規約

### TypeScript設定
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"],
      "@domain/*": ["./src/domain/*"],
      "@application/*": ["./src/application/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@presentation/*": ["./src/presentation/*"]
    }
  }
}
```

### コーディング規約
- **命名規則**: 
  - クラス: PascalCase
  - インターフェース: IPascalCase
  - 関数・変数: camelCase
  - 定数: UPPER_SNAKE_CASE
  - ファイル: PascalCase (クラス), camelCase (その他)

- **ドメインモデル**:
  - 不変性を保つ（イミュータブル）
  - ビジネスロジックをモデルに集約
  - 副作用を避ける

- **依存性**:
  - 依存性逆転の原則を守る
  - ドメイン層は他の層に依存しない
  - インターフェースを通じた疎結合

## 🔧 開発環境セットアップ

### 必要なツール
- Node.js 20.x
- pnpm 8.x
- Git
- VS Code (推奨)

### 推奨VS Code拡張
- Vue - Official
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier
- UnoCSS

### 初回セットアップコマンド
```bash
# リポジトリクローン
git clone https://github.com/[username]/solo-boardgame.git
cd solo-boardgame

# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev

# 型チェック（別ターミナル）
pnpm type-check --watch

# テスト実行（別ターミナル）
pnpm test:watch
```

---

**重要**: この仕様書は生きたドキュメントです。プロジェクトの進化と共に更新し続けてください。