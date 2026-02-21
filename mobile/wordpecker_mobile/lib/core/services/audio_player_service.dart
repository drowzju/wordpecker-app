import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';

class AudioPlayerService {
  AudioPlayerService._();

  static final AudioPlayerService instance = AudioPlayerService._();
  final AudioPlayer _player = AudioPlayer();
  final Dio _dio = Dio();

  Future<void> playFromUrl(BuildContext context, String url) async {
    try {
      final file = await _downloadToTemp(url);
      await _player.stop();
      await _player.play(DeviceFileSource(file.path));
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('音频播放失败')),
        );
      }
    }
  }

  Future<File> _downloadToTemp(String url) async {
    final tempDir = await getTemporaryDirectory();
    final fileName = 'word_audio_${url.hashCode}.mp3';
    final file = File('${tempDir.path}/$fileName');
    if (await file.exists()) {
      return file;
    }

    final response = await _dio.get<List<int>>(
      url,
      options: Options(responseType: ResponseType.bytes),
    );
    final bytes = response.data;
    if (bytes == null) {
      throw StateError('音频下载失败');
    }

    await file.writeAsBytes(bytes, flush: true);
    return file;
  }
}
