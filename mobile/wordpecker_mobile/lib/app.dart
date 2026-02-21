import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers/server_config_provider.dart';
import 'features/lists/presentation/pages/lists_page.dart';
import 'features/setup/presentation/pages/server_setup_page.dart';
import 'features/sync/presentation/pages/initial_sync_page.dart';
import 'features/sync/providers/initial_sync_provider.dart';
import 'shared/widgets/error_view.dart';
import 'shared/widgets/loading_view.dart';


class WordPeckerApp extends ConsumerWidget {
  const WordPeckerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configAsync = ref.watch(serverConfigProvider);

    return MaterialApp(
      title: 'WordPecker',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: configAsync.when(
        loading: () => const LoadingView(message: '正在加载配置...'),
        error: (error, stackTrace) => ErrorView(
          message: '配置加载失败，请重试。',
          onRetry: () => ref.invalidate(serverConfigProvider),
        ),
        data: (config) {
          if (config == null) {
            return const ServerSetupPage();
          }
          final syncMetaAsync = ref.watch(syncMetaProvider);
          return syncMetaAsync.when(
            loading: () => const LoadingView(message: '正在检查离线数据...'),
            error: (error, stackTrace) => ErrorView(
              message: '同步状态加载失败，请重试。',
              details: error.toString(),
              onRetry: () => ref.invalidate(syncMetaProvider),
            ),
            data: (meta) {
              if (!meta.isSynced) {
                return const InitialSyncPage();
              }
              return ListsPage(config: config);
            },
          );
        },

      ),
    );
  }
}
