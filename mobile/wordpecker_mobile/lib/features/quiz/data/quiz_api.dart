import 'package:dio/dio.dart';

import '../domain/models/quiz_question.dart';

class QuizStartResult {
  final List<QuizQuestion> questions;
  final int totalQuestions;

  const QuizStartResult({
    required this.questions,
    required this.totalQuestions,
  });
}

class QuizApi {
  final Dio dio;

  QuizApi(this.dio);

  static const int _localQuizCount = 5;


  Future<QuizStartResult> startLocalQuiz(String listId) async {
    final response = await dio.post(
      '/api/quiz/$listId/start',
      data: {'mode': 'local', 'count': _localQuizCount},
    );

    final data = response.data;
    if (data is! Map || data['questions'] is! List) {
      throw StateError('本地测验数据格式错误');
    }

    final questions = (data['questions'] as List)
        .map((item) => QuizQuestion.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
    final totalQuestions = (data['total_questions'] as num?)?.toInt() ?? questions.length;
    return QuizStartResult(questions: questions, totalQuestions: totalQuestions);
  }


  Future<List<QuizQuestion>> fetchMoreLocalQuiz(String listId) async {
    final response = await dio.post(
      '/api/quiz/$listId/more',
      data: {'mode': 'local', 'count': _localQuizCount},
    );

    final data = response.data;
    if (data is! Map || data['questions'] is! List) {
      throw StateError('本地测验数据格式错误');
    }

    final questions = data['questions'] as List;
    return questions
        .map((item) => QuizQuestion.fromJson(Map<String, dynamic>.from(item as Map)))
        .toList();
  }

  Future<void> updateLearnedPoints(String listId, List<Map<String, dynamic>> results) async {
    await dio.put('/api/quiz/$listId/learned-points', data: {'results': results});
  }
}

