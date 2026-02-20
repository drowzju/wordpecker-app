# WordPecker Mobile (Flutter)

这是 WordPecker 应用的 Flutter 移动端实现,采用嵌入式后端方案,支持完全离线运行。

## 📱 项目概述

将 WordPecker Web 应用改造为原生移动应用,主要特性:

- ✅ **跨平台**: 同时支持 Android 和 iOS
- 📦 **嵌入式后端**: 本地 SQLite 数据库,无需服务器
- 🔌 **离线优先**: 核心功能完全离线可用
- 🤖 **智能降级**: 联网时使用 AI 增强功能,离线时使用本地方案
- 🎨 **流畅体验**: Flutter 原生性能,Material Design

## 🚀 快速开始

### 前置要求

1. **Flutter SDK** (3.16.0+)
2. **Android Studio** (带 Android SDK)
3. **VS Code** 或其他 IDE (可选)

详细安装步骤见 [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### 创建项目

#### 方法 1: 自动脚本 (推荐)

```bash
cd mobile
CREATE_PROJECT.bat
```

#### 方法 2: 手动创建

```bash
# 创建项目
flutter create --org com.wordpecker --platforms android,ios wordpecker_mobile
cd wordpecker_mobile

# 安装依赖
flutter pub get

# 运行项目
flutter run
```

## 📁 项目结构

```
wordpecker_mobile/
├── lib/
│   ├── main.dart                  # 应用入口
│   ├── app.dart                   # 应用配置和路由
│   │
│   ├── core/                      # 核心模块
│   │   ├── database/              # Drift 数据库
│   │   │   ├── database.dart      # 数据库定义
│   │   │   ├── tables/            # 表定义
│   │   │   └── daos/              # 数据访问对象
│   │   │
│   │   ├── services/              # 核心服务
│   │   │   ├── ai_service.dart
│   │   │   ├── audio_service.dart
│   │   │   ├── dictionary_service.dart
│   │   │   └── connectivity_service.dart
│   │   │
│   │   ├── models/                # 数据模型
│   │   └── utils/                 # 工具类
│   │
│   ├── features/                  # 功能模块 (Clean Architecture)
│   │   ├── lists/                 # 词汇表
│   │   │   ├── presentation/      # UI 层
│   │   │   │   ├── pages/
│   │   │   │   ├── widgets/
│   │   │   │   └── providers/
│   │   │   ├── domain/            # 业务逻辑层
│   │   │   │   ├── models/
│   │   │   │   └── repositories/
│   │   │   └── data/              # 数据层
│   │   │       ├── datasources/
│   │   │       └── repositories/
│   │   │
│   │   ├── words/                 # 单词管理
│   │   ├── learn/                 # 学习模式
│   │   ├── quiz/                  # 测验模式
│   │   ├── reading/               # 阅读功能
│   │   ├── discovery/             # 发现新词
│   │   └── settings/              # 设置
│   │
│   └── shared/                    # 共享组件
│       ├── widgets/               # 通用 UI 组件
│       ├── providers/             # 全局 Provider
│       └── theme/                 # 主题配置
│
├── assets/                        # 资源文件
│   ├── images/
│   └── dictionaries/              # 本地词典(可选)
│
├── test/                          # 单元测试
└── integration_test/              # 集成测试
```

## 🏗️ 技术架构

### 核心技术栈

- **UI Framework**: Flutter 3.16+
- **状态管理**: Riverpod 2.4+
- **本地数据库**: Drift (SQLite)
- **网络请求**: Dio
- **语音合成**: Flutter TTS
- **代码生成**: build_runner, freezed, json_serializable

### 架构模式

采用 **Clean Architecture** + **Feature-First** 组织:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (UI, Widgets, State Management)        │
├─────────────────────────────────────────┤
│         Domain Layer                    │
│  (Business Logic, Use Cases)            │
├─────────────────────────────────────────┤
│         Data Layer                      │
│  (Repositories, Data Sources)           │
└─────────────────────────────────────────┘
```

### 数据流

```
User Interaction
    ↓
UI Widget (Consumer)
    ↓
Provider (Riverpod)
    ↓
Repository
    ↓
Data Source (Drift DAO / Dio API)
    ↓
Local DB / Remote API
```

## 📊 数据库设计

### 核心表

- `word_lists` - 词汇表
- `words` - 单词
- `word_list_relations` - 单词与列表关联(多对多)
- `exercises` - 练习记录
- `quizzes` - 测验记录
- `templates` - 模板
- `user_preferences` - 用户偏好

详细设计见方案文档中的 Schema 定义。

## 🔧 开发指南

### 运行项目

```bash
# 开发模式
flutter run

# 指定设备
flutter run -d <device_id>

# 热重载: 保存文件自动生效
# 热重启: 按 'R' 键
```

### 代码生成

```bash
# 生成 Drift, Riverpod, Freezed 代码
flutter pub run build_runner build

# 监听模式(自动生成)
flutter pub run build_runner watch
```

### 构建 APK

```bash
# Debug APK
flutter build apk --debug

# Release APK
flutter build apk --release

# App Bundle (Google Play)
flutter build appbundle --release
```

## 🎯 开发路线图

### MVP 阶段 (核心功能)

- [ ] 词汇表管理 (CRUD)
- [ ] 单词添加与查询
- [ ] 基础练习模式 (5种题型)
- [ ] 学习进度跟踪
- [ ] 本地数据库持久化
- [ ] 系统 TTS 语音

### 增强阶段

- [ ] 测验模式
- [ ] 单词详情页
- [ ] 模板库
- [ ] 数据导入/导出
- [ ] AI 定义生成(混合方案)
- [ ] 轻量阅读

### 高级阶段

- [ ] 发现新词
- [ ] 图片关联
- [ ] 云端同步(可选)
- [ ] iOS 版本发布
- [ ] 本地 AI 模型集成

## 📝 开发规范

### 命名约定

- **文件名**: `snake_case` (例: `word_list_page.dart`)
- **类名**: `PascalCase` (例: `WordListPage`)
- **变量/方法**: `camelCase` (例: `getWordList`)
- **常量**: `kPascalCase` 或 `SCREAMING_SNAKE_CASE`

### 目录组织

每个 Feature 包含:
```
feature/
├── presentation/     # UI 层
├── domain/          # 业务逻辑
└── data/            # 数据访问
```

### Provider 命名

```dart
// Notifier Provider
final wordListProvider = NotifierProvider<WordListNotifier, List<WordList>>(...);

// Future Provider
final wordDetailProvider = FutureProvider.family<Word, int>(...);

// Stream Provider
final wordStreamProvider = StreamProvider<List<Word>>(...);
```

## 🧪 测试

```bash
# 单元测试
flutter test

# 集成测试
flutter test integration_test

# 覆盖率
flutter test --coverage
```

## 📦 依赖说明

### 主要依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| flutter_riverpod | ^2.4.0 | 状态管理 |
| drift | ^2.14.0 | SQLite ORM |
| dio | ^5.4.0 | HTTP 客户端 |
| flutter_tts | ^3.8.3 | 文本转语音 |
| shared_preferences | ^2.2.2 | 键值存储 |

完整依赖列表见 `pubspec.yaml`

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](../LICENSE)

## 📞 联系方式

- 项目主页: https://github.com/baturyilmaz/wordpecker-app
- Issues: https://github.com/baturyilmaz/wordpecker-app/issues

---

## 相关文档

- [安装指南](./SETUP_GUIDE.md)
- [架构设计](./ARCHITECTURE.md) (待创建)
- [API 文档](./API.md) (待创建)
- [改造方案](../docs/android-flutter-migration-plan.md)

**开始开发前,请先阅读 [SETUP_GUIDE.md](./SETUP_GUIDE.md) 完成环境配置!**
