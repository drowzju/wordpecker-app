# WordPecker Mobile - Quick Reference

## 🚀 快速命令

### Flutter 常用命令

```bash
# 检查环境
flutter doctor -v

# 查看设备
flutter devices

# 运行应用
flutter run

# 运行到指定设备
flutter run -d <device_id>

# 热重载 (在运行时)
# 按 'r' 键

# 热重启 (在运行时)
# 按 'R' 键

# 构建 APK
flutter build apk --release

# 清理项目
flutter clean

# 获取依赖
flutter pub get

# 升级依赖
flutter pub upgrade
```

### 代码生成

```bash
# 生成代码 (Drift, Riverpod, Freezed)
flutter pub run build_runner build

# 删除旧代码重新生成
flutter pub run build_runner build --delete-conflicting-outputs

# 监听模式 (自动生成)
flutter pub run build_runner watch
```

---

## 📁 项目结构速查

```
lib/
├── main.dart                       # 应用入口
├── app.dart                        # 路由配置
│
├── core/                           # 核心功能
│   ├── database/
│   │   ├── database.dart           # Drift 数据库
│   │   ├── tables/                 # 表定义
│   │   │   ├── word_lists.dart
│   │   │   ├── words.dart
│   │   │   └── ...
│   │   └── daos/                   # DAO
│   │       ├── word_list_dao.dart
│   │       └── ...
│   │
│   ├── services/
│   │   ├── ai_service.dart
│   │   ├── audio_service.dart
│   │   ├── dictionary_service.dart
│   │   └── connectivity_service.dart
│   │
│   ├── models/                     # 数据模型
│   └── utils/                      # 工具类
│
├── features/                       # 功能模块
│   ├── lists/
│   │   ├── presentation/
│   │   │   ├── pages/
│   │   │   │   ├── lists_page.dart
│   │   │   │   └── list_detail_page.dart
│   │   │   ├── widgets/
│   │   │   └── providers/
│   │   ├── domain/
│   │   │   ├── models/
│   │   │   └── repositories/
│   │   └── data/
│   │       └── repositories/
│   │
│   ├── words/                      # 单词功能
│   ├── learn/                      # 学习模式
│   ├── quiz/                       # 测验模式
│   └── settings/                   # 设置
│
└── shared/                         # 共享
    ├── widgets/                    # 通用组件
    ├── providers/                  # 全局 Provider
    └── theme/                      # 主题
```

---

## 🎨 代码模板

### 1. 创建新 Page

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class MyPage extends ConsumerWidget {
  const MyPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Page'),
      ),
      body: Center(
        child: Text('Hello World'),
      ),
    );
  }
}
```

### 2. 创建 StatefulWidget

```dart
class MyStatefulPage extends ConsumerStatefulWidget {
  const MyStatefulPage({Key? key}) : super(key: key);

  @override
  ConsumerState<MyStatefulPage> createState() => _MyStatefulPageState();
}

class _MyStatefulPageState extends ConsumerState<MyStatefulPage> {
  @override
  void initState() {
    super.initState();
    // 初始化逻辑
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Page')),
      body: Container(),
    );
  }
}
```

### 3. 创建 Riverpod Provider

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'my_provider.g.dart';

@riverpod
class MyNotifier extends _$MyNotifier {
  @override
  Future<List<Item>> build() async {
    // 初始化数据
    return await _fetchItems();
  }
  
  Future<void> addItem(Item item) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _saveItem(item);
      return await _fetchItems();
    });
  }
}

// 使用 Provider
final myProvider = myNotifierProvider;
```

### 4. 创建 Freezed Model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'my_model.freezed.dart';
part 'my_model.g.dart';

@freezed
class MyModel with _$MyModel {
  const factory MyModel({
    required int id,
    required String name,
    String? description,
    @Default(false) bool isActive,
  }) = _MyModel;
  
  factory MyModel.fromJson(Map<String, dynamic> json) =>
      _$MyModelFromJson(json);
}
```

### 5. 创建 Drift Table

```dart
import 'package:drift/drift.dart';

class MyTable extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text().withLength(min: 1, max: 100)();
  TextColumn get description => text().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();
}
```

### 6. 创建 DAO

```dart
import 'package:drift/drift.dart';

@DriftAccessor(tables: [MyTable])
class MyDao extends DatabaseAccessor<AppDatabase> with _$MyDaoMixin {
  MyDao(AppDatabase db) : super(db);
  
  Future<List<MyTableData>> getAll() {
    return select(myTable).get();
  }
  
  Future<MyTableData?> getById(int id) {
    return (select(myTable)..where((tbl) => tbl.id.equals(id)))
        .getSingleOrNull();
  }
  
  Future<int> insertItem(MyTableCompanion entry) {
    return into(myTable).insert(entry);
  }
  
  Future<bool> updateItem(MyTableData item) {
    return update(myTable).replace(item);
  }
  
  Future<int> deleteItem(int id) {
    return (delete(myTable)..where((tbl) => tbl.id.equals(id))).go();
  }
}
```

---

## 🎯 常用 Widget

### 列表

```dart
// 简单列表
ListView(
  children: [
    ListTile(title: Text('Item 1')),
    ListTile(title: Text('Item 2')),
  ],
)

