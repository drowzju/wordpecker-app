# WordPecker Mobile - Architecture Documentation

## 概述

本文档描述 WordPecker Mobile 的技术架构设计,采用 Clean Architecture 原则和 Feature-First 目录组织。

## 架构图

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     Flutter Application                      │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐      ┌──────────────┐     ┌──────────────┐
│ Presentation │      │   Domain     │     │     Data     │
│    Layer     │──────│    Layer     │─────│    Layer     │
└──────────────┘      └──────────────┘     └──────────────┘
        │                     │                     │
        │                     │          ┌──────────┴──────────┐
        │                     │          │                     │
        ▼                     ▼          ▼                     ▼
   ┌─────────┐         ┌──────────┐  ┌──────┐          ┌──────────┐
   │ Widgets │         │Use Cases │  │DAO   │          │Remote API│
   │Providers│         │Repository│  │Drift │          │   Dio    │
   └─────────┘         └──────────┘  └──────┘          └──────────┘
```

## 分层架构详解

### 1. Presentation Layer (表现层)

**职责**: 
- UI 组件渲染
- 用户交互处理
- 状态管理
- 路由导航

**主要组件**:

#### Pages (页面)
```dart
// 页面示例
class WordListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wordLists = ref.watch(wordListProvider);
    
    return wordLists.when(
      data: (lists) => ListView.builder(...),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => ErrorWidget(error),
    );
  }
}
```

#### Widgets (组件)
```dart
// 可复用组件
class WordCard extends StatelessWidget {
  final Word word;
  final VoidCallback onTap;
  
  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(word.value),
        subtitle: Text(word.meaning),
        onTap: onTap,
      ),
    );
  }
}
```

#### Providers (状态管理)
```dart
// Riverpod Provider
@riverpod
class WordListNotifier extends _$WordListNotifier {
  @override
  Future<List<WordList>> build() async {
    final repo = ref.read(wordListRepositoryProvider);
    return await repo.getAllLists();
  }
  
