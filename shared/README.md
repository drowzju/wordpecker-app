# Shared Resources

This directory contains resources shared across all platforms (backend, web frontend, mobile).

## Structure

- **assets/** - Shared media files (images, icons, etc.)
- **data/** - Shared data files (dictionaries, datasets, etc.)
- **templates/** - Shared templates and configurations

## Usage

### Backend
```javascript
import template from '../shared/templates/vocabulary.json';
```

### Web Frontend
```javascript
import template from '../../shared/templates/vocabulary.json';
```

### Mobile
```dart
// Access via assets bundle or copied to app directory
```

## Guidelines

- Only add resources that are truly shared across platforms
- Keep file sizes reasonable
- Document any platform-specific usage patterns
