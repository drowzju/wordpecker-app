import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/local_cache_provider.dart';
import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../data/learn_api.dart';
import '../domain/models/learn_exercise.dart';


final learnApiProvider = Provider<LearnApi>((ref) {
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

  return LearnApi(dio);
});

const int _localExerciseCount = 15;

final learnExercisesProvider = FutureProvider.family<List<LearnExercise>, String>((ref, listId) async {
  final cache = ref.read(localCacheProvider);
  final isSynced = await cache.isInitialSyncDone();
  if (isSynced) {
    final raw = await cache.loadExercisesRaw(listId);
    if (raw.isNotEmpty) {
      final exercises = raw.map(LearnExercise.fromJson).toList();
      exercises.shuffle(Random());
      return exercises.take(_localExerciseCount).toList();
    }
  }

  final api = ref.watch(learnApiProvider);
  return api.startLocalLearning(listId);
});

