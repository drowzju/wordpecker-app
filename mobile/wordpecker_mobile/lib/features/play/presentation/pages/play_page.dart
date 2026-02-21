import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/providers/local_cache_provider.dart';
import '../../../../core/services/audio_player_service.dart';
import '../../../lists/domain/models/word_item.dart';
import '../../../lists/providers/list_detail_providers.dart';
import '../../../lists/providers/list_providers.dart';

class PlayPage extends ConsumerStatefulWidget {
  final String listId;
  final String listName;
  final List<WordItem> words;

  const PlayPage({
    super.key,
    required this.listId,
    required this.listName,
    required this.words,
  });

  @override
  ConsumerState<PlayPage> createState() => _PlayPageState();
}

enum _PlayStatus {
  idle,
  correct,
  incorrect,
  revealed,
}

class _PlayPageState extends ConsumerState<PlayPage> {
  final TextEditingController _inputController = TextEditingController();
  int _currentIndex = 0;
  _PlayStatus _status = _PlayStatus.idle;

  @override
  void initState() {
    super.initState();
    _scheduleAutoPlay(initial: true);
  }

  @override
  void dispose() {
    _inputController.dispose();
    super.dispose();
  }

  WordItem get _currentWord => widget.words[_currentIndex];

  String? get _currentAudioUrl =>
      _DictionaryAudioExtractor.firstPhoneticAudio(_currentWord.dictionary);

  void _scheduleAutoPlay({bool initial = false}) {
    final audioUrl = _currentAudioUrl;
    if (audioUrl == null || audioUrl.isEmpty) return;
    final delay = initial ? const Duration(milliseconds: 300) : const Duration(milliseconds: 800);
    Future.delayed(delay, () {
      if (!mounted) return;
      if (_currentIndex >= widget.words.length) return;
      _playCurrentAudio();
    });
  }

  void _playCurrentAudio() {
    final audioUrl = _currentAudioUrl;
    if (audioUrl == null || audioUrl.isEmpty) {
      _showSnack('当前单词没有可用音频');
      return;
    }
    AudioPlayerService.instance.playFromUrl(context, audioUrl);
  }

  Future<void> _applyResult(bool correct) async {
    final cache = ref.read(localCacheProvider);
    final result = {
      'wordId': _currentWord.id,
      'correct': correct,
    };
    await cache.applyLearnedPointChanges(widget.listId, [result]);
    await cache.addPendingLearnedPoints(widget.listId, [result]);
  }

  void _handleReplay() {
    _playCurrentAudio();
  }

  void _handleShowWord() {
    if (_status == _PlayStatus.revealed) return;
    setState(() {
      _status = _PlayStatus.revealed;
    });
  }

  void _handleSubmit() {
    if (_status != _PlayStatus.idle) return;
    final input = _inputController.text.trim();
    if (input.isEmpty) return;

    final isCorrect = input.toLowerCase() == _currentWord.value.toLowerCase();
    if (isCorrect) {
      _applyResult(true);
      setState(() {
        _status = _PlayStatus.correct;
      });
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (!mounted) return;
        _goNext();
      });
    } else {
      _applyResult(false);
      setState(() {
        _status = _PlayStatus.incorrect;
      });
      Future.delayed(const Duration(milliseconds: 1200), () {
        if (!mounted) return;
        setState(() {
          _status = _PlayStatus.revealed;
        });
      });
    }
  }

  void _goNext() {
    if (_currentIndex < widget.words.length - 1) {
      setState(() {
        _currentIndex += 1;
        _status = _PlayStatus.idle;
        _inputController.clear();
      });
      _scheduleAutoPlay();
      return;
    }
    _finishSession();
  }

  void _finishSession() {
    ref.invalidate(listsProvider);
    ref.invalidate(listWordsProvider(widget.listId));
    Navigator.of(context).pop();
  }

  void _showSnack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        ref.invalidate(listsProvider);
        ref.invalidate(listWordsProvider(widget.listId));
        return true;
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.listName),
        ),
        body: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Playing word ${_currentIndex + 1} of ${widget.words.length}'),
              const SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton(
                    onPressed: _handleReplay,
                    child: const Text('Replay'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: _status == _PlayStatus.revealed ? null : _handleShowWord,
                    child: const Text('Show Word'),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Expanded(
                child: Center(
                  child: _buildStatusPanel(),
                ),
              ),
              if (_status == _PlayStatus.revealed)
                FilledButton(
                  onPressed: _goNext,
                  child: const Text('继续'),
                )
              else
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _inputController,
                        enabled: _status == _PlayStatus.idle,
                        decoration: InputDecoration(
                          labelText: '请输入你听到的单词',
                          border: const OutlineInputBorder(),
                          errorText: _status == _PlayStatus.incorrect ? '拼写错误' : null,
                        ),
                        onSubmitted: (_) => _handleSubmit(),
                      ),
                    ),
                    const SizedBox(width: 12),
                    FilledButton(
                      onPressed: _handleSubmit,
                      child: const Text('提交'),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusPanel() {
    switch (_status) {
      case _PlayStatus.correct:
        return const Text(
          '正确！',
          style: TextStyle(color: Colors.green, fontSize: 20, fontWeight: FontWeight.w600),
        );
      case _PlayStatus.incorrect:
        return const Text(
          '错误！',
          style: TextStyle(color: Colors.red, fontSize: 20, fontWeight: FontWeight.w600),
        );
      case _PlayStatus.revealed:
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              _currentWord.value,
              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (_currentWord.meaning.isNotEmpty)
              Text(
                _currentWord.meaning,
                textAlign: TextAlign.center,
              ),
          ],
        );
      case _PlayStatus.idle:
      default:
        return const Text(
          '正在播放...',
          style: TextStyle(fontSize: 18),
        );
    }
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
