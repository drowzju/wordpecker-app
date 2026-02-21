import 'package:dio/dio.dart';

import '../domain/models/local_stats.dart';
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

  Future<List<Map<String, dynamic>>> fetchWordsRaw(String listId) async {
    final response = await dio.get('/api/lists/$listId/words');
    final data = response.data;
    if (data is! List) {
      throw StateError('单词数据格式错误');
    }
    return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }


  Future<LocalStats> fetchLocalStats(String listId) async {
    final response = await dio.get('/api/lists/$listId/local-stats');
    final data = response.data;
    if (data is! Map) {
      throw StateError('本地题库统计格式错误');
    }
    return LocalStats.fromJson(Map<String, dynamic>.from(data));
  }

  Future<List<Map<String, dynamic>>> fetchExercisesRaw(String listId) async {
    final response = await dio.get('/api/lists/$listId/exercises');
    final data = response.data;
    if (data is! List) {
      throw StateError('练习题数据格式错误');
    }
    return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> fetchQuizzesRaw(String listId) async {
    final response = await dio.get('/api/lists/$listId/quizzes');
    final data = response.data;
    if (data is! List) {
      throw StateError('测验题数据格式错误');
    }
    return data.map((item) => Map<String, dynamic>.from(item as Map)).toList();
  }

}






