import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/server_config.dart';
import '../services/server_config_service.dart';

final serverConfigServiceProvider = Provider<ServerConfigService>((ref) {
  return ServerConfigService();
});

final serverConfigProvider = AsyncNotifierProvider<ServerConfigNotifier, ServerConfig?>(
  ServerConfigNotifier.new,
);

class ServerConfigNotifier extends AsyncNotifier<ServerConfig?> {
  @override
  Future<ServerConfig?> build() async {
    final service = ref.read(serverConfigServiceProvider);
    return service.loadConfig();
  }

  Future<void> saveConfig(ServerConfig config) async {
    state = const AsyncValue.loading();
    final service = ref.read(serverConfigServiceProvider);
    await service.saveConfig(config);
    state = AsyncValue.data(config);
  }

  Future<void> clearConfig() async {
    state = const AsyncValue.loading();
    final service = ref.read(serverConfigServiceProvider);
    await service.clearConfig();
    state = const AsyncValue.data(null);
  }
}
