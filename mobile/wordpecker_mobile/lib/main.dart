import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/services/local_cache_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await LocalCacheService.instance.init();
  runApp(const ProviderScope(child: WordPeckerApp()));
}


