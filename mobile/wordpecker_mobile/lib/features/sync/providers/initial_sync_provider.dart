import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


import '../../../core/providers/local_cache_provider.dart';
import '../../lists/providers/list_providers.dart';
import '../../lists/providers/list_detail_providers.dart';
import '../../quiz/providers/quiz_providers.dart';
import '../../words/providers/word_detail_providers.dart';



class SyncProgress {
  final String stage;
  final int current;
  final int total;
  final String message;
  final double progress;
  final bool done;
  final String? error;
  final DateTime? lastSyncAt;

  const SyncProgress({
    required this.stage,
    required this.current,
    required this.total,
    required this.message,
    required this.progress,
    required this.done,
    this.error,
    this.lastSyncAt,
  });

  factory SyncProgress.idle({DateTime? lastSyncAt}) => SyncProgress(
        stage: 'idle',
        current: 0,
        total: 0,
        message: '等待同步',
        progress: 0,
        done: false,
        lastSyncAt: lastSyncAt,
      );

  factory SyncProgress.running({
    required String message,
    required int current,
    required int total,
  }) {
    final progress = total > 0 ? current / total.toDouble() : 0.0;
    return SyncProgress(
      stage: 'syncing',
      current: current,
      total: total,
      message: message,
      progress: progress,
      done: false,
    );
  }


  factory SyncProgress.completed({DateTime? lastSyncAt}) => SyncProgress(
        stage: 'completed',
        current: 1,
        total: 1,
        message: '同步完成',
        progress: 1,
        done: true,
        lastSyncAt: lastSyncAt,
      );

  factory SyncProgress.failed(String error) => SyncProgress(
        stage: 'failed',
        current: 0,
        total: 0,
        message: '同步失败',
        progress: 0,
        done: false,
        error: error,
      );
}

class SyncMeta {
  final bool isSynced;
  final DateTime? lastSyncAt;

  const SyncMeta({required this.isSynced, required this.lastSyncAt});
}

final syncMetaProvider = FutureProvider<SyncMeta>((ref) async {
  final cache = ref.read(localCacheProvider);
  final synced = await cache.isInitialSyncDone();
  final lastSyncAt = await cache.getLastSyncAt();
  return SyncMeta(isSynced: synced, lastSyncAt: lastSyncAt);
});

final pendingSyncProvider = AsyncNotifierProvider<PendingSyncNotifier, void>(
  PendingSyncNotifier.new,
);

class PendingSyncNotifier extends AsyncNotifier<void> {
  @override
  Future<void> build() async {}

  Future<int> syncPendingLearnedPoints() async {
    state = const AsyncValue.loading();
    try {
      final cache = ref.read(localCacheProvider);
      final pending = await cache.loadAllPendingLearnedPoints();
      if (pending.isEmpty) {
        state = const AsyncValue.data(null);
        return 0;
      }

      final api = ref.read(quizApiProvider);
      int total = 0;
      for (final entry in pending.entries) {
        await api.updateLearnedPoints(entry.key, entry.value);
        total += entry.value.length;
        await cache.clearPendingLearnedPoints(entry.key);
      }

      state = const AsyncValue.data(null);
      return total;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      rethrow;
    }
  }
}

final initialSyncProvider = AsyncNotifierProvider<InitialSyncNotifier, SyncProgress>(
  InitialSyncNotifier.new,
);


class InitialSyncNotifier extends AsyncNotifier<SyncProgress> {
  bool _syncing = false;

  @override
  Future<SyncProgress> build() async {
    final cache = ref.read(localCacheProvider);
    final done = await cache.isInitialSyncDone();
    final lastSyncAt = await cache.getLastSyncAt();
    return done ? SyncProgress.completed(lastSyncAt: lastSyncAt) : SyncProgress.idle(lastSyncAt: lastSyncAt);
  }

  Future<void> startFullSync() async {
    if (_syncing) return;
    _syncing = true;
    final cache = ref.read(localCacheProvider);
    try {
      state = AsyncData(SyncProgress.running(message: '正在拉取词表...', current: 0, total: 1));
      final listApi = ref.read(listApiProvider);
      final listsRaw = await listApi.fetchListsRaw();
      await cache.saveListsRaw(listsRaw);

      final total = listsRaw.length;
      int current = 0;

      final detailApi = ref.read(listDetailApiProvider);
      final wordDetailApi = ref.read(wordDetailApiProvider);
      for (final list in listsRaw) {
        final listId = list['id']?.toString() ?? '';
        if (listId.isEmpty) continue;

        state = AsyncData(
          SyncProgress.running(
            message: '同步 ${list['name'] ?? '词表'} (${current + 1}/$total)',
            current: current,
            total: total,
          ),
        );

        final words = await detailApi.fetchWordsRaw(listId);
        final exercises = await detailApi.fetchExercisesRaw(listId);
        final quizzes = await detailApi.fetchQuizzesRaw(listId);

        final wordsWithExamples = words.where((word) {
          final examples = word['examples'];
          return examples is List && examples.isNotEmpty;
        }).length;
        debugPrint('Sync list=$listId words=${words.length} withExamples=$wordsWithExamples');

        await cache.saveWordsRaw(listId, words);
        await cache.saveExercisesRaw(listId, exercises);
        await cache.saveQuizzesRaw(listId, quizzes);

        for (final word in words) {
          final wordId = word['id']?.toString() ?? word['_id']?.toString() ?? '';
          if (wordId.isEmpty) continue;
          try {
            final detailRaw = await wordDetailApi.fetchWordDetailRaw(wordId);
            final detailMap = Map<String, dynamic>.from(detailRaw);
            final examples = detailMap['examples'];
            final exampleCount = examples is List ? examples.length : 0;
            debugPrint('WordDetail sync word=$wordId examples=$exampleCount');
            await cache.saveWordDetailRaw(wordId, detailMap);
          } catch (error) {
            debugPrint('WordDetail sync failed word=$wordId error=$error');
          }
        }


        current += 1;
        state = AsyncData(
          SyncProgress.running(
            message: '已同步 $current/$total 个词表',
            current: current,
            total: total,
          ),
        );
      }


      await cache.setInitialSyncDone(true);
      final now = DateTime.now();
      await cache.setLastSyncAt(now);
      ref.invalidate(syncMetaProvider);

      state = AsyncData(SyncProgress.completed(lastSyncAt: now));

    } catch (error) {
      state = AsyncData(SyncProgress.failed(error.toString()));
    } finally {
      _syncing = false;
    }
  }
}
