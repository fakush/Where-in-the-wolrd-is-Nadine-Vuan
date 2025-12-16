/**
 * TranslationService.js - Translation Key Resolution and Parameter Substitution
 * Provides convenient translation methods for UI components with parameter support
 */

export class TranslationService {
    constructor(localizationManager) {
        this.localizationManager = localizationManager;
        this.translationObservers = new Set();
        
        // Bind methods to maintain context
        this.translate = this.translate.bind(this);
        this.translateElement = this.translateElement.bind(this);
        this.translateAll = this.translateAll.bind(this);
    }

    /**
     * Translate a key with optional parameter substitution and enhanced error handling
     * @param {string} key - Translation key (e.g., 'ui.buttons.start_game')
     * @param {Object} params - Optional parameters for substitution
     * @param {string} fallback - Optional fallback text
     * @returns {string} Translated and processed text
     */
    translate(key, params = {}, fallback = null) {
        try {
            // Validate input parameters
            if (!key || typeof key !== 'string') {
                this._logTranslationServiceError('invalid_key', key, 'Translation key must be a non-empty string');
                return fallback || '[INVALID_KEY]';
            }

            // Get base translation from LocalizationManager
            let translation = this.localizationManager.getTranslation(key, fallback);

            // Apply parameter substitution if parameters provided
            if (params && Object.keys(params).length > 0) {
                try {
                    translation = this._substituteParameters(translation, params);
                } catch (substitutionError) {
                    this._logTranslationServiceError('substitution_failed', key,
                        `Parameter substitution failed: ${substitutionError.message}`, substitutionError);

                    // Return translation without substitution as fallback
                    console.warn(`Using translation without parameter substitution for key: ${key}`);
                    return translation;
                }
            }

            return translation;

        } catch (error) {
            this._logTranslationServiceError('translation_exception', key,
                `Translation failed: ${error.message}`, error);

            // Return safe fallback
            return this._getSafeTranslationFallback(key, fallback, error);
        }
    }

    /**
     * Translate and update a DOM element with comprehensive error handling
     * @param {HTMLElement} element - DOM element to update
     * @param {string} key - Translation key
     * @param {Object} params - Optional parameters for substitution
     * @param {string} attribute - Element attribute to update ('textContent', 'innerHTML', 'placeholder', etc.)
     * @returns {boolean} Success status
     */
    translateElement(element, key, params = {}, attribute = 'textContent') {
        try {
            // Validate element
            if (!element || !element.nodeType) {
                this._logTranslationServiceError('invalid_element', key, 'Cannot translate null, undefined, or invalid element');
                return false;
            }

            // Validate key
            if (!key || typeof key !== 'string') {
                this._logTranslationServiceError('invalid_key', key, 'Translation key must be a non-empty string');
                return false;
            }

            // Get translation with error handling
            const translation = this.translate(key, params);

            // Validate translation result
            if (typeof translation !== 'string') {
                this._logTranslationServiceError('invalid_translation_result', key,
                    `Translation result is not a string: ${typeof translation}`);
                return false;
            }

            // Update the specified attribute with error handling
            try {
                this._updateElementAttribute(element, attribute, translation);
            } catch (updateError) {
                this._logTranslationServiceError('element_update_failed', key,
                    `Failed to update element attribute '${attribute}': ${updateError.message}`, updateError);

                // Try fallback to textContent if original attribute failed
                if (attribute.toLowerCase() !== 'textcontent') {
                    try {
                        element.textContent = translation;
                        console.warn(`Used textContent fallback for failed ${attribute} update on key: ${key}`);
                    } catch (fallbackError) {
                        console.error(`Even textContent fallback failed for key: ${key}`, fallbackError);
                        return false;
                    }
                } else {
                    return false;
                }
            }

            // Store translation metadata for future updates (with error handling)
            try {
                this._storeTranslationMetadata(element, key, params, attribute);
            } catch (metadataError) {
                // Metadata storage failure shouldn't prevent successful translation
                console.warn(`Failed to store translation metadata for key '${key}':`, metadataError);
            }

            return true;

        } catch (error) {
            this._logTranslationServiceError('element_translation_exception', key,
                `Element translation failed: ${error.message}`, error);
            return false;
        }
    }

