import 'package:dio/dio.dart';

import '../domain/models/word_item.dart';

class ListDetailApi {
  final Dio dio;

  ListDetailApi(this.dio);

  Future<List<WordItem>> fetchWords(String listId) async {
    final response = await dio.get('/api/lists/$listId/words');

    final data = response.data;
    if (data is! List) {
      throw StateError('单词数据格式错误');
    }

    return data
        .map((item) => WordItem.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();

  }
}
