import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

Interceptor createDioLogger() {
  return InterceptorsWrapper(
    onRequest: (options, handler) {
      debugPrint('[DIO][Request] ${options.method} ${options.uri}');
      handler.next(options);
    },
    onResponse: (response, handler) {
      debugPrint('[DIO][Response] ${response.statusCode} ${response.requestOptions.uri}');
      handler.next(response);
    },

    onError: (error, handler) {
      final uri = error.requestOptions.uri;
      debugPrint('[DIO][Error] ${error.type} ${error.message}');
      debugPrint('[DIO][Error][Request] ${error.requestOptions.method} $uri');
      if (error.response != null) {
        debugPrint('[DIO][Error][Status] ${error.response?.statusCode}');
        debugPrint('[DIO][Error][Body] ${error.response?.data}');
      }
      handler.next(error);
    },
  );
}
