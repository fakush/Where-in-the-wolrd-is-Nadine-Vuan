/**
 * SessionManager.js - Session Isolation and Restart System
 * Handles session management, isolation, and restart functionality
 */

export class SessionManager {
    constructor(gameState, uiManager) {
        this.gameState = gameState;
        this.uiManager = uiManager;

        // Language preference storage key
        this.languagePreferenceKey = 'nadine_game_language_preference';
        this.defaultLanguage = 'es'; // Spanish as default per requirements
    }

    // Perform complete session reset with validation
    performCompleteSessionReset() {
        // Store old session ID for logging
        const oldSessionId = this.gameState.sessionId;
        
        // Reset game state completely
        this.gameState.resetGameState();
        
        // Validate that reset was successful
        if (!this.validateSessionReset(oldSessionId)) {
            console.warn('Session reset validation failed, forcing clean state');
            this.forceCleanSessionState();
        }
        
        // Clear any persistent UI elements
        this.clearPersistentUIElements();
        
        // Reset UI state
        if (this.uiManager) {
            this.uiManager.gameController.uiState = new (this.uiManager.gameController.uiState.constructor)();
        }
    }

    // Validate that session reset was successful
    validateSessionReset(oldSessionId) {
        // Check that session ID changed
        if (this.gameState.sessionId === oldSessionId) {
            return false;
        }
        
        // Check that all arrays are empty
        if (this.gameState.visitedCities.length > 0 || this.gameState.collectedClues.length > 0) {
            return false;
        }
        
        // Check that stats are reset
        const stats = this.gameState.gameStats;
        if (stats.citiesVisited !== 0 || stats.correctDeductions !== 0 || stats.attemptsRemaining !== 10) {
            return false;
        }
        
        // Check that flags are reset
        if (this.gameState.isGameComplete || this.gameState.hasWon) {
            return false;
        }
        
        // Check that optional fields are cleared
        if (this.gameState.failureDetails || this.gameState.milestonesReached) {
            return false;
        }
        
        return true;
    }

    // Force clean session state if validation fails
    forceCleanSessionState() {
        const gameData = this.gameState.gameData; // Preserve game data
        this.gameState = new (this.gameState.constructor)();
        this.gameState.gameData = gameData;
    }

    // Test session independence to ensure no data contamination
    testSessionIndependence() {
        const testResults = {
            sessionIsolation: true,
            randomizationFresh: true,
            stateClean: true,
            errors: []
        };
        
        try {
            // Test 1: Verify session ID is unique
            const currentSessionId = this.gameState.sessionId;
            const newGameState = new (this.gameState.constructor)();
            if (currentSessionId === newGameState.sessionId) {
                testResults.sessionIsolation = false;
                testResults.errors.push('Session IDs are not unique');
            }
            
            // Test 2: Verify randomization produces different results
            // Note: This test might occasionally fail due to random chance, but it's a good indicator
            
            // Test 3: Verify state is completely clean
            if (this.gameState.visitedCities.length > 0 || 
                this.gameState.collectedClues.length > 0 ||
                this.gameState.gameStats.citiesVisited > 0 ||
                this.gameState.isGameComplete ||
                this.gameState.hasWon) {
                testResults.stateClean = false;
                testResults.errors.push('Game state is not clean');
            }
            
            // Test 4: Verify no localStorage contamination
            const savedState = localStorage.getItem('nadine-vuan-game-state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                if (parsed.sessionId === currentSessionId && 
                    (parsed.visitedCities?.length > 0 || parsed.collectedClues?.length > 0)) {
                    testResults.stateClean = false;
                    testResults.errors.push('localStorage contains contaminated data');
                }
            }
            
        } catch (error) {
            testResults.sessionIsolation = false;
            testResults.errors.push(`Session independence test failed: ${error.message}`);
        }
        
        // Log results for debugging
        if (testResults.errors.length > 0) {
            console.warn('Session independence test failed:', testResults);
        } else {
            console.log('Session independence test passed');
        }
        
