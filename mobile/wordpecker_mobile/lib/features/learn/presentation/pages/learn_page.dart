import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';


import '../../../../shared/widgets/empty_view.dart';
import '../../../../shared/widgets/error_view.dart';
import '../../../../shared/widgets/loading_view.dart';
import '../../domain/models/learn_exercise.dart';
import '../../providers/learn_providers.dart';

class LearnPage extends ConsumerStatefulWidget {
  final String listId;
  final String listName;

  const LearnPage({
    super.key,
    required this.listId,
    required this.listName,
  });

  @override
  ConsumerState<LearnPage> createState() => _LearnPageState();
}

class _LearnPageState extends ConsumerState<LearnPage> {
  int _currentIndex = 0;
  String? _selectedOption;
  final TextEditingController _textController = TextEditingController();
  bool _showResult = false;
  bool _showHint = false;
  final Map<String, String> _userPairs = {};
  String? _selectedWord;

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  void _resetAnswer() {
    _selectedOption = null;
    _textController.clear();
    _showResult = false;
    _showHint = false;
    _userPairs.clear();
    _selectedWord = null;
  }

  Widget _buildMatchingSummary(
    BuildContext context,
    List<List<String>> pairs,
    Map<String, String> userPairs,
  ) {
    int correctCount = 0;
    for (final pair in pairs) {
      if (userPairs[pair[0]] == pair[1]) {
        correctCount += 1;
      }
    }
    final totalPairs = pairs.length;
    final incorrectCount = totalPairs - correctCount;
    final overallCorrect = incorrectCount == 0 && userPairs.length == totalPairs;
    final colors = Theme.of(context).colorScheme;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: colors.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                overallCorrect ? Icons.check_circle : Icons.error,
                color: overallCorrect ? Colors.green : Colors.red,
                size: 18,
              ),
              const SizedBox(width: 6),
              Text(
                overallCorrect ? '全部正确' : '需要复习',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              Chip(
                label: Text('正确 $correctCount'),
                backgroundColor: Colors.green.withOpacity(0.15),
              ),
              const SizedBox(width: 6),
              Chip(
                label: Text('错误 $incorrectCount'),
                backgroundColor: Colors.red.withOpacity(0.15),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            '正确匹配：',
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 6),
          ...pairs.map((pair) => Text(
                '${pair[0]} → ${pair[1]}',
                style: TextStyle(color: Colors.green.shade700),
              )),
        ],
      ),
    );
  }


  List<_OptionItem> _resolveOptions(LearnExercise exercise) {
    final options = exercise.options ?? [];
    final labels = exercise.optionLabels;
    if (options.isEmpty && exercise.type == 'true_false') {
      return const [
        _OptionItem(label: 'A', text: 'True'),
        _OptionItem(label: 'B', text: 'False'),
      ];
    }
    if (labels != null && labels.length == options.length) {
      return List.generate(options.length, (index) {
        return _OptionItem(label: labels[index], text: options[index]);
      });
    }
    return List.generate(options.length, (index) {
      return _OptionItem(
        label: String.fromCharCode(65 + index),
        text: options[index],
      );
    });
  }


  String? _resolveCorrectLabel(LearnExercise exercise) {
    final correctRaw = exercise.correctAnswer;
    if (correctRaw == null) return null;
    final correct = correctRaw.toString().trim();
    final options = exercise.options;
    final labels = exercise.optionLabels;
    if (options != null && labels != null && options.length == labels.length) {
      final normalized = correct.toLowerCase();
      final index = options.indexWhere(
        (option) => option.toString().trim().toLowerCase() == normalized,
      );
      if (index >= 0) {
        return labels[index];
      }
    }
    return correct;
  }


  List<List<String>> _resolvePairs(LearnExercise exercise) {
    if (exercise.pairs != null && exercise.pairs!.isNotEmpty) {
      return exercise.pairs!;
    }
    final correct = exercise.correctAnswer;
    if (correct is Map && correct['pairs'] is List) {
      return (correct['pairs'] as List)
          .map((item) => List<String>.from(item as List))
          .toList();
    }
    return [];
  }

  bool _isCorrect(LearnExercise exercise) {
    if (exercise.type == 'matching') {
      final pairs = _resolvePairs(exercise);
      if (pairs.isEmpty) return false;
      for (final pair in pairs) {
        if (_userPairs[pair[0]] != pair[1]) {
          return false;
        }
      }
      return _userPairs.length == pairs.length;
    }

    final answer = _selectedOption ?? _textController.text.trim();
    if (answer.isEmpty) return false;

    if (exercise.type == 'fill_blank') {
      final correct = exercise.correctAnswer?.toString().trim().toLowerCase();
      return correct != null && answer.toLowerCase() == correct;
    }

    final correctLabel = _resolveCorrectLabel(exercise);
    if (correctLabel == null) return false;
    return answer.toLowerCase() == correctLabel.trim().toLowerCase();
  }


  @override
  Widget build(BuildContext context) {
    final exercisesAsync = ref.watch(learnExercisesProvider(widget.listId));

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.listName),
      ),
      body: exercisesAsync.when(
        loading: () => const LoadingView(message: '正在加载本地练习...'),
        error: (error, stackTrace) => ErrorView(
          message: '加载失败，请稍后重试。',
          details: error.toString(),
          onRetry: () => ref.invalidate(learnExercisesProvider(widget.listId)),
        ),
        data: (exercises) {
          if (exercises.isEmpty) {
            return const EmptyView(
              title: '暂无本地练习题库',
              subtitle: '当前列表未导入本地练习题。',
            );
          }

          final exercise = exercises[_currentIndex];
          final isMatching = exercise.type == 'matching';
          final options = _resolveOptions(exercise);
          final pairs = _resolvePairs(exercise);
          final isCorrect = _showResult ? _isCorrect(exercise) : false;

          return ListView(

            padding: const EdgeInsets.all(20),
            children: [
              Text('第 ${_currentIndex + 1} / ${exercises.length} 题'),
              const SizedBox(height: 12),
              Text(
                exercise.question,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (exercise.hint != null && exercise.hint!.isNotEmpty) ...[
                const SizedBox(height: 8),
                TextButton(
                  onPressed: () => setState(() => _showHint = !_showHint),
                  child: Text(_showHint ? '隐藏提示' : '显示提示'),
                ),
                if (_showHint)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(exercise.hint!),
                  ),
              ],
              const SizedBox(height: 16),
              if (options.isNotEmpty && !isMatching)
                _OptionList(
                  options: options,
                  selected: _selectedOption,
                  onSelected: (value) => setState(() => _selectedOption = value),
                )
              else if (!isMatching)
                TextField(
                  controller: _textController,
                  decoration: const InputDecoration(
                    labelText: '你的答案',
                    border: OutlineInputBorder(),
                  ),
                ),

              if (isMatching && pairs.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text('配对题：', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                _MatchingPanel(
                  key: ValueKey(exercise.id),
                  pairs: pairs,
                  userPairs: _userPairs,
                  selectedWord: _selectedWord,
                  isAnswered: _showResult,

                  onSelectWord: (word) => setState(() => _selectedWord = word),
                  onMatch: (word, definition) => setState(() {
                    final existing = _userPairs.entries
                        .firstWhere(
                          (entry) => entry.value == definition,
                          orElse: () => const MapEntry('', ''),
                        )
                        .key;
                    if (existing.isNotEmpty) {
                      _userPairs.remove(existing);
                    }
                    _userPairs[word] = definition;
                    _selectedWord = null;
                  }),

                  onUnmatch: (word) => setState(() {
                    _userPairs.remove(word);
                    _selectedWord = null;
                  }),
                ),
                if (_showResult) ...[
                  const SizedBox(height: 12),
                  _buildMatchingSummary(context, pairs, _userPairs),
                ],
              ],
              const SizedBox(height: 20),

              if (_showResult)
                Text(
                  isCorrect ? '回答正确' : '回答不正确',
                  style: TextStyle(
                    color: isCorrect ? Colors.green : Colors.red,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              if (_showResult && isCorrect && exercise.feedback != null && exercise.feedback!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(exercise.feedback!),
              ],
              if (_showResult && exercise.type == 'fill_blank' && !isCorrect) ...[
                const SizedBox(height: 6),
                Text('正确答案：${exercise.correctAnswer ?? ''}'),
              ],

              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        if (!_showResult) {
                          setState(() => _showResult = true);
                          return;
                        }

                        if (_currentIndex < exercises.length - 1) {
                          setState(() {
                            _currentIndex += 1;
                            _resetAnswer();
                          });
                        } else {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('本次练习完成')),
                          );
                        }
                      },
                      child: Text(_showResult ? '下一题' : '提交答案'),
                    ),
                  ),
                ],
              ),
            ],
          );

        },
      ),
    );
  }
}

