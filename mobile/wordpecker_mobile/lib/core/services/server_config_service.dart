import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/server_config.dart';

class ServerConfigService {
  static const _configKey = 'server_config';

  Future<ServerConfig?> loadConfig() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_configKey);
    if (raw == null || raw.trim().isEmpty) {
      return null;
    }

    final Map<String, dynamic> data = jsonDecode(raw) as Map<String, dynamic>;
    final config = ServerConfig.fromJson(data);
    if (config.baseUrl.isEmpty || config.userId.isEmpty) {
      return null;
    }
    return config;
  }

  Future<void> saveConfig(ServerConfig config) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_configKey, jsonEncode(config.toJson()));
  }

  Future<void> clearConfig() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_configKey);
  }
}
