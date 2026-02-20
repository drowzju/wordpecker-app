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
    return ServerConfig(
      baseUrl: (json['baseUrl'] as String? ?? '').trim(),
      userId: (json['userId'] as String? ?? '').trim(),
      updatedAt: updatedAtRaw != null
          ? DateTime.tryParse(updatedAtRaw) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'baseUrl': baseUrl,
      'userId': userId,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }
}
