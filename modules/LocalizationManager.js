/**
 * LocalizationManager.js - Internationalization and Language Management
 * Manages language data loading, caching, and retrieval for bilingual support
 */

import { LanguageConfig } from './LanguageConfig.js';

export class LocalizationManager {
    constructor(gameController, languageConfig = null) {
        this.gameController = gameController;
        this.languageConfig = languageConfig || new LanguageConfig();
        this.currentLanguage = this.languageConfig.getDefaultLanguage();
        this.languageData = new Map(); // Cache for loaded language data
        this.isLoading = false;
        this.loadingPromises = new Map(); // Track ongoing loading operations

        // Bind methods to maintain context
        this.loadLanguageData = this.loadLanguageData.bind(this);
        this.getTranslation = this.getTranslation.bind(this);
        this.setLanguage = this.setLanguage.bind(this);
    }

    /**
     * Load language-specific data from JSON file
     * @param {string} languageCode - Language code (e.g., 'es', 'en')
     * @returns {Promise<Object>} Loaded language data
     */
    async loadLanguageData(languageCode) {
        // Validate language code
        if (!this.languageConfig.isLanguageSupported(languageCode)) {
            throw new Error(`Unsupported language: ${languageCode}`);
        }

        // Return cached data if available
        if (this.languageData.has(languageCode)) {
            return this.languageData.get(languageCode);
        }

        // Return existing loading promise if already in progress
        if (this.loadingPromises.has(languageCode)) {
            return this.loadingPromises.get(languageCode);
        }

        // Create loading promise that loads both game data and UI translations
        const loadingPromise = this._loadCompleteLanguageData(languageCode);
        this.loadingPromises.set(languageCode, loadingPromise);

        try {
            const data = await loadingPromise;
            
            // Cache the loaded data
            this.languageData.set(languageCode, data);
            
            // Clean up loading promise
            this.loadingPromises.delete(languageCode);
            
            return data;
        } catch (error) {
            // Clean up loading promise on error
            this.loadingPromises.delete(languageCode);
            throw error;
        }
    }

    /**
     * Internal method to load complete language data (game data + UI translations)
     * @param {string} languageCode - Language code
     * @returns {Promise<Object>} Complete language data
     * @private
     */
    async _loadCompleteLanguageData(languageCode) {
        try {
            // Load both game data and UI translations in parallel
            const [gameData, uiTranslations] = await Promise.all([
                this._loadLanguageDataFromFile(languageCode),
                this._loadUITranslationsFromFile(languageCode)
            ]);

            // Merge the data
            const completeData = {
                ...gameData,
                ui: {
                    ...gameData.ui,
                    ...uiTranslations.ui
                }
            };

            return completeData;
        } catch (error) {
            console.error(`Error loading complete language data for ${languageCode}:`, error);
            
            // Try to load at least the game data
            try {
                const gameData = await this._loadLanguageDataFromFile(languageCode);
                console.warn(`Using game data only for ${languageCode} - UI translations failed to load`);
                return gameData;
            } catch (gameDataError) {
                console.error(`Failed to load even game data for ${languageCode}:`, gameDataError);
                throw error;
            }
        }
    }

