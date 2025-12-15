/**
 * DataValidator.js - Game Data Validation
 * Handles validation of game data structure and integrity
 */

export class DataValidator {
    // Comprehensive game data structure validation
    static validateGameData(data) {
        const errors = [];
        
        // Check root structure
        if (!data || typeof data !== 'object') {
            return { isValid: false, errors: ['Data must be a valid object'] };
        }
        
        // Handle both wrapped and unwrapped data formats
        const gameData = data.game_data || data;
        
        // Validate cities array
        if (!gameData.cities || !Array.isArray(gameData.cities)) {
            errors.push('Cities must be an array');
        } else if (gameData.cities.length === 0) {
            errors.push('Cities array cannot be empty');
        } else {
            // Validate each city
            const cityValidation = this.validateCities(gameData.cities);
            if (!cityValidation.isValid) {
                errors.push(...cityValidation.errors);
            }
        }
        
        // Validate game messages (optional but recommended)
        if (gameData.game_messages) {
            const messagesValidation = this.validateGameMessages(gameData.game_messages);
            if (!messagesValidation.isValid) {
                errors.push(...messagesValidation.errors);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validate cities data structure
    static validateCities(cities) {
        const errors = [];
        const cityIds = new Set();
        let hasFinalCity = false;
        
        cities.forEach((city, index) => {
            const cityErrors = [];
            
            // Required fields
            if (!city.id || typeof city.id !== 'string') {
                cityErrors.push(`City ${index}: Missing or invalid id`);
            } else {
                if (cityIds.has(city.id)) {
                    cityErrors.push(`City ${index}: Duplicate city id '${city.id}'`);
                }
                cityIds.add(city.id);
            }
            
            if (!city.name || typeof city.name !== 'string') {
                cityErrors.push(`City ${index}: Missing or invalid name`);
            }
            
            if (!city.country || typeof city.country !== 'string') {
                cityErrors.push(`City ${index}: Missing or invalid country`);
            }
            
            if (typeof city.is_final !== 'boolean') {
                cityErrors.push(`City ${index}: Missing or invalid is_final flag`);
            } else if (city.is_final) {
                hasFinalCity = true;
            }
            
            // Validate informant
            if (!city.informant || typeof city.informant !== 'object') {
                cityErrors.push(`City ${index}: Missing or invalid informant`);
            } else {
                const informant = city.informant;
                if (!informant.name || typeof informant.name !== 'string') {
                    cityErrors.push(`City ${index}: Informant missing name`);
                }
                if (!informant.greeting || typeof informant.greeting !== 'string') {
                    cityErrors.push(`City ${index}: Informant missing greeting`);
                }
                if (!informant.farewell_helpful || typeof informant.farewell_helpful !== 'string') {
                    cityErrors.push(`City ${index}: Informant missing farewell_helpful`);
                }
                if (!informant.farewell_unhelpful || typeof informant.farewell_unhelpful !== 'string') {
                    cityErrors.push(`City ${index}: Informant missing farewell_unhelpful`);
                }
            }
            
            // Validate clues structure
            if (!city.clues || typeof city.clues !== 'object') {
                cityErrors.push(`City ${index}: Missing or invalid clues`);
            } else {
                const clues = city.clues;
                const requiredDifficulties = ['easy', 'medium', 'difficult'];
                
                requiredDifficulties.forEach(difficulty => {
                    if (!clues[difficulty] || !Array.isArray(clues[difficulty])) {
                        cityErrors.push(`City ${index}: Missing or invalid ${difficulty} clues array`);
                    } else if (clues[difficulty].length === 0) {
                        cityErrors.push(`City ${index}: Empty ${difficulty} clues array`);
                    } else {
                        // Validate each clue is a string
                        clues[difficulty].forEach((clue, clueIndex) => {
                            if (typeof clue !== 'string' || clue.trim().length === 0) {
                                cityErrors.push(`City ${index}: Invalid clue at ${difficulty}[${clueIndex}]`);
                            }
                        });
                    }
                });
            }
            
            // Validate not_here_response
            if (!city.not_here_response || typeof city.not_here_response !== 'string') {
                cityErrors.push(`City ${index}: Missing or invalid not_here_response`);
            }
            
            // Validate final encounter for final cities
            if (city.is_final && (!city.final_encounter || typeof city.final_encounter !== 'object')) {
                cityErrors.push(`City ${index}: Final city missing final_encounter`);
            } else if (city.is_final && city.final_encounter) {
                const encounter = city.final_encounter;
                if (!encounter.nadine_speech || typeof encounter.nadine_speech !== 'string') {
                    cityErrors.push(`City ${index}: Final encounter missing nadine_speech`);
                }
                if (!encounter.steve_response || typeof encounter.steve_response !== 'string') {
                    cityErrors.push(`City ${index}: Final encounter missing steve_response`);
                }
                if (!encounter.victory_message || typeof encounter.victory_message !== 'string') {
                    cityErrors.push(`City ${index}: Final encounter missing victory_message`);
                }
            }
            
            errors.push(...cityErrors);
        });
        
        // Ensure there's exactly one final city
        if (!hasFinalCity) {
            errors.push('No final city found (is_final: true)');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validate game messages structure
    static validateGameMessages(messages) {
        const errors = [];
        
        // Check required message sections
        const requiredSections = ['intro', 'game_messages', 'ui_text'];
        
        if (messages.intro && typeof messages.intro === 'object') {
            if (!messages.intro.title || typeof messages.intro.title !== 'string') {
                errors.push('Missing or invalid intro.title');
            }
            if (!messages.intro.text || typeof messages.intro.text !== 'string') {
                errors.push('Missing or invalid intro.text');
            }
        }
        
        // Validate UI text structure
        if (messages.ui_text && typeof messages.ui_text === 'object') {
            if (messages.ui_text.buttons && typeof messages.ui_text.buttons === 'object') {
                // Check for essential button labels
                const essentialButtons = ['start_game', 'restart', 'view_clues'];
                essentialButtons.forEach(button => {
                    if (!messages.ui_text.buttons[button] || typeof messages.ui_text.buttons[button] !== 'string') {
                        errors.push(`Missing or invalid ui_text.buttons.${button}`);
                    }
                });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}