# Technical Debt & Future Tasks

This document tracks technical debt and future implementation tasks extracted from the source code.

## Application Services

### GameApplicationService.ts
- [ ] Implement `InsurancePremium.sum(premiums)` for total premium calculation. (Line 182)

## Architecture

### Presentation / Composables

#### useGameCards.ts
- [ ] Properly type `cardService` property instead of using `any`. (Line 91)

#### useGameState.ts
- [ ] Retrieve `maxVitality` directly from the `vitality` object instead of using a separate getter/value. (Line 138)

### ServiceFactory.ts (Creational Patterns)
The following methods need specific implementations (currently mock/placeholder):

- **Storage**
  - [ ] Implement IndexedDB storage for `GameRepository`.
  - [ ] Implement IndexedDB storage for `PlayerRepository`.
  - [ ] Implement IndexedDB storage for `CardRepository`.
  - [ ] Implement IndexedDB storage for `AuditLogRepository`.

- **Projections / Queries**
  - [ ] Implement query logic for `GameHistoryProjection`.
  - [ ] Implement statistics calculation for `StatisticsProjection`.

- **Domain Services**
  - [ ] Implement card drawing logic in `DeckService`.
  - [ ] Implement deck shuffling in `DeckService`.
  - [ ] Implement validation logic in `DeckService`.
  - [ ] Implement challenge creation in `ChallengeService`.
  - [ ] Implement challenge resolution in `ChallengeService`.
  - [ ] Implement validation in `ChallengeService`.
  - [ ] Implement game creation in `GameFactory`.
  - [ ] Implement template-based creation in `GameFactory`.

- **Monitoring**
  - [ ] Connect `PerformanceMonitor` to logging service.
  - [ ] Connect `ErrorTracker` to logging service.
  - [ ] Connect `AuditLogger` to logging service.

## Utils

### ErrorHandler.ts
- [ ] Integrate with actual UI notification components for error display. (Line 424)

## 解決済みの課題 (2025-12-07 解決)

### Type Safety Issues
- **useGameState.ts**:
  - `ComputedRef` 型の不整合エラー修正。
  - `GameAggregate` / `GameId` の型キャスト対応。
- **useGameCards.ts**:
  - `ComputedRef` 型エラー修正。
  - `ICardService` インターフェース定義修正。
- **ErrorHandler.ts**:
  - `ErrorInfo` 型定義の緩和と呼び出し側の修正。
- **GameApplicationService.ts**:
  - `DomainEvent` のユニオン型定義と `instanceof` 型ガードの導入。
  - `currentChallenge` 型定義修正。

### アーキテクチャ上の課題
- `GameApplicationService.ts` は `DomainEvent` を適切に扱うようになりました。

## 残存する課題

### アーキテクチャ上の課題
- `Game.ts` と `GameApplicationService.ts` の間の責任分担が依然として曖昧（長期的リファクタリングが必要）。
- テストコードが内部実装（`drawCardsSync`など）に依存している箇所がある。
