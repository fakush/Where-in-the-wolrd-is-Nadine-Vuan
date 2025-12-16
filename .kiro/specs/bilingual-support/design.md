# Design Document - Bilingual Support

## Overview

This design document outlines the implementation of bilingual support (Spanish and English) for the "Where in the World is Nadine Vuan?" game. The solution will provide a comprehensive internationalization (i18n) system that allows players to experience the game in their preferred language while maintaining all existing functionality and game mechanics.

The design focuses on creating a language-agnostic architecture where all text content is externalized into language-specific JSON files, enabling seamless language switching without disrupting gameplay or requiring application restarts.

## Architecture

### High-Level Architecture

The bilingual support system will be implemented using a layered architecture:

1. **Localization Layer**: Manages language data loading, caching, and retrieval
2. **Translation Service**: Provides translation key resolution and fallback handling
3. **UI Integration Layer**: Integrates with existing UIManager to update interface elements
4. **Data Management Layer**: Handles language-specific game data files
5. **Persistence Layer**: Manages language preference storage and retrieval

### System Integration

The bilingual system will integrate with existing game components:

- **GameController**: Enhanced to support language-aware data loading
- **UIManager**: Extended with translation capabilities for all UI elements
- **AssetLoader**: Modified to load language-specific JSON files
- **GameState**: Updated to track current language preference
- **SessionManager**: Enhanced to persist language preferences across sessions

## Components and Interfaces

### LocalizationManager

```javascript
class LocalizationManager {
    constructor(gameController)
    async loadLanguageData(languageCode)
    getTranslation(key, fallbackText)
    getCurrentLanguage()
    setLanguage(languageCode)
    validateLanguageData(data)
    getAvailableLanguages()
}
```

**Responsibilities:**
- Load and cache language-specific JSON files
- Provide translation key resolution with fallback support
- Manage current language state
- Validate language data integrity

### LanguageSelector

```javascript
class LanguageSelector {
    constructor(localizationManager, uiManager)
    render(containerElement)
    handleLanguageChange(languageCode)
    updateVisualState()
    destroy()
}
```

**Responsibilities:**
- Render language selection UI component
- Handle user language selection events
- Update visual state to reflect current language
- Integrate with welcome screen and settings menu

### TranslationService

```javascript
class TranslationService {
    constructor(localizationManager)
    translate(key, params)
    translateElement(element, key, params)
    translateAll(containerElement)
    registerTranslationObserver(callback)
}
```

**Responsibilities:**
- Provide convenient translation methods for UI components
- Support parameterized translations
- Enable bulk translation of DOM elements
- Notify observers of language changes

## Data Models

### Language Data Structure

```json
{
  "metadata": {
    "language": "es",
    "version": "1.0",
    "lastUpdated": "2024-12-16"
  },
  "ui": {
    "buttons": {
      "start_game": "Comenzar Búsqueda",
      "select_city": "Viajar a esta Ciudad",
      "view_clues": "Ver Pistas",
      "restart": "Nueva Búsqueda"
    },
    "labels": {
      "current_location": "Ubicación Actual",
      "clues_collected": "Pistas Recolectadas",
      "cities_visited": "Ciudades Visitadas"
    },
    "messages": {
      "correct_city": "¡Correcto! Nadine estuvo aquí.",
      "wrong_city": "Ups... Nadine no ha estado en esta ciudad.",
      "game_over_time": "Se acabó el tiempo. ¿Quieres intentarlo otra vez?"
    }
  },
  "game_data": {
    "cities": [...],
    "intro": {...},
    "tutorial": {...}
  }
}
```

### Language Configuration