class _OptionItem {
  final String label;
  final String text;

  const _OptionItem({required this.label, required this.text});
}

class _OptionList extends StatelessWidget {
  final List<_OptionItem> options;
  final String? selected;
  final ValueChanged<String> onSelected;

  const _OptionList({
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: options.map((option) {
        return RadioListTile<String>(
          title: Text('${option.label}. ${option.text}'),
          value: option.label,
          groupValue: selected,
          onChanged: (value) {
            if (value != null) {
              onSelected(value);
            }
          },
        );
      }).toList(),
    );
  }
}

class _MatchingPanel extends StatefulWidget {
  final List<List<String>> pairs;
  final Map<String, String> userPairs;
  final String? selectedWord;
  final bool isAnswered;
  final ValueChanged<String> onSelectWord;
  final void Function(String word, String definition) onMatch;
  final ValueChanged<String> onUnmatch;

  const _MatchingPanel({
    required this.pairs,
    required this.userPairs,
    required this.selectedWord,
    required this.isAnswered,
    required this.onSelectWord,
    required this.onMatch,
    required this.onUnmatch,
    super.key,
  });

  @override
  State<_MatchingPanel> createState() => _MatchingPanelState();
}

class _MatchingPanelState extends State<_MatchingPanel> {
  late List<String> _words;
  late List<String> _definitions;
  String? _pairsSignature;

