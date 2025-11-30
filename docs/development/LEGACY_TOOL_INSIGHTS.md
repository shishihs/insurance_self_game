# Legacy Tool Insights & Safety Systems

> **Note**: This document preserves valuable insights and configurations from legacy tool directories (`.claude`, `.cursor`) that have been removed from the project root.

## 🔒 Claude Code Hooks System (Legacy)

The project previously used a hook system to protect against destructive commands and manage parallel development risks. While the `.claude` directory has been removed, the principles remain relevant.

### 🚨 Critical Safety Rules

**Prohibited Destructive Commands:**
- `rm -rf /`, `rm -rf ~`, `rm -rf $HOME` (Root/Home deletion)
- `dd if=/dev/zero of=/dev/sda` (Disk destruction)
- `:(){ :|:& };:` (Fork bomb)
- `chmod -R 000 /` (Permission destruction)
- `curl ... | bash` (Unverified script execution)

### ⚠️ Parallel Development Risks

**Git Safety Rules:**
- **Prohibited**: `git add .`, `git add -A`, `git add *` (Bulk adding files risks including unwanted changes)
- **Required**: Explicitly add specific files (e.g., `git add src/components/GameCanvas.vue`)

### 📋 Hook Functions (Reference)

1.  **Pre-Bash Hook**: Prevented dangerous git/npm commands.
2.  **Post-Bash Hook**: Logged command execution results.
3.  **Pre-Commit Hook**: Checked staged files for safety and secrets.
4.  **Task Complete Hook**: Suggested next steps upon task completion.

## 🖱️ Cursor Configuration (Legacy)

(If any specific rules were found in .cursor, they would be listed here. Currently preserving structure for reference.)

- **.cursorrules**: Typically contained project-specific context for the AI editor.
- **.cursor/ignore**: Files ignored by the editor's indexing.

---

**Usage**: Refer to these safety principles when configuring new AI agents or development tools.
