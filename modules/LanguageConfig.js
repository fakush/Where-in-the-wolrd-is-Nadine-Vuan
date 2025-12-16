/**
 * LanguageConfig.js - Language Configuration System
 * Centralized configuration for supported languages and file paths
 */

export class LanguageConfig {
    constructor() {
        // Default configuration
        this.config = {
            // Default language when no preference is set
            defaultLanguage: 'es',
            
            // List of supported language codes
            supportedLanguages: ['es', 'en'],
            
            // Fallback language when translations are missing
            fallbackLanguage: 'es',
            
            // File paths for language-specific data
            languageFiles: {
                'es': 'assets/data/game_data.es.json',
                'en': 'assets/data/game_data.en.json'
            },
            
            // File paths for UI translations
            uiTranslationFiles: {
                'es': 'assets/data/ui_translations.es.json',
                'en': 'assets/data/ui_translations.en.json'
            },
            
            // Human-readable language names
            languageNames: {
                'es': 'Español',
                'en': 'English'
            },
            
            // Language metadata
            languageMetadata: {
                'es': {
                    code: 'es',
                    name: 'Español',
                    nativeName: 'Español',
                    direction: 'ltr',
                    region: 'ES',
                    flag: '🇪🇸'
                },
                'en': {
                    code: 'en',
                    name: 'English',
                    nativeName: 'English',
                    direction: 'ltr',
                    region: 'US',
                    flag: '🇺🇸'
                }
            },
            
            // Storage keys for persistence
            storageKeys: {
                languagePreference: 'nadine_game_language_preference',
                languageCache: 'nadine_game_language_cache'
            },
            
            // Loading configuration
            loading: {
                timeout: 15000,
                retryAttempts: 3,
                retryDelay: 1000,
                showLoadingIndicator: true
            },
            
            // Validation rules
            validation: {
                requireGameData: true,
                requireUIText: false,
                allowPartialData: true,
                strictMode: false
            }
        };
    }

    /**
     * Get the complete configuration object
     * @returns {Object} Configuration object
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Get default language code
     * @returns {string} Default language code
     */
    getDefaultLanguage() {
        return this.config.defaultLanguage;
    }

    /**
     * Get list of supported language codes
     * @returns {Array<string>} Supported language codes
     */
    getSupportedLanguages() {
        return [...this.config.supportedLanguages];
    }

    /**
     * Get fallback language code
     * @returns {string} Fallback language code
     */
    getFallbackLanguage() {
        return this.config.fallbackLanguage;
    }

    /**
     * Get file path for a specific language
     * @param {string} languageCode - Language code
     * @returns {string|null} File path or null if not found
     */
    getLanguageFilePath(languageCode) {
        return this.config.languageFiles[languageCode] || null;
    }

    /**
     * Get UI translation file path for a specific language
     * @param {string} languageCode - Language code
     * @returns {string|null} UI translation file path or null if not found
     */
    getUITranslationFilePath(languageCode) {
        return this.config.uiTranslationFiles[languageCode] || null;
    }

    /**
     * Get human-readable name for a language
     * @param {string} languageCode - Language code
     * @returns {string} Language name or code if not found
     */
    getLanguageName(languageCode) {
        return this.config.languageNames[languageCode] || languageCode;
    }

    /**
     * Get metadata for a specific language
     * @param {string} languageCode - Language code
     * @returns {Object|null} Language metadata or null if not found
     */
    getLanguageMetadata(languageCode) {
        return this.config.languageMetadata[languageCode] || null;
    }

    /**
     * Get all language metadata
     * @returns {Array<Object>} Array of language metadata objects
     */
    getAllLanguageMetadata() {
        return this.config.supportedLanguages.map(code => ({
            ...this.config.languageMetadata[code],
            isSupported: true
        }));
    }

    /**
     * Check if a language is supported
     * @param {string} languageCode - Language code to check
     * @returns {boolean} True if supported
     */
    isLanguageSupported(languageCode) {
        return this.config.supportedLanguages.includes(languageCode);
    }

    /**
     * Get storage key for language preference
     * @returns {string} Storage key
     */
    getLanguagePreferenceKey() {
        return this.config.storageKeys.languagePreference;
    }

    /**
     * Get storage key for language cache
     * @returns {string} Storage key
     */
    getLanguageCacheKey() {
        return this.config.storageKeys.languageCache;
    }

    /**
     * Get loading configuration
     * @returns {Object} Loading configuration
     */
    getLoadingConfig() {
        return { ...this.config.loading };
    }

    /**
     * Get validation configuration
     * @returns {Object} Validation configuration
     */
    getValidationConfig() {
        return { ...this.config.validation };
    }

    /**
     * Update configuration (for runtime modifications)
     * @param {Object} updates - Configuration updates
     * @returns {boolean} Success status
     */
    updateConfig(updates) {
        try {
            // Validate updates
            if (updates.supportedLanguages && !Array.isArray(updates.supportedLanguages)) {
                throw new Error('supportedLanguages must be an array');
            }
            
            if (updates.defaultLanguage && typeof updates.defaultLanguage !== 'string') {
                throw new Error('defaultLanguage must be a string');
            }
            
            // Apply updates
            this.config = {
                ...this.config,
                ...updates
            };
            
            console.log('Language configuration updated successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to update language configuration:', error);
            return false;
        }
    }