  Future<void> createList(String name) async {
    final repo = ref.read(wordListRepositoryProvider);
    await repo.createList(name);
    ref.invalidateSelf();
  }
}
```

**设计原则**:
- UI 与业务逻辑分离
- 使用 Riverpod 管理状态
- Widget 应保持简单,复杂逻辑放到 Provider
- 复用组件放在 `shared/widgets/`

---

### 2. Domain Layer (领域层)

**职责**:
- 定义业务规则
- 定义数据模型
- 定义 Repository 接口
- 包含业务用例 (Use Cases)

**主要组件**:

#### Models (领域模型)
```dart
@freezed
class WordList with _$WordList {
  const factory WordList({
    required int id,
    required String name,
    String? description,
    String? context,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _WordList;
  
  factory WordList.fromJson(Map<String, dynamic> json) =>
      _$WordListFromJson(json);
}
```

#### Repository Interfaces (仓储接口)
```dart
abstract class WordListRepository {
  Future<List<WordList>> getAllLists();
  Future<WordList> getListById(int id);
  Future<WordList> createList(String name, {String? description, String? context});
  Future<void> updateList(WordList list);
  Future<void> deleteList(int id);
}
```

#### Use Cases (业务用例)
```dart
class CreateWordListUseCase {
  final WordListRepository _repository;
  
  CreateWordListUseCase(this._repository);
  
  Future<WordList> execute({
    required String name,
    String? description,
    String? context,
  }) async {
    // 业务验证
    if (name.trim().isEmpty) {
      throw InvalidInputException('List name cannot be empty');
    }
    
    // 调用 Repository
    return await _repository.createList(
      name,
      description: description,
      context: context,
    );
  }
}
```

**设计原则**:
- 不依赖具体实现,只定义接口
- 包含业务验证逻辑
- 使用 freezed 生成不可变模型
- 领域模型独立于数据层

---

### 3. Data Layer (数据层)

**职责**:
- 实现 Repository 接口
- 管理数据源 (本地数据库/远程 API)
- 数据转换和缓存

**主要组件**:

#### Repository Implementation (仓储实现)
```dart
class WordListRepositoryImpl implements WordListRepository {
  final WordListDao _dao;
  final WordListRemoteDataSource? _remoteDataSource;
  
  WordListRepositoryImpl(this._dao, [this._remoteDataSource]);
  
  @override
  Future<List<WordList>> getAllLists() async {
    final dbLists = await _dao.getAllWordLists();
    return dbLists.map((e) => e.toDomainModel()).toList();
  }
  
  @override
  Future<WordList> createList(
    String name, {
    String? description,
    String? context,
  }) async {
    final companion = WordListsCompanion.insert(
      name: name,
      description: Value(description),
      context: Value(context),
    );
    
    final id = await _dao.insertWordList(companion);
    final created = await _dao.getWordListById(id);
    return created!.toDomainModel();
  }
}
```

#### Data Sources (数据源)

**本地数据源 (Drift DAO)**:
```dart
@DriftAccessor(tables: [WordLists])
class WordListDao extends DatabaseAccessor<AppDatabase> with _$WordListDaoMixin {
  WordListDao(AppDatabase db) : super(db);
  
  Future<List<WordListData>> getAllWordLists() {
    return select(wordLists).get();
  }
  
  Future<WordListData?> getWordListById(int id) {
    return (select(wordLists)..where((tbl) => tbl.id.equals(id)))
        .getSingleOrNull();
  }
  
  Future<int> insertWordList(WordListsCompanion entry) {
    return into(wordLists).insert(entry);
  }
}
```

**远程数据源 (Dio)**:
```dart
class WordListRemoteDataSource {
  final Dio _dio;
  
  WordListRemoteDataSource(this._dio);
  
  Future<List<WordListDto>> fetchWordLists() async {
    final response = await _dio.get('/api/lists');
    return (response.data as List)
        .map((e) => WordListDto.fromJson(e))
        .toList();
  }
}
```

**设计原则**:
- Repository 是数据源的抽象
- 本地数据源优先 (离线优先)
- 远程数据源可选 (联网增强)
- 数据层模型与领域模型分离

---

## 核心服务

### 1. Database Service (数据库服务)

```dart
@DriftDatabase(
  tables: [
    WordLists,
    Words,
    WordListRelations,
    Exercises,
    Quizzes,
    Templates,
    UserPreferences,
  ],
  daos: [
    WordListDao,
    WordDao,
    ExerciseDao,
    QuizDao,
    TemplateDao,
    PreferenceDao,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  
  @override
  int get schemaVersion => 1;
  
  static LazyDatabase _openConnection() {
    return LazyDatabase(() async {
      final dbFolder = await getApplicationDocumentsDirectory();
      final file = File(p.join(dbFolder.path, 'wordpecker.db'));
      return NativeDatabase(file);
    });
  }
}
```

### 2. AI Service (AI 服务)

```dart
abstract class AIService {
  Future<String> generateDefinition(String word, String context);
  Future<List<String>> generateExamples(String word, String meaning);
  Future<List<SimilarWord>> generateSimilarWords(String word);
  Future<String> generateReading(List<Word> words, String level);
}

// 混合实现
class HybridAIService implements AIService {
  final LocalAIService _local;
  final CloudAIService _cloud;
  final ConnectivityService _connectivity;
  
  @override
  Future<String> generateDefinition(String word, String context) async {
    // 优先使用云端
    if (await _connectivity.isConnected) {
      try {
        return await _cloud.generateDefinition(word, context);
      } catch (e) {
        // 降级到本地
        return await _local.generateDefinition(word, context);
      }
    }
    
    // 离线模式
    return await _local.generateDefinition(word, context);
  }
}
```

### 3. Audio Service (音频服务)

```dart
class AudioService {
  final FlutterTts _tts = FlutterTts();
  
  Future<void> initialize() async {
    await _tts.setLanguage('en-US');
    await _tts.setSpeechRate(0.5);
    await _tts.setVolume(1.0);
  }
  
  Future<void> speak(String text) async {
    await _tts.speak(text);
  }
  
  Future<void> stop() async {
    await _tts.stop();
  }
}
```

### 4. Dictionary Service (词典服务)

```dart
class DictionaryService {
  final DictionaryDao _localDao;
  final Dio _dio;
  
  Future<DictionaryEntry?> lookup(String word) async {
    // 1. 查询本地缓存
    final cached = await _localDao.findWord(word);
    if (cached != null) return cached.toDomainModel();
    
    // 2. 在线查询
    try {
      final response = await _dio.get(
        'https://api.dictionaryapi.dev/api/v2/entries/en/$word',
      );
      final entry = DictionaryEntry.fromJson(response.data[0]);
      
      // 3. 缓存结果
      await _localDao.cacheWord(entry.toDbModel());
      
      return entry;
    } catch (e) {
      return null;
    }
  }
}
```

---

## 状态管理 (Riverpod)

### Provider 层级结构

```
Global Providers (全局)
├── databaseProvider          # 数据库实例
├── dioProvider               # HTTP 客户端
├── connectivityProvider      # 网络连接状态
└── audioServiceProvider      # 音频服务

Feature Providers (功能)
├── wordListProvider          # 词汇表列表
├── wordListDetailProvider    # 词汇表详情
├── learnSessionProvider      # 学习会话
└── quizSessionProvider       # 测验会话
```

### Provider 示例

```dart
// 全局 Provider
@riverpod
AppDatabase database(DatabaseRef ref) {
  return AppDatabase();
}

@riverpod
Dio dio(DioRef ref) {
  return Dio(BaseOptions(
    baseURL: 'http://localhost:3000',
    connectTimeout: Duration(seconds: 5),
  ));
}

// Feature Provider
@riverpod
class WordListNotifier extends _$WordListNotifier {
  @override
  Future<List<WordList>> build() async {
    final db = ref.read(databaseProvider);
    final dao = db.wordListDao;
    final lists = await dao.getAllWordLists();
    return lists.map((e) => e.toDomainModel()).toList();
  }
  
  Future<void> createList(String name) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final db = ref.read(databaseProvider);
      await db.wordListDao.insertWordList(
        WordListsCompanion.insert(name: name),
      );
      return await db.wordListDao.getAllWordLists()
          .then((e) => e.map((e) => e.toDomainModel()).toList());
    });
  }
}
```

---

## 数据流程示例

### 创建词汇表流程

```
1. User Interaction
   ┌─────────────────────┐
   │ CreateListButton    │
   │ onPressed()         │
   └──────────┬──────────┘
              │
