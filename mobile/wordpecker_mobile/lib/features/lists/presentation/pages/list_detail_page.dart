import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


import '../../../../core/services/audio_player_service.dart';
import '../../../../shared/widgets/empty_view.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../../learn/presentation/pages/learn_page.dart';
import '../../../play/presentation/pages/play_page.dart';
import '../../../quiz/presentation/pages/quiz_page.dart';
import '../../../words/presentation/pages/word_detail_page.dart';
import '../../domain/models/local_stats.dart';
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
          final statsAsync = ref.watch(listLocalStatsProvider(list.id));

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(listLocalStatsProvider(list.id));
              return ref.refresh(listWordsProvider(list.id).future);
            },
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: words.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _ActionPanel(
                    list: list,
                    words: words,
                    statsAsync: statsAsync,
                  );


                }
                final word = words[index - 1];
                return _WordItemTile(word: word);
              },
              separatorBuilder: (_, __) => const SizedBox(height: 12),
            ),
          );

        },
      ),
    );
  }
}

class _ActionPanel extends StatelessWidget {
  final WordList list;
  final List<WordItem> words;
  final AsyncValue<LocalStats> statsAsync;

  const _ActionPanel({
    required this.list,
    required this.words,
    required this.statsAsync,
  });



  @override
  Widget build(BuildContext context) {
    final stats = statsAsync.value;
    final exerciseCount = stats?.exerciseCount ?? 0;
    final quizCount = stats?.quizCount ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 12,
          runSpacing: 8,
          children: [
            _MetricChip(label: '本地练习', value: exerciseCount.toString()),
            _MetricChip(label: '本地测验', value: quizCount.toString()),
          ],
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            SizedBox(
              width: 110,
              child: FilledButton.icon(
                onPressed: exerciseCount > 0
                    ? () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => LearnPage(
                              listId: list.id,
                              listName: list.name,
                            ),
                          ),
                        );
                      }
                    : () => _showSnack(context, '暂无本地练习题库'),
                icon: const Icon(Icons.school),
                label: const Text('Learn'),
              ),
            ),
            SizedBox(
              width: 110,
              child: FilledButton.icon(
                onPressed: quizCount > 0
                    ? () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => QuizPage(
                              listId: list.id,
                              listName: list.name,
                            ),
                          ),
                        );
                      }
                    : () => _showSnack(context, '暂无本地测验题库'),
                icon: const Icon(Icons.quiz),
                label: const Text('Quiz'),
              ),
            ),
            SizedBox(
              width: 110,
              child: FilledButton.icon(
                onPressed: words.isNotEmpty
                    ? () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PlayPage(
                              listName: list.name,
                              words: words,
                            ),
                          ),
                        );
                      }
                    : null,
                icon: const Icon(Icons.play_arrow),
                label: const Text('Play'),
              ),
            ),

          ],
        ),

      ],
    );
  }

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}



class _WordItemTile extends StatelessWidget {


  final WordItem word;

  const _WordItemTile({required this.word});

  @override
  Widget build(BuildContext context) {
    final audioUrl = _DictionaryAudioExtractor.firstPhoneticAudio(word.dictionary);

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
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Text(
                      word.value,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ),
                  if (audioUrl != null)
                    IconButton(
                      onPressed: () => AudioPlayerService.instance.playFromUrl(
                        context,
                        audioUrl,
                      ),
                      icon: const Icon(Icons.volume_up),
                      tooltip: '发音',
                    ),
                ],
              ),
              if (word.meaning.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(word.meaning),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _MetricChip(label: '学习进度', value: '${word.learnedPoint}%'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DictionaryAudioExtractor {
  static String? firstPhoneticAudio(dynamic dictionary) {
    if (dictionary is! List || dictionary.isEmpty) {
      return null;
    }

    final first = dictionary.first;
    if (first is Map && first['dictionary'] is List) {
      return _firstAudioFromEntries(first['dictionary'] as List);
    }

    return _firstAudioFromEntries(dictionary);
  }

  static String? _firstAudioFromEntries(List entries) {
    for (final entry in entries) {
      if (entry is! Map) continue;
      final phonetics = entry['phonetics'];
      if (phonetics is! List) continue;
      for (final phonetic in phonetics) {
        if (phonetic is! Map) continue;
        final audio = phonetic['audio']?.toString();
        if (audio != null && audio.isNotEmpty) {
          return audio;
        }
      }
    }
    return null;
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
