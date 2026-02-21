import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../data/word_detail_api.dart';
import '../domain/models/word_detail.dart';

final wordDetailApiProvider = Provider<WordDetailApi>((ref) {
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

  return WordDetailApi(dio);
});

final wordDetailProvider = FutureProvider.family<WordDetail, String>((ref, wordId) async {
  final api = ref.watch(wordDetailApiProvider);
  return api.fetchWordDetail(wordId);
});
