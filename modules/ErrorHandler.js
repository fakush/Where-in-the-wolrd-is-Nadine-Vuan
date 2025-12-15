/**
 * Enhanced Error Handler
 * Provides graceful error handling for all user actions and system operations
 */

export class ErrorHandler {
    constructor(gameController) {
        this.gameController = gameController;
        this.errorLog = [];
        this.recoveryStrategies = this.initializeRecoveryStrategies();
        this.setupGlobalErrorHandling();
    }

    // Initialize recovery strategies for different error types
    initializeRecoveryStrategies() {
        return {
            'network': {
                retry: true,
                maxRetries: 3,
                retryDelay: 1000,
                fallback: () => this.handleNetworkFailure()
            },
            'validation': {
                retry: false,
                fallback: (error, context) => this.handleValidationError(error, context)
            },
            'gamestate': {
                retry: false,
                fallback: () => this.handleGameStateError()
            },
            'asset': {
                retry: true,
                maxRetries: 2,
                retryDelay: 500,
                fallback: (error, context) => this.handleAssetError(error, context)
            },
            'ui': {
                retry: false,
                fallback: (error, context) => this.handleUIError(error, context)
            },
            'storage': {
                retry: true,
                maxRetries: 1,
                retryDelay: 100,
                fallback: () => this.handleStorageError()
            }
        };
    }

