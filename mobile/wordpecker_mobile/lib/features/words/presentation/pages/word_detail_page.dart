import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:url_launcher/url_launcher.dart';

import '../../../../core/services/audio_player_service.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/models/word_detail.dart';
import '../../providers/word_detail_providers.dart';


class WordDetailPage extends ConsumerWidget {
  final String wordId;
  final String wordValue;

  const WordDetailPage({
    super.key,
    required this.wordId,
    required this.wordValue,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(wordDetailProvider(wordId));

    return Scaffold(
      appBar: AppBar(
        title: Text(wordValue),
      ),
      body: detailAsync.when(
        loading: () => const LoadingView(message: '正在加载单词详情...'),
        error: (error, stackTrace) => ErrorView(
          message: '加载失败，请稍后重试。',
          details: error.toString(),
          onRetry: () => ref.invalidate(wordDetailProvider(wordId)),
        ),
        data: (detail) => _WordDetailBody(detail: detail, wordId: wordId),

      ),
    );
  }
}

class _WordDetailBody extends StatelessWidget {
  final WordDetail detail;
  final String wordId;

  const _WordDetailBody({required this.detail, required this.wordId});


  @override
  Widget build(BuildContext context) {
    debugPrint('WordDetailPage word=$wordId examples=${detail.examples.length}');
    final dictionaryData = _DictionaryParser.parse(detail.dictionary);

    final phoneticText = _DictionaryParser.firstPhoneticText(dictionaryData.entries);
    final phoneticAudio = _DictionaryParser.firstPhoneticAudio(dictionaryData.entries);

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Text(
                detail.value,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),
            if (phoneticAudio != null)
              IconButton(
                onPressed: () => AudioPlayerService.instance.playFromUrl(
                  context,
                  phoneticAudio,
                ),
                icon: const Icon(Icons.volume_up),
                tooltip: '发音',
              ),

          ],
        ),
        if (phoneticText != null && phoneticText.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            phoneticText,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
        if (detail.contexts.isNotEmpty) ...[
          const SizedBox(height: 16),
          _SectionCard(
            title: '词表语境',
            child: Column(
              children: detail.contexts
                  .map((context) => _ContextTile(contextInfo: context))
                  .toList(),
            ),
          ),
        ],
        const SizedBox(height: 16),
        _SectionCard(
          title: '详情',
          trailing: TextButton.icon(
            onPressed: () => _launchUrl(
              context,
              'https://www.merriam-webster.com/dictionary/${detail.value}',
            ),
            icon: const Icon(Icons.open_in_new, size: 18),
            label: const Text('Merriam-Webster'),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (dictionaryData.entries.isNotEmpty) ...[
                Text(
                  '词典释义',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 8),
                ...dictionaryData.entries.map((entry) => _DictionaryEntryTile(entry: entry)),
              ] else
                Text(
                  '暂无词典释义',
                  style: Theme.of(context).textTheme.bodySmall,
                ),

              if (dictionaryData.stems.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  '派生词根',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: dictionaryData.stems
                      .map((stem) => Chip(label: Text(stem)))
                      .toList(),
                ),
              ],
            ],
          ),
        ),
        if (detail.examples.isNotEmpty) ...[
          const SizedBox(height: 16),
          _SectionCard(
            title: '例句',
            child: Column(
              children: detail.examples
                  .map((example) => _ExampleTile(example: example))
                  .toList(),
            ),
          ),
        ] else
          const SizedBox(height: 12),
        if ((detail.similarWords?.synonyms.isNotEmpty ?? false) ||
            (detail.similarWords?.interchangeableWords.isNotEmpty ?? false)) ...[
          const SizedBox(height: 16),
          _SectionCard(
            title: '相似词',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (detail.similarContext != null && detail.similarContext!.isNotEmpty) ...[
                  Text(
                    detail.similarContext!,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 8),
                ],
                if (detail.similarWords!.synonyms.isNotEmpty) ...[
                  Text(
                    '同义词',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 6),
                  ...detail.similarWords!.synonyms
                      .map((item) => _SimilarWordTile(item: item))
                      .toList(),
                  const SizedBox(height: 12),
                ],
                if (detail.similarWords!.interchangeableWords.isNotEmpty) ...[
                  Text(
                    '可替换词',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                  const SizedBox(height: 6),
                  ...detail.similarWords!.interchangeableWords
                      .map((item) => _SimilarWordTile(item: item))
                      .toList(),
                ],
              ],
            ),
          ),
        ],

      ],
    );
  }

  Future<void> _launchUrl(BuildContext context, String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) {
      _showSnack(context, '链接无效');
      return;
    }

    final success = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!success && context.mounted) {
      _showSnack(context, '无法打开链接');
    }
  }

  void _showSnack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final Widget child;
  final Widget? trailing;

  const _SectionCard({
    required this.title,
    required this.child,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (trailing != null) trailing!,
              ],
            ),
            const SizedBox(height: 10),
            child,
          ],
        ),
      ),
    );
  }
}

class _ContextTile extends StatelessWidget {
  final WordContextInfo contextInfo;

  const _ContextTile({required this.contextInfo});

