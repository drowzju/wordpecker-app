import 'package:dio/dio.dart';

import '../domain/models/word_list.dart';

class ListApi {
  final Dio dio;

  ListApi(this.dio);

  Future<List<WordList>> fetchLists() async {
    final response = await dio.get('/api/lists');

    final data = response.data;
    if (data is! List) {
      throw StateError('列表数据格式错误');
    }

    return data
        .map((item) => WordList.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();

  }
}
