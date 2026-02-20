import 'package:dio/dio.dart';

import '../domain/models/word_list.dart';

class ListApi {
  final Dio dio;

  ListApi(this.dio);

  Future<List<WordList>> fetchLists() async {
    final response = await dio.get('/lists');
    final data = response.data;
    if (data is! List) {
      throw StateError('列表数据格式错误');
    }

    return data
        .whereType<Map<String, dynamic>>()
        .map(WordList.fromJson)
        .toList();
  }
}
