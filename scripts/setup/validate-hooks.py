#!/usr/bin/env python3
"""
Claude Code Hooks 検証スクリプト
危険なコマンドやファイル操作を検証するPythonスクリプト
"""

import json
import sys
import os
from datetime import datetime

# 危険なコマンドパターン
DANGEROUS_COMMANDS = [
    'rm -rf /',
    'dd if=',
    'mkfs',
    ':(){:|:&};:',  # Fork bomb
    'chmod -R 777 /',
    'chown -R',
    'kill -9 -1',
    '> /dev/sda',
    'wget | sh',
    'curl | bash'
]

# 保護されたファイル/ディレクトリ
PROTECTED_PATHS = [
    '.env',
    '.env.local',
    '.env.production',
    'node_modules/',
    '.git/',
    'dist/',
    'coverage/',
    '.claude/settings.json',
    'package-lock.json',
    'pnpm-lock.yaml',
    '/etc/',
    '/usr/',
    '/bin/',
    '/sbin/',
    '~/.ssh/',
    '~/.aws/'
]

def validate_command(command):
    """危険なコマンドをチェック"""
    for dangerous in DANGEROUS_COMMANDS:
        if dangerous in command:
            return False, f"危険なコマンドが検出されました: {dangerous}"
    return True, "OK"

def validate_file_path(file_path):
    """保護されたパスへのアクセスをチェック"""
    # ホームディレクトリを展開
    expanded_path = os.path.expanduser(file_path)
    
    for protected in PROTECTED_PATHS:
        protected_expanded = os.path.expanduser(protected)
        if protected in file_path or protected_expanded in expanded_path:
            return False, f"保護されたパスへのアクセス: {protected}"
    
    # 相対パスで親ディレクトリへの移動を防ぐ
    if '..' in file_path:
        return False, "親ディレクトリへの移動は許可されていません"
    
    return True, "OK"

def log_validation(event_type, data, result, message):
    """検証結果をログに記録"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        "data": data,
        "result": result,
        "message": message
    }
    
    log_dir = ".claude/logs"
    os.makedirs(log_dir, exist_ok=True)
    
    with open(f"{log_dir}/validation.log", "a") as f:
        f.write(json.dumps(log_entry) + "\n")

def main():
    """メイン処理"""
    try:
        # 標準入力からJSONデータを読み込む
        data = json.load(sys.stdin)
        
        tool_name = data.get('tool_name', '')
        tool_input = data.get('tool_input', {})
        
        # Bashコマンドの検証
        if tool_name == 'Bash':
            command = tool_input.get('command', '')
            is_valid, message = validate_command(command)
            
            log_validation('bash_command', command, is_valid, message)
            
            if not is_valid:
                print(f"❌ {message}", file=sys.stderr)
                sys.exit(2)  # Exit code 2 blocks the tool execution
        
        # ファイル操作の検証
        elif tool_name in ['Write', 'Edit', 'MultiEdit']:
            file_path = tool_input.get('file_path', '')
            is_valid, message = validate_file_path(file_path)
            
            log_validation('file_operation', file_path, is_valid, message)
            
            if not is_valid:
                print(f"❌ {message}", file=sys.stderr)
                sys.exit(2)  # Exit code 2 blocks the tool execution
        
        # 検証成功
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ 検証エラー: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()