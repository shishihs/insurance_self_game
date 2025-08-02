# バックアップとリカバリ手順

> **最終更新**: 2025/08/01  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 概要

insurance_gameプロジェクトのデータ保護とシステム復旧戦略を定義します。障害発生時の迅速な復旧と、重要なデータの確実な保護を実現します。

## 1. バックアップ戦略

### 基本方針
- **自動化優先**: 手動作業によるリスクを最小化
- **多重化**: 複数の場所・方法でデータを保護
- **定期検証**: バックアップデータの整合性を定期確認
- **迅速復旧**: RTO（目標復旧時間）とRPO（目標復旧ポイント）の最適化

### バックアップ対象
- **ソースコード**: GitHubリポジトリ
- **設定ファイル**: 環境設定、CI/CD設定
- **ドキュメント**: 技術文書、ユーザーマニュアル
- **依存関係情報**: package.json、package-lock.json
- **ビルド成果物**: 本番環境のデプロイ済みファイル

## 2. ソースコード保護

### 2.1 Git リポジトリのバックアップ

#### GitHub による自動バックアップ
- **プライマリ**: GitHub.com (https://github.com/shishihs/insurance_self_game)
- **レプリカ**: GitHub内部での冗長化
- **アクセス制御**: 適切な権限管理

#### 外部バックアップ設定
```bash
#!/bin/bash
# scripts/backup-repository.sh

REPO_URL="https://github.com/shishihs/insurance_self_game.git"
BACKUP_DIR="/backup/repositories"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/insurance_game_$DATE"

# リポジトリの完全バックアップ
git clone --mirror $REPO_URL "$BACKUP_PATH.git"

# アーカイブ作成
tar -czf "$BACKUP_PATH.tar.gz" -C "$BACKUP_DIR" "insurance_game_$DATE.git"

# 古いバックアップの削除（30日以上）
find $BACKUP_DIR -name "insurance_game_*.tar.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_PATH.tar.gz"
```

#### 自動実行設定
```yaml
# .github/workflows/backup.yml
name: Repository Backup

on:
  schedule:
    - cron: '0 2 * * *' # 毎日2:00に実行
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup Repository
        run: |
          # 外部バックアップサービスへの保存
          # 例: AWS S3, Google Cloud Storage など
```

### 2.2 ブランチ保護

#### 保護設定
- **masterブランチ**: 削除防止、強制プッシュ防止
- **タグ保護**: リリースタグの削除防止
- **履歴保護**: git historyの改変防止

```bash
# Git設定による保護
git config --global receive.denyDeletes true
git config --global receive.denyNonFastforwards true
```

## 3. 設定ファイルとビルド成果物

### 3.1 環境設定のバックアップ

#### GitHub Secrets のエクスポート
```javascript
// scripts/backup-secrets.js
const { Octokit } = require('@octokit/rest');

const backupSecrets = async () => {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN
  });

  const secrets = await octokit.actions.listRepoSecrets({
    owner: 'shishihs',
    repo: 'insurance_self_game'
  });

  // シークレット名の一覧を保存（値は取得不可）
  const secretsList = secrets.data.secrets.map(s => ({
    name: s.name,
    created_at: s.created_at,
    updated_at: s.updated_at
  }));

  console.log('Secrets backup:', JSON.stringify(secretsList, null, 2));
  return secretsList;
};
```

#### ワークフロー設定のバックアップ
```bash
# .github/workflows/ の定期バックアップ
#!/bin/bash
# scripts/backup-workflows.sh

WORKFLOW_DIR=".github/workflows"
BACKUP_DIR="backup/workflows"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# ワークフローファイルをアーカイブ
tar -czf "$BACKUP_DIR/workflows_$DATE.tar.gz" "$WORKFLOW_DIR"

echo "Workflows backed up: $BACKUP_DIR/workflows_$DATE.tar.gz"
```

### 3.2 ビルド成果物の保護

#### GitHub Pages の自動バックアップ
```javascript
// scripts/backup-build.js
const fs = require('fs');
const path = require('path');
const https = require('https');

const backupBuildArtifacts = async () => {
  const buildUrl = 'https://shishihs.github.io/insurance_self_game/';
  const backupDir = 'backup/build-artifacts';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // HTMLファイルのダウンロード
  const file = fs.createWriteStream(`${backupDir}/index_${timestamp}.html`);
  
  https.get(buildUrl, (response) => {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log(`Build artifact backed up: index_${timestamp}.html`);
    });
  });
};

// 定期実行
setInterval(backupBuildArtifacts, 24 * 60 * 60 * 1000); // 24時間間隔
```

## 4. データベースとログ

### 4.1 ゲームデータのバックアップ

#### ローカルストレージデータ
```javascript
// src/utils/backup-manager.ts
export class BackupManager {
  private static readonly BACKUP_KEY = 'insurance_game_backup';
  
  static createBackup(): BackupData {
    const gameState = localStorage.getItem('game_state');
    const userPreferences = localStorage.getItem('user_preferences');
    const statistics = localStorage.getItem('game_statistics');
    
    const backup: BackupData = {
      timestamp: Date.now(),
      version: '1.0.0',
      data: {
        gameState: gameState ? JSON.parse(gameState) : null,
        userPreferences: userPreferences ? JSON.parse(userPreferences) : null,
        statistics: statistics ? JSON.parse(statistics) : null
      }
    };
    
    // ローカルにバックアップを保存
    localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
    
    return backup;
  }
  
  static restoreBackup(backup: BackupData): boolean {
    try {
      if (backup.data.gameState) {
        localStorage.setItem('game_state', JSON.stringify(backup.data.gameState));
      }
      
      if (backup.data.userPreferences) {
        localStorage.setItem('user_preferences', JSON.stringify(backup.data.userPreferences));
      }
      
      if (backup.data.statistics) {
        localStorage.setItem('game_statistics', JSON.stringify(backup.data.statistics));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }
  
  static exportBackup(): string {
    const backup = this.createBackup();
    return JSON.stringify(backup, null, 2);
  }
  
  static importBackup(backupString: string): boolean {
    try {
      const backup = JSON.parse(backupString);
      return this.restoreBackup(backup);
    } catch (error) {
      console.error('Invalid backup format:', error);
      return false;
    }
  }
}

interface BackupData {
  timestamp: number;
  version: string;
  data: {
    gameState: any;
    userPreferences: any;
    statistics: any;
  };
}
```

### 4.2 ログデータの保管

#### アプリケーションログ
```javascript
// src/utils/log-manager.ts
class LogManager {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  
  log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      id: this.generateId()
    };
    
    this.logs.push(entry);
    
    // 最大数を超えたら古いログを削除
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // 重要なログは即座に外部保存
    if (level === 'error' || level === 'critical') {
      this.persistLog(entry);
    }
  }
  
  exportLogs(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      logs: this.logs
    }, null, 2);
  }
  
  private persistLog(entry: LogEntry) {
    // IndexedDB に保存
    const request = indexedDB.open('InsuranceGameLogs', 1);
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['logs'], 'readwrite');
      const store = transaction.objectStore('logs');
      store.add(entry);
    };
  }
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
  id: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';
```

## 5. リカバリ手順

### 5.1 完全システム復旧

#### GitHub リポジトリからの復旧
```bash
#!/bin/bash
# scripts/full-recovery.sh

echo "Starting full system recovery..."

# 1. リポジトリのクローン
git clone https://github.com/shishihs/insurance_self_game.git
cd insurance_self_game

# 2. 依存関係のインストール
npm install

# 3. 環境設定の復元
echo "Please restore the following secrets in GitHub:"
echo "- GITHUB_TOKEN (for deployment)"
echo "- Any other required environment variables"

# 4. テスト実行による検証
npm run test:run
npm run type-check
npm run lint

# 5. ビルドテスト
npm run build

# 6. デプロイテスト
echo "Ready for deployment. Run 'git push origin master' to deploy."

echo "Recovery completed successfully!"
```

### 5.2 部分復旧手順

#### 特定のファイルの復旧
```bash
# 特定のファイルを前のバージョンに戻す
git checkout HEAD~1 -- src/components/GameBoard.vue

# 特定のコミットから復旧
git checkout [COMMIT_HASH] -- src/utils/game-logic.ts

# 復旧内容をコミット
git add .
git commit -m "restore: 特定ファイルの復旧"
```

#### 設定ファイルの復旧
```bash
# package.json の復旧
git checkout HEAD~1 -- package.json package-lock.json

# 依存関係の再インストール
rm -rf node_modules
npm install

# 動作確認
npm run test:run
```

### 5.3 データ復旧

#### ゲームデータの復旧UI
```vue
<!-- src/components/admin/BackupRestore.vue -->
<template>
  <div class="backup-restore">
    <h2>データのバックアップと復元</h2>
    
    <div class="backup-section">
      <h3>バックアップ作成</h3>
      <button @click="createBackup" class="btn-primary">
        バックアップを作成
      </button>
      <button @click="downloadBackup" class="btn-secondary" :disabled="!backupData">
        バックアップをダウンロード
      </button>
    </div>
    
    <div class="restore-section">
      <h3>データ復元</h3>
      <input type="file" @change="loadBackupFile" accept=".json" />
      <button @click="restoreBackup" class="btn-primary" :disabled="!selectedBackup">
        データを復元
      </button>
    </div>
    
    <div class="backup-info" v-if="backupData">
      <h4>バックアップ情報</h4>
      <ul>
        <li>作成日時: {{ formatDate(backupData.timestamp) }}</li>
        <li>バージョン: {{ backupData.version }}</li>
        <li>ゲーム状態: {{ backupData.data.gameState ? '有り' : '無し' }}</li>
        <li>設定: {{ backupData.data.userPreferences ? '有り' : '無し' }}</li>
        <li>統計: {{ backupData.data.statistics ? '有り' : '無し' }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { BackupManager } from '@/utils/backup-manager';

const backupData = ref<BackupData | null>(null);
const selectedBackup = ref<BackupData | null>(null);

const createBackup = () => {
  backupData.value = BackupManager.createBackup();
  alert('バックアップが作成されました');
};

const downloadBackup = () => {
  if (!backupData.value) return;
  
  const dataStr = JSON.stringify(backupData.value, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `insurance_game_backup_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

const loadBackupFile = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      selectedBackup.value = JSON.parse(e.target?.result as string);
    } catch (error) {
      alert('無効なバックアップファイルです');
    }
  };
  reader.readAsText(file);
};

