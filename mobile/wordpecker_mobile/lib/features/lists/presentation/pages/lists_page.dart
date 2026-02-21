import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/server_config.dart';
import '../../../../shared/widgets/error_view.dart';

import '../../../../shared/widgets/loading_view.dart';
import '../../domain/models/word_list.dart';
import '../../providers/list_providers.dart';
import '../pages/list_detail_page.dart';
import '../../../setup/presentation/pages/server_setup_page.dart';
import '../../../sync/presentation/pages/initial_sync_page.dart';
import '../../../sync/providers/initial_sync_provider.dart';




class ListsPage extends ConsumerWidget {
  final ServerConfig? config;

  const ListsPage({super.key, this.config});

  Future<void> _openSettings(BuildContext context, WidgetRef ref) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ServerSetupPage(initialConfig: config),
      ),
    );
    if (!context.mounted) return;
    ref.invalidate(listsProvider);
    ref.invalidate(syncMetaProvider);
  }

  Future<void> _openSync(BuildContext context, WidgetRef ref) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const InitialSyncPage(),
      ),
    );
    if (!context.mounted) return;
    ref.invalidate(listsProvider);
    ref.invalidate(syncMetaProvider);
  }

  Future<void> _syncPendingPoints(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(pendingSyncProvider.notifier);
    try {
      final count = await notifier.syncPendingLearnedPoints();
      if (!context.mounted) return;
      final message = count == 0 ? '没有待同步的学习进度' : '已同步 $count 条学习进度';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message)),
      );
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('同步学习进度失败：${error.toString()}')),
      );
    }
  }




  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listsAsync = ref.watch(listsProvider);
    final syncMetaAsync = ref.watch(syncMetaProvider);
    final hasConfig = config != null;

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的词表'),
        actions: [
          if (config != null)
            IconButton(
              onPressed: () => _syncPendingPoints(context, ref),
              icon: const Icon(Icons.cloud_upload),
            ),
          if (config != null)
            IconButton(
              onPressed: () => _openSync(context, ref),
              icon: const Icon(Icons.sync),
            ),
          IconButton(
            onPressed: () => _openSettings(context, ref),
            icon: Icon(config != null ? Icons.settings : Icons.cloud),
          ),
        ],

      ),

      body: listsAsync.when(
        loading: () => const LoadingView(message: '正在加载词表...'),
        error: (error, stackTrace) => ErrorView(
          message: '加载失败，请检查服务器地址。',
          details: error.toString(),
          onRetry: () => ref.invalidate(listsProvider),
        ),

        data: (lists) {
          if (lists.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      hasConfig ? Icons.cloud_sync : Icons.cloud_off,
                      size: 48,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      hasConfig ? '暂无本地词表' : '未连接服务器',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      hasConfig
                          ? '点击同步后将获取词表与离线题库'
                          : '连接服务器后可同步词表与离线题库',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => hasConfig
                          ? _openSync(context, ref)
                          : _openSettings(context, ref),
                      child: Text(hasConfig ? '开始同步' : '连接服务器'),
                    ),
                  ],
                ),
              ),
            );
          }

          final syncMeta = syncMetaAsync.value;
          final showBanner = syncMeta?.isSynced == true;

          return RefreshIndicator(
            onRefresh: () async => ref.refresh(listsProvider.future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: lists.length + (showBanner ? 1 : 0),
              itemBuilder: (context, index) {
                if (showBanner && index == 0) {
                  final lastSyncAt = syncMeta?.lastSyncAt;
                  String timeText = '尚未记录同步时间';
                  if (lastSyncAt != null) {
                    final local = lastSyncAt.toLocal();
                    String two(int value) => value.toString().padLeft(2, '0');
                    timeText = '上次同步：${local.year}-${two(local.month)}-${two(local.day)} '
                        '${two(local.hour)}:${two(local.minute)}:${two(local.second)}';
                  }
                  return Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      timeText,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  );
                }


                final listIndex = showBanner ? index - 1 : index;
                return _WordListCard(list: lists[listIndex]);
              },
              separatorBuilder: (_, __) => const SizedBox(height: 12),
            ),
          );

        },
      ),
    );
  }
}

class _WordListCard extends StatelessWidget {
  final WordList list;

  const _WordListCard({required this.list});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ListDetailPage(list: list),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                list.name,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (list.description.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  list.description,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetricChip(label: '单词数', value: list.wordCount.toString()),
                  const SizedBox(width: 8),
                  _MetricChip(label: '平均进度', value: '${list.averageProgress}%'),
                  const SizedBox(width: 8),
                  _MetricChip(label: '已掌握', value: list.masteredWords.toString()),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

}

class _MetricChip extends StatelessWidget {
  final String label;
  final String value;

  const _MetricChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        '$label $value',
        style: Theme.of(context).textTheme.labelMedium,
      ),
    );
  }
}
