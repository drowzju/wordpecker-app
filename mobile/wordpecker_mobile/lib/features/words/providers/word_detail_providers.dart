import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
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

bool _hasExamples(Map<String, dynamic> raw) {
  final examplesRaw = raw['examples'];
  return examplesRaw is List && examplesRaw.isNotEmpty;
}

Map<String, dynamic> _buildLocalDetailMap({
  required WordList list,
  required WordItem item,
  required Map<String, dynamic> matched,
}) {
  return {
    'id': item.id,
    'value': item.value,
    'contexts': [
      {
        'listId': list.id,
        'listName': list.name,
        'listContext': list.context,
        'meaning': item.meaning,
        'learnedPoint': item.learnedPoint,
      },
    ],
    'definition': item.definition,
    'dictionary': item.dictionary,
    'examples': matched['examples'] ?? const [],
    'created_at': item.createdAt.toIso8601String(),
    'updated_at': item.updatedAt.toIso8601String(),
  };
}

final wordDetailProvider = FutureProvider.family<WordDetail, String>((ref, wordId) async {
  final cache = ref.read(localCacheProvider);
  final cachedDetail = await cache.loadWordDetailRaw(wordId);
  final config = ref.watch(serverConfigProvider).value;

  if (cachedDetail != null) {
    final examples = cachedDetail['examples'];
    final count = examples is List ? examples.length : 0;
    debugPrint('WordDetail cache word=$wordId examples=$count');
    if (_hasExamples(cachedDetail)) {
      debugPrint('WordDetail source=cache word=$wordId');
      return WordDetail.fromJson(cachedDetail);
    }
  }



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
        final detailMap = _buildLocalDetailMap(list: list, item: item, matched: matched);
        final examples = detailMap['examples'];
        final count = examples is List ? examples.length : 0;
        debugPrint('WordDetail local word=$wordId examples=$count list=$listId');
        await cache.saveWordDetailRaw(wordId, detailMap);
        debugPrint('WordDetail source=remote word=$wordId');
        return WordDetail.fromJson(detailMap);

      }

    }
  }

  if (config != null) {
    final api = ref.watch(wordDetailApiProvider);
    try {
      final detailRaw = await api.fetchWordDetailRaw(wordId);
      final detailMap = Map<String, dynamic>.from(detailRaw);
      try {
        final similarRaw = await api.fetchSimilarWords(wordId, contextIndex: 0);
        final similarWords = similarRaw['similar_words'];
        if (similarWords is Map) {
          detailMap['similar_words'] = Map<String, dynamic>.from(similarWords as Map);
          if (similarRaw['context'] is String) {
            detailMap['context'] = similarRaw['context'];
          }
        } else if (!detailMap.containsKey('similar_words')) {
          detailMap['similar_words'] = null;
        }
      } catch (_) {
        if (!detailMap.containsKey('similar_words')) {
          detailMap['similar_words'] = null;
        }
      }

        await cache.saveWordDetailRaw(wordId, detailMap);
        debugPrint('WordDetail source=local word=$wordId');
        return WordDetail.fromJson(detailMap);

    } catch (_) {}
  }

  if (cachedDetail != null) {
    return WordDetail.fromJson(cachedDetail);
  }

  throw StateError('本地未找到该单词详情');
});