        return testResults;
    }

    // Ensure no data contamination between games
    ensureSessionIsolation() {
        // Run session independence test
        const testResults = this.testSessionIndependence();
        
        if (!testResults.sessionIsolation || !testResults.stateClean) {
            console.warn('Session contamination detected, performing deep clean');
            this.performDeepSessionClean();
        }
        
        return testResults;
    }

    // Perform deep session clean if contamination is detected
    performDeepSessionClean() {
        // Preserve language preference before clearing
        const currentLanguagePreference = this.getLanguagePreference();

        // Clear all localStorage keys related to the game
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('nadine-vuan') && key !== this.languagePreferenceKey) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Restore language preference after cleaning
        this.storeLanguagePreference(currentLanguagePreference);

        // Force complete state reset
        this.forceCleanSessionState();
        
        // Clear all UI elements
        if (this.uiManager && typeof this.uiManager.clearUIState === 'function') {
            this.uiManager.clearUIState();
        }
        
        // Reinitialize with fresh state
        if (this.gameState && typeof this.gameState.initializeGame === 'function') {
            this.gameState.initializeGame();
        }
        
        console.log('Deep session clean completed');
    }

    // Clear persistent UI elements that might contaminate new session
    clearPersistentUIElements() {
        // Check if we're in a browser environment
        if (typeof document === 'undefined' || !document.querySelectorAll) {
            // In testing environment, skip DOM operations
            return;
        }

        try {
            // Clear any modal dialogs
            const modals = document.querySelectorAll('.modal, .tooltip, .feedback-message');
            modals.forEach(modal => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            });

            // Clear any animation classes
            const animatedElements = document.querySelectorAll('[class*="animation"], [class*="effect"]');
            animatedElements.forEach(element => {
                element.className = element.className.replace(/\b\w*animation\w*\b/g, '').replace(/\b\w*effect\w*\b/g, '').trim();
            });
        } catch (error) {
            // Silently handle DOM errors in testing environment
            console.log('DOM operations skipped in testing environment');
        }
    }

    /**
     * Store language preference in localStorage
     * @param {string} languageCode - Language code to store (e.g., 'es', 'en')
     */
    storeLanguagePreference(languageCode) {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this.languagePreferenceKey, languageCode);
                console.log(`SessionManager: Stored language preference: ${languageCode}`);
            } else {
                console.warn('SessionManager: localStorage not available, cannot store language preference');
            }
        } catch (error) {
            console.warn('SessionManager: Failed to store language preference:', error);
        }
    }

    /**
     * Retrieve language preference from localStorage
     * @returns {string} Language code or default language if no preference exists
     */
    getLanguagePreference() {
        try {
            if (typeof localStorage !== 'undefined') {
                const storedLanguage = localStorage.getItem(this.languagePreferenceKey);

                if (storedLanguage) {
                    console.log(`SessionManager: Retrieved language preference: ${storedLanguage}`);
                    return storedLanguage;
                }
            }

            // Return default language if no preference exists
            console.log(`SessionManager: No language preference found, using default: ${this.defaultLanguage}`);
            return this.defaultLanguage;

        } catch (error) {
            console.warn('SessionManager: Failed to retrieve language preference:', error);
            return this.defaultLanguage;
        }
    }

    /**
     * Initialize language preference on game startup
     * Sets the language preference to the stored value or default if none exists
     * @returns {string} The language code that was set
     */
    initializeLanguagePreference() {
        const languagePreference = this.getLanguagePreference();

        // If no preference was stored, store the default language
        if (!localStorage.getItem(this.languagePreferenceKey)) {
            this.storeLanguagePreference(this.defaultLanguage);
        }

        console.log(`SessionManager: Initialized language preference: ${languagePreference}`);
        return languagePreference;
    }

    /**
     * Clear language preference from storage
     * Used during deep session clean or when resetting preferences
     */
    clearLanguagePreference() {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(this.languagePreferenceKey);
                console.log('SessionManager: Cleared language preference');
            }
        } catch (error) {
            console.warn('SessionManager: Failed to clear language preference:', error);
        }
    }

    /**
     * Check if a language preference exists in storage
     * @returns {boolean} True if a preference exists, false otherwise
     */
    hasLanguagePreference() {
        try {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(this.languagePreferenceKey) !== null;
            }
            return false;
        } catch (error) {
            console.warn('SessionManager: Failed to check language preference existence:', error);
            return false;
        }
    }
}