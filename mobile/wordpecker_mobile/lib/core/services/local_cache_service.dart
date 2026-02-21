import 'package:hive_flutter/hive_flutter.dart';

class LocalCacheService {
  LocalCacheService._();

  static final LocalCacheService instance = LocalCacheService._();

  static const String _listsBoxName = 'lists';
  static const String _wordsBoxName = 'words';
  static const String _exercisesBoxName = 'exercises';
  static const String _quizzesBoxName = 'quizzes';
  static const String _metaBoxName = 'meta';

  static const String _listsKey = 'all';
  static const String _initialSyncKey = 'initial_sync_done';
  static const String _lastSyncAtKey = 'last_sync_at';

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized) return;
    await Hive.initFlutter();
    await Future.wait([
      Hive.openBox<dynamic>(_listsBoxName),
      Hive.openBox<dynamic>(_wordsBoxName),
      Hive.openBox<dynamic>(_exercisesBoxName),
      Hive.openBox<dynamic>(_quizzesBoxName),
      Hive.openBox<dynamic>(_metaBoxName),
    ]);
    _initialized = true;
  }

  Box<dynamic> get _listsBox => Hive.box<dynamic>(_listsBoxName);
  Box<dynamic> get _wordsBox => Hive.box<dynamic>(_wordsBoxName);
  Box<dynamic> get _exercisesBox => Hive.box<dynamic>(_exercisesBoxName);
  Box<dynamic> get _quizzesBox => Hive.box<dynamic>(_quizzesBoxName);
  Box<dynamic> get _metaBox => Hive.box<dynamic>(_metaBoxName);

  Future<void> saveListsRaw(List<Map<String, dynamic>> lists) async {
    await _listsBox.put(_listsKey, lists);
  }

  Future<List<Map<String, dynamic>>> loadListsRaw() async {
    final raw = _listsBox.get(_listsKey);
    if (raw is List) {
      return raw.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    }
    return [];
  }

  Future<void> saveWordsRaw(String listId, List<Map<String, dynamic>> words) async {
    await _wordsBox.put(listId, words);
  }

  Future<List<Map<String, dynamic>>> loadWordsRaw(String listId) async {
    final raw = _wordsBox.get(listId);
    if (raw is List) {
      return raw.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    }
    return [];
  }

  Future<void> saveExercisesRaw(String listId, List<Map<String, dynamic>> exercises) async {
    await _exercisesBox.put(listId, exercises);
  }

  Future<List<Map<String, dynamic>>> loadExercisesRaw(String listId) async {
    final raw = _exercisesBox.get(listId);
    if (raw is List) {
      return raw.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    }
    return [];
  }

  Future<void> saveQuizzesRaw(String listId, List<Map<String, dynamic>> quizzes) async {
    await _quizzesBox.put(listId, quizzes);
  }

  Future<List<Map<String, dynamic>>> loadQuizzesRaw(String listId) async {
    final raw = _quizzesBox.get(listId);
    if (raw is List) {
      return raw.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    }
    return [];
  }

  Future<int> countExercises(String listId) async {
    final exercises = await loadExercisesRaw(listId);
    return exercises.length;
  }

  Future<int> countQuizzes(String listId) async {
    final quizzes = await loadQuizzesRaw(listId);
    return quizzes.length;
  }

  Future<void> setInitialSyncDone(bool done) async {
    await _metaBox.put(_initialSyncKey, done);
  }

  Future<bool> isInitialSyncDone() async {
    final value = _metaBox.get(_initialSyncKey);
    return value == true;
  }

  Future<void> setLastSyncAt(DateTime time) async {
    await _metaBox.put(_lastSyncAtKey, time.toIso8601String());
  }

  Future<DateTime?> getLastSyncAt() async {
    final raw = _metaBox.get(_lastSyncAtKey);
    if (raw is String) {
      return DateTime.tryParse(raw);
    }
    return null;
  }
}
