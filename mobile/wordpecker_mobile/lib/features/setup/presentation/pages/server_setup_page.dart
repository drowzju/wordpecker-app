import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/models/server_config.dart';
import '../../../../core/providers/server_config_provider.dart';

class ServerSetupPage extends ConsumerStatefulWidget {
  final ServerConfig? initialConfig;

  const ServerSetupPage({super.key, this.initialConfig});

  @override
  ConsumerState<ServerSetupPage> createState() => _ServerSetupPageState();
}

class _ServerSetupPageState extends ConsumerState<ServerSetupPage> {
  late final TextEditingController _baseUrlController;
  late final TextEditingController _userIdController;

  @override
  void initState() {
    super.initState();
    _baseUrlController = TextEditingController(text: widget.initialConfig?.baseUrl ?? '');
    _userIdController = TextEditingController(text: widget.initialConfig?.userId ?? '');
  }

  @override
  void dispose() {
    _baseUrlController.dispose();
    _userIdController.dispose();
    super.dispose();
  }

  String _normalizeBaseUrl(String value) {
    var input = value.trim();
    if (input.isEmpty) return input;
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'http://$input';
    }
    input = input.replaceAll(RegExp(r'/+$'), '');
    if (input.endsWith('/api')) {
      input = input.substring(0, input.length - 4);
    }
    return input;
  }


  Future<void> _save() async {
    final rawUrl = _baseUrlController.text;
    final rawUserId = _userIdController.text.trim();

    final baseUrl = _normalizeBaseUrl(rawUrl);
    if (baseUrl.isEmpty || rawUserId.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('请填写服务器地址和绑定码/用户ID。')),
        );
      }
      return;
    }

    final config = ServerConfig(
      baseUrl: baseUrl,
      userId: rawUserId,
      updatedAt: DateTime.now(),
    );

    await ref.read(serverConfigProvider.notifier).saveConfig(config);

    if (mounted) {
      Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.initialConfig != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? '服务器设置' : '绑定服务器'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            '请在 Web 端生成绑定码/二维码。扫码会自动填写服务器地址和绑定码。\n\n当前 MVP 先支持手动填写。',
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _baseUrlController,
            decoration: const InputDecoration(
              labelText: '服务器地址',
              hintText: '例如 http://192.168.1.8:3000（不含 /api）',

              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _userIdController,
            decoration: const InputDecoration(
              labelText: '绑定码 / 用户ID',
              hintText: '从 Web 端获取',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _save,
            child: Text(isEditing ? '保存配置' : '保存并继续'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('二维码扫描将在后续版本提供。')),
              );
            },
            icon: const Icon(Icons.qr_code_scanner),
            label: const Text('扫码绑定（占位）'),
          ),
        ],
      ),
    );
  }
}
