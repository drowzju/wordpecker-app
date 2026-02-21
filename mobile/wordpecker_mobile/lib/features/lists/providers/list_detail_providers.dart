import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/local_cache_provider.dart';
import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../data/list_detail_api.dart';
import '../domain/models/local_stats.dart';
import '../domain/models/word_item.dart';




final listDetailApiProvider = Provider<ListDetailApi>((ref) {
  final config = ref.watch(serverConfigProvider).value;
  if (config == null) {
    throw StateError('服务器未配置');
  }

  final dio = Dio(
    BaseOptions(
      baseUrl: config.baseUrl,
      headers: {'user-id': config.userId},
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
    ),
  );
  dio.interceptors.add(createDioLogger());

  return ListDetailApi(dio);


});

final listWordsProvider = FutureProvider.family<List<WordItem>, String>((ref, listId) async {
  final cache = ref.read(localCacheProvider);
  final isSynced = await cache.isInitialSyncDone();
  if (isSynced) {
    final raw = await cache.loadWordsRaw(listId);
    if (raw.isNotEmpty) {
      return raw.map(WordItem.fromJson).toList();
    }
  }

  final api = ref.watch(listDetailApiProvider);
  return api.fetchWords(listId);
});

final listLocalStatsProvider = FutureProvider.family<LocalStats, String>((ref, listId) async {
  final cache = ref.read(localCacheProvider);
  final isSynced = await cache.isInitialSyncDone();
  if (isSynced) {
    final exerciseCount = await cache.countExercises(listId);
    final quizCount = await cache.countQuizzes(listId);
    return LocalStats(exerciseCount: exerciseCount, quizCount: quizCount);
  }

  final api = ref.watch(listDetailApiProvider);
  return api.fetchLocalStats(listId);
});