    // Set up global error handling
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        if (typeof window !== 'undefined') {
            window.addEventListener('unhandledrejection', (event) => {
                console.error('Unhandled promise rejection:', event.reason);
                this.handleError('system', event.reason, { 
                    type: 'unhandled_promise',
                    source: 'global'
                });
                event.preventDefault();
            });

            // Handle general JavaScript errors
            window.addEventListener('error', (event) => {
                console.error('Global error:', event.error);
                this.handleError('system', event.error, {
                    type: 'javascript_error',
                    source: 'global',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
        }
    }

    // Main error handling method
    async handleError(errorType, error, context = {}) {
        try {
            // Log the error
            this.logError(errorType, error, context);

            // Get recovery strategy
            const strategy = this.recoveryStrategies[errorType] || this.recoveryStrategies['ui'];

            // Attempt recovery
            const recoveryResult = await this.attemptRecovery(strategy, error, context);

            // Show user-friendly error message
            this.showUserErrorMessage(errorType, error, recoveryResult);

            return recoveryResult;

        } catch (recoveryError) {
            console.error('Error during error handling:', recoveryError);
            this.handleCriticalError(error, recoveryError);
            return { success: false, critical: true };
        }
    }

    // Attempt error recovery based on strategy
    async attemptRecovery(strategy, error, context) {
        let attempts = 0;
        const maxRetries = strategy.maxRetries || 0;

        while (attempts <= maxRetries) {
            try {
                if (attempts > 0 && strategy.retryDelay) {
                    await this.delay(strategy.retryDelay * attempts);
                }

                if (strategy.retry && attempts < maxRetries) {
                    // Attempt to retry the original operation
                    const retryResult = await this.retryOperation(context);
                    if (retryResult.success) {
                        return { success: true, method: 'retry', attempts: attempts + 1 };
                    }
                }

                // Use fallback strategy
                if (strategy.fallback) {
                    const fallbackResult = await strategy.fallback(error, context);
                    return { 
                        success: fallbackResult.success !== false, 
                        method: 'fallback', 
                        attempts: attempts + 1,
                        fallbackData: fallbackResult
                    };
                }

                break;

            } catch (recoveryError) {
                console.warn(`Recovery attempt ${attempts + 1} failed:`, recoveryError);
                attempts++;
            }
        }

        return { success: false, method: 'none', attempts: attempts };
    }

    // Retry original operation if possible
    async retryOperation(context) {
        try {
            if (context.operation && typeof context.operation === 'function') {
                const result = await context.operation();
                return { success: true, result: result };
            }

            if (context.retryCallback && typeof context.retryCallback === 'function') {
                const result = await context.retryCallback();
                return { success: true, result: result };
            }

            return { success: false, reason: 'No retry operation available' };

        } catch (error) {
            return { success: false, error: error };
        }
    }

    // Handle network-related failures
    handleNetworkFailure() {
        return {
            success: true,
            action: 'offline_mode',
            message: 'Network connection lost. The game will continue with cached data.',
            userMessage: 'Connection issue detected. The game is running in offline mode.'
        };
    }

    // Handle validation errors
    handleValidationError(error, context) {
        const fallbackAction = context.fallbackAction || 'back-to-investigation';
        
        return {
            success: true,
            action: fallbackAction,
            message: `Validation error handled: ${error.message}`,
            userMessage: this.getUserFriendlyMessage(error.message)
        };
    }

    // Handle game state errors
    handleGameStateError() {
        // Attempt to restore from last known good state
        const restored = this.restoreGameState();
        
        if (restored) {
            return {
                success: true,
                action: 'state_restored',
                message: 'Game state restored from backup',
                userMessage: 'Game state has been restored. You can continue playing.'
            };
        } else {
            return {
                success: true,
                action: 'restart_required',
                message: 'Game state corrupted, restart required',
                userMessage: 'There was an issue with your game progress. Please start a new game.'
            };
        }
    }

    // Handle asset loading errors
    handleAssetError(error, context) {
        const assetType = context.assetType || 'unknown';
        const assetPath = context.assetPath || 'unknown';

        // Provide fallback assets
        const fallbackAsset = this.getFallbackAsset(assetType, assetPath);

        return {
            success: true,
            action: 'fallback_asset',
            fallbackAsset: fallbackAsset,
            message: `Asset loading failed, using fallback: ${assetPath}`,
            userMessage: 'Some images may appear different due to loading issues.'
        };
    }

    // Handle UI-related errors
    handleUIError(error, context) {
        // Attempt to refresh the UI component
        const refreshed = this.refreshUIComponent(context.component);

        if (refreshed) {
            return {
                success: true,
                action: 'ui_refreshed',
                message: 'UI component refreshed successfully',
                userMessage: null // No user message needed for successful UI refresh
            };
        } else {
            return {
                success: true,
                action: 'ui_fallback',
                message: 'UI error handled with fallback interface',
                userMessage: 'The interface has been simplified due to a display issue.'
            };
        }
    }

    // Handle storage-related errors
    handleStorageError() {
        // Try alternative storage methods
        const alternativeStorage = this.setupAlternativeStorage();

        return {
            success: alternativeStorage.success,
            action: 'alternative_storage',
            storageMethod: alternativeStorage.method,
            message: `Storage error handled: ${alternativeStorage.method}`,
            userMessage: alternativeStorage.success ? 
                null : 
                'Game progress may not be saved due to storage limitations.'
        };
    }

    // Handle critical errors that cannot be recovered
    handleCriticalError(originalError, recoveryError) {
        console.error('Critical error - recovery failed:', { originalError, recoveryError });

        // Log critical error for debugging
        this.logError('critical', originalError, {
            recoveryError: recoveryError,
            timestamp: new Date().toISOString(),
            gameState: this.gameController?.gameState || null
        });

        // Show critical error message to user
        this.showCriticalErrorMessage(originalError);

        // Attempt emergency game reset
        this.emergencyGameReset();
    }

    // Restore game state from backup
    restoreGameState() {
        try {
            // Try to restore from localStorage backup
            const backupState = localStorage.getItem('nadine-vuan-game-backup');
            if (backupState) {
                const parsedState = JSON.parse(backupState);
                if (this.gameController.gameState.validateSavedState(parsedState)) {
                    Object.assign(this.gameController.gameState, parsedState);
                    return true;
                }
            }

            // Try to create a minimal valid state
            this.gameController.gameState.resetGameState();
            return true;

        } catch (error) {
            console.error('Failed to restore game state:', error);
            return false;
        }
    }

    // Get fallback asset for failed loads
    getFallbackAsset(assetType, originalPath) {
        const fallbackAssets = {
            'scene': 'assets/scenes/world_map.png',
            'character': 'assets/scenes/steve.png',
            'cover': 'assets/scenes/portada_juego.png',
            'map': 'assets/scenes/world_map.png'
        };

        // Determine asset type from path if not specified
        if (assetType === 'unknown' && originalPath) {
            if (originalPath.includes('_pistas') || originalPath.includes('_notHere')) {
                assetType = 'scene';
            } else if (originalPath.includes('steve') || originalPath.includes('nadine')) {
                assetType = 'character';
            } else if (originalPath.includes('portada')) {
                assetType = 'cover';
            } else if (originalPath.includes('world_map')) {
                assetType = 'map';
            }
        }

        return fallbackAssets[assetType] || fallbackAssets['scene'];
    }

    // Refresh UI component
    refreshUIComponent(componentName) {
        try {
            if (!componentName || !this.gameController.uiManager) {
                return false;
            }

            // Attempt to refresh specific UI components
            switch (componentName) {
                case 'investigation':
                    this.gameController.uiManager.updateInvestigationScreen(
                        this.gameController.gameState.currentCity
                    );
                    return true;

                case 'progress':
                    this.gameController.updateProgressDisplay();
                    return true;

                case 'clues':
                    this.gameController.uiManager.updateCluesScreen(
                        this.gameController.gameState.collectedClues
                    );
                    return true;

                case 'travel':
                    this.gameController.uiManager.showWorldMap();
                    return true;

                default:
                    // Generic refresh - reload current screen
                    const currentPhase = this.gameController.gameState.phase;
                    this.gameController.uiManager.showScreen(currentPhase + '-screen');
                    return true;
            }

        } catch (error) {
            console.error('Failed to refresh UI component:', error);
            return false;
        }
    }

    // Setup alternative storage when localStorage fails
    setupAlternativeStorage() {
        try {
            // Try sessionStorage
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem('nadine-vuan-test', 'test');
                sessionStorage.removeItem('nadine-vuan-test');
                return { success: true, method: 'sessionStorage' };
            }

            // Fall back to in-memory storage
            if (!window.gameMemoryStorage) {
                window.gameMemoryStorage = {};
            }
            return { success: true, method: 'memory' };

        } catch (error) {
            return { success: false, method: 'none' };
        }
    }

    // Show user-friendly error message
    showUserErrorMessage(errorType, error, recoveryResult) {
        if (!recoveryResult.fallbackData?.userMessage && !this.shouldShowErrorToUser(errorType)) {
            return; // Don't show technical errors to users
        }

        const message = recoveryResult.fallbackData?.userMessage || 
                       this.getUserFriendlyMessage(error.message || error);

        if (message && this.gameController.uiManager) {
            this.gameController.uiManager.showFeedbackMessage(message, 'warning', {
                icon: 'fas fa-exclamation-triangle',
                duration: 5000,
                persistent: errorType === 'critical'
            });
        }
    }

    // Show critical error message
    showCriticalErrorMessage(error) {
        const message = 'A serious error occurred. The game will attempt to restart automatically.';
        
        if (this.gameController?.uiManager) {
            this.gameController.uiManager.showFeedbackMessage(message, 'error', {
                icon: 'fas fa-exclamation-circle',
                duration: 10000,
                persistent: true
            });
        } else {
            // Fallback to alert if UI manager is not available
            alert(message);
        }
    }

    // Determine if error should be shown to user
    shouldShowErrorToUser(errorType) {
        const userVisibleErrors = ['network', 'asset', 'storage'];
        return userVisibleErrors.includes(errorType);
    }

    // Convert technical error messages to user-friendly ones
    getUserFriendlyMessage(technicalMessage) {
        const messageMappings = {
            'Network error': 'Connection problem detected. Please check your internet connection.',
            'Failed to fetch': 'Unable to load game data. Please check your connection and try again.',
            'Invalid JSON': 'Game data appears to be corrupted. Please refresh the page.',
            'City .* does not exist': 'That location is not available. Please choose from the available options.',
            'Game not initialized': 'The game is still loading. Please wait a moment.',
            'localStorage': 'Unable to save your progress. Your game will continue but progress may not be saved.',
            'sessionStorage': 'Unable to save your progress. Your game will continue but progress may not be saved.',
            'QuotaExceededError': 'Storage is full. Some features may not work properly.',
            'Image failed to load': 'Some images could not be loaded. The game will continue with placeholder images.'
        };

        for (const [pattern, friendlyMessage] of Object.entries(messageMappings)) {
            if (new RegExp(pattern, 'i').test(technicalMessage)) {
                return friendlyMessage;
            }
        }

        return 'Something unexpected happened. The game will attempt to continue normally.';
    }

    // Emergency game reset for critical failures
    emergencyGameReset() {
        try {
            console.log('Performing emergency game reset...');

            // Clear all storage
            if (typeof localStorage !== 'undefined') {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.includes('nadine-vuan')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }

            // Reset game controller if available
            if (this.gameController) {
                this.gameController.gameState.resetGameState();
                if (this.gameController.uiManager) {
                    this.gameController.uiManager.showScreen('intro-screen');
                }
            }

            // Show recovery message
            setTimeout(() => {
                if (this.gameController?.uiManager) {
                    this.gameController.uiManager.showFeedbackMessage(
                        'The game has been reset due to a technical issue. You can start a new investigation.',
                        'info',
                        { icon: 'fas fa-refresh', duration: 5000 }
                    );
                }
            }, 1000);

        } catch (resetError) {
            console.error('Emergency reset failed:', resetError);
            // Last resort - reload the page
            if (typeof window !== 'undefined') {
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        }
    }

    // Log errors for debugging and monitoring
    logError(errorType, error, context) {
        const errorEntry = {
            timestamp: new Date().toISOString(),
            type: errorType,
            message: error.message || String(error),
            stack: error.stack,
            context: context,
            gameState: {
                phase: this.gameController?.gameState?.phase,
                currentCity: this.gameController?.gameState?.currentCity,
                citiesVisited: this.gameController?.gameState?.visitedCities?.length || 0,
                cluesCollected: this.gameController?.gameState?.collectedClues?.length || 0
            },
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown'
        };

        // Add to error log (keep last 50 errors)
        this.errorLog.push(errorEntry);
        if (this.errorLog.length > 50) {
            this.errorLog.shift();
        }

        // Log to console with appropriate level
        if (errorType === 'critical') {
            console.error('Critical Error:', errorEntry);
        } else {
            console.warn('Handled Error:', errorEntry);
        }

        // In a production environment, this would be sent to an error monitoring service
        this.sendErrorToMonitoring(errorEntry);
    }

    // Send error to monitoring service (placeholder for production implementation)
    sendErrorToMonitoring(errorEntry) {
        // In a real application, this would send the error to a service like Sentry, LogRocket, etc.
        // For now, we'll just store it locally for debugging
        try {
            const existingErrors = JSON.parse(localStorage.getItem('nadine-vuan-error-log') || '[]');
            existingErrors.push(errorEntry);
            
            // Keep only last 20 errors in storage
            if (existingErrors.length > 20) {
                existingErrors.splice(0, existingErrors.length - 20);
            }
            
            localStorage.setItem('nadine-vuan-error-log', JSON.stringify(existingErrors));
        } catch (storageError) {
            // If we can't even log errors, just continue silently
            console.warn('Could not store error log:', storageError);
        }
    }

    // Utility method for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get error statistics for debugging
    getErrorStatistics() {
        const stats = {
            totalErrors: this.errorLog.length,
            errorsByType: {},
            recentErrors: this.errorLog.slice(-10),
            criticalErrors: this.errorLog.filter(e => e.type === 'critical').length
        };

        this.errorLog.forEach(error => {
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
        });

        return stats;
    }

    // Clear error log (for testing or privacy)
    clearErrorLog() {
        this.errorLog = [];
        try {
            localStorage.removeItem('nadine-vuan-error-log');
        } catch (error) {
            console.warn('Could not clear error log from storage:', error);
        }
    }
}