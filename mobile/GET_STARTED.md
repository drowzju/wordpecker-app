# 🚀 WordPecker Mobile - 开始指南

欢迎使用 WordPecker Mobile! 这份文档将引导你完成从环境搭建到运行第一个应用的全过程。

---

## ⏱️ 预计时间

- **完全新手**: 2-3 小时 (包括安装 Android Studio 和配置)
- **有 Flutter 经验**: 10-15 分钟
- **已配置环境**: 5 分钟

---

## 📋 清单

在开始之前,请确认你有:

- [ ] Windows 10/11 电脑
- [ ] 至少 10GB 可用磁盘空间
- [ ] 良好的网络连接 (下载 SDK 和依赖)
- [ ] 管理员权限 (安装软件)

---

## 🎯 三步快速开始

### 第 1 步: 安装 Flutter 环境

#### 选项 A: 自动安装 (推荐新手)

1. 访问 Flutter 中文网: https://flutter.cn/
2. 下载 "Flutter SDK for Windows"
3. 运行安装程序,按提示操作
4. 安装完成后重启电脑

#### 选项 B: 手动安装 (推荐高级用户)

详细步骤请查看: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

**验证安装**:
```bash
# 打开命令提示符 (Win+R, 输入 cmd)
flutter doctor

# 预期输出:
# [✓] Flutter (Channel stable, 3.16.0)
# [✓] Android toolchain
# [✓] Android Studio
```

如果看到 ❌ 或 ⚠️,请按照提示修复。

---

### 第 2 步: 创建 Flutter 项目

两种方法任选其一:

#### 方法 1: 使用自动脚本 (推荐)

```bash
# 1. 进入 mobile 目录
cd d:\code\mywordpecker\mobile

# 2. 运行创建脚本
CREATE_PROJECT.bat

# 脚本会自动:
# - 检查 Flutter 环境
# - 创建项目
# - 配置依赖
# - 安装所有包
```

#### 方法 2: 手动创建

```bash
# 1. 进入 mobile 目录
cd d:\code\mywordpecker\mobile

# 2. 创建 Flutter 项目
flutter create --org com.wordpecker --platforms android,ios wordpecker_mobile

# 3. 进入项目
cd wordpecker_mobile

# 4. 手动配置 pubspec.yaml (参考 SETUP_GUIDE.md)

# 5. 安装依赖
flutter pub get
```

---

### 第 3 步: 运行应用

#### A. 使用 Android 模拟器

```bash
# 1. 启动 Android Studio
# 2. 打开 Device Manager (工具栏右上角手机图标)
# 3. 点击 ▶️ 启动一个模拟器

# 4. 在命令行运行
cd wordpecker_mobile
flutter run

# 等待编译完成 (首次需要 2-5 分钟)
```

#### B. 使用真机 (Android)

```bash
# 1. 手机开启开发者选项
#    设置 -> 关于手机 -> 连续点击"版本号"7次

# 2. 开启 USB 调试
#    设置 -> 开发者选项 -> USB 调试

# 3. 用 USB 线连接手机到电脑

# 4. 手机上点击"信任此电脑"

# 5. 验证连接
flutter devices

# 6. 运行应用
flutter run
```

#### 成功标志

当看到以下输出,说明成功了:

```
✓ Built build\app\outputs\flutter-apk\app-debug.apk (XX MB).
Launching lib\main.dart on <device> in debug mode...
```

手机/模拟器上会显示 WordPecker 应用!

---

## 🎉 恭喜!你已成功运行应用

现在你可以:

### 🔥 热重载 (Hot Reload)

在应用运行时:
1. 修改 Dart 代码
2. 保存文件 (Ctrl+S)
3. **自动刷新!** 无需重启应用

或者在终端按 `r` 键手动刷新

### 🔄 热重启 (Hot Restart)

如果热重载无效,按 `R` 键完全重启应用

### 🛑 停止应用

在终端按 `q` 键或 Ctrl+C

---

## 📚 下一步学习

### 1. 理解项目结构

```
wordpecker_mobile/
├── lib/
│   └── main.dart          # 应用入口,从这里开始
├── pubspec.yaml           # 依赖配置
├── android/               # Android 原生代码
└── ios/                   # iOS 原生代码
```

**重要文件**:
- `lib/main.dart` - 应用的起点
- `pubspec.yaml` - 项目配置和依赖

### 2. 修改第一个界面

打开 `lib/main.dart`,找到:

```dart
home: Scaffold(
  appBar: AppBar(
    title: Text('WordPecker'),
  ),
  body: Center(
    child: Text('Hello World'),  // 修改这里
  ),
),
```

改成:
```dart
child: Text('你好,WordPecker!'),
```

保存,看看应用是否自动更新!

### 3. 查看文档

| 文档 | 内容 |
|------|------|
| [README.md](./README.md) | 项目概述 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 技术架构 |
| [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) | 快速参考 |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | 实现状态 |

### 4. 开始开发

现在可以按照 [改造方案](../docs/android-flutter-migration-plan.md) 开始实现功能了!

建议顺序:
1. ✅ **阶段 1**: 框架搭建 (已完成)
2. 📊 **阶段 2**: 数据层实现
3. 🔧 **阶段 3**: 业务逻辑层
4. 🎨 **阶段 4**: UI 层
5. 🧪 **阶段 5**: 测试优化

---

## ❓ 常见问题

### Q1: flutter 命令未找到

**A**: 确认 Flutter bin 目录已添加到 PATH 环境变量

```bash
# 添加到 PATH (Windows):
# 我的电脑 -> 属性 -> 高级系统设置 -> 环境变量
# 在 Path 中添加: C:\src\flutter\bin
```

### Q2: Android licenses 未接受

**A**: 运行以下命令并全部输入 'y':
```bash
flutter doctor --android-licenses
```

### Q3: 模拟器启动失败

**A**: 
1. 打开 Android Studio
2. Tools -> Device Manager
3. 创建新设备: Pixel 6 Pro, API 34
4. 点击 ▶️ 启动

### Q4: 编译太慢

**A**: 首次编译需要 2-5 分钟,之后会快很多 (10-30秒)

### Q5: 出现错误怎么办

**A**: 
1. 运行 `flutter clean`
2. 运行 `flutter pub get`
3. 重新运行 `flutter run`
4. 如果还不行,查看错误信息并搜索解决方案

---

## 🆘 获取帮助

如果遇到问题:

1. **查看文档**: 先检查 `mobile/` 目录下的文档
2. **Flutter 官方文档**: https://docs.flutter.dev/
3. **Stack Overflow**: 搜索错误信息
4. **GitHub Issues**: 提交问题到项目仓库

---

## 🎓 学习资源

### Flutter 基础

- [Flutter 中文网](https://flutter.cn/)
- [Flutter Cookbook](https://docs.flutter.dev/cookbook)
- [Dart 语言教程](https://dart.dev/guides)

### 视频教程

- [Flutter 官方 YouTube 频道](https://www.youtube.com/@flutterdev)
- Flutter 中文社区视频教程

### 推荐阅读顺序

1. Dart 语言基础 (1-2天)
2. Flutter Widget 基础 (2-3天)
3. 状态管理 (Riverpod) (1-2天)
4. Drift 数据库 (1天)
5. 开始实际开发!

---

## ✅ 检查清单

完成以下项目后,你就可以开始开发了:

- [ ] Flutter 环境安装成功 (`flutter doctor` 全部通过)
- [ ] Android Studio 安装并配置
- [ ] 成功创建项目
- [ ] 成功运行 "Hello World"
- [ ] 热重载测试成功
- [ ] 阅读了项目文档
- [ ] 理解了项目结构
- [ ] 准备好开始编码!

---

**准备好了吗? 让我们开始构建 WordPecker Mobile! 🚀**

有任何问题,随时查看文档或寻求帮助。祝你开发顺利! 💪