```json
{
  "defaultLanguage": "es",
  "supportedLanguages": ["es", "en"],
  "fallbackLanguage": "es",
  "languageFiles": {
    "es": "assets/data/game_data.es.json",
    "en": "assets/data/game_data.en.json"
  },
  "languageNames": {
    "es": "Español",
    "en": "English"
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Language Selection Storage
*For any* language selection by the user, the system should store that preference and retrieve it correctly in subsequent sessions
**Validates: Requirements 1.2, 1.5, 5.4**

### Property 2: UI Translation Consistency
*For any* language selection, all visible UI elements should display text in the selected language without mixing languages
**Validates: Requirements 1.3, 4.4, 4.5, 5.2**

### Property 3: Translation Key Resolution
*For any* valid translation key, the system should return the appropriate translation from the active language data
**Validates: Requirements 2.2, 4.1, 4.2, 4.3**

### Property 4: Language Data Loading
*For any* supported language code, the system should load the corresponding language-specific JSON file completely
**Validates: Requirements 2.1, 3.1, 3.2**

### Property 5: Missing Translation Handling
*For any* missing or invalid translation key, the system should display the key name and log an error without crashing
**Validates: Requirements 2.5**

### Property 6: Data Structure Consistency
*For any* translation key that exists in one language file, the same key should exist in all other language files with appropriate translations
**Validates: Requirements 3.3, 3.4**

### Property 7: Fallback Mechanism
*For any* file loading error or missing translation, the system should fallback to the default Spanish content gracefully
**Validates: Requirements 3.5**

### Property 8: Game State Preservation
*For any* language switch during gameplay, the current game state and progress should remain unchanged
**Validates: Requirements 5.3, 5.5**

### Property 9: Template Processing
*For any* HTML template with translation placeholders, the system should replace all placeholders with localized content
**Validates: Requirements 2.3**

### Property 10: JavaScript Message Localization
*For any* JavaScript-generated message, the system should use translation keys instead of hardcoded strings
**Validates: Requirements 2.4**

## Error Handling

### Language Loading Errors
- **File Not Found**: Fallback to default Spanish content with user notification
- **Invalid JSON**: Log error, show user-friendly message, use fallback content
- **Network Timeout**: Retry mechanism with exponential backoff, fallback on failure
- **Corrupted Data**: Validate data structure, use fallback if validation fails

### Translation Errors
- **Missing Keys**: Display key name, log warning, continue operation
- **Invalid Parameters**: Use default parameter values, log warning
- **Circular References**: Detect and prevent infinite loops in translation resolution

### UI Integration Errors
- **Element Not Found**: Log warning, skip translation for that element
- **DOM Manipulation Errors**: Graceful degradation, maintain functionality
- **Event Handler Errors**: Isolate errors, prevent cascade failures

## Testing Strategy

### Unit Testing Approach
The bilingual support system will use comprehensive unit testing to verify:

- **LocalizationManager**: Test language loading, caching, and retrieval mechanisms
- **LanguageSelector**: Test UI rendering and event handling
- **TranslationService**: Test translation resolution and parameter substitution
- **Integration Points**: Test interaction with existing game components

### Property-Based Testing Approach
Property-based testing will be implemented using **fast-check** library for JavaScript to verify universal properties across all inputs:

- **Language Selection Properties**: Test that language selection works correctly for all supported languages
- **Translation Consistency Properties**: Verify that translations maintain consistency across language switches
- **Data Loading Properties**: Test that language data loading works for various file conditions
- **Error Handling Properties**: Verify graceful degradation for various error conditions

Each property-based test will run a minimum of 100 iterations to ensure thorough coverage of the input space. Tests will be tagged with comments explicitly referencing the correctness properties from this design document using the format: **Feature: bilingual-support, Property {number}: {property_text}**

### Integration Testing
- **End-to-End Language Switching**: Test complete language switching workflow
- **Game State Preservation**: Verify game state remains intact during language changes
- **UI Consistency**: Test that all UI elements update correctly across language switches
- **Performance Testing**: Ensure language switching doesn't impact game performance

### Validation Testing
- **Data Structure Validation**: Verify consistency between language files
- **Translation Completeness**: Ensure all required translations exist
- **Fallback Mechanism Testing**: Test error scenarios and fallback behavior