  @override
  void initState() {
    super.initState();
    _pairsSignature = _signatureForPairs(widget.pairs);
    _resetShuffle();
  }

  @override
  void didUpdateWidget(covariant _MatchingPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    final nextSignature = _signatureForPairs(widget.pairs);
    if (nextSignature != _pairsSignature) {
      _pairsSignature = nextSignature;
      _resetShuffle();
    }
  }

  String _signatureForPairs(List<List<String>> pairs) {
    return pairs.map((pair) => pair.join('::')).join('||');
  }

  void _resetShuffle() {
    final words = widget.pairs.map((pair) => pair[0]).toList();
    final definitions = widget.pairs.map((pair) => pair[1]).toList();
    _words = List<String>.from(words)..shuffle(Random());
    _definitions = List<String>.from(definitions)..shuffle(Random());
  }


  @override
  Widget build(BuildContext context) {
    final selectedWord = widget.selectedWord;
    final userPairs = widget.userPairs;
    final isAnswered = widget.isAnswered;
    final colors = Theme.of(context).colorScheme;
    final correctMap = {
      for (final pair in widget.pairs) pair[0]: pair[1],
    };

    return Row(

      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _words.map((word) {
              final isSelected = selectedWord == word;
              final matchedDefinition = userPairs[word];
              final isMatched = matchedDefinition != null;
              final isCorrect = isMatched && correctMap[word] == matchedDefinition;
              final backgroundColor = isAnswered && isMatched
                  ? (isCorrect ? colors.tertiaryContainer : colors.errorContainer)
                  : isMatched
                      ? colors.primaryContainer
                      : isSelected
                          ? colors.secondaryContainer
                          : null;
              final textColor = isAnswered && isMatched
                  ? (isCorrect ? colors.onTertiaryContainer : colors.onErrorContainer)
                  : null;

              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  onPressed: isAnswered
                      ? null
                      : () {
                          if (isMatched) {
                            widget.onUnmatch(word);
                          } else {
                            widget.onSelectWord(isSelected ? '' : word);
                          }
                        },
                  style: OutlinedButton.styleFrom(
                    backgroundColor: backgroundColor,
                    foregroundColor: textColor,
                  ),
                  child: Text(word),
                ),
              );
            }).toList(),

          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: _definitions.map((definition) {
              final matchedWord = userPairs.entries
                  .firstWhere(
                    (entry) => entry.value == definition,
                    orElse: () => const MapEntry('', ''),
                  )
                  .key;
              final isMatched = matchedWord.isNotEmpty;
              final isCorrect = isMatched && correctMap[matchedWord] == definition;
              final backgroundColor = isAnswered && isMatched
                  ? (isCorrect ? colors.tertiaryContainer : colors.errorContainer)
                  : isMatched
                      ? colors.surfaceContainerHighest
                      : null;
              final textColor = isAnswered && isMatched
                  ? (isCorrect ? colors.onTertiaryContainer : colors.onErrorContainer)
                  : null;
              return Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: OutlinedButton(
                  onPressed: isAnswered || selectedWord == null || selectedWord.isEmpty || isMatched
                      ? null
                      : () => widget.onMatch(selectedWord, definition),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: backgroundColor,
                    foregroundColor: textColor,
                  ),
                  child: Text(definition),
                ),
              );
            }).toList(),

          ),
        ),
      ],
    );
  }
}


