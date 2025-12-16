/**
 * DataValidator - Validates language data files for completeness and structure consistency
 * Ensures that both Spanish and English data files have identical structure and all required keys
 */
class DataValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validates that two language data objects have identical structure
     * @param {Object} data1 - First language data object
     * @param {Object} data2 - Second language data object
     * @param {string} lang1 - First language code (e.g., 'es')
     * @param {string} lang2 - Second language code (e.g., 'en')
     * @returns {Object} Validation result with errors and warnings
     */
    validateDataStructure(data1, data2, lang1 = 'es', lang2 = 'en') {
        this.errors = [];
        this.warnings = [];

        // Validate metadata
        this._validateMetadata(data1, data2, lang1, lang2);

        // Validate game_data structure
        if (data1.game_data && data2.game_data) {
            this._validateGameData(data1.game_data, data2.game_data, lang1, lang2);
        } else {
            this.errors.push(`Missing game_data section in one or both language files`);
        }

        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Validates metadata section
     */
    _validateMetadata(data1, data2, lang1, lang2) {
        if (!data1.metadata || !data2.metadata) {
            this.errors.push('Missing metadata section in one or both files');
            return;
        }

        // Check language codes
        if (data1.metadata.language !== lang1) {
            this.errors.push(`Expected language '${lang1}' in first file, got '${data1.metadata.language}'`);
        }
        if (data2.metadata.language !== lang2) {
            this.errors.push(`Expected language '${lang2}' in second file, got '${data2.metadata.language}'`);
        }

        // Check version consistency
        if (data1.metadata.version !== data2.metadata.version) {
            this.warnings.push(`Version mismatch: ${lang1}=${data1.metadata.version}, ${lang2}=${data2.metadata.version}`);
        }
    }

    /**
     * Validates game_data section structure
     */
    _validateGameData(gameData1, gameData2, lang1, lang2) {
        // Validate cities array
        this._validateCities(gameData1.cities, gameData2.cities, lang1, lang2);

        // Validate game_messages
        this._validateGameMessages(gameData1.game_messages, gameData2.game_messages, lang1, lang2);

        // Validate ui_text
        this._validateUIText(gameData1.ui_text, gameData2.ui_text, lang1, lang2);

        // Validate basic properties
        const basicProps = ['title', 'version'];
        basicProps.forEach(prop => {
            if (!gameData1[prop] || !gameData2[prop]) {
                this.errors.push(`Missing '${prop}' in game_data section`);
            }
        });
    }

    /**
     * Validates cities array structure and content
     */
    _validateCities(cities1, cities2, lang1, lang2) {
        if (!Array.isArray(cities1) || !Array.isArray(cities2)) {
            this.errors.push('Cities must be arrays in both language files');
            return;
        }

        if (cities1.length !== cities2.length) {
            this.errors.push(`Cities array length mismatch: ${lang1}=${cities1.length}, ${lang2}=${cities2.length}`);
            return;
        }

        // Create maps for easier comparison
        const cityMap1 = new Map(cities1.map(city => [city.id, city]));
        const cityMap2 = new Map(cities2.map(city => [city.id, city]));

        // Check that all city IDs exist in both files
        for (const cityId of cityMap1.keys()) {
            if (!cityMap2.has(cityId)) {
                this.errors.push(`City '${cityId}' exists in ${lang1} but not in ${lang2}`);
            }
        }

        for (const cityId of cityMap2.keys()) {
            if (!cityMap1.has(cityId)) {
                this.errors.push(`City '${cityId}' exists in ${lang2} but not in ${lang1}`);
            }
        }

        // Validate each city's structure
        for (const cityId of cityMap1.keys()) {
            if (cityMap2.has(cityId)) {
                this._validateCityStructure(cityMap1.get(cityId), cityMap2.get(cityId), cityId, lang1, lang2);
            }
        }
    }

    /**
     * Validates individual city structure
     */
    _validateCityStructure(city1, city2, cityId, lang1, lang2) {
        const requiredProps = ['id', 'name', 'country', 'is_final', 'informant', 'clues', 'not_here_response'];

        requiredProps.forEach(prop => {
            if (!(prop in city1) || !(prop in city2)) {
                this.errors.push(`Missing '${prop}' in city '${cityId}' for one or both languages`);
            }
        });

        // Validate informant structure
        if (city1.informant && city2.informant) {
            const informantProps = ['name', 'greeting', 'farewell_helpful', 'farewell_unhelpful'];
            informantProps.forEach(prop => {
                if (!(prop in city1.informant) || !(prop in city2.informant)) {
                    this.errors.push(`Missing informant '${prop}' in city '${cityId}' for one or both languages`);
                }
            });
        }

        // Validate clues structure
        if (city1.clues && city2.clues) {
            const clueTypes = ['difficult', 'medium', 'easy'];
            clueTypes.forEach(type => {
                if (!Array.isArray(city1.clues[type]) || !Array.isArray(city2.clues[type])) {
                    this.errors.push(`Missing or invalid clues '${type}' in city '${cityId}' for one or both languages`);
                } else if (city1.clues[type].length !== city2.clues[type].length) {
                    this.warnings.push(`Different number of '${type}' clues in city '${cityId}': ${lang1}=${city1.clues[type].length}, ${lang2}=${city2.clues[type].length}`);
                }
            });
        }

        // Validate final encounter for Buenos Aires
        if (city1.is_final && city2.is_final) {
            if (city1.final_encounter && city2.final_encounter) {
                const encounterProps = ['nadine_speech', 'steve_response', 'victory_message'];
                encounterProps.forEach(prop => {
                    if (!(prop in city1.final_encounter) || !(prop in city2.final_encounter)) {
                        this.errors.push(`Missing final_encounter '${prop}' in city '${cityId}' for one or both languages`);
                    }
                });
            } else if (city1.final_encounter || city2.final_encounter) {
                this.errors.push(`final_encounter exists in only one language for city '${cityId}'`);
            }
        }
    }

    /**
     * Validates game_messages structure
     */
    _validateGameMessages(messages1, messages2, lang1, lang2) {
        if (!messages1 || !messages2) {
            this.errors.push('Missing game_messages section in one or both files');
            return;
        }

        // Validate intro section
        this._validateNestedObject(messages1.intro, messages2.intro, 'game_messages.intro', ['title', 'text'], lang1, lang2);

        // Validate tutorial section
        this._validateNestedObject(messages1.tutorial, messages2.tutorial, 'game_messages.tutorial', ['step1', 'step2', 'step3', 'step4'], lang1, lang2);

        // Validate direct message properties
        const messageProps = ['correct_city', 'wrong_city', 'game_over_time', 'game_over_attempts', 'restart_prompt'];
        messageProps.forEach(prop => {
            if (!(prop in messages1) || !(prop in messages2)) {
                this.errors.push(`Missing '${prop}' in game_messages for one or both languages`);
            }
        });
    }

    /**
     * Validates ui_text structure
     */
    _validateUIText(uiText1, uiText2, lang1, lang2) {
        if (!uiText1 || !uiText2) {
            this.errors.push('Missing ui_text section in one or both files');
            return;
        }

        // Validate buttons section
        const buttonProps = ['start_game', 'select_city', 'view_clues', 'restart', 'continue', 'back', 'quit'];
        this._validateNestedObject(uiText1.buttons, uiText2.buttons, 'ui_text.buttons', buttonProps, lang1, lang2);

        // Validate labels section
        const labelProps = ['current_location', 'clues_collected', 'cities_visited', 'attempts_remaining', 'time_elapsed', 'choose_destination'];
        this._validateNestedObject(uiText1.labels, uiText2.labels, 'ui_text.labels', labelProps, lang1, lang2);
    }

    /**
     * Helper method to validate nested objects
     */
    _validateNestedObject(obj1, obj2, path, requiredProps, lang1, lang2) {
        if (!obj1 || !obj2) {
            this.errors.push(`Missing '${path}' section in one or both files`);
            return;
        }

        requiredProps.forEach(prop => {
            if (!(prop in obj1) || !(prop in obj2)) {
                this.errors.push(`Missing '${prop}' in '${path}' for one or both languages`);
            }
        });
    }

    /**
     * Validates that all translation keys exist and are non-empty
     * @param {Object} data - Language data object
     * @param {string} language - Language code
     * @returns {Object} Validation result
     */
    validateTranslationCompleteness(data, language) {
        this.errors = [];
        this.warnings = [];

        this._validateTranslationKeys(data, language, '');

        return {
            isValid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Recursively validates translation keys
     */
    _validateTranslationKeys(obj, language, path) {
        if (typeof obj === 'string') {
            if (!obj.trim()) {
                this.errors.push(`Empty translation string at '${path}' in ${language}`);
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                this._validateTranslationKeys(item, language, `${path}[${index}]`);
            });
        } else if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                const newPath = path ? `${path}.${key}` : key;
                this._validateTranslationKeys(obj[key], language, newPath);
            });
        }
    }

    /**
     * Loads and validates both language files
     * @param {string} esFilePath - Path to Spanish data file
     * @param {string} enFilePath - Path to English data file
     * @returns {Promise<Object>} Validation result
     */
    async validateLanguageFiles(esFilePath, enFilePath) {
        try {
            const [esResponse, enResponse] = await Promise.all([
                fetch(esFilePath),
                fetch(enFilePath)
            ]);

            if (!esResponse.ok) {
                throw new Error(`Failed to load Spanish data file: ${esResponse.status}`);
            }
            if (!enResponse.ok) {
                throw new Error(`Failed to load English data file: ${enResponse.status}`);
            }

            const [esData, enData] = await Promise.all([
                esResponse.json(),
                enResponse.json()
            ]);

            // Validate structure consistency
            const structureResult = this.validateDataStructure(esData, enData, 'es', 'en');

            // Validate translation completeness for both languages
            const esCompletenessResult = this.validateTranslationCompleteness(esData, 'es');
            const enCompletenessResult = this.validateTranslationCompleteness(enData, 'en');

            return {
                isValid: structureResult.isValid && esCompletenessResult.isValid && enCompletenessResult.isValid,
                structure: structureResult,
                completeness: {
                    es: esCompletenessResult,
                    en: enCompletenessResult
                }
            };

        } catch (error) {
            return {
                isValid: false,
                error: error.message,
                structure: { isValid: false, errors: [error.message], warnings: [] },
                completeness: {
                    es: { isValid: false, errors: [error.message], warnings: [] },
                    en: { isValid: false, errors: [error.message], warnings: [] }
                }
            };
        }
    }
}

// Export for use in other modules
export { DataValidator };