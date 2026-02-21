class WordContextInfo {
  final String listId;
  final String listName;
  final String? listContext;
  final String meaning;
  final int learnedPoint;

  const WordContextInfo({
    required this.listId,
    required this.listName,
    required this.listContext,
    required this.meaning,
    required this.learnedPoint,
  });

  factory WordContextInfo.fromJson(Map<String, dynamic> json) {
    return WordContextInfo(
      listId: (json['listId'] as String? ?? '').trim(),
      listName: (json['listName'] as String? ?? '').trim(),
      listContext: json['listContext'] as String?,
      meaning: (json['meaning'] as String? ?? '').trim(),
      learnedPoint: (json['learnedPoint'] as num?)?.toInt() ?? 0,
    );
  }
}

class WordExample {
  final String id;
  final String sentence;
  final String translation;
  final String contextAndUsage;

  const WordExample({
    required this.id,
    required this.sentence,
    required this.translation,
    required this.contextAndUsage,
  });

  factory WordExample.fromJson(Map<String, dynamic> json) {
    return WordExample(
      id: (json['id'] as String? ?? '').trim(),
      sentence: (json['sentence'] as String? ?? '').trim(),
      translation: (json['translation'] as String? ?? '').trim(),
      contextAndUsage: (json['context_and_usage'] as String? ?? '').trim(),
    );
  }
}

class WordDetail {
  final String id;
  final String value;
  final String definition;
  final dynamic dictionary;
  final List<WordContextInfo> contexts;
  final List<WordExample> examples;
  final DateTime createdAt;
  final DateTime updatedAt;

  const WordDetail({
    required this.id,
    required this.value,
    required this.definition,
    required this.dictionary,
    required this.contexts,
    required this.examples,
    required this.createdAt,
    required this.updatedAt,
  });

  factory WordDetail.fromJson(Map<String, dynamic> json) {
    final createdRaw = json['created_at'] as String?;
    final updatedRaw = json['updated_at'] as String?;
    final contextsRaw = json['contexts'];
    final examplesRaw = json['examples'];

    return WordDetail(
      id: (json['id'] as String? ?? json['_id'] as String? ?? '').trim(),
      value: (json['value'] as String? ?? '').trim(),
      definition: (json['definition'] as String? ?? '').trim(),
      dictionary: json['dictionary'],
      contexts: contextsRaw is List
          ? contextsRaw
              .map((item) => WordContextInfo.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ))
              .toList()
          : const [],
      examples: examplesRaw is List
          ? examplesRaw
              .map((item) => WordExample.fromJson(
                    Map<String, dynamic>.from(item as Map),
                  ))
              .toList()
          : const [],
      createdAt: createdRaw != null
          ? DateTime.tryParse(createdRaw) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: updatedRaw != null
          ? DateTime.tryParse(updatedRaw) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
