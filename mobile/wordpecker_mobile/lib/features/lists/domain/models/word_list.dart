class WordList {
  final String id;
  final String name;
  final String description;
  final String context;
  final int wordCount;
  final int averageProgress;
  final int masteredWords;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WordList({
    required this.id,
    required this.name,
    required this.description,
    required this.context,
    required this.wordCount,
    required this.averageProgress,
    required this.masteredWords,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WordList.fromJson(Map<String, dynamic> json) {
    final createdRaw = json['created_at'] as String?;
    final updatedRaw = json['updated_at'] as String?;
    return WordList(
      id: (json['id'] as String? ?? '').trim(),
      name: (json['name'] as String? ?? '').trim(),
      description: (json['description'] as String? ?? '').trim(),
      context: (json['context'] as String? ?? '').trim(),
      wordCount: (json['wordCount'] as num?)?.toInt() ?? 0,
      averageProgress: (json['averageProgress'] as num?)?.toInt() ?? 0,
      masteredWords: (json['masteredWords'] as num?)?.toInt() ?? 0,
      createdAt: createdRaw != null
          ? DateTime.tryParse(createdRaw) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: updatedRaw != null
          ? DateTime.tryParse(updatedRaw) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
