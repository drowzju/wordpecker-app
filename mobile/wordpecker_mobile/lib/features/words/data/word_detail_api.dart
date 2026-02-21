import 'package:dio/dio.dart';

import '../domain/models/word_detail.dart';

class WordDetailApi {
  final Dio dio;

  WordDetailApi(this.dio);

  Future<Map<String, dynamic>> fetchWordDetailRaw(String wordId) async {
    final response = await dio.get('/api/lists/word/$wordId');

    final data = response.data;
    if (data is! Map) {
      throw StateError('单词详情数据格式错误');
    }

    return Map<String, dynamic>.from(data as Map);
  }

  Future<WordDetail> fetchWordDetail(String wordId) async {
    final data = await fetchWordDetailRaw(wordId);
    return WordDetail.fromJson(data);
  }


  Future<Map<String, dynamic>> fetchSimilarWords(String wordId, {int contextIndex = 0}) async {
    final response = await dio.post(
      '/api/lists/word/$wordId/similar',
      data: {'contextIndex': contextIndex},
    );

    final data = response.data;
    if (data is! Map) {
      throw StateError('相似词数据格式错误');
    }

    return Map<String, dynamic>.from(data as Map);
  }
}

