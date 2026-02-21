import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/local_cache_provider.dart';
import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../../lists/domain/models/word_item.dart';
import '../../lists/domain/models/word_list.dart';
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
  final cache = ref.read(localCacheProvider);
  final listsRaw = await cache.loadListsRaw();
  if (listsRaw.isNotEmpty) {
    for (final listRaw in listsRaw) {
      final listId = listRaw['id']?.toString() ?? '';
      if (listId.isEmpty) continue;
      final wordsRaw = await cache.loadWordsRaw(listId);
      if (wordsRaw.isEmpty) continue;

      Map<String, dynamic>? matched;
      for (final word in wordsRaw) {
        final id = word['id']?.toString() ?? word['_id']?.toString() ?? '';
        if (id == wordId) {
          matched = Map<String, dynamic>.from(word as Map);
          break;
        }
      }

      if (matched != null) {
        final list = WordList.fromJson(Map<String, dynamic>.from(listRaw as Map));
        final item = WordItem.fromJson(matched);
        return WordDetail(
          id: item.id,
          value: item.value,
          definition: item.definition,
          dictionary: item.dictionary,
          contexts: [
            WordContextInfo(
              listId: list.id,
              listName: list.name,
              listContext: list.context,
              meaning: item.meaning,
              learnedPoint: item.learnedPoint,
            ),
          ],
          examples: const [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        );
      }
    }
  }

  final config = ref.watch(serverConfigProvider).value;
  if (config == null) {
    throw StateError('本地未找到该单词详情');
  }

  final api = ref.watch(wordDetailApiProvider);
  return api.fetchWordDetail(wordId);
});