    /**
     * Update element attribute with proper error handling
     * @param {HTMLElement} element - DOM element
     * @param {string} attribute - Attribute to update
     * @param {string} translation - Translation text
     * @private
     */
    _updateElementAttribute(element, attribute, translation) {
        switch (attribute.toLowerCase()) {
            case 'textcontent':
            case 'text':
                element.textContent = translation;
                break;
            case 'innerhtml':
            case 'html':
                // Sanitize HTML content to prevent XSS
                element.innerHTML = this._sanitizeHTML(translation);
                break;
            case 'placeholder':
                if ('placeholder' in element) {
                    element.placeholder = translation;
                } else {
                    throw new Error('Element does not support placeholder attribute');
                }
                break;
            case 'title':
                element.title = translation;
                break;
            case 'alt':
                if ('alt' in element) {
                    element.alt = translation;
                } else {
                    throw new Error('Element does not support alt attribute');
                }
                break;
            case 'arialabel':
            case 'aria-label':
                element.setAttribute('aria-label', translation);
                break;
            case 'value':
                if ('value' in element) {
                    element.value = translation;
                } else {
                    throw new Error('Element does not support value attribute');
                }
                break;
            default:
                // For custom attributes, validate attribute name
                if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(attribute)) {
                    throw new Error(`Invalid attribute name: ${attribute}`);
                }
                element.setAttribute(attribute, translation);
        }
    }

    /**
     * Store translation metadata on element
     * @param {HTMLElement} element - DOM element
     * @param {string} key - Translation key
     * @param {Object} params - Translation parameters
     * @param {string} attribute - Target attribute
     * @private
     */
    _storeTranslationMetadata(element, key, params, attribute) {
        element.dataset.translationKey = key;

        if (params && Object.keys(params).length > 0) {
            try {
                element.dataset.translationParams = JSON.stringify(params);
            } catch (jsonError) {
                console.warn(`Failed to serialize translation parameters for key '${key}':`, jsonError);
                element.dataset.translationParams = '{}';
            }
        }

        element.dataset.translationAttribute = attribute;
        element.dataset.translationTimestamp = new Date().toISOString();
    }

    /**
     * Basic HTML sanitization to prevent XSS
     * @param {string} html - HTML content to sanitize
     * @returns {string} Sanitized HTML
     * @private
     */
    _sanitizeHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }

        // Basic sanitization - remove script tags and javascript: URLs
        return html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }

    /**
     * Translate all elements in a container that have translation attributes
     * @param {HTMLElement} containerElement - Container to search for translatable elements
     * @returns {number} Number of elements translated
     */
    translateAll(containerElement = document) {
        if (!containerElement) {
            console.warn('Cannot translate in null or undefined container');
            return 0;
        }

        let translatedCount = 0;

        // Find elements with data-translate-key attribute
        const elementsWithKeys = containerElement.querySelectorAll('[data-translate-key]');
        
        elementsWithKeys.forEach(element => {
            const key = element.dataset.translateKey;
            const paramsStr = element.dataset.translateParams;
            const attribute = element.dataset.translateAttribute || 'textContent';
            
            let params = {};
            if (paramsStr) {
                try {
                    params = JSON.parse(paramsStr);
                } catch (error) {
                    console.warn(`Invalid translation parameters for element with key '${key}':`, paramsStr);
                }
            }
            
            if (this.translateElement(element, key, params, attribute)) {
                translatedCount++;
            }
        });

        // Also translate elements that already have translation metadata
        const elementsWithMetadata = containerElement.querySelectorAll('[data-translation-key]');
        
        elementsWithMetadata.forEach(element => {
            const key = element.dataset.translationKey;
            const paramsStr = element.dataset.translationParams;
            const attribute = element.dataset.translationAttribute || 'textContent';
            
            let params = {};
            if (paramsStr) {
                try {
                    params = JSON.parse(paramsStr);
                } catch (error) {
                    console.warn(`Invalid translation parameters for element with key '${key}':`, paramsStr);
                }
            }
            
            if (this.translateElement(element, key, params, attribute)) {
                translatedCount++;
            }
        });

        console.log(`Translated ${translatedCount} elements in container`);
        return translatedCount;
    }

    /**
     * Register an observer to be notified of language changes
     * @param {Function} callback - Callback function to call on language change
     * @returns {Function} Unsubscribe function
     */
    registerTranslationObserver(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Translation observer callback must be a function');
        }
        
        this.translationObservers.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.translationObservers.delete(callback);
        };
    }

    /**
     * Notify all observers of language change
     * @param {string} newLanguage - New language code
     * @param {string} oldLanguage - Previous language code
     */
    notifyLanguageChange(newLanguage, oldLanguage) {
        this.translationObservers.forEach(callback => {
            try {
                callback(newLanguage, oldLanguage);
            } catch (error) {
                console.error('Error in translation observer callback:', error);
            }
        });
    }

    /**
     * Substitute parameters in a translation string
     * @param {string} text - Text with parameter placeholders
     * @param {Object} params - Parameters to substitute
     * @returns {string} Text with parameters substituted
     * @private
     */
    _substituteParameters(text, params) {
        if (!text || typeof text !== 'string') {
            return text;
        }

        let result = text;
        
        // Handle different parameter placeholder formats
        Object.entries(params).forEach(([key, value]) => {
            // Handle {{key}} format
            const doubleBracePattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
            result = result.replace(doubleBracePattern, String(value));
            
            // Handle {key} format
            const singleBracePattern = new RegExp(`\\{\\s*${key}\\s*\\}`, 'g');
            result = result.replace(singleBracePattern, String(value));
            
            // Handle %key% format
            const percentPattern = new RegExp(`%\\s*${key}\\s*%`, 'g');
            result = result.replace(percentPattern, String(value));
            
            // Handle $key format
            const dollarPattern = new RegExp(`\\$${key}\\b`, 'g');
            result = result.replace(dollarPattern, String(value));
        });
        
        return result;
    }

    /**
     * Create a translation function bound to a specific key prefix
     * @param {string} keyPrefix - Prefix to prepend to all keys
     * @returns {Function} Bound translation function
     */
    createBoundTranslator(keyPrefix) {
        return (key, params = {}, fallback = null) => {
            const fullKey = keyPrefix ? `${keyPrefix}.${key}` : key;
            return this.translate(fullKey, params, fallback);
        };
    }

    /**
     * Get translation with pluralization support
     * @param {string} key - Base translation key
     * @param {number} count - Count for pluralization
     * @param {Object} params - Additional parameters
     * @returns {string} Pluralized translation
     */
    translatePlural(key, count, params = {}) {
        // Determine plural form based on count
        let pluralKey = key;
        
        if (count === 0) {
            pluralKey = `${key}.zero`;
        } else if (count === 1) {
            pluralKey = `${key}.one`;
        } else {
            pluralKey = `${key}.other`;
        }
        
        // Try specific plural form first, fallback to base key
        let translation = this.localizationManager.getTranslation(pluralKey, null);
        if (!translation || translation === pluralKey) {
            translation = this.localizationManager.getTranslation(key, key);
        }
        
        // Add count to parameters
        const allParams = { count, ...params };
        
        return this._substituteParameters(translation, allParams);
    }

    /**
     * Format a translation key for debugging
     * @param {string} key - Translation key
     * @returns {string} Formatted debug string
     */
    formatKeyForDebug(key) {
        const currentLang = this.localizationManager.getCurrentLanguage();
        const translation = this.localizationManager.getTranslation(key, null);
        
        if (translation && translation !== key) {
            return `[${currentLang}] ${key} → "${translation}"`;
        } else {
            return `[${currentLang}] ${key} → MISSING`;
        }
    }

    /**
     * Validate that all required translation keys exist
     * @param {Array<string>} requiredKeys - Array of required translation keys
     * @returns {Object} Validation result
     */
    validateRequiredKeys(requiredKeys) {
        const missing = [];
        const found = [];
        
        requiredKeys.forEach(key => {
            const translation = this.localizationManager.getTranslation(key, null);
            if (!translation || translation === key) {
                missing.push(key);
            } else {
                found.push(key);
            }
        });
        
        return {
            isValid: missing.length === 0,
            missing,
            found,
            total: requiredKeys.length,
            coverage: (found.length / requiredKeys.length) * 100
        };
    }

    /**
     * Get statistics about translation usage
     * @returns {Object} Translation statistics
     */
    getTranslationStats() {
        const currentLanguage = this.localizationManager.getCurrentLanguage();
        const cacheStats = this.localizationManager.getCacheStats();
        
        return {
            currentLanguage,
            availableLanguages: this.localizationManager.getAvailableLanguages(),
            cacheStats,
            observerCount: this.translationObservers.size,
            elementsWithTranslations: document.querySelectorAll('[data-translation-key]').length,
            errorStats: this._getErrorStats()
        };
    }

    /**
     * Get safe translation fallback for error cases
     * @param {string} key - Translation key
     * @param {string} fallback - Provided fallback
     * @param {Error} error - The error that occurred
     * @returns {string} Safe fallback text
     * @private
     */
    _getSafeTranslationFallback(key, fallback, error) {
        try {
            // Use provided fallback if available
            if (fallback && typeof fallback === 'string') {
                return fallback;
            }

            // Try to generate a reasonable fallback from the key
            if (key && typeof key === 'string') {
                return this._generateReadableKeyFallback(key);
            }

            // Last resort
            return '[TRANSLATION_ERROR]';

        } catch (fallbackError) {
            console.error('Critical error in translation fallback:', fallbackError);
            return '[CRITICAL_ERROR]';
        }
    }

    /**
     * Generate readable fallback from translation key
     * @param {string} key - Translation key
     * @returns {string} Readable fallback text
     * @private
     */
    _generateReadableKeyFallback(key) {
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
     * Log translation service errors
     * @param {string} errorType - Type of error
     * @param {string} key - Translation key
     * @param {string} message - Error message
     * @param {Error} error - Optional error object
     * @private
     */
    _logTranslationServiceError(errorType, key, message, error = null) {
        const logEntry = {
            type: errorType,
            key: key,
            message: message,
            timestamp: new Date().toISOString(),
            currentLanguage: this.localizationManager.getCurrentLanguage()
        };

        // Log at appropriate level
        switch (errorType) {
            case 'translation_exception':
            case 'element_translation_exception':
                console.error('TranslationService Error:', logEntry, error);
                break;

            case 'substitution_failed':
            case 'element_update_failed':
                console.warn('TranslationService Warning:', logEntry, error);
                break;

            case 'invalid_key':
            case 'invalid_element':
            case 'invalid_translation_result':
                console.warn('TranslationService Validation:', logEntry);
                break;

            default:
                console.log('TranslationService Info:', logEntry);
        }

        // Store error for debugging
        if (!this._translationServiceErrors) {
            this._translationServiceErrors = [];
        }

        this._translationServiceErrors.push(logEntry);
        if (this._translationServiceErrors.length > 100) {
            this._translationServiceErrors.shift();
        }
    }

    /**
     * Get error statistics for debugging
     * @returns {Object} Error statistics
     * @private
     */
    _getErrorStats() {
        const errors = this._translationServiceErrors || [];
        const stats = {
            totalErrors: errors.length,
            errorsByType: {},
            recentErrors: errors.slice(-5)
        };

        errors.forEach(error => {
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get an array of translations for a given key
     * @param {string} key - Translation key that should point to an array
     * @param {Array} fallback - Optional fallback array
     * @returns {Array} Array of translated strings
     */
    getTranslationArray(key, fallback = []) {
        try {
            // Validate input parameters
            if (!key || typeof key !== 'string') {
                this._logTranslationServiceError('invalid_key', key, 'Translation key must be a non-empty string');
                return fallback;
            }

            // Get the translation data
            const translation = this.localizationManager.getTranslation(key);

            // Check if the translation is an array
            if (Array.isArray(translation)) {
                return translation;
            }

            // If not an array, log warning and return fallback
            this._logTranslationServiceError('not_array', key,
                `Translation key '${key}' does not point to an array, got: ${typeof translation}`);
            return fallback;

        } catch (error) {
            this._logTranslationServiceError('array_translation_exception', key,
                `Array translation failed: ${error.message}`, error);
            return fallback;
        }
    }

    /**
     * Clear error logs (for testing or privacy)
     */
    clearErrorLogs() {
        this._translationServiceErrors = [];
        console.log('TranslationService error logs cleared');
    }
}