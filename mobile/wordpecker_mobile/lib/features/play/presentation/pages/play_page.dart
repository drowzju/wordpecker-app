import 'package:flutter/material.dart';

import '../../../lists/domain/models/word_item.dart';
import '../../../../core/services/audio_player_service.dart';

class PlayPage extends StatefulWidget {
  final String listName;
  final List<WordItem> words;

  const PlayPage({
    super.key,
    required this.listName,
    required this.words,
  });

  @override
  State<PlayPage> createState() => _PlayPageState();
}

class _PlayPageState extends State<PlayPage> {
  late final PageController _controller;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    _controller = PageController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.listName),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text('第 ${_index + 1} / ${widget.words.length} 个'),
          ),
          Expanded(
            child: PageView.builder(
              controller: _controller,
              itemCount: widget.words.length,
              onPageChanged: (value) => setState(() => _index = value),
              itemBuilder: (context, index) {
                final word = widget.words[index];
                final audioUrl = _DictionaryAudioExtractor.firstPhoneticAudio(word.dictionary);

                return Padding(
                  padding: const EdgeInsets.all(20),
                  child: Card(
                    elevation: 1,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  word.value,
                                  style: Theme.of(context).textTheme.headlineSmall,
                                ),
                              ),
                              if (audioUrl != null)
                                IconButton(
                                  onPressed: () => AudioPlayerService.instance.playFromUrl(
                                    context,
                                    audioUrl,
                                  ),
                                  icon: const Icon(Icons.volume_up),
                                ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          if (word.meaning.isNotEmpty)
                            Text(
                              word.meaning,
                              style: Theme.of(context).textTheme.bodyLarge,
                            ),
                          const Spacer(),
                          Row(
                            children: [
                              const Icon(Icons.bar_chart, size: 18),
                              const SizedBox(width: 6),
                              Text('学习进度 ${word.learnedPoint}%'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
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
