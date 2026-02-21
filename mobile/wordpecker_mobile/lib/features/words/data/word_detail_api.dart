import 'package:dio/dio.dart';

import '../domain/models/word_detail.dart';

class WordDetailApi {
  final Dio dio;

  WordDetailApi(this.dio);

  Future<WordDetail> fetchWordDetail(String wordId) async {
    final response = await dio.get('/api/lists/word/$wordId');

    final data = response.data;
    if (data is! Map) {
      throw StateError('单词详情数据格式错误');
    }

    return WordDetail.fromJson(Map<String, dynamic>.from(data));
  }
}
