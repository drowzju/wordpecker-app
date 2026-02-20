# Git Workflow & Commit Guidelines

## 📋 项目结构

WordPecker 采用 **Monorepo** 结构,包含以下模块:

```
wordpecker/
├── backend/     # Node.js/Express 后端服务
├── frontend/    # React Web 前端
├── mobile/      # Flutter 移动应用
└── shared/      # 共享资源
```

---

## 🌳 分支策略

### 主要分支

- **`main`** (或 `master`) - 生产环境分支,只接受 merge,不直接提交
- **`develop`** - 开发主分支,所有功能分支从这里创建

### 功能分支命名

```bash
# 格式: <type>/<platform>-<feature-name>

# 移动端功能
feature/mobile-word-list
feature/mobile-learning-mode
fix/mobile-crash-on-startup

# Web前端功能
feature/web-reading-mode
feature/web-responsive-layout
fix/web-audio-playback

# 后端功能
feature/backend-quiz-api
feature/backend-ai-integration
fix/backend-memory-leak

# 跨平台功能
feature/shared-templates
feature/all-user-authentication
```

### 发布分支

```bash
# 格式: release/<platform>-v<version>

release/mobile-v1.0.0
release/web-v2.1.0
release/backend-v1.5.0
```

---

## 💬 提交消息规范

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (必需)

| Type | 说明 | 示例 |
|------|------|------|
| `mobile` | 移动端相关 | `mobile: add word list page` |
| `web` | Web前端相关 | `web: update word card component` |
| `backend` | 后端相关 | `backend: add quiz generation endpoint` |
| `shared` | 共享资源 | `shared: add new vocabulary templates` |
| `all` | 影响所有平台 | `all: update dependencies` |
| `docs` | 仅文档 | `docs: update architecture diagram` |
| `ci` | CI/CD配置 | `ci: add flutter build workflow` |
| `test` | 测试 | `test: add unit tests for word service` |
| `refactor` | 重构 | `refactor: improve code structure` |
| `fix` | 修复 | `fix: resolve memory leak` |
| `feat` | 新功能 | `feat: add dark mode support` |
| `chore` | 杂项 | `chore: update build scripts` |

### Scope (可选)

具体模块或功能区域:

```bash
mobile(ui)       # 移动端UI
mobile(db)       # 移动端数据库
mobile(service)  # 移动端服务层
web(style)       # Web样式
web(component)   # Web组件
backend(api)     # 后端API
backend(db)      # 后端数据库
```

### 示例

#### 单行提交
```bash
git commit -m "mobile: add word list page"
git commit -m "mobile(ui): implement learning mode interface"
git commit -m "mobile(db): setup drift database schema"
git commit -m "web: update word card component"
git commit -m "backend(api): add quiz generation endpoint"
git commit -m "shared: add new vocabulary templates"
git commit -m "docs: update mobile architecture diagram"
```

#### 多行提交
```bash
git commit -m "mobile(db): implement word repository

- Add WordRepository with CRUD operations
- Setup Drift database tables
- Add DAO for word list operations
- Include unit tests

Issue: #123"
```

---

## 🏷️ 版本标签 (Tags)

### 命名规范

不同平台使用不同前缀:

```bash
# 移动端版本
mobile-v1.0.0
mobile-v1.0.1
mobile-v1.1.0

# Web版本
web-v1.0.0
web-v2.0.0

# 后端版本
backend-v1.0.0
backend-v1.5.0

# 整体版本 (所有端同步发布)
v2.0.0
v3.0.0
```

### 创建标签

```bash
# 1. 确保在正确的提交上
git log --oneline

# 2. 创建标签
git tag mobile-v1.0.0 -m "Release mobile app version 1.0.0"

# 3. 推送标签
git push origin mobile-v1.0.0

# 或推送所有标签
git push --tags
```

---

## 🔄 工作流程

### 1. 开发新功能