const restoreBackup = () => {
  if (!selectedBackup.value) return;
  
  const success = BackupManager.restoreBackup(selectedBackup.value);
  if (success) {
    alert('データが復元されました。ページを再読み込みしてください。');
    location.reload();
  } else {
    alert('データの復元に失敗しました');
  }
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ja-JP');
};
</script>
```

## 6. 障害対応手順

### 6.1 障害レベルの分類

#### レベル1: 軽微な障害
- **例**: 一部機能の不具合、パフォーマンス軽微劣化
- **対応時間**: 24時間以内
- **復旧手順**: 通常のバグ修正プロセス

#### レベル2: 重大な障害
- **例**: 主要機能の停止、サイトの一部アクセス不可
- **対応時間**: 4時間以内
- **復旧手順**: 緊急修正またはロールバック

#### レベル3: 致命的障害
- **例**: サイト全体のアクセス不可、データ損失
- **対応時間**: 1時間以内
- **復旧手順**: 即座のロールバックまたは緊急復旧

### 6.2 緊急復旧手順

#### サイト全体障害時
```bash
#!/bin/bash
# scripts/emergency-recovery.sh

echo "🚨 EMERGENCY RECOVERY STARTED"

# 1. 現在の状況確認
echo "Checking current deployment status..."
curl -I https://shishihs.github.io/insurance_self_game/

