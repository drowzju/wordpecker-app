import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/providers/server_config_provider.dart';
import 'features/lists/presentation/pages/lists_page.dart';
import 'shared/widgets/error_view.dart';
import 'shared/widgets/loading_view.dart';



class WordPeckerApp extends ConsumerWidget {
  const WordPeckerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final configAsync = ref.watch(serverConfigProvider);

    const primary = Color(0xFF1890FF);
    const secondary = Color(0xFF38A169);
    const surface = Color(0xFF1E293B);
    const background = Color(0xFF0F172A);
    const border = Color(0xFF334155);
    const textPrimary = Color(0xFFF8FAFC);
    const textSecondary = Color(0xFF94A3B8);
    const textMuted = Color(0xFF64748B);
    const error = Color(0xFFFF4D4F);

    final colorScheme = const ColorScheme.dark().copyWith(
      primary: primary,
      secondary: secondary,
      surface: surface,
      background: background,
      error: error,
      onPrimary: Colors.white,
      onSecondary: Colors.white,
      onSurface: textPrimary,
      onBackground: textPrimary,
      onError: Colors.white,
    );

    final baseTextTheme = ThemeData.dark().textTheme;

    return MaterialApp(
      title: 'WordPecker',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: colorScheme,
        scaffoldBackgroundColor: background,
        textTheme: baseTextTheme.copyWith(
          headlineSmall: baseTextTheme.headlineSmall?.copyWith(
            color: textPrimary,
            fontWeight: FontWeight.w700,
          ),
          titleMedium: baseTextTheme.titleMedium?.copyWith(
            color: textPrimary,
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: baseTextTheme.bodyLarge?.copyWith(color: textPrimary),
          bodyMedium: baseTextTheme.bodyMedium?.copyWith(color: textSecondary),
          bodySmall: baseTextTheme.bodySmall?.copyWith(color: textMuted),
          labelMedium: baseTextTheme.labelMedium?.copyWith(color: textSecondary),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: background,
          foregroundColor: textPrimary,
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          color: surface,
          elevation: 2,
          shadowColor: Colors.black.withOpacity(0.3),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: border),
          ),
        ),

        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: textPrimary,
            side: const BorderSide(color: border),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surface,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: primary, width: 1.5),
          ),
          labelStyle: const TextStyle(color: textSecondary),
          hintStyle: const TextStyle(color: textMuted),
        ),
        snackBarTheme: SnackBarThemeData(
          backgroundColor: surface,
          contentTextStyle: const TextStyle(color: textPrimary),
          actionTextColor: primary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          behavior: SnackBarBehavior.floating,
        ),
        dividerTheme: const DividerThemeData(
          color: border,
          thickness: 1,
        ),
        chipTheme: ChipThemeData(
          backgroundColor: surface,
          side: const BorderSide(color: border),
          labelStyle: const TextStyle(color: textSecondary),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
        iconTheme: const IconThemeData(color: textSecondary),
      ),

      home: configAsync.when(
        loading: () => const LoadingView(message: '正在加载配置...'),
        error: (error, stackTrace) => ErrorView(
          message: '配置加载失败，请重试。',
          onRetry: () => ref.invalidate(serverConfigProvider),
        ),
        data: (config) {
          return ListsPage(config: config);
        },


      ),
    );
  }
}
