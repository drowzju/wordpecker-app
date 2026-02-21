import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/local_cache_provider.dart';
import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../data/list_api.dart';
import '../domain/models/word_list.dart';



final listApiProvider = Provider<ListApi>((ref) {
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

  return ListApi(dio);


});

final listsProvider = FutureProvider<List<WordList>>((ref) async {
  final cache = ref.read(localCacheProvider);
  final raw = await cache.loadListsRaw();
  if (raw.isNotEmpty) {
    return raw.map(WordList.fromJson).toList();
  }

  final config = ref.watch(serverConfigProvider).value;
  if (config == null) {
    return [];
  }

  final api = ref.watch(listApiProvider);
  return api.fetchLists();
});


