import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../services/local_cache_service.dart';

final localCacheProvider = Provider<LocalCacheService>((ref) {
  return LocalCacheService.instance;
});