# 2. 最新の安定版タグを確認
LATEST_STABLE=$(git tag -l "v*" | sort -V | tail -1)
echo "Latest stable version: $LATEST_STABLE"

# 3. ロールバック実行
echo "Rolling back to $LATEST_STABLE..."
git checkout $LATEST_STABLE
git push origin HEAD:master --force

# 4. デプロイ状況監視
echo "Monitoring deployment..."
sleep 300 # 5分待機

# 5. 復旧確認
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://shishihs.github.io/insurance_self_game/)
if [ $HTTP_STATUS -eq 200 ]; then
    echo "✅ Recovery successful"
else
    echo "❌ Recovery failed - manual intervention required"
    exit 1
fi

echo "🎉 EMERGENCY RECOVERY COMPLETED"
```

### 6.3 データ損失時の対応

#### ローカルストレージデータ損失
```javascript
// src/utils/emergency-recovery.ts
export class EmergencyRecovery {
  static async recoverFromDataLoss() {
    console.log('Starting data loss recovery...');
    
    // 1. 既存のバックアップを確認
    const existingBackup = localStorage.getItem(BackupManager.BACKUP_KEY);
    if (existingBackup) {
      console.log('Found existing backup, attempting restore...');
      const success = BackupManager.importBackup(existingBackup);
      if (success) {
        console.log('✅ Data recovered from local backup');
        return true;
      }
    }
    
    // 2. デフォルト状態に初期化
    console.log('No valid backup found, initializing default state...');
    this.initializeDefaultState();
    
    // 3. ユーザーに通知
    this.notifyUser('データが失われました。新規ゲームとして開始します。');
    
    return false;
  }
  
