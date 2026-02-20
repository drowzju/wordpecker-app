@echo off
echo ========================================
echo WordPecker Mobile - Flutter Project Setup
echo ========================================
echo.

REM Check if Flutter is installed
flutter --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Flutter is not installed or not in PATH
    echo.
    echo Please follow the setup guide: mobile\SETUP_GUIDE.md
    echo.
    pause
    exit /b 1
)

echo [OK] Flutter is installed
echo.

REM Check if project already exists
if exist "wordpecker_mobile\pubspec.yaml" (
    echo [INFO] Project already exists
    echo.
    cd wordpecker_mobile
    echo Installing dependencies...
    call flutter pub get
    echo.
    echo [SUCCESS] Dependencies installed
    echo.
    echo You can now run the app:
    echo   cd wordpecker_mobile
    echo   flutter run
    echo.
    pause
    exit /b 0
)

echo Creating Flutter project...
echo.

REM Create Flutter project
call flutter create --org com.wordpecker --platforms android,ios wordpecker_mobile

if errorlevel 1 (
    echo [ERROR] Failed to create Flutter project
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Flutter project created
echo.

cd wordpecker_mobile

REM Backup original pubspec.yaml
copy pubspec.yaml pubspec.yaml.backup >nul

REM Update pubspec.yaml with dependencies
echo Updating pubspec.yaml with required dependencies...
(
echo name: wordpecker_mobile
echo description: A personalized language-learning mobile app
echo publish_to: 'none'
echo version: 1.0.0+1
echo.
echo environment:
echo   sdk: '>=3.2.0 ^<4.0.0'
echo.
echo dependencies:
echo   flutter:
echo     sdk: flutter
echo   cupertino_icons: ^1.0.6
echo.
echo   # State Management
echo   flutter_riverpod: ^2.4.0
echo   riverpod_annotation: ^2.3.0
echo.
echo   # Local Database
echo   drift: ^2.14.0
echo   sqlite3_flutter_libs: ^0.5.18
echo   path_provider: ^2.1.1
echo   path: ^1.8.3
echo.
echo   # Network
echo   dio: ^5.4.0
echo   connectivity_plus: ^5.0.2
echo.
echo   # Local Storage
echo   shared_preferences: ^2.2.2
echo   hive_flutter: ^1.1.0
echo.
echo   # UI Components
echo   flutter_slidable: ^3.0.1
echo   cached_network_image: ^3.3.0
echo.
echo   # Audio
echo   flutter_tts: ^3.8.3
echo.
echo   # Utilities
echo   freezed_annotation: ^2.4.1
echo   json_annotation: ^4.8.1
echo   intl: ^0.18.1
echo.
echo dev_dependencies:
echo   flutter_test:
echo     sdk: flutter
echo   flutter_lints: ^3.0.0
echo.
echo   # Code Generation
echo   build_runner: ^2.4.7
echo   drift_dev: ^2.14.0
echo   riverpod_generator: ^2.3.0
echo   freezed: ^2.4.6
echo   json_serializable: ^6.7.1
echo.
echo flutter:
echo   uses-material-design: true
) > pubspec.yaml

echo.
echo Installing dependencies...
call flutter pub get

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    echo Restoring backup pubspec.yaml...
    copy pubspec.yaml.backup pubspec.yaml >nul
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Project setup completed!
echo.
echo Next steps:
echo   1. Open the project in your IDE:
echo      - Android Studio: File ^> Open ^> Select 'wordpecker_mobile' folder
echo      - VS Code: Open 'wordpecker_mobile' folder
echo.
echo   2. Start an emulator or connect a device
echo.
echo   3. Run the app:
echo      cd wordpecker_mobile
echo      flutter run
echo.
pause