2. UI Layer  ▼
   ┌─────────────────────┐
   │ WordListNotifier    │
   │ createList(name)    │
   └──────────┬──────────┘
              │
3. Domain    ▼
   ┌─────────────────────┐
   │ CreateListUseCase   │
   │ execute()           │
   └──────────┬──────────┘
              │
4. Data      ▼
   ┌─────────────────────┐
   │ WordListRepository  │
   │ createList()        │
   └──────────┬──────────┘
              │
5. Database  ▼
   ┌─────────────────────┐
   │ WordListDao         │
   │ insertWordList()    │
   └──────────┬──────────┘
              │
6. Result    ▼
   ┌─────────────────────┐
   │ SQLite Database     │
   │ INSERT INTO...      │
   └─────────────────────┘
```

---

## 错误处理

### 错误类型

```dart
// 自定义异常
class AppException implements Exception {
  final String message;
  final String? code;
  
  AppException(this.message, [this.code]);
}

class NetworkException extends AppException {
  NetworkException(String message) : super(message, 'NETWORK_ERROR');
}

class DatabaseException extends AppException {
  DatabaseException(String message) : super(message, 'DATABASE_ERROR');
}

class ValidationException extends AppException {
  ValidationException(String message) : super(message, 'VALIDATION_ERROR');
}
```

### 错误处理策略

```dart
// Provider 中的错误处理
@riverpod
class WordListNotifier extends _$WordListNotifier {
  @override
  Future<List<WordList>> build() async {
    state = const AsyncValue.loading();
    
    state = await AsyncValue.guard(() async {
      try {
        final lists = await _repository.getAllLists();
        return lists;
      } on DatabaseException catch (e) {
        throw AppException('Database error: ${e.message}');
      } on NetworkException catch (e) {
        // 网络错误时使用缓存
        return await _repository.getCachedLists();
      } catch (e) {
        throw AppException('Unknown error: $e');
      }
    });
    
    return state.value ?? [];
  }
}

