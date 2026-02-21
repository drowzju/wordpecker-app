class QuizQuestion {
  final String id;
  final String word;
  final String? wordId;
  final String type;
  final String question;
  final List<String>? options;
  final List<String>? optionLabels;
  final dynamic correctAnswer;
  final String? difficulty;
  final String? hint;
  final String? feedback;
  final List<List<String>>? pairs;

  const QuizQuestion({
    required this.id,
    required this.word,
    required this.wordId,
    required this.type,
    required this.question,
    required this.options,
    required this.optionLabels,
    required this.correctAnswer,
    required this.difficulty,
    required this.hint,
    required this.feedback,
    required this.pairs,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: (json['id'] as String? ?? json['_id'] as String? ?? '').trim(),
      word: (json['word'] as String? ?? '').trim(),
      wordId: json['wordId']?.toString(),
      type: (json['type'] as String? ?? '').trim(),
      question: (json['question'] as String? ?? '').trim(),
      options: (json['options'] as List?)?.map((item) => item.toString()).toList(),
      optionLabels: (json['optionLabels'] as List?)?.map((item) => item.toString()).toList(),
      correctAnswer: json['correctAnswer'],
      difficulty: json['difficulty']?.toString(),
      hint: json['hint']?.toString(),
      feedback: json['feedback']?.toString(),
      pairs: (json['pairs'] as List?)
          ?.map((item) => List<String>.from(item as List))
          .toList(),
    );
  }
}
