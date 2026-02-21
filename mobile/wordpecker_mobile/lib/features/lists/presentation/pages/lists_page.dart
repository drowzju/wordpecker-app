import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/server_config.dart';
import '../../../../core/providers/server_config_provider.dart';
import '../../../../shared/widgets/empty_view.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/models/word_list.dart';
import '../../providers/list_providers.dart';
import '../pages/list_detail_page.dart';
import '../../../setup/presentation/pages/server_setup_page.dart';
import '../../../sync/providers/initial_sync_provider.dart';



class ListsPage extends ConsumerWidget {
  final ServerConfig config;

  const ListsPage({super.key, required this.config});

  Future<void> _openSettings(BuildContext context, WidgetRef ref) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ServerSetupPage(initialConfig: config),
      ),
    );
    if (!context.mounted) return;
    ref.invalidate(listsProvider);
  }


  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listsAsync = ref.watch(listsProvider);
    final syncMetaAsync = ref.watch(syncMetaProvider);

    return Scaffold(

      appBar: AppBar(
        title: const Text('我的词表'),
        actions: [
          IconButton(
            onPressed: () => _openSettings(context, ref),
            icon: const Icon(Icons.settings),
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
            return const EmptyView(
              title: '暂无词表',
              subtitle: '请先在 Web 端创建词表后再刷新。',
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
                  final timeText = lastSyncAt == null
                      ? '尚未记录同步时间'
                      : '上次同步：${lastSyncAt.toLocal()}';
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '离线模式已启用',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 4),
                        Text(timeText, style: Theme.of(context).textTheme.bodySmall),
                      ],
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
