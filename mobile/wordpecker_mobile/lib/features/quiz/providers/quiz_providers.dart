import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/local_cache_provider.dart';
import '../../../core/providers/server_config_provider.dart';
import '../../../core/services/dio_logger.dart';
import '../data/quiz_api.dart';
import '../domain/models/quiz_question.dart';


final quizApiProvider = Provider<QuizApi>((ref) {
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

  return QuizApi(dio);
});

const int localQuizCount = 5;



final quizQuestionsProvider = FutureProvider.family<List<QuizQuestion>, String>((ref, listId) async {


  final cache = ref.read(localCacheProvider);
  final isSynced = await cache.isInitialSyncDone();
  if (isSynced) {
    final raw = await cache.loadQuizzesRaw(listId);
    if (raw.isNotEmpty) {
      final quizzes = raw.map(QuizQuestion.fromJson).toList();
      final words = await cache.loadWordsRaw(listId);
      final learnedPoints = {
        for (final word in words)
          word['id']?.toString() ?? '': (word['learnedPoint'] as num?)?.toInt() ?? 0,
      };
      return selectWeightedQuiz(quizzes, learnedPoints, localQuizCount);

    }
  }

  final api = ref.watch(quizApiProvider);
  return api.startLocalQuiz(listId);
});

List<QuizQuestion> _selectWeightedQuiz(
  List<QuizQuestion> source,
  Map<String, int> learnedPoints,
  int count,
) {
  return selectWeightedQuiz(source, learnedPoints, count);
}

List<QuizQuestion> selectWeightedQuiz(

  List<QuizQuestion> source,
  Map<String, int> learnedPoints,
  int count,
) {

  if (source.length <= count) return source;

  final random = Random();
  final candidates = List<QuizQuestion>.from(source);
  final selected = <QuizQuestion>[];

  while (selected.length < count && candidates.isNotEmpty) {
    final weights = candidates.map((question) {
      final wordId = question.wordId ?? '';
      final learned = learnedPoints[wordId] ?? 0;
      final weight = pow(101 - learned, 1.6).toDouble();
      return weight;
    }).toList();

    final totalWeight = weights.fold<double>(0, (sum, w) => sum + w);
    double pick = random.nextDouble() * totalWeight;
    int chosenIndex = 0;
    for (int i = 0; i < weights.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        chosenIndex = i;
        break;
      }
    }

    selected.add(candidates.removeAt(chosenIndex));
  }

  return selected;
}