// 懒加载列表
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(title: Text(items[index]));
  },
)

// 分割线列表
ListView.separated(
  itemCount: items.length,
  itemBuilder: (context, index) => ListTile(title: Text(items[index])),
  separatorBuilder: (context, index) => Divider(),
)
```

### 卡片

```dart
Card(
  elevation: 4,
  margin: EdgeInsets.all(8),
  child: Padding(
    padding: EdgeInsets.all(16),
    child: Column(
      children: [
        Text('Title'),
        Text('Content'),
      ],
    ),
  ),
)
```

### 按钮

```dart
// 主按钮
ElevatedButton(
  onPressed: () {},
  child: Text('Click Me'),
)

// 文本按钮
TextButton(
  onPressed: () {},
  child: Text('Click Me'),
)

// 图标按钮
IconButton(
  icon: Icon(Icons.add),
  onPressed: () {},
)

// 浮动按钮
FloatingActionButton(
  onPressed: () {},
  child: Icon(Icons.add),
)
```

### 输入框

```dart
TextField(
  decoration: InputDecoration(
    labelText: 'Enter text',
    hintText: 'Type here',
    prefixIcon: Icon(Icons.search),
    border: OutlineInputBorder(),
  ),
  onChanged: (value) {
    print(value);
  },
)
```

### 对话框

```dart
// 显示对话框
showDialog(
  context: context,
  builder: (context) => AlertDialog(
    title: Text('Title'),
    content: Text('Message'),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: Text('Cancel'),
      ),
      TextButton(
        onPressed: () {
          // 处理确认
          Navigator.pop(context);
        },
        child: Text('OK'),
      ),
    ],
  ),
);
```

### SnackBar

```dart
ScaffoldMessenger.of(context).showSnackBar(
  SnackBar(
    content: Text('Message'),
    action: SnackBarAction(
      label: 'Undo',
      onPressed: () {},
    ),
  ),
);
```

---

## 🔧 常用 Riverpod 模式

### 读取 Provider

```dart
// 在 ConsumerWidget 中
@override
Widget build(BuildContext context, WidgetRef ref) {
  // 监听变化
  final value = ref.watch(myProvider);
  
  // 一次性读取
  final value2 = ref.read(myProvider);
  
  // 监听选择的值
  final name = ref.watch(myProvider.select((state) => state.name));
  
  return Container();
}
```

### AsyncValue 处理

```dart
final asyncValue = ref.watch(myAsyncProvider);

return asyncValue.when(
  data: (data) => ListView.builder(...),
  loading: () => CircularProgressIndicator(),
  error: (error, stack) => Text('Error: $error'),
);

// 或者使用 maybeWhen
return asyncValue.maybeWhen(
  data: (data) => MyWidget(data),
  orElse: () => CircularProgressIndicator(),
);
```

### Provider 刷新

```dart
// 刷新 Provider
ref.refresh(myProvider);

// 使 Provider 失效
ref.invalidate(myProvider);
```

---

## 🎨 主题和样式

### 定义主题

```dart
ThemeData(
  primarySwatch: Colors.blue,
  primaryColor: Colors.blue[700],
  scaffoldBackgroundColor: Colors.grey[100],
  appBarTheme: AppBarTheme(
    elevation: 0,
    backgroundColor: Colors.blue[700],
  ),
  cardTheme: CardTheme(
    elevation: 2,
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(8),
    ),
  ),
)
```

### 使用主题

```dart
// 获取主题
final theme = Theme.of(context);

// 使用主题颜色
Container(
  color: theme.primaryColor,
  child: Text(
    'Hello',
    style: theme.textTheme.headline6,
  ),
)
```

---

## 🐛 调试技巧

### 打印调试

```dart
print('Debug: $value');
debugPrint('Debug: $value');  // 更好,不会被截断
```

### 断点调试

在代码中设置断点,然后:
1. VS Code: F5 启动调试
2. Android Studio: Debug 模式运行

### Flutter DevTools

```bash
# 启动 DevTools
flutter pub global activate devtools
flutter pub global run devtools
```

### 性能分析

```dart
// 测量性能
import 'package:flutter/foundation.dart';

Timeline.startSync('my_operation');
// ... 代码
Timeline.finishSync();
```

---

## 📦 常用包

| 包名 | 用途 |
|------|------|
| flutter_riverpod | 状态管理 |
| drift | SQLite ORM |
| dio | HTTP 客户端 |
| flutter_tts | 文本转语音 |
| shared_preferences | 键值存储 |
| path_provider | 文件路径 |
| connectivity_plus | 网络状态 |
| freezed | 数据类生成 |
| json_serializable | JSON 序列化 |

---

## 🔗 有用的链接

- Flutter 官方文档: https://docs.flutter.dev/
- Dart 语言: https://dart.dev/
- Riverpod: https://riverpod.dev/
- Drift: https://drift.simonbinder.eu/
- Pub.dev: https://pub.dev/

---

**快速查找提示**: 使用 Ctrl+F 搜索关键词!