// UI 中的错误显示
Consumer(
  builder: (context, ref, child) {
    final wordLists = ref.watch(wordListProvider);
    
    return wordLists.when(
      data: (lists) => ListView.builder(...),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => ErrorView(
        message: error.toString(),
        onRetry: () => ref.refresh(wordListProvider),
      ),
    );
  },
)
```

---

## 性能优化

### 1. 数据库优化

```dart
// 创建索引
@override
List<Index> get indexes => [
  Index('idx_words_value', [words.value]),
  Index('idx_word_list_relations', [wordListRelations.wordId, wordListRelations.listId]),
];

// 批量插入
Future<void> batchInsertWords(List<Word> words) async {
  await batch((batch) {
    for (final word in words) {
      batch.insert(words, word);
    }
  });
}
```

### 2. UI 优化

```dart
// 使用 ListView.builder 懒加载
ListView.builder(
  itemCount: words.length,
  itemBuilder: (context, index) {
    return WordCard(word: words[index]);
  },
)

// 使用 const 构造函数
const WordCard({Key? key, required this.word}) : super(key: key);
```

### 3. 状态缓存

```dart
// Riverpod 自动缓存
@riverpod
Future<WordList> wordListDetail(WordListDetailRef ref, int listId) async {
  // 自动缓存结果
  return await ref.read(databaseProvider).wordListDao.getWordListById(listId);
}

// 手动缓存控制
@riverpod(keepAlive: true)  // 保持 Provider 活跃
class CachedData extends _$CachedData {
  // ...
}
```

---

## 测试策略

### 单元测试

```dart
void main() {
  late WordListRepository repository;
  late MockDatabase mockDb;
  
  setUp(() {
    mockDb = MockDatabase();
    repository = WordListRepositoryImpl(mockDb.wordListDao);
  });
  
  test('should return all word lists', () async {
    // Arrange
    when(mockDb.wordListDao.getAllWordLists())
        .thenAnswer((_) async => [testWordList]);
    
    // Act
    final result = await repository.getAllLists();
    
    // Assert
    expect(result, isA<List<WordList>>());
    expect(result.length, 1);
  });
}
```

### Widget 测试

```dart
void main() {
  testWidgets('WordListPage should display lists', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          wordListProvider.overrideWith((ref) => testWordLists),
        ],
        child: MaterialApp(home: WordListPage()),
      ),
    );
    
    expect(find.byType(WordCard), findsWidgets);
  });
}
```

---

## 总结

本架构设计具有以下优势:

✅ **清晰分层**: UI、业务逻辑、数据访问职责分明  
✅ **可测试性**: 每层可独立测试  
✅ **可维护性**: 模块化设计,易于扩展  
✅ **离线优先**: 本地数据库为主,云端为辅  
✅ **性能优秀**: Flutter 原生性能 + SQLite 高效查询  
✅ **类型安全**: Dart 强类型 + freezed 不可变模型  

遵循此架构,可以构建高质量的移动应用! 🚀
