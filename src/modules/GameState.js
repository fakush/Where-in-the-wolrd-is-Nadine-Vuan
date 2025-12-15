/**
 * GameState.js - Game State Management
 * Handles all game state data and persistence
 */

export class GameState {
    constructor() {
        this.phase = 'intro';
        this.currentCity = null;
        this.visitedCities = [];
        this.collectedClues = [];
        this.gameStats = {
            startTime: null,
            citiesVisited: 0,
            correctDeductions: 0,
            attemptsRemaining: 10
        };
        this.isGameComplete = false;
        this.hasWon = false;
        this.gameData = null;
        this.sessionId = this.generateSessionId();
        this.failureDetails = null;
        this.milestonesReached = null;
    }

    // Generate unique session ID for session isolation
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Initialize new game session with fresh randomization
    initializeGame() {
        this.phase = 'intro';
        this.currentCity = null;
        this.visitedCities = [];
        this.collectedClues = [];
        this.gameStats = {
            startTime: new Date(),
            citiesVisited: 0,
            correctDeductions: 0,
            attemptsRemaining: 10
        };
        this.isGameComplete = false;
        this.hasWon = false;
        this.failureDetails = null;
        this.milestonesReached = null;
        
        // Generate new session ID for complete isolation
        this.sessionId = this.generateSessionId();
        
        // Reset random seed for fresh randomization (if needed)
        this.resetRandomSeed();

        // Mark that randomization should be reinitialized
        this.randomizationNeedsReset = true;
    }

    // Reset random seed for fresh randomization in new sessions
    resetRandomSeed() {
        // JavaScript doesn't have a built-in way to seed Math.random()
        // But we can create a simple seeded random number generator for consistency
        this.randomSeed = Date.now() + Math.random();
    }

    // Reset game state for restart with complete session isolation
    resetGameState() {
        // Clear all game state properties completely
        this.phase = 'intro';
        this.currentCity = null;
        this.visitedCities = [];
        this.collectedClues = [];
        this.gameStats = {
            startTime: null,
            citiesVisited: 0,
            correctDeductions: 0,
            attemptsRemaining: 10
        };
        this.isGameComplete = false;
        this.hasWon = false;
        this.failureDetails = null;
        this.milestonesReached = null;
        
        // Generate new session ID for isolation
        this.sessionId = this.generateSessionId();
        
        // Clear any cached data that might contaminate new session
        this.clearSessionCache();
        
        // Save the reset state
        this.saveGameState();
    }

    // Clear session-specific cached data
    clearSessionCache() {
        // Clear any temporary UI state
        if (typeof window !== 'undefined') {
            // Clear any session-specific localStorage keys
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('nadine-vuan-temp-')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        }
    }

    // Save game state to localStorage with session validation
    saveGameState() {
        try {
            const stateToSave = {
                sessionId: this.sessionId,
                phase: this.phase,
                currentCity: this.currentCity,
                visitedCities: [...this.visitedCities],
                collectedClues: [...this.collectedClues],
                gameStats: { ...this.gameStats },
                isGameComplete: this.isGameComplete,
                hasWon: this.hasWon,
                failureDetails: this.failureDetails,
                milestonesReached: this.milestonesReached,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem('nadine-vuan-game-state', JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Could not save game state:', error);
        }
    }

    // Load game state from localStorage with session validation
    loadGameState() {
        try {
            const savedState = localStorage.getItem('nadine-vuan-game-state');
            if (savedState) {
                const state = JSON.parse(savedState);
                
                // Validate session data integrity
                if (!this.validateSavedState(state)) {
                    console.warn('Saved state validation failed, starting fresh session');
                    return false;
                }
                
                this.sessionId = state.sessionId || this.generateSessionId();
                this.phase = state.phase || 'intro';
                this.currentCity = state.currentCity;
                this.visitedCities = state.visitedCities || [];
                this.collectedClues = state.collectedClues || [];
                this.gameStats = state.gameStats || {
                    startTime: new Date(),
                    citiesVisited: 0,
                    correctDeductions: 0,
                    attemptsRemaining: 10
                };
                this.isGameComplete = state.isGameComplete || false;
                this.hasWon = state.hasWon || false;
                this.failureDetails = state.failureDetails || null;
                this.milestonesReached = state.milestonesReached || null;
                
                return true;
            }
        } catch (error) {
            console.warn('Could not load game state:', error);
        }
        return false;
    }

    // Validate saved state for data integrity
    validateSavedState(state) {
        // Check required fields
        if (!state || typeof state !== 'object') {
            return false;
        }
        
        // Validate phase
        const validPhases = ['intro', 'investigation', 'travel', 'conclusion', 'game_over'];
        if (!validPhases.includes(state.phase)) {
            return false;
        }
        
        // Validate arrays
        if (!Array.isArray(state.visitedCities) || !Array.isArray(state.collectedClues)) {
            return false;
        }
        
        // Validate game stats structure
        if (!state.gameStats || typeof state.gameStats !== 'object') {
            return false;
        }
        
        const requiredStats = ['citiesVisited', 'correctDeductions', 'attemptsRemaining'];
        for (const stat of requiredStats) {
            if (typeof state.gameStats[stat] !== 'number') {
                return false;
            }
        }
        
        // Validate attempts remaining is within reasonable bounds
        if (state.gameStats.attemptsRemaining < 0 || state.gameStats.attemptsRemaining > 10) {
            return false;
        }
        
        // Check for data contamination - ensure clues have proper structure
        for (const clue of state.collectedClues) {
            if (!clue || typeof clue !== 'object' || !clue.text || !clue.difficulty || !clue.sourceCity) {
                return false;
            }
        }
        
        return true;
    }
}