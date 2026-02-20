# WordPecker Mobile - Flutter Setup Guide

## 前置要求

### 1. 安装 Flutter SDK

#### Windows 安装步骤:

1. **下载 Flutter SDK**
   - 访问: https://docs.flutter.dev/get-started/install/windows
   - 下载最新稳定版 (建议 3.16.0 或更高版本)

2. **解压到合适位置**
   ```
   建议路径: C:\src\flutter
   避免使用带空格或中文的路径
   ```

3. **配置环境变量**
   - 打开"系统属性" -> "高级" -> "环境变量"
   - 在"用户变量"中添加 `Path`:
     ```
     C:\src\flutter\bin
     ```

4. **验证安装**
   ```bash
   flutter --version
   flutter doctor
   ```

### 2. 安装 Android Studio

1. **下载并安装 Android Studio**
   - 访问: https://developer.android.com/studio
   - 下载并安装最新版本

2. **安装必要组件**
   - Android SDK (自动安装)
   - Android SDK Command-line Tools
   - Android SDK Build-Tools
   - Android SDK Platform-Tools

3. **配置 Android 模拟器**
   ```
   Tools -> Device Manager -> Create Device
   推荐: Pixel 6 Pro API 34
   ```

4. **接受 Android 许可证**
   ```bash
   flutter doctor --android-licenses
   ```

### 3. 安装开发工具 (可选)

**推荐使用以下之一:**

- **Android Studio** (官方推荐)
  - 安装 Flutter 插件
  - 安装 Dart 插件

- **VS Code** (轻量级)
  - 安装 Flutter 扩展
  - 安装 Dart 扩展

## 创建 Flutter 项目

### 方法 1: 使用命令行

```bash
# 在项目根目录执行
cd d:\code\mywordpecker

# 创建 Flutter 项目
flutter create --org com.wordpecker --platforms android,ios wordpecker_mobile

# 进入项目目录
cd wordpecker_mobile

# 运行项目 (连接设备或启动模拟器)
flutter run
```

### 方法 2: 使用 Android Studio

1. File -> New -> New Flutter Project
2. 选择 Flutter Application
3. 项目名称: `wordpecker_mobile`
4. 项目位置: `d:\code\mywordpecker\wordpecker_mobile`
5. 组织名: `com.wordpecker`
6. Android 语言: Kotlin
7. iOS 语言: Swift

## 配置项目依赖

创建项目后，修改 `pubspec.yaml`:

```yaml
name: wordpecker_mobile
description: A personalized language-learning mobile app
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  
  # 状态管理
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0
  
  # 本地数据库
  drift: ^2.14.0
  sqlite3_flutter_libs: ^0.5.18
  path_provider: ^2.1.1
  path: ^1.8.3
  
  # 网络请求
  dio: ^5.4.0
  connectivity_plus: ^5.0.2
  
  # 本地存储
  shared_preferences: ^2.2.2
  hive_flutter: ^1.1.0
  
  # UI组件
  flutter_slidable: ^3.0.1
  cached_network_image: ^3.3.0
  
  # 语音功能
  flutter_tts: ^3.8.3
  
  # 工具库
  freezed_annotation: ^2.4.1
  json_annotation: ^4.8.1
  intl: ^0.18.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
  
  # 代码生成
  build_runner: ^2.4.7
  drift_dev: ^2.14.0
  riverpod_generator: ^2.3.0
  freezed: ^2.4.6
  json_serializable: ^6.7.1

flutter:
  uses-material-design: true
  
  # 资源文件
  # assets:
  #   - assets/images/
  #   - assets/dictionaries/
```

### 安装依赖

```bash
cd wordpecker_mobile
flutter pub get
```

## 验证环境

```bash
# 检查 Flutter 环境
flutter doctor -v

# 列出可用设备
flutter devices

# 运行项目
flutter run
```

### 预期输出 (flutter doctor)

```
[✓] Flutter (Channel stable, 3.16.0, on Microsoft Windows)
[✓] Android toolchain - develop for Android devices
[✓] Chrome - develop for the web
[✓] Android Studio (version 2023.1)
[✓] VS Code (version 1.85.0)
[✓] Connected device (3 available)
[✓] Network resources
```

## 常见问题

### 1. Flutter 命令未找到

**解决方法**: 确认 Flutter bin 目录已添加到 PATH 环境变量

### 2. Android licenses 未接受

```bash
flutter doctor --android-licenses
```
按 'y' 接受所有许可证

### 3. 找不到 Android SDK

在 Android Studio 中:
- File -> Settings -> Appearance & Behavior -> System Settings -> Android SDK
- 记下 SDK 位置
- 设置环境变量 `ANDROID_HOME`

### 4. 模拟器启动失败

**方法 1**: 使用 Android Studio 启动
- Tools -> Device Manager -> 点击播放按钮

**方法 2**: 使用命令行
```bash
# 列出模拟器
emulator -list-avds

# 启动模拟器
emulator -avd Pixel_6_Pro_API_34
```

### 5. 真机调试 (Android)

1. 手机开启开发者选项
   - 设置 -> 关于手机 -> 连续点击版本号7次
2. 开启 USB 调试
   - 设置 -> 开发者选项 -> USB 调试
3. 连接手机到电脑
4. 信任电脑
5. 运行 `flutter devices` 确认识别
6. 运行 `flutter run`

## 下一步

环境搭建完成后，继续以下步骤:

1. ✅ Flutter 环境验证通过
2. 📁 建立项目目录结构
3. 🗄️ 实现数据层 (Drift 数据库)
4. 🔧 实现业务逻辑层 (Services)
5. 🎨 实现 UI 层 (Pages & Widgets)
6. 🧪 测试与优化

## 参考资源

- Flutter 官方文档: https://docs.flutter.dev/
- Drift 文档: https://drift.simonbinder.eu/
- Riverpod 文档: https://riverpod.dev/
- Flutter 中文网: https://flutter.cn/

---

**准备好后,运行以下命令开始开发:**

```bash
cd d:\code\mywordpecker\wordpecker_mobile
flutter run
```
