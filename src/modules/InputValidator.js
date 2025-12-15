/**
 * Input Validation System
 * Provides comprehensive validation for all user inputs and game actions
 */

export class InputValidator {
    constructor(gameController) {
        this.gameController = gameController;
        this.validationRules = this.initializeValidationRules();
    }

    // Initialize validation rules for different input types
    initializeValidationRules() {
        return {
            cityId: {
                required: true,
                type: 'string',
                minLength: 1,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9_-]+$/,
                customValidator: (value) => this.validateCityExists(value)
            },
            gameAction: {
                required: true,
                type: 'string',
                allowedValues: [
                    'start-game', 'collect-clues', 'travel', 'select-destination',
                    'view-clues', 'restart-game', 'back-to-investigation', 'exit-game'
                ]
            },
            gamePhase: {
                required: true,
                type: 'string',
                allowedValues: ['intro', 'investigation', 'travel', 'conclusion', 'game_over']
            },
            difficulty: {
                required: false,
                type: 'string',
                allowedValues: ['easy', 'medium', 'difficult']
            },
            sessionId: {
                required: true,
                type: 'string',
                minLength: 10,
                maxLength: 100,
                pattern: /^session_[0-9]+_[a-zA-Z0-9]+$/
            }
        };
    }

    // Main validation method for user inputs
    validateUserInput(inputType, value, context = {}) {
        try {
            // Sanitize input first
            const sanitizedValue = this.sanitizeInput(value);
            
            // Get validation rule
            const rule = this.validationRules[inputType];
            if (!rule) {
                return {
                    isValid: false,
                    error: `Unknown input type: ${inputType}`,
                    sanitizedValue: sanitizedValue
                };
            }

            // Perform validation
            const validationResult = this.performValidation(sanitizedValue, rule, context);
            
            // Log validation attempt for security monitoring
            this.logValidationAttempt(inputType, value, validationResult, context);
            
            return {
                isValid: validationResult.isValid,
                error: validationResult.error,
                sanitizedValue: sanitizedValue,
                warnings: validationResult.warnings || []
            };

        } catch (error) {
            console.error('Input validation error:', error);
            return {
                isValid: false,
                error: 'Validation system error',
                sanitizedValue: this.sanitizeInput(value)
            };
        }
    }

    // Sanitize user input to prevent injection attacks
    sanitizeInput(input) {
        if (typeof input !== 'string') {
            return String(input);
        }

        // Remove potentially dangerous characters
        let sanitized = input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/[<>'"&]/g, (match) => { // Escape special characters
                const escapeMap = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return escapeMap[match];
            });

        // Trim whitespace
        sanitized = sanitized.trim();

        // Limit length to prevent DoS attacks
        if (sanitized.length > 1000) {
            sanitized = sanitized.substring(0, 1000);
        }

        return sanitized;
    }

    // Perform detailed validation based on rules
    performValidation(value, rule, context) {
        const warnings = [];

        // Check if required
        if (rule.required && (value === null || value === undefined || value === '')) {
            return { isValid: false, error: 'This field is required' };
        }

        // Skip further validation if not required and empty
        if (!rule.required && (value === null || value === undefined || value === '')) {
            return { isValid: true, warnings: warnings };
        }

        // Type validation
        if (rule.type && typeof value !== rule.type) {
            return { isValid: false, error: `Expected ${rule.type}, got ${typeof value}` };
        }

        // String-specific validations
        if (rule.type === 'string' && typeof value === 'string') {
            // Length validation
            if (rule.minLength && value.length < rule.minLength) {
                return { isValid: false, error: `Minimum length is ${rule.minLength}` };
            }
            if (rule.maxLength && value.length > rule.maxLength) {
                return { isValid: false, error: `Maximum length is ${rule.maxLength}` };
            }

            // Pattern validation
            if (rule.pattern && !rule.pattern.test(value)) {
                return { isValid: false, error: 'Invalid format' };
            }

            // Allowed values validation
            if (rule.allowedValues && !rule.allowedValues.includes(value)) {
                return { 
                    isValid: false, 
                    error: `Invalid value. Allowed values: ${rule.allowedValues.join(', ')}` 
                };
            }
        }

        // Number-specific validations
        if (rule.type === 'number' && typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                return { isValid: false, error: `Minimum value is ${rule.min}` };
            }
            if (rule.max !== undefined && value > rule.max) {
                return { isValid: false, error: `Maximum value is ${rule.max}` };
            }
        }

        // Custom validator
        if (rule.customValidator) {
            const customResult = rule.customValidator(value, context);
            if (!customResult.isValid) {
                return customResult;
            }
            if (customResult.warnings) {
                warnings.push(...customResult.warnings);
            }
        }

        return { isValid: true, warnings: warnings };
    }

    // Validate that a city exists in the game data
    validateCityExists(cityId) {
        if (!this.gameController || !this.gameController.gameState) {
            return { isValid: false, error: 'Game not initialized' };
        }

        const cityData = this.gameController.getCityData(cityId);
        if (!cityData) {
            return { isValid: false, error: `City '${cityId}' does not exist` };
        }

        return { isValid: true };
    }

    // Validate click and selection against current game state
    validateGameStateAction(action, data, currentGameState) {
        try {
            // Validate action type
            const actionValidation = this.validateUserInput('gameAction', action);
            if (!actionValidation.isValid) {
                return {
                    isValid: false,
                    error: `Invalid action: ${actionValidation.error}`,
                    fallbackAction: 'back-to-investigation'
                };
            }

            // Validate action against current game phase
            const phaseValidation = this.validateActionForPhase(action, currentGameState.phase);
            if (!phaseValidation.isValid) {
                return {
                    isValid: false,
                    error: phaseValidation.error,
                    fallbackAction: this.getSafeActionForPhase(currentGameState.phase)
                };
            }

            // Action-specific validations
            switch (action) {
                case 'select-destination':
                    return this.validateDestinationSelection(data, currentGameState);
                
                case 'collect-clues':
                    return this.validateClueCollection(currentGameState);
                
                case 'travel':
                    return this.validateTravelAction(currentGameState);
                
                case 'view-clues':
                    return this.validateViewClues(currentGameState);
                
                default:
                    return { isValid: true };
            }

        } catch (error) {
            console.error('Game state validation error:', error);
            return {
                isValid: false,
                error: 'Game state validation failed',
                fallbackAction: 'back-to-investigation'
            };
        }
    }

    // Validate action is appropriate for current game phase
    validateActionForPhase(action, phase) {
        const allowedActionsPerPhase = {
            intro: ['start-game', 'exit-game'],
            investigation: ['collect-clues', 'travel', 'view-clues', 'restart-game', 'exit-game'],
            travel: ['select-destination', 'back-to-investigation', 'restart-game', 'exit-game'],
            conclusion: ['restart-game', 'exit-game'],
            game_over: ['restart-game', 'exit-game']
        };

        const allowedActions = allowedActionsPerPhase[phase] || [];
        
        if (!allowedActions.includes(action)) {
            return {
                isValid: false,
                error: `Action '${action}' is not allowed in phase '${phase}'`
            };
        }

        return { isValid: true };
    }

    // Get safe fallback action for current phase
    getSafeActionForPhase(phase) {
        const safeActions = {
            intro: 'start-game',
            investigation: 'back-to-investigation',
            travel: 'back-to-investigation',
            conclusion: 'restart-game',
            game_over: 'restart-game'
        };

        return safeActions[phase] || 'restart-game';
    }

    // Validate destination selection
    validateDestinationSelection(data, gameState) {
        if (!data || !data.cityId) {
            return {
                isValid: false,
                error: 'No destination specified',
                fallbackAction: 'back-to-investigation'
            };
        }

        // Validate city ID format
        const cityValidation = this.validateUserInput('cityId', data.cityId);
        if (!cityValidation.isValid) {
            return {
                isValid: false,
                error: `Invalid destination: ${cityValidation.error}`,
                fallbackAction: 'back-to-investigation'
            };
        }

        // Check if city can be traveled to
        const travelCheck = this.gameController.canTravelToCity(data.cityId);
        if (!travelCheck.canTravel) {
            return {
                isValid: false,
                error: `Cannot travel to ${data.cityId}: ${travelCheck.reason}`,
                fallbackAction: 'back-to-investigation'
            };
        }

        return { isValid: true };
    }

    // Validate clue collection action
    validateClueCollection(gameState) {
        if (!gameState.currentCity) {
            return {
                isValid: false,
                error: 'No current city for clue collection',
                fallbackAction: 'restart-game'
            };
        }

        if (gameState.phase !== 'investigation') {
            return {
                isValid: false,
                error: 'Clue collection only allowed during investigation phase',
                fallbackAction: 'back-to-investigation'
            };
        }

        return { isValid: true };
    }

    // Validate travel action
    validateTravelAction(gameState) {
        if (!gameState.currentCity) {
            return {
                isValid: false,
                error: 'No current city to travel from',
                fallbackAction: 'restart-game'
            };
        }

        if (gameState.phase !== 'investigation') {
            return {
                isValid: false,
                error: 'Travel only allowed during investigation phase',
                fallbackAction: 'back-to-investigation'
            };
        }

        // Check if there are available destinations
        const availableCities = this.gameController.getAvailableCities();
        if (availableCities.length === 0) {
            return {
                isValid: false,
                error: 'No available destinations',
                fallbackAction: 'back-to-investigation'
            };
        }

        return { isValid: true };
    }

    // Validate view clues action
    validateViewClues(gameState) {
        // Always allow viewing clues, but provide helpful feedback
        const warnings = [];
        
        if (gameState.collectedClues.length === 0) {
            warnings.push('No clues collected yet');
        }

        return { 
            isValid: true, 
            warnings: warnings 
        };
    }

    // Create fallback response for invalid operations
    createFallbackResponse(error, fallbackAction = null) {
        const fallbackMessages = {
            'back-to-investigation': 'Returning to investigation screen...',
            'restart-game': 'Restarting game due to invalid state...',
            'start-game': 'Please start a new game...'
        };

        return {
            success: false,
            error: error,
            fallbackAction: fallbackAction,
            fallbackMessage: fallbackMessages[fallbackAction] || 'Attempting to recover...',
            userMessage: this.getUserFriendlyErrorMessage(error)
        };
    }

    // Convert technical errors to user-friendly messages
    getUserFriendlyErrorMessage(error) {
        const errorMappings = {
            'City .* does not exist': 'That destination is not available. Please choose from the available cities.',
            'Invalid action': 'That action is not available right now. Please try a different option.',
            'Cannot travel to.*already visited': 'You have already visited that city. Choose a new destination.',
            'Cannot travel to.*current city': 'You are already in that city. Choose a different destination.',
            'No current city': 'There seems to be an issue with your current location. The game will restart.',
            'Game not initialized': 'The game is still loading. Please wait a moment and try again.',
            'Validation system error': 'Something went wrong. Please try again or restart the game.'
        };

        for (const [pattern, message] of Object.entries(errorMappings)) {
            if (new RegExp(pattern).test(error)) {
                return message;
            }
        }

        return 'Something unexpected happened. Please try again or restart the game if the problem persists.';
    }

    // Log validation attempts for security monitoring
    logValidationAttempt(inputType, originalValue, result, context) {
        // Only log failed validations and suspicious patterns
        if (!result.isValid || this.isSuspiciousInput(originalValue)) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                inputType: inputType,
                originalValue: typeof originalValue === 'string' ? originalValue.substring(0, 100) : originalValue,
                isValid: result.isValid,
                error: result.error,
                context: context,
                userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
            };

            // In a real application, this would be sent to a security monitoring service
            console.warn('Input validation log:', logEntry);
        }
    }

    // Detect suspicious input patterns
    isSuspiciousInput(input) {
        if (typeof input !== 'string') return false;

        const suspiciousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\./i,
            /window\./i,
            /alert\s*\(/i,
            /confirm\s*\(/i,
            /prompt\s*\(/i,
            /\.innerHTML/i,
            /\.outerHTML/i
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input));
    }

    // Validate and sanitize form data
    validateFormData(formData) {
        const validatedData = {};
        const errors = [];

        for (const [key, value] of Object.entries(formData)) {
            try {
                const sanitizedValue = this.sanitizeInput(value);
                
                // Apply basic validation based on field name
                if (key.includes('city') || key.includes('destination')) {
                    const validation = this.validateUserInput('cityId', sanitizedValue);
                    if (validation.isValid) {
                        validatedData[key] = validation.sanitizedValue;
                    } else {
                        errors.push(`${key}: ${validation.error}`);
                    }
                } else {
                    validatedData[key] = sanitizedValue;
                }
            } catch (error) {
                errors.push(`${key}: Validation error`);
            }
        }

        return {
            isValid: errors.length === 0,
            data: validatedData,
            errors: errors
        };
    }

    // Rate limiting for user actions (prevent spam/abuse)
    checkRateLimit(action, userId = 'anonymous') {
        const now = Date.now();
        const rateLimits = {
            'collect-clues': { maxAttempts: 10, windowMs: 60000 }, // 10 attempts per minute
            'select-destination': { maxAttempts: 20, windowMs: 60000 }, // 20 attempts per minute
            'restart-game': { maxAttempts: 5, windowMs: 300000 } // 5 restarts per 5 minutes
        };

        const limit = rateLimits[action];
        if (!limit) return { allowed: true };

        // Initialize rate limit tracking
        if (!this.rateLimitData) {
            this.rateLimitData = {};
        }

        const key = `${userId}_${action}`;
        if (!this.rateLimitData[key]) {
            this.rateLimitData[key] = { attempts: [], windowStart: now };
        }

        const userData = this.rateLimitData[key];

        // Clean old attempts outside the window
        userData.attempts = userData.attempts.filter(timestamp => 
            now - timestamp < limit.windowMs
        );

        // Check if limit exceeded
        if (userData.attempts.length >= limit.maxAttempts) {
            return {
                allowed: false,
                error: `Rate limit exceeded for ${action}. Please wait before trying again.`,
                retryAfter: Math.ceil((userData.attempts[0] + limit.windowMs - now) / 1000)
            };
        }

        // Record this attempt
        userData.attempts.push(now);

        return { allowed: true };
    }
}