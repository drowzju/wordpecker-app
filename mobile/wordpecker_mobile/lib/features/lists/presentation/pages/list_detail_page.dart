import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../shared/widgets/empty_view.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../../words/presentation/pages/word_detail_page.dart';
import '../../domain/models/word_item.dart';
import '../../domain/models/word_list.dart';
import '../../providers/list_detail_providers.dart';


class ListDetailPage extends ConsumerWidget {
  final WordList list;

  const ListDetailPage({super.key, required this.list});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wordsAsync = ref.watch(listWordsProvider(list.id));

    return Scaffold(
      appBar: AppBar(
        title: Text(list.name),
      ),
      body: wordsAsync.when(
        loading: () => const LoadingView(message: '正在加载单词...'),
        error: (error, stackTrace) => ErrorView(
          message: '加载失败，请检查服务器地址。',
          details: error.toString(),
          onRetry: () => ref.invalidate(listWordsProvider(list.id)),
        ),

        data: (words) {
          if (words.isEmpty) {
            return const EmptyView(
              title: '暂无单词',
              subtitle: '请先在 Web 端添加单词后再刷新。',
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(listWordsProvider(list.id).future),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: words.length,
              itemBuilder: (context, index) => _WordItemTile(word: words[index]),
              separatorBuilder: (_, __) => const SizedBox(height: 12),
            ),
          );
        },
      ),
    );
  }
}

class _WordItemTile extends StatelessWidget {
  final WordItem word;

  const _WordItemTile({required this.word});

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
              builder: (_) => WordDetailPage(
                wordId: word.id,
                wordValue: word.value,
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                word.value,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (word.meaning.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(word.meaning),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetricChip(label: '学习进度', value: '${word.learnedPoint}%'),
                  const SizedBox(width: 8),
                  if (word.definition.isNotEmpty)
                    _MetricChip(label: '释义', value: '已生成'),
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