    /**
     * Internal method to load language data from file with comprehensive error handling
     * @param {string} languageCode - Language code
     * @returns {Promise<Object>} Language data
     * @private
     */
    async _loadLanguageDataFromFile(languageCode) {
        const filePath = this.languageConfig.getLanguageFilePath(languageCode);
        
        if (!filePath) {
            const error = new Error(`No file path configured for language: ${languageCode}`);
            this._logFileLoadingError('no_file_path', languageCode, filePath, error);
            throw error;
        }

        let lastError = null;
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        // Attempt to load with retries
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                let rawData;

                // Use AssetLoader if available for enhanced error handling
                if (this.gameController.uiManager && this.gameController.uiManager.assetLoader) {
                    rawData = await this._loadWithAssetLoader(filePath, languageCode, attempt);
                } else {
                    rawData = await this._loadWithFetch(filePath, languageCode, attempt);
                }

                // Validate the loaded data structure
                const validationResult = this.validateLanguageData(rawData);
                if (!validationResult.isValid) {
                    this._logFileLoadingError('validation_failed', languageCode, filePath,
                        new Error(`Validation failed: ${validationResult.errors.join(', ')}`));

                    // If validation fails but we have basic structure, try to use it anyway
                    if (rawData && (rawData.game_data || rawData.ui)) {
                        console.warn(`Using potentially incomplete language data for ${languageCode}`);
                        return this._normalizeLanguageData(rawData);
                    }

                    throw new Error(`Invalid language data structure for ${languageCode}: ${validationResult.errors.join(', ')}`);
                }

                // Success - log and return normalized data
                if (attempt > 1) {
                    console.log(`Successfully loaded ${languageCode} language data on attempt ${attempt}`);
                }
                return this._normalizeLanguageData(rawData);

            } catch (error) {
                lastError = error;
                this._logFileLoadingError('load_attempt_failed', languageCode, filePath, error, attempt);

                // If this isn't the last attempt, wait before retrying
                if (attempt < maxRetries) {
                    console.log(`Retrying language data load for ${languageCode} in ${retryDelay * attempt}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await this._delay(retryDelay * attempt);
                } else {
                    // All attempts failed, try fallback strategies
                    return await this._handleFileLoadingFailure(languageCode, filePath, lastError);
                }
            }
        }

        // This should not be reached, but just in case
        throw lastError || new Error(`Failed to load language data for ${languageCode} after ${maxRetries} attempts`);
    }

    /**
     * Load language data using AssetLoader
     * @param {string} filePath - File path to load
     * @param {string} languageCode - Language code
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} Raw language data
     * @private
     */
    async _loadWithAssetLoader(filePath, languageCode, attempt) {
        try {
            return await this.gameController.uiManager.assetLoader.loadGameData(filePath, {
                timeout: 15000 + (attempt * 5000), // Increase timeout with each attempt
                retryOnFailure: false, // We handle retries ourselves
                showLoadingState: false
            });
        } catch (error) {
            // Enhance error with context
            error.loadMethod = 'AssetLoader';
            error.attempt = attempt;
            throw error;
        }
    }

    /**
     * Load language data using direct fetch
     * @param {string} filePath - File path to load
     * @param {string} languageCode - Language code
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} Raw language data
     * @private
     */
    async _loadWithFetch(filePath, languageCode, attempt) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000 + (attempt * 5000));

            const response = await fetch(filePath, {
                signal: controller.signal,
                cache: attempt > 1 ? 'no-cache' : 'default' // Bypass cache on retries
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }

            const rawData = await response.json();
            return rawData;

        } catch (error) {
            // Enhance error with context
            if (error.name === 'AbortError') {
                error.message = 'Request timeout';
            }
            error.loadMethod = 'fetch';
            error.attempt = attempt;
            throw error;
        }
    }

    /**
     * Handle comprehensive fallback strategies when file loading fails
     * @param {string} languageCode - Language code that failed to load
     * @param {string} filePath - File path that failed
     * @param {Error} error - The loading error
     * @returns {Promise<Object>} Fallback language data
     * @private
     */
    async _handleFileLoadingFailure(languageCode, filePath, error) {
        this._logFileLoadingError('all_attempts_failed', languageCode, filePath, error);

        // Strategy 1: Try fallback to default Spanish content
        const fallbackLanguage = this.languageConfig.getFallbackLanguage();
        if (languageCode !== fallbackLanguage) {
            console.log(`Attempting fallback to ${fallbackLanguage} for failed ${languageCode} load`);
            try {
                const fallbackData = await this.loadLanguageData(fallbackLanguage);
                console.warn(`Using fallback language data (${fallbackLanguage}) for ${languageCode}`);

                // Mark this data as fallback for transparency
                const markedFallbackData = {
                    ...fallbackData,
                    metadata: {
                        ...fallbackData.metadata,
                        isFallback: true,
                        originalLanguage: languageCode,
                        fallbackReason: error.message
                    }
                };

                return markedFallbackData;
            } catch (fallbackError) {
                this._logFileLoadingError('fallback_failed', languageCode, filePath, fallbackError);
                console.error(`Fallback language loading also failed:`, fallbackError);
            }
        }

        // Strategy 2: Try to load from alternative file paths
        const alternativePaths = this._getAlternativeFilePaths(languageCode, filePath);
        for (const altPath of alternativePaths) {
            try {
                console.log(`Trying alternative path for ${languageCode}: ${altPath}`);
                const rawData = await this._loadWithFetch(altPath, languageCode, 1);

                console.warn(`Loaded ${languageCode} from alternative path: ${altPath}`);
                return this._normalizeLanguageData(rawData);
            } catch (altError) {
                console.log(`Alternative path ${altPath} also failed:`, altError.message);
            }
        }

        // Strategy 3: Create minimal emergency data structure
        console.error(`All fallback strategies failed for ${languageCode}, creating emergency data`);
        return this._createEmergencyLanguageData(languageCode, error);
    }

    /**
     * Get alternative file paths to try when primary path fails
     * @param {string} languageCode - Language code
     * @param {string} originalPath - Original file path that failed
     * @returns {Array<string>} Alternative paths to try
     * @private
     */
    _getAlternativeFilePaths(languageCode, originalPath) {
        const alternatives = [];

        // Try different file extensions
        if (originalPath.endsWith('.json')) {
            const basePath = originalPath.slice(0, -5);
            alternatives.push(`${basePath}.js`);
        }

        // Try different directory structures
        const pathParts = originalPath.split('/');
        if (pathParts.length > 2) {
            // Try moving up one directory level
            const altPath1 = [...pathParts.slice(0, -2), pathParts[pathParts.length - 1]].join('/');
            alternatives.push(altPath1);

            // Try assets/data root
            alternatives.push(`assets/data/game_data.${languageCode}.json`);
            alternatives.push(`assets/game_data.${languageCode}.json`);
            alternatives.push(`data/game_data.${languageCode}.json`);
        }

        // Try legacy file names
        alternatives.push(`assets/data/game_data_${languageCode}.json`);
        alternatives.push(`game_data_${languageCode}.json`);

        return alternatives.filter(path => path !== originalPath);
    }

    /**
     * Create emergency language data when all loading strategies fail
     * @param {string} languageCode - Language code
     * @param {Error} error - The original error
     * @returns {Object} Emergency language data structure
     * @private
     */
    _createEmergencyLanguageData(languageCode, error) {
        console.warn(`Creating emergency language data for ${languageCode}`);

        const emergencyData = {
            metadata: {
                language: languageCode,
                version: '1.0-emergency',
                lastUpdated: new Date().toISOString().split('T')[0],
                isEmergency: true,
                originalError: error.message
            },
            ui: {
                buttons: {
                    start_game: languageCode === 'es' ? 'Comenzar Búsqueda' : 'Start Investigation',
                    select_city: languageCode === 'es' ? 'Viajar a esta Ciudad' : 'Travel to this City',
                    view_clues: languageCode === 'es' ? 'Ver Pistas' : 'View Clues',
                    restart: languageCode === 'es' ? 'Nueva Búsqueda' : 'New Investigation'
                },
                labels: {
                    current_location: languageCode === 'es' ? 'Ubicación Actual' : 'Current Location',
                    clues_collected: languageCode === 'es' ? 'Pistas Recolectadas' : 'Clues Collected',
                    cities_visited: languageCode === 'es' ? 'Ciudades Visitadas' : 'Cities Visited'
                },
                messages: {
                    loading_error: languageCode === 'es' ?
                        'Error al cargar datos del juego. Usando datos de emergencia.' :
                        'Error loading game data. Using emergency data.',
                    correct_city: languageCode === 'es' ? '¡Correcto! Nadine estuvo aquí.' : 'Correct! Nadine was here.',
                    wrong_city: languageCode === 'es' ? 'Ups... Nadine no ha estado en esta ciudad.' : 'Oops... Nadine has not been in this city.',
                    game_over_time: languageCode === 'es' ?
                        'Se acabó el tiempo. ¿Quieres intentarlo otra vez?' :
                        'Time is up. Do you want to try again?'
                }
            },
            game_data: {
                cities: [], // Will be populated with minimal data if needed
                intro: {
                    title: languageCode === 'es' ?
                        '¿Dónde en el Mundo está Nadine Vuan?' :
                        'Where in the World is Nadine Vuan?',
                    description: languageCode === 'es' ?
                        'Ayuda a Steve a encontrar a Nadine siguiendo las pistas.' :
                        'Help Steve find Nadine by following the clues.'
                }
            }
        };

        return emergencyData;
    }

    /**
     * Log file loading errors with appropriate context
     * @param {string} errorType - Type of loading error
     * @param {string} languageCode - Language code
     * @param {string} filePath - File path
     * @param {Error} error - Error object
     * @param {number} attempt - Attempt number (optional)
     * @private
     */
    _logFileLoadingError(errorType, languageCode, filePath, error, attempt = null) {
        const logEntry = {
            type: errorType,
            languageCode: languageCode,
            filePath: filePath,
            message: error.message,
            attempt: attempt,
            timestamp: new Date().toISOString(),
            errorDetails: {
                name: error.name,
                stack: error.stack,
                loadMethod: error.loadMethod
            }
        };

        // Log at appropriate level
        switch (errorType) {
            case 'no_file_path':
            case 'all_attempts_failed':
            case 'fallback_failed':
                console.error('Language File Loading Error:', logEntry);
                break;

            case 'load_attempt_failed':
                if (attempt === 1) {
                    console.warn('Language File Loading Warning:', logEntry);
                } else {
                    console.log('Language File Retry:', logEntry);
                }
                break;

            case 'validation_failed':
                console.warn('Language File Validation Error:', logEntry);
                break;

            default:
                console.log('Language File Loading Info:', logEntry);
        }

        // Store error for debugging
        if (!this._fileLoadingErrors) {
            this._fileLoadingErrors = [];
        }

        this._fileLoadingErrors.push(logEntry);
        if (this._fileLoadingErrors.length > 50) {
            this._fileLoadingErrors.shift();
        }
    }

    /**
     * Utility method for delays in retry logic
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Internal method to load UI translations from file
     * @param {string} languageCode - Language code
     * @returns {Promise<Object>} UI translations data
     * @private
     */
    async _loadUITranslationsFromFile(languageCode) {
        const filePath = this.languageConfig.getUITranslationFilePath(languageCode);
        
        if (!filePath) {
            console.warn(`No UI translation file path configured for language: ${languageCode}`);
            return { ui: {} };
        }

        try {
            // Use AssetLoader if available for enhanced error handling
            let rawData;
            
            if (this.gameController.uiManager && this.gameController.uiManager.assetLoader) {
                rawData = await this.gameController.uiManager.assetLoader.loadGameData(filePath, {
                    timeout: 10000,
                    retryOnFailure: true,
                    showLoadingState: false
                });
            } else {
                // Fallback to direct fetch
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to load UI translations: HTTP ${response.status} - ${response.statusText}`);
                }
                rawData = await response.json();
            }

