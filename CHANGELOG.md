# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 保険カード報酬システムの実装
- ドキュメント管理ガイドライン（CLAUDE.md）
- アーカイブディレクトリ構造（`.archive/`）

### Changed
- ディレクトリ構造を整理（docs/, scripts/をカテゴリ別に再編成）
- テストが全て通過するように修正（49/49）
- 不要な`console.log`を削除

### Fixed
- Windows環境でのテスト実行問題
- 手札上限を超えた場合の処理
- デッキ再シャッフル機能
- ターン進行時の統計更新

## [0.1.0] - 2025-01-26

### Added
- Phase 1 プロトタイプ完成
- 基本的なゲームループ実装
- カードシステム（ドロー、手札管理、捨て札）
- チャレンジシステム
- ステージ進行システム（青年期→中年期→充実期）
- Phaser 3とVue 3の統合
- GitHub Pagesへの自動デプロイ

### Technical Stack
- Vue 3 + TypeScript
- Phaser 3（ゲームエンジン）
- Vite（ビルドツール）
- UnoCSS（スタイリング）
- Vitest（テスティング）