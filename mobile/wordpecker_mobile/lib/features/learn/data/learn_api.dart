import 'package:dio/dio.dart';

import '../domain/models/learn_exercise.dart';

class LearnApi {
  final Dio dio;

  LearnApi(this.dio);

  Future<List<LearnExercise>> startLocalLearning(String listId) async {
    final response = await dio.post('/api/learn/$listId/start-local');
    final data = response.data;
    if (data is! Map || data['exercises'] is! List) {
      throw StateError('本地练习数据格式错误');
    }

    final exercises = data['exercises'] as List;
    return exercises
        .map((item) => LearnExercise.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }
}