    /**
     * Add a new language to the configuration
     * @param {string} languageCode - Language code
     * @param {Object} languageInfo - Language information
     * @returns {boolean} Success status
     */
    addLanguage(languageCode, languageInfo) {
        try {
            // Validate required fields
            if (!languageCode || typeof languageCode !== 'string') {
                throw new Error('Language code must be a non-empty string');
            }
            
            if (!languageInfo.name || !languageInfo.filePath) {
                throw new Error('Language info must include name and filePath');
            }
            
            // Check if language already exists
            if (this.config.supportedLanguages.includes(languageCode)) {
                console.warn(`Language ${languageCode} already exists, updating...`);
            } else {
                this.config.supportedLanguages.push(languageCode);
            }
            
            // Add language configuration
            this.config.languageNames[languageCode] = languageInfo.name;
            this.config.languageFiles[languageCode] = languageInfo.filePath;
            
            if (languageInfo.metadata) {
                this.config.languageMetadata[languageCode] = {
                    code: languageCode,
                    name: languageInfo.name,
                    nativeName: languageInfo.metadata.nativeName || languageInfo.name,
                    direction: languageInfo.metadata.direction || 'ltr',
                    region: languageInfo.metadata.region || '',
                    flag: languageInfo.metadata.flag || ''
                };
            }
            
            console.log(`Added language: ${languageCode} (${languageInfo.name})`);
            return true;
            
        } catch (error) {
            console.error(`Failed to add language ${languageCode}:`, error);
            return false;
        }
    }

    /**
     * Remove a language from the configuration
     * @param {string} languageCode - Language code to remove
     * @returns {boolean} Success status
     */
    removeLanguage(languageCode) {
        try {
            // Prevent removal of default or fallback language
            if (languageCode === this.config.defaultLanguage) {
                throw new Error('Cannot remove default language');
            }
            
            if (languageCode === this.config.fallbackLanguage) {
                throw new Error('Cannot remove fallback language');
            }
            
            // Remove from supported languages
            const index = this.config.supportedLanguages.indexOf(languageCode);
            if (index > -1) {
                this.config.supportedLanguages.splice(index, 1);
            }
            
            // Remove from other configuration objects
            delete this.config.languageNames[languageCode];
            delete this.config.languageFiles[languageCode];
            delete this.config.languageMetadata[languageCode];
            
            console.log(`Removed language: ${languageCode}`);
            return true;
            
        } catch (error) {
            console.error(`Failed to remove language ${languageCode}:`, error);
            return false;
        }
    }

    /**
     * Validate the current configuration
     * @returns {Object} Validation result
     */
    validateConfig() {
        const errors = [];
        const warnings = [];
        
        // Check required fields
        if (!this.config.defaultLanguage) {
            errors.push('Missing defaultLanguage');
        }
        
        if (!Array.isArray(this.config.supportedLanguages) || this.config.supportedLanguages.length === 0) {
            errors.push('supportedLanguages must be a non-empty array');
        }
        
        // Check that default language is supported
        if (this.config.defaultLanguage && !this.config.supportedLanguages.includes(this.config.defaultLanguage)) {
            errors.push('defaultLanguage must be in supportedLanguages');
        }
        
        // Check that fallback language is supported
        if (this.config.fallbackLanguage && !this.config.supportedLanguages.includes(this.config.fallbackLanguage)) {
            errors.push('fallbackLanguage must be in supportedLanguages');
        }
        
        // Check that all supported languages have file paths
        this.config.supportedLanguages.forEach(lang => {
            if (!this.config.languageFiles[lang]) {
                warnings.push(`Missing file path for language: ${lang}`);
            }
            
            if (!this.config.languageNames[lang]) {
                warnings.push(`Missing display name for language: ${lang}`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            hasWarnings: warnings.length > 0
        };
    }

    /**
     * Reset configuration to defaults
     */
    resetToDefaults() {
        this.config = {
            defaultLanguage: 'es',
            supportedLanguages: ['es', 'en'],
            fallbackLanguage: 'es',
            languageFiles: {
                'es': 'assets/data/game_data.es.json',
                'en': 'assets/data/game_data.en.json'
            },
            uiTranslationFiles: {
                'es': 'assets/data/ui_translations.es.json',
                'en': 'assets/data/ui_translations.en.json'
            },
            languageNames: {
                'es': 'Español',
                'en': 'English'
            },
            languageMetadata: {
                'es': {
                    code: 'es',
                    name: 'Español',
                    nativeName: 'Español',
                    direction: 'ltr',
                    region: 'ES',
                    flag: '🇪🇸'
                },
                'en': {
                    code: 'en',
                    name: 'English',
                    nativeName: 'English',
                    direction: 'ltr',
                    region: 'US',
                    flag: '🇺🇸'
                }
            },
            storageKeys: {
                languagePreference: 'nadine_game_language_preference',
                languageCache: 'nadine_game_language_cache'
            },
            loading: {
                timeout: 15000,
                retryAttempts: 3,
                retryDelay: 1000,
                showLoadingIndicator: true
            },
            validation: {
                requireGameData: true,
                requireUIText: false,
                allowPartialData: true,
                strictMode: false
            }
        };
        
        console.log('Language configuration reset to defaults');
    }

    /**
     * Export configuration as JSON
     * @returns {string} JSON string of configuration
     */
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON
     * @param {string} jsonConfig - JSON configuration string
     * @returns {boolean} Success status
     */
    importConfig(jsonConfig) {
        try {
            const newConfig = JSON.parse(jsonConfig);
            
            // Validate the imported configuration
            const tempConfig = new LanguageConfig();
            tempConfig.config = newConfig;
            const validation = tempConfig.validateConfig();
            
            if (!validation.isValid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }
            
            // Apply the new configuration
            this.config = newConfig;
            
            console.log('Language configuration imported successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to import language configuration:', error);
            return false;
        }
    }
}

// Create and export a default instance
export const defaultLanguageConfig = new LanguageConfig();