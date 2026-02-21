import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../providers/initial_sync_provider.dart';

class InitialSyncPage extends ConsumerStatefulWidget {
  const InitialSyncPage({super.key});

  @override
  ConsumerState<InitialSyncPage> createState() => _InitialSyncPageState();
}

class _InitialSyncPageState extends ConsumerState<InitialSyncPage> {
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    Future.microtask(() => ref.read(initialSyncProvider.notifier).startFullSync());
  }

  @override
  Widget build(BuildContext context) {
    final syncAsync = ref.watch(initialSyncProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('首次导入')),
      body: syncAsync.when(
        loading: () => const LoadingView(message: '正在准备同步...'),
        error: (error, stackTrace) => ErrorView(
          message: '同步状态加载失败',
          details: error.toString(),
          onRetry: () => ref.invalidate(initialSyncProvider),
        ),
        data: (progress) {
          if (progress.done) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.check_circle, color: Colors.green, size: 48),
                  const SizedBox(height: 12),
                  const Text('离线数据已准备就绪'),
                  const SizedBox(height: 4),
                  Text('你现在可以离线学习与测验', style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            );
          }

          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '正在导入数据',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(progress.message),
                const SizedBox(height: 16),
                LinearProgressIndicator(value: progress.progress),
                const SizedBox(height: 12),
                if (progress.total > 0)
                  Text('${progress.current} / ${progress.total}'),
                if (progress.error != null) ...[
                  const SizedBox(height: 12),
                  Text('同步失败：${progress.error}'),
                  const SizedBox(height: 8),
                  FilledButton(
                    onPressed: () => ref.read(initialSyncProvider.notifier).startFullSync(),
                    child: const Text('重试同步'),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
