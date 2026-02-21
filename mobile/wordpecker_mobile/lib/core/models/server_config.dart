class ServerConfig {
  final String baseUrl;
  final String userId;
  final DateTime updatedAt;

  const ServerConfig({
    required this.baseUrl,
    required this.userId,
    required this.updatedAt,
  });

  ServerConfig copyWith({
    String? baseUrl,
    String? userId,
    DateTime? updatedAt,
  }) {
    return ServerConfig(
      baseUrl: baseUrl ?? this.baseUrl,
      userId: userId ?? this.userId,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  factory ServerConfig.fromJson(Map<String, dynamic> json) {
    final updatedAtRaw = json['updatedAt'] as String?;
    final rawBaseUrl = (json['baseUrl'] as String? ?? '').trim();
    final normalizedBaseUrl = _normalizeBaseUrl(rawBaseUrl);
    return ServerConfig(
      baseUrl: normalizedBaseUrl,
      userId: (json['userId'] as String? ?? '').trim(),
      updatedAt: updatedAtRaw != null
          ? DateTime.tryParse(updatedAtRaw) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  static String _normalizeBaseUrl(String value) {
    var input = value.trim();
    if (input.isEmpty) return input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'http://$input';
    }
    input = input.replaceAll(RegExp(r'/+$'), '');
    if (input.endsWith('/api')) {
      input = input.substring(0, input.length - 4);
    }
    return input;
  }


  Map<String, dynamic> toJson() {
    return {
      'baseUrl': baseUrl,
      'userId': userId,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