  @override
  Widget build(BuildContext context) {
    final progressValue = (contextInfo.learnedPoint / 100).clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Chip(label: Text(contextInfo.listName)),
              if (contextInfo.listContext != null && contextInfo.listContext!.isNotEmpty)
                Chip(label: Text(contextInfo.listContext!)),
            ],
          ),
          if (contextInfo.meaning.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(contextInfo.meaning),
          ],
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: LinearProgressIndicator(value: progressValue),
              ),
              const SizedBox(width: 8),
              Text('${contextInfo.learnedPoint}/100'),
            ],
          ),
        ],
      ),
    );
  }
}

class _DictionaryEntryTile extends StatelessWidget {
  final Map<String, dynamic> entry;

  const _DictionaryEntryTile({required this.entry});

  @override
  Widget build(BuildContext context) {
    final partOfSpeech = (entry['partOfSpeech'] as String? ?? '').trim();
    final entryNumber = entry['entryNumber'];
    final phonetics = entry['phonetics'];
    final definitions = entry['definitions'];
    final derivatives = entry['derivatives'];

    final phoneticText = _DictionaryParser.firstPhoneticTextFromRaw(phonetics);
    final phoneticAudio = _DictionaryParser.firstPhoneticAudioFromRaw(phonetics);

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: const EdgeInsets.only(left: 8, right: 8, bottom: 12),
        title: Text(
          entryNumber != null && entryNumber.toString().isNotEmpty
              ? '$partOfSpeech (${entryNumber.toString()})'
              : (partOfSpeech.isEmpty ? '释义' : partOfSpeech),
          style: Theme.of(context).textTheme.titleSmall,
        ),
        subtitle: phoneticText != null && phoneticText.isNotEmpty
            ? Text(phoneticText)
            : null,
        trailing: phoneticAudio != null
            ? IconButton(
                onPressed: () => _DictionaryParser.playAudio(context, phoneticAudio),
                icon: const Icon(Icons.volume_up, size: 20),
              )
            : const Icon(Icons.expand_more),

        children: [
          if (definitions is List && definitions.isNotEmpty)
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: definitions.map((item) {
                final map = Map<String, dynamic>.from(item as Map);
                final number = map['number']?.toString();
                final definition = map['definition']?.toString() ?? '';
                final example = map['example']?.toString() ?? '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        number != null && number.isNotEmpty
                            ? '$number. $definition'
                            : definition,
                      ),
                      if (example.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          example,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ],
                  ),
                );
              }).toList(),
            ),
          if (derivatives is List && derivatives.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              '派生词',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: derivatives.map((item) {
                final map = Map<String, dynamic>.from(item as Map);
                final word = map['word']?.toString() ?? '';
                final pos = map['partOfSpeech']?.toString() ?? '';
                final label = pos.isNotEmpty ? '$word ($pos)' : word;
                return Chip(label: Text(label));
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }
}

class _ExampleTile extends StatelessWidget {
  final WordExample example;

  const _ExampleTile({required this.example});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('"${example.sentence}"'),
          if (example.translation.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              example.translation,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          if (example.contextAndUsage.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              example.contextAndUsage,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _SimilarWordTile extends StatelessWidget {
  final SimilarWordItem item;

  const _SimilarWordTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            item.word,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          if (item.meaning.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(item.meaning),
          ],
          if (item.example.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              '例句：${item.example}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
          if (item.usageNote != null && item.usageNote!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              item.usageNote!,
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
    );
  }
}

class _DictionaryData {

  final List<Map<String, dynamic>> entries;
  final List<String> stems;

  const _DictionaryData({required this.entries, required this.stems});
}

class _DictionaryParser {
  static _DictionaryData parse(dynamic dictionary) {
    if (dictionary is! List || dictionary.isEmpty) {
      return const _DictionaryData(entries: [], stems: []);
    }

    final first = dictionary.first;
    if (first is Map && first['dictionary'] is List) {
      final entriesRaw = first['dictionary'] as List;
      final stemsRaw = first['stems'];
      return _DictionaryData(
        entries: entriesRaw
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList(),
        stems: stemsRaw is List
            ? stemsRaw.map((item) => item.toString()).toList()
            : const [],
      );
    }

    return _DictionaryData(
      entries: dictionary
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList(),
      stems: const [],
    );
  }

  static String? firstPhoneticText(List<Map<String, dynamic>> entries) {
    for (final entry in entries) {
      final phonetics = entry['phonetics'];
      final text = firstPhoneticTextFromRaw(phonetics);
      if (text != null && text.isNotEmpty) return text;
    }
    return null;
  }

  static String? firstPhoneticAudio(List<Map<String, dynamic>> entries) {
    for (final entry in entries) {
      final phonetics = entry['phonetics'];
      final audio = firstPhoneticAudioFromRaw(phonetics);
      if (audio != null && audio.isNotEmpty) return audio;
    }
    return null;
  }

  static String? firstPhoneticTextFromRaw(dynamic phonetics) {
    if (phonetics is! List) return null;
    for (final item in phonetics) {
      final map = Map<String, dynamic>.from(item as Map);
      final text = map['text']?.toString();
      if (text != null && text.isNotEmpty) return text;
    }
    return null;
  }

  static String? firstPhoneticAudioFromRaw(dynamic phonetics) {
    if (phonetics is! List) return null;
    for (final item in phonetics) {
      final map = Map<String, dynamic>.from(item as Map);
      final audio = map['audio']?.toString();
      if (audio != null && audio.isNotEmpty) return audio;
    }
    return null;
  }

  static Future<void> playAudio(BuildContext context, String url) async {
    await AudioPlayerService.instance.playFromUrl(context, url);
  }
}

