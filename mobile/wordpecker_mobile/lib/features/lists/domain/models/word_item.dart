class WordItem {
  final String id;
  final String value;
  final String meaning;
  final int learnedPoint;
  final String definition;
  final dynamic dictionary;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WordItem({
    required this.id,
    required this.value,
    required this.meaning,
    required this.learnedPoint,
    required this.definition,
    required this.dictionary,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WordItem.fromJson(Map<String, dynamic> json) {
    final createdRaw = json['created_at'] as String?;
    final updatedRaw = json['updated_at'] as String?;
    return WordItem(
      id: (json['id'] as String? ?? json['_id'] as String? ?? '').trim(),
      value: (json['value'] as String? ?? '').trim(),
      meaning: (json['meaning'] as String? ?? '').trim(),
      learnedPoint: (json['learnedPoint'] as num?)?.toInt() ?? 0,
      definition: (json['definition'] as String? ?? '').trim(),
      dictionary: json['dictionary'],
      createdAt: createdRaw != null
          ? DateTime.tryParse(createdRaw) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: updatedRaw != null
          ? DateTime.tryParse(updatedRaw) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

