import 'package:hive_flutter/hive_flutter.dart';

class LocalCacheService {
  LocalCacheService._();

  static final LocalCacheService instance = LocalCacheService._();

  static const String _listsBoxName = 'lists';
  static const String _wordsBoxName = 'words';
  static const String _exercisesBoxName = 'exercises';
  static const String _quizzesBoxName = 'quizzes';
  static const String _pendingPointsBoxName = 'pending_points';
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
      Hive.openBox<dynamic>(_pendingPointsBoxName),
      Hive.openBox<dynamic>(_metaBoxName),
    ]);

    _initialized = true;
  }

  Box<dynamic> get _listsBox => Hive.box<dynamic>(_listsBoxName);
  Box<dynamic> get _wordsBox => Hive.box<dynamic>(_wordsBoxName);
  Box<dynamic> get _exercisesBox => Hive.box<dynamic>(_exercisesBoxName);
  Box<dynamic> get _quizzesBox => Hive.box<dynamic>(_quizzesBoxName);
  Box<dynamic> get _pendingPointsBox => Hive.box<dynamic>(_pendingPointsBoxName);
  Box<dynamic> get _metaBox => Hive.box<dynamic>(_metaBoxName);

  Future<void> _ensurePendingPointsBoxOpen() async {
    if (!Hive.isBoxOpen(_pendingPointsBoxName)) {
      await Hive.openBox<dynamic>(_pendingPointsBoxName);
    }
  }



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

  Future<List<Map<String, dynamic>>> loadPendingLearnedPoints(String listId) async {
    await _ensurePendingPointsBoxOpen();
    final raw = _pendingPointsBox.get(listId);
    if (raw is List) {
      return raw.map((item) => Map<String, dynamic>.from(item as Map)).toList();
    }
    return [];
  }

  Future<Map<String, List<Map<String, dynamic>>>> loadAllPendingLearnedPoints() async {
    await _ensurePendingPointsBoxOpen();
    final result = <String, List<Map<String, dynamic>>>{};
    for (final key in _pendingPointsBox.keys) {
      final listId = key?.toString() ?? '';
      if (listId.isEmpty) continue;
      final pending = await loadPendingLearnedPoints(listId);
      if (pending.isNotEmpty) {
        result[listId] = pending;
      }
    }
    return result;
  }

  Future<void> addPendingLearnedPoints(String listId, List<Map<String, dynamic>> results) async {
    if (listId.isEmpty || results.isEmpty) return;
    await _ensurePendingPointsBoxOpen();
    final existing = await loadPendingLearnedPoints(listId);
    await _pendingPointsBox.put(listId, [...existing, ...results]);
  }

  Future<void> clearPendingLearnedPoints(String listId) async {
    await _ensurePendingPointsBoxOpen();
    await _pendingPointsBox.delete(listId);
  }

  Future<void> applyLearnedPointChanges(String listId, List<Map<String, dynamic>> results) async {
    if (results.isEmpty) return;
    final raw = await loadWordsRaw(listId);
    if (raw.isEmpty) return;

    final changes = <String, int>{};
    for (final result in results) {
      final wordId = result['wordId']?.toString();
      final correct = result['correct'] == true;
      if (wordId == null || wordId.isEmpty) continue;
      changes[wordId] = (changes[wordId] ?? 0) + (correct ? 10 : -5);
    }

    if (changes.isEmpty) return;

    final updated = raw.map((word) {
      final id = word['id']?.toString() ?? '';
      if (id.isEmpty || !changes.containsKey(id)) {
        return word;
      }
      final current = (word['learnedPoint'] as num?)?.toInt() ?? 0;
      final next = (current + (changes[id] ?? 0)).clamp(0, 100);
      return {
        ...word,
        'learnedPoint': next,
      };
    }).toList();

    await saveWordsRaw(listId, updated);

    final lists = await loadListsRaw();
    if (lists.isEmpty) return;

    final listIndex = lists.indexWhere((item) => (item['id']?.toString() ?? '') == listId);
    if (listIndex < 0) return;

    final total = updated.length;
    final sum = updated.fold<int>(0, (acc, word) => acc + ((word['learnedPoint'] as num?)?.toInt() ?? 0));
    final average = total > 0 ? (sum / total).round() : 0;
    final mastered = updated.where((word) => ((word['learnedPoint'] as num?)?.toInt() ?? 0) >= 80).length;

    final target = Map<String, dynamic>.from(lists[listIndex] as Map);
    lists[listIndex] = {
      ...target,
      'wordCount': total,
      'averageProgress': average,
      'masteredWords': mastered,
    };

    await saveListsRaw(lists);
  }

}