            // Validate the UI translations structure
            if (!rawData || !rawData.ui) {
                console.warn(`Invalid UI translations structure for ${languageCode}`);
                return { ui: {} };
            }

            return rawData;

        } catch (error) {
            console.warn(`Error loading UI translations for ${languageCode}:`, error);
            return { ui: {} };
        }
    }

    /**
     * Normalize language data structure to ensure consistency
     * @param {Object} rawData - Raw loaded data
     * @returns {Object} Normalized language data
     * @private
     */
    _normalizeLanguageData(rawData) {
        // Handle different possible data structures
        const gameData = rawData.game_data || rawData;
        
        return {
            metadata: rawData.metadata || {
                language: this.currentLanguage,
                version: '1.0',
                lastUpdated: new Date().toISOString().split('T')[0]
            },
            ui: rawData.ui || this._extractUIFromGameData(gameData),
            game_data: gameData
        };
    }

    /**
     * Extract UI text from game data structure for backward compatibility
     * @param {Object} gameData - Game data object
     * @returns {Object} UI text structure
     * @private
     */
    _extractUIFromGameData(gameData) {
        const ui = {
            buttons: {},
            labels: {},
            messages: {}
        };

        // Extract UI text from game_messages if available
        if (gameData.game_messages) {
            ui.messages = { ...gameData.game_messages };
        }

        // Extract UI text from ui_text if available
        if (gameData.ui_text) {
            ui.buttons = { ...gameData.ui_text.buttons };
            ui.labels = { ...gameData.ui_text.labels };
        }

        return ui;
    }

    /**
     * Get translation for a specific key with enhanced error handling
     * @param {string} key - Translation key (e.g., 'ui.buttons.start_game')
     * @param {string} fallbackText - Fallback text if translation not found
     * @returns {string} Translated text or fallback
     */
    getTranslation(key, fallbackText = null) {
        try {
            // Validate input parameters
            if (!key || typeof key !== 'string') {
                this._logTranslationError('invalid_key', key, 'Translation key must be a non-empty string');
                return fallbackText || '[INVALID_KEY]';
            }

            const languageData = this.languageData.get(this.currentLanguage);

            if (!languageData) {
                this._logTranslationError('no_language_data', key, `No language data loaded for ${this.currentLanguage}`);
                return this._handleMissingLanguageData(key, fallbackText);
            }

            // Navigate through nested object structure using dot notation
            const keys = key.split('.');
            let value = languageData;

            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    // Key not found in current language, try fallback mechanisms
                    return this._handleMissingTranslationKey(key, keys, fallbackText);
                }
            }

            // Return the found value if it's a string
            if (typeof value === 'string') {
                return value;
            }

            // If value is not a string, handle as missing translation
            this._logTranslationError('invalid_value_type', key, `Translation key '${key}' does not resolve to a string value, got: ${typeof value}`);
            return this._handleMissingTranslationKey(key, keys, fallbackText);

        } catch (error) {
            this._logTranslationError('exception', key, `Exception during translation: ${error.message}`, error);
            return this._handleTranslationException(key, fallbackText, error);
        }
    }

    /**
     * Handle missing language data with fallback mechanisms
     * @param {string} key - Translation key
     * @param {string} fallbackText - Fallback text
     * @returns {string} Fallback translation
     * @private
     */
    _handleMissingLanguageData(key, fallbackText) {
        // Try to load fallback language data if available
        const fallbackLanguage = this.languageConfig.getFallbackLanguage();

        if (this.currentLanguage !== fallbackLanguage && this.languageData.has(fallbackLanguage)) {
            const fallbackData = this.languageData.get(fallbackLanguage);
            const fallbackTranslation = this._extractTranslationFromData(key, fallbackData);

            if (fallbackTranslation) {
                this._logTranslationError('fallback_language_used', key, `Using fallback language ${fallbackLanguage} for missing data`);
                return fallbackTranslation;
            }
        }

        // Return appropriate fallback
        return fallbackText || this._generateMissingKeyDisplay(key);
    }

    /**
     * Handle missing translation key with comprehensive fallback strategy
     * @param {string} key - Translation key
     * @param {Array} keys - Split key parts
     * @param {string} fallbackText - Fallback text
     * @returns {string} Fallback translation
     * @private
     */
    _handleMissingTranslationKey(key, keys, fallbackText) {
        // Strategy 1: Try fallback language
        const fallbackLanguage = this.languageConfig.getFallbackLanguage();
        if (this.currentLanguage !== fallbackLanguage) {
            const fallbackData = this.languageData.get(fallbackLanguage);
            if (fallbackData) {
                const fallbackTranslation = this._extractTranslationFromData(key, fallbackData);
                if (fallbackTranslation) {
                    this._logTranslationError('fallback_language_used', key, `Translation key '${key}' not found in ${this.currentLanguage}, using fallback language ${fallbackLanguage}`);
                    return fallbackTranslation;
                }
            }
        }

        // Strategy 2: Try partial key matching (for nested keys)
        const partialMatch = this._tryPartialKeyMatching(keys, this.languageData.get(this.currentLanguage));
        if (partialMatch) {
            this._logTranslationError('partial_match_used', key, `Using partial match for missing key: ${key}`);
            return partialMatch;
        }

        // Strategy 3: Try similar key suggestions
        const similarKey = this._findSimilarKey(key, this.languageData.get(this.currentLanguage));
        if (similarKey) {
            this._logTranslationError('similar_key_used', key, `Using similar key '${similarKey}' for missing key: ${key}`);
            return this._extractTranslationFromData(similarKey, this.languageData.get(this.currentLanguage));
        }

        // Strategy 4: Use provided fallback or generate display key
        this._logTranslationError('missing_key', key, `Missing translation key: ${key} for language: ${this.currentLanguage}`);
        return fallbackText || this._generateMissingKeyDisplay(key);
    }

    /**
     * Handle translation exceptions gracefully
     * @param {string} key - Translation key
     * @param {string} fallbackText - Fallback text
     * @param {Error} error - The exception that occurred
     * @returns {string} Safe fallback translation
     * @private
     */
    _handleTranslationException(key, fallbackText, error) {
        // Try to provide a safe fallback even during exceptions
        try {
            // If we have fallback text, use it
            if (fallbackText && typeof fallbackText === 'string') {
                return fallbackText;
            }

            // Try to extract a reasonable display from the key
            return this._generateMissingKeyDisplay(key);

        } catch (fallbackError) {
            // Last resort - return a safe string
            console.error('Critical translation error - using emergency fallback:', fallbackError);
            return '[TRANSLATION_ERROR]';
        }
    }

    /**
     * Extract translation from language data object
     * @param {string} key - Translation key
     * @param {Object} data - Language data object
     * @returns {string|null} Translation or null if not found
     * @private
     */
    _extractTranslationFromData(key, data) {
        if (!data || !key) return null;

        try {
            const keys = key.split('.');
            let value = data;

            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    return null;
                }
            }

            return typeof value === 'string' ? value : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Try to find a partial match for missing nested keys
     * @param {Array} keys - Split key parts
     * @param {Object} data - Language data
     * @returns {string|null} Partial match or null
     * @private
     */
    _tryPartialKeyMatching(keys, data) {
        if (!data || !keys || keys.length < 2) return null;

        try {
            // Try progressively shorter key paths
            for (let i = keys.length - 1; i > 0; i--) {
                const partialKey = keys.slice(0, i).join('.');
                const partialTranslation = this._extractTranslationFromData(partialKey, data);

                if (partialTranslation) {
                    // Add the missing part as a suffix to indicate partial match
                    const missingSuffix = keys.slice(i).join('.');
                    return `${partialTranslation} [${missingSuffix}]`;
                }
            }
        } catch (error) {
            // Ignore errors in partial matching
        }

        return null;
    }

    /**
     * Find similar keys that might be typos or variations
     * @param {string} targetKey - The key we're looking for
     * @param {Object} data - Language data
     * @returns {string|null} Similar key or null
     * @private
     */
    _findSimilarKey(targetKey, data) {
        if (!data || !targetKey) return null;

        try {
            const allKeys = this._getAllKeysFromData(data);
            const targetLower = targetKey.toLowerCase();

            // Look for exact case-insensitive match first
            const exactMatch = allKeys.find(key => key.toLowerCase() === targetLower);
            if (exactMatch && exactMatch !== targetKey) {
                return exactMatch;
            }

            // Look for keys that contain the target or vice versa
            const containsMatch = allKeys.find(key => {
                const keyLower = key.toLowerCase();
                return keyLower.includes(targetLower) || targetLower.includes(keyLower);
            });

            return containsMatch || null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get all translation keys from data object
     * @param {Object} data - Language data
     * @param {string} prefix - Key prefix for nested objects
     * @returns {Array} Array of all keys
     * @private
     */
    _getAllKeysFromData(data, prefix = '') {
        const keys = [];

        try {
            for (const [key, value] of Object.entries(data)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;

                if (typeof value === 'string') {
                    keys.push(fullKey);
                } else if (value && typeof value === 'object') {
                    keys.push(...this._getAllKeysFromData(value, fullKey));
                }
            }
        } catch (error) {
            // Return what we have so far
        }

        return keys;
    }

    /**
     * Generate a user-friendly display for missing keys
     * @param {string} key - Translation key
     * @returns {string} Display text for missing key
     * @private
     */
    _generateMissingKeyDisplay(key) {
        if (!key || typeof key !== 'string') {
            return '[INVALID_KEY]';
        }

        // Extract the last part of the key and make it human-readable
        const parts = key.split('.');
        const lastPart = parts[parts.length - 1];

        // Convert snake_case or camelCase to readable text
        const readable = lastPart
            .replace(/[_-]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());

        return readable || key;
    }

    /**
     * Log translation errors with appropriate detail level
     * @param {string} errorType - Type of translation error
     * @param {string} key - Translation key
     * @param {string} message - Error message
     * @param {Error} error - Optional error object
     * @private
     */
    _logTranslationError(errorType, key, message, error = null) {
        const logEntry = {
            type: errorType,
            key: key,
            language: this.currentLanguage,
            message: message,
            timestamp: new Date().toISOString()
        };

        // Log at appropriate level based on error type
        switch (errorType) {
            case 'missing_key':
            case 'no_language_data':
                console.error('Translation Error:', logEntry);
                break;

            case 'fallback_language_used':
            case 'partial_match_used':
            case 'similar_key_used':
                console.warn('Translation Fallback:', logEntry);
                break;

            case 'invalid_key':
            case 'invalid_value_type':
                console.warn('Translation Warning:', logEntry);
                break;

            case 'exception':
                console.error('Translation Exception:', logEntry, error);
                break;

            default:
                console.log('Translation Info:', logEntry);
        }

        // Store error for debugging (keep last 100 errors)
        if (!this._translationErrors) {
            this._translationErrors = [];
        }
        
        this._translationErrors.push(logEntry);
        if (this._translationErrors.length > 100) {
            this._translationErrors.shift();
        }
    }

    /**
     * Get current language code
     * @returns {string} Current language code
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Set current language and load data if needed
     * @param {string} languageCode - Language code to set
     * @returns {Promise<boolean>} Success status
     */
    async setLanguage(languageCode) {
        if (!this.languageConfig.isLanguageSupported(languageCode)) {
            console.error(`Unsupported language: ${languageCode}`);
            return false;
        }

        if (this.currentLanguage === languageCode) {
            return true; // Already set to this language
        }

        try {
            // Load language data if not already cached
            await this.loadLanguageData(languageCode);
            
            // Update current language
            this.currentLanguage = languageCode;
            
            console.log(`Language changed to: ${languageCode}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to set language to ${languageCode}:`, error);
            return false;
        }
    }

    /**
     * Validate language data structure
     * @param {Object} data - Language data to validate
     * @returns {Object} Validation result with isValid and errors
     */
    validateLanguageData(data) {
        const errors = [];
        
        if (!data || typeof data !== 'object') {
            errors.push('Data must be an object');
            return { isValid: false, errors };
        }

        // Check for required structure (either direct game_data or wrapped)
        const gameData = data.game_data || data;
        
        if (!gameData || typeof gameData !== 'object') {
            errors.push('Missing or invalid game_data structure');
        }

        // Validate cities array if present
        if (gameData.cities) {
            if (!Array.isArray(gameData.cities)) {
                errors.push('cities must be an array');
            } else if (gameData.cities.length === 0) {
                errors.push('cities array cannot be empty');
            }
        }

        // Validate UI structure if present
        if (data.ui) {
            if (typeof data.ui !== 'object') {
                errors.push('ui must be an object');
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get list of available languages
     * @returns {Array} Array of language objects with code and name
     */
    getAvailableLanguages() {
        return this.languageConfig.getSupportedLanguages().map(code => ({
            code,
            name: this.languageConfig.getLanguageName(code),
            metadata: this.languageConfig.getLanguageMetadata(code),
            isLoaded: this.languageData.has(code)
        }));
    }

    /**
     * Preload all supported languages
     * @returns {Promise<Object>} Loading results
     */
    async preloadAllLanguages() {
        const supportedLanguages = this.languageConfig.getSupportedLanguages();
        const results = {
            loaded: [],
            failed: [],
            total: supportedLanguages.length
        };

        const loadPromises = supportedLanguages.map(async (languageCode) => {
            try {
                await this.loadLanguageData(languageCode);
                results.loaded.push(languageCode);
                return { languageCode, success: true };
            } catch (error) {
                results.failed.push({ languageCode, error: error.message });
                return { languageCode, success: false, error };
            }
        });

        await Promise.allSettled(loadPromises);
        
        console.log(`Language preloading complete: ${results.loaded.length}/${results.total} successful`);
        return results;
    }

    /**
     * Clear language data cache
     * @param {string} languageCode - Optional specific language to clear
     */
    clearCache(languageCode = null) {
        if (languageCode) {
            this.languageData.delete(languageCode);
            this.loadingPromises.delete(languageCode);
            console.log(`Cleared cache for language: ${languageCode}`);
        } else {
            this.languageData.clear();
            this.loadingPromises.clear();
            console.log('Cleared all language data cache');
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getCacheStats() {
        return {
            cachedLanguages: Array.from(this.languageData.keys()),
            loadingLanguages: Array.from(this.loadingPromises.keys()),
            currentLanguage: this.currentLanguage,
            supportedLanguages: this.languageConfig.getSupportedLanguages(),
            cacheSize: this.languageData.size,
            config: this.languageConfig.getConfig()
        };
    }

    /**
     * Get the language configuration instance
     * @returns {LanguageConfig} Language configuration
     */
    getLanguageConfig() {
        return this.languageConfig;
    }

    /**
     * Get comprehensive error statistics for debugging
     * @returns {Object} Error statistics and debugging information
     */
    getErrorStatistics() {
        const translationErrors = this._translationErrors || [];
        const fileLoadingErrors = this._fileLoadingErrors || [];

        const stats = {
            translation: {
                totalErrors: translationErrors.length,
                errorsByType: {},
                errorsByLanguage: {},
                recentErrors: translationErrors.slice(-10)
            },
            fileLoading: {
                totalErrors: fileLoadingErrors.length,
                errorsByType: {},
                errorsByLanguage: {},
                recentErrors: fileLoadingErrors.slice(-10)
            },
            summary: {
                totalErrors: translationErrors.length + fileLoadingErrors.length,
                hasEmergencyData: false,
                hasFallbackData: false
            }
        };

        // Analyze translation errors
        translationErrors.forEach(error => {
            stats.translation.errorsByType[error.type] = (stats.translation.errorsByType[error.type] || 0) + 1;
            stats.translation.errorsByLanguage[error.language] = (stats.translation.errorsByLanguage[error.language] || 0) + 1;
        });

        // Analyze file loading errors
        fileLoadingErrors.forEach(error => {
            stats.fileLoading.errorsByType[error.type] = (stats.fileLoading.errorsByType[error.type] || 0) + 1;
            stats.fileLoading.errorsByLanguage[error.languageCode] = (stats.fileLoading.errorsByLanguage[error.languageCode] || 0) + 1;
        });

        // Check for emergency or fallback data
        this.languageData.forEach((data, language) => {
            if (data.metadata) {
                if (data.metadata.isEmergency) {
                    stats.summary.hasEmergencyData = true;
                }
                if (data.metadata.isFallback) {
                    stats.summary.hasFallbackData = true;
                }
            }
        });

        return stats;
    }

    /**
     * Clear all error logs (for testing or privacy)
     */
    clearErrorLogs() {
        this._translationErrors = [];
        this._fileLoadingErrors = [];
        console.log('LocalizationManager error logs cleared');
    }

    /**
     * Get diagnostic information for troubleshooting
     * @returns {Object} Diagnostic information
     */
    getDiagnosticInfo() {
        const config = this.languageConfig.getConfig();
        const cacheStats = this.getCacheStats();
        const errorStats = this.getErrorStatistics();

        return {
            configuration: {
                defaultLanguage: config.defaultLanguage,
                supportedLanguages: config.supportedLanguages,
                fallbackLanguage: config.fallbackLanguage,
                languageFiles: config.languageFiles
            },
            runtime: {
                currentLanguage: this.currentLanguage,
                cachedLanguages: cacheStats.cachedLanguages,
                loadingLanguages: cacheStats.loadingLanguages,
                cacheSize: cacheStats.cacheSize
            },
            errors: errorStats,
            health: {
                allLanguagesLoaded: config.supportedLanguages.every(lang =>
                    this.languageData.has(lang)
                ),
                hasErrors: errorStats.summary.totalErrors > 0,
                hasEmergencyData: errorStats.summary.hasEmergencyData,
                hasFallbackData: errorStats.summary.hasFallbackData
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test translation key resolution for debugging
     * @param {string} key - Translation key to test
     * @param {string} targetLanguage - Optional specific language to test
     * @returns {Object} Test results
     */
    testTranslationKey(key, targetLanguage = null) {
        const testLanguage = targetLanguage || this.currentLanguage;
        const results = {
            key: key,
            language: testLanguage,
            found: false,
            value: null,
            fallbackUsed: false,
            fallbackValue: null,
            errors: []
        };

        try {
            // Test in target language
            const languageData = this.languageData.get(testLanguage);
            if (languageData) {
                const value = this._extractTranslationFromData(key, languageData);
                if (value) {
                    results.found = true;
                    results.value = value;
                }
            } else {
                results.errors.push(`No data loaded for language: ${testLanguage}`);
            }

            // Test fallback if not found
            if (!results.found) {
                const fallbackLanguage = this.languageConfig.getFallbackLanguage();
                if (testLanguage !== fallbackLanguage) {
                    const fallbackData = this.languageData.get(fallbackLanguage);
                    if (fallbackData) {
                        const fallbackValue = this._extractTranslationFromData(key, fallbackData);
                        if (fallbackValue) {
                            results.fallbackUsed = true;
                            results.fallbackValue = fallbackValue;
                        }
                    }
                }
            }

        } catch (error) {
            results.errors.push(`Exception during test: ${error.message}`);
        }

        return results;
    }
}