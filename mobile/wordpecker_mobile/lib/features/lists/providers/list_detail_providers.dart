import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../data/list_detail_api.dart';
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
  final api = ref.watch(listDetailApiProvider);
  return api.fetchWords(listId);
});
