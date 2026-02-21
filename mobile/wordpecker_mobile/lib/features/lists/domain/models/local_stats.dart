class LocalStats {
  final int exerciseCount;
  final int quizCount;

  const LocalStats({
    required this.exerciseCount,
    required this.quizCount,
  });

  factory LocalStats.fromJson(Map<String, dynamic> json) {
    return LocalStats(
      exerciseCount: (json['exerciseCount'] as num?)?.toInt() ?? 0,
      quizCount: (json['quizCount'] as num?)?.toInt() ?? 0,
    );
  }
}