```bash
# 1. 切换到 develop 分支并更新
git checkout develop
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/mobile-word-list

# 3. 进行开发
# ... 编写代码 ...

# 4. 提交更改
git add .
git commit -m "mobile: add word list page"

# 5. 推送到远程
git push origin feature/mobile-word-list

# 6. 创建 Pull Request
# 在 GitHub/GitLab 上创建 PR,目标分支: develop
```

### 2. 发布新版本

```bash
# 1. 从 develop 创建发布分支
git checkout develop
git checkout -b release/mobile-v1.0.0

# 2. 更新版本号
# 编辑: mobile/wordpecker_mobile/pubspec.yaml
# version: 1.0.0+1

# 3. 提交版本更新
git add .
git commit -m "mobile: bump version to 1.0.0"

# 4. 合并到 main
git checkout main
git merge release/mobile-v1.0.0

# 5. 打标签
git tag mobile-v1.0.0 -m "Release mobile app v1.0.0"

# 6. 推送
git push origin main --tags

# 7. 合并回 develop
git checkout develop
git merge main
git push origin develop

# 8. 删除发布分支
git branch -d release/mobile-v1.0.0
```

### 3. 紧急修复 (Hotfix)

```bash
# 1. 从 main 创建 hotfix 分支
git checkout main
git checkout -b hotfix/mobile-crash-fix

# 2. 修复问题
# ... 编写代码 ...

# 3. 提交
git add .
git commit -m "fix(mobile): resolve crash on startup"

# 4. 合并到 main
git checkout main
git merge hotfix/mobile-crash-fix

# 5. 打标签
git tag mobile-v1.0.1 -m "Hotfix: crash on startup"

# 6. 推送
git push origin main --tags

# 7. 合并回 develop
git checkout develop
git merge main
git push origin develop

# 8. 删除 hotfix 分支
git branch -d hotfix/mobile-crash-fix
```

---

## 🔧 Git 配置

### 自动配置

运行配置脚本:

```bash
cd d:\code\mywordpecker
scripts\setup-git.bat
```

### 手动配置

```bash
# 设置提交模板
git config commit.template .gitmessage

# 设置用户信息 (如果还没设置)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# 设置默认编辑器 (可选)
git config core.editor "code --wait"  # VS Code
```

---

## 📚 最佳实践

### ✅ 推荐做法

1. **频繁提交**: 小步快跑,每个逻辑改动一次提交
2. **清晰描述**: 提交消息要说明"做了什么"和"为什么"
3. **使用前缀**: 始终使用 `mobile`/`web`/`backend` 前缀
4. **功能分支**: 每个功能一个分支,不在 `develop` 上直接提交
5. **代码审查**: 所有代码通过 Pull Request 合并
6. **保持同步**: 开发前先 `git pull` 更新本地代码

### ❌ 避免做法

1. ❌ 直接在 `main` 分支提交
2. ❌ 模糊的提交消息: "fix bug", "update code"
3. ❌ 单次提交包含多个不相关的改动
4. ❌ 忘记添加平台前缀
5. ❌ 长期不合并的功能分支 (>2周)
6. ❌ Force push 到共享分支

---

## 🛠️ 常用命令

### 查看提交历史

```bash
# 查看所有提交
git log --oneline --graph --all

# 查看特定平台的提交
git log --oneline --grep="mobile"
git log --oneline --grep="web"
git log --oneline --grep="backend"

# 查看最近10条提交
git log --oneline -10
```

### 分支管理

```bash
# 列出所有分支
git branch -a

# 删除本地分支
git branch -d feature/mobile-word-list

# 删除远程分支
git push origin --delete feature/mobile-word-list

# 清理已删除的远程分支引用
git fetch --prune
```

### 标签管理

```bash
# 列出所有标签
git tag

# 列出特定平台的标签
git tag -l "mobile-*"
git tag -l "web-*"

# 删除本地标签
git tag -d mobile-v1.0.0

# 删除远程标签
git push origin --delete mobile-v1.0.0
```

---

## 📖 参考资源

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Semantic Versioning](https://semver.org/)

---

**遵循这些规范,让协作更高效! 🚀**