  private static initializeDefaultState() {
    const defaultGameState = {
      currentPlayer: 1,
      gamePhase: 'start',
      score: 0,
      moves: []
    };
    
    const defaultPreferences = {
      sound: true,
      animations: true,
      theme: 'default'
    };
    
    localStorage.setItem('game_state', JSON.stringify(defaultGameState));
    localStorage.setItem('user_preferences', JSON.stringify(defaultPreferences));
    localStorage.setItem('game_statistics', JSON.stringify({}));
  }
  
  private static notifyUser(message: string) {
    // ユーザーへの通知（モーダル、トースト等）
    alert(message);
  }
}
```

## 7. バックアップ検証

### 7.1 定期検証スクリプト

#### バックアップ整合性チェック
```bash
#!/bin/bash
# scripts/verify-backups.sh

echo "Starting backup verification..."

BACKUP_DIR="backup"
ERRORS=0

# 1. リポジトリバックアップの検証
echo "Verifying repository backups..."
for backup in $BACKUP_DIR/repositories/*.tar.gz; do
    if [ -f "$backup" ]; then
        # アーカイブの整合性チェック
        if ! tar -tzf "$backup" > /dev/null 2>&1; then
            echo "❌ Corrupted backup: $backup"
            ((ERRORS++))
        else
            echo "✅ Valid backup: $backup"
        fi
    fi
done

# 2. 設定ファイルバックアップの検証
echo "Verifying configuration backups..."
for config_backup in $BACKUP_DIR/workflows/*.tar.gz; do
    if [ -f "$config_backup" ]; then
        if ! tar -tzf "$config_backup" > /dev/null 2>&1; then
            echo "❌ Corrupted config backup: $config_backup"
            ((ERRORS++))
        else
            echo "✅ Valid config backup: $config_backup"
        fi
    fi
done

# 3. 復旧テスト
echo "Testing recovery procedures..."
TEMP_DIR=$(mktemp -d)
git clone --quiet https://github.com/shishihs/insurance_self_game.git "$TEMP_DIR/test-recovery"

if [ -d "$TEMP_DIR/test-recovery" ]; then
    cd "$TEMP_DIR/test-recovery"
    
    # 依存関係のインストールテスト
    if npm install --silent; then
        echo "✅ Dependency installation test passed"
    else
        echo "❌ Dependency installation test failed"
        ((ERRORS++))
    fi
    
    # ビルドテスト
    if npm run build --silent; then
        echo "✅ Build test passed"
    else
        echo "❌ Build test failed"
        ((ERRORS++))
    fi
fi

# クリーンアップ
rm -rf "$TEMP_DIR"

# 結果報告
if [ $ERRORS -eq 0 ]; then
    echo "🎉 All backup verifications passed"
    exit 0
else
    echo "⚠️  Found $ERRORS errors in backup verification"
    exit 1
fi
```

### 7.2 復旧テスト

#### 月次復旧テスト
```bash
#!/bin/bash
# scripts/monthly-recovery-test.sh

echo "Starting monthly recovery test..."

# テスト環境の準備
TEST_DIR="test-recovery-$(date +%Y%m%d)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# 1. 完全復旧テスト
echo "Testing full recovery..."
git clone https://github.com/shishihs/insurance_self_game.git full-recovery
cd full-recovery

npm install
npm run test:run
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Full recovery test passed"
else
    echo "❌ Full recovery test failed"
    exit 1
fi

cd ..

# 2. 部分復旧テスト
echo "Testing partial recovery..."
git clone https://github.com/shishihs/insurance_self_game.git partial-recovery
cd partial-recovery

# 意図的にファイルを破損
echo "corrupted content" > src/App.vue

# 復旧実行
git checkout HEAD -- src/App.vue

# 動作確認
npm install --silent
npm run build --silent

if [ $? -eq 0 ]; then
    echo "✅ Partial recovery test passed"
else
    echo "❌ Partial recovery test failed"
    exit 1
fi

# クリーンアップ
cd ../../
rm -rf "$TEST_DIR"

echo "🎉 Monthly recovery test completed successfully"
```

## 8. チェックリスト

### バックアップ設定チェックリスト
- [ ] GitHubリポジトリの自動バックアップが設定されている
- [ ] 設定ファイルのバックアップが定期実行されている
- [ ] ビルド成果物のバックアップが動作している
- [ ] ローカルデータのバックアップ機能が実装されている
- [ ] バックアップデータの暗号化が適切に設定されている

### 復旧手順チェックリスト
- [ ] 完全復旧手順が文書化されている
- [ ] 部分復旧手順が明確に定義されている
- [ ] 緊急復旧スクリプトが準備されている
- [ ] データ復旧UIが実装されている
- [ ] 復旧時間目標（RTO）が設定されている

### 定期検証チェックリスト
- [ ] バックアップ整合性チェックが定期実行されている
- [ ] 復旧テストが月次で実施されている
- [ ] バックアップ容量と保存期間が管理されている
- [ ] 不要なバックアップの自動削除が設定されている
- [ ] バックアップ失敗時のアラートが設定されている

### 障害対応チェックリスト
- [ ] 障害レベルが明確に分類されている
- [ ] 各レベルの対応時間が定義されている
- [ ] 緊急連絡先が最新に保たれている
- [ ] エスカレーション手順が明確化されている
- [ ] 事後分析の手順が定義されている

## 関連ドキュメント

- [デプロイメント手順書](./DEPLOYMENT_PROCEDURES.md)
- [監視・アラート設定](./MONITORING_ALERTING.md)
- [インシデント対応手順](../development/INCIDENT_RESPONSE.md)
- [セキュリティガイドライン](../security/SECURITY_GUIDELINES.md)