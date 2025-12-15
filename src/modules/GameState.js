/**
 * GameState.js - Game State Management
 * Handles all game state data and persistence
 */

export class GameState {
    constructor() {
        this.phase = 'intro';
        this.currentCity = null;
        this.cityRoute = []; // Predetermined 5-city journey ending with Buenos Aires
        this.currentCityIndex = 0; // Position in the route (0-4)
        this.visitedCities = [];
        this.collectedClues = [];
        this.currentClueLevel = 'hard'; // Current clue difficulty level
        this.gameStats = {
            startTime: null,
            score: 0, // Points accumulated based on clue difficulty
            attemptsRemaining: 3, // Three attempts as per requirements
            citiesCompleted: 0 // Number of cities successfully completed
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
    initializeGame(gameData = null, randomizationSystem = null) {
        this.phase = 'intro';
        this.currentCity = null;
        this.currentCityIndex = 0;
        this.visitedCities = [];
        this.collectedClues = [];
        this.currentClueLevel = 'hard';
        this.gameStats = {
            startTime: new Date(),
            score: 0,
            attemptsRemaining: 3,
            citiesCompleted: 0
        };
        this.isGameComplete = false;
        this.hasWon = false;
        this.failureDetails = null;
        this.milestonesReached = null;
        
        // Generate new session ID for complete isolation
        this.sessionId = this.generateSessionId();
        
        // Reset random seed for fresh randomization (if needed)
        this.resetRandomSeed();

        // Generate predetermined 5-city route ending with Buenos Aires using fair randomization
        if (gameData) {
            this.gameData = gameData;

            // Generate fair route using RandomizationSystem
            this.cityRoute = this.generateCityRoute(gameData, randomizationSystem);

            // Select fair starting city using RandomizationSystem
            if (this.cityRoute.length > 0) {
                // Use the first city in the fairly generated route as starting city
                this.currentCity = this.cityRoute[0];

                // Validate starting city selection
                const startingCityData = gameData.cities.find(city => city.id === this.currentCity);
                if (!startingCityData || startingCityData.is_final) {
                    console.error('Invalid starting city in generated route:', this.currentCity);
                    // Fallback: select a fair starting city separately
                    const fairStartingCity = this.getRandomStartingCity(gameData, randomizationSystem);
                    if (fairStartingCity) {
                        this.currentCity = fairStartingCity.id;
                        // Replace first city in route with the fair starting city
                        this.cityRoute[0] = fairStartingCity.id;
                    }
                }
            }
        }

        // Mark that randomization should be reinitialized
        this.randomizationNeedsReset = true;

        console.log('Game initialized with fair randomization');
        console.log('Route:', this.cityRoute);
        console.log('Starting city:', this.currentCity);
    }

    // Reset random seed for fresh randomization in new sessions
    resetRandomSeed() {
        // JavaScript doesn't have a built-in way to seed Math.random()
        // But we can create a simple seeded random number generator for consistency
        this.randomSeed = Date.now() + Math.random();
    }

    // Generate predetermined 5-city route ending with Buenos Aires using fair randomization
    generateCityRoute(gameData, randomizationSystem = null) {
        if (!gameData || !gameData.cities) {
            console.warn('No game data available for route generation');
            return [];
        }

        // Find Buenos Aires (final destination)
        const buenosAires = gameData.cities.find(city => city.is_final === true);
        if (!buenosAires) {
            console.error('Buenos Aires not found in game data');
            return [];
        }

        // Get all non-final cities for route generation
        const availableCities = gameData.cities.filter(city => city.is_final !== true);
        if (availableCities.length < 4) {
            console.error('Not enough cities available for 5-city route');
            return [];
        }

        let selectedCities = [];

        if (randomizationSystem) {
            // Use fair randomization system for balanced selection
            selectedCities = randomizationSystem.balancedRandomSelection(
                availableCities,
                4,
                {
                    ensureUniqueness: true,
                    avoidRecentSelections: true
                }
            );
        } else {
            // Fallback to basic randomization if system not available
            console.warn('RandomizationSystem not available, using basic randomization');
            const cityPool = [...availableCities];
            for (let i = 0; i < 4; i++) {
                const randomIndex = Math.floor(Math.random() * cityPool.length);
                selectedCities.push(cityPool.splice(randomIndex, 1)[0]);
            }
        }

        // Validate selection
        if (selectedCities.length !== 4) {
            console.error(`Route generation failed: expected 4 cities, got ${selectedCities.length}`);
            return [];
        }

        // Create the 5-city route: 4 random cities + Buenos Aires as final
        const route = selectedCities.map(city => city.id);
        route.push(buenosAires.id);

        // Validate final route
        const validationResult = this.validateGeneratedRoute(route, gameData);
        if (!validationResult.isValid) {
            console.error('Generated route validation failed:', validationResult.errors);
            return [];
        }

        console.log('Generated fair 5-city route:', route);
        return route;
    }

    // Get fair random starting city from the 10 non-Buenos Aires cities
    getRandomStartingCity(gameData, randomizationSystem = null) {
        if (!gameData || !gameData.cities) {
            console.warn('No game data available for starting city selection');
            return null;
        }

        const nonFinalCities = gameData.cities.filter(city => city.is_final !== true);
        if (nonFinalCities.length === 0) {
            console.error('No starting cities available');
            return null;
        }

        let selectedCity = null;

        if (randomizationSystem) {
            // Use fair randomization system for balanced starting city selection
            selectedCity = randomizationSystem.selectRandomStartingCity(gameData.cities);
        } else {
            // Fallback to basic randomization if system not available
            console.warn('RandomizationSystem not available, using basic randomization');
            const randomIndex = Math.floor(Math.random() * nonFinalCities.length);
            selectedCity = nonFinalCities[randomIndex];
        }

        // Validate selection
        if (!selectedCity || selectedCity.is_final) {
            console.error('Invalid starting city selected:', selectedCity);
            return null;
        }

        console.log('Selected fair starting city:', selectedCity.name, selectedCity.id);
        return selectedCity;
    }

    // Reset game state for restart with complete session isolation
    resetGameState() {
        // Clear all game state properties completely
        this.phase = 'intro';
        this.currentCity = null;
        this.cityRoute = [];
        this.currentCityIndex = 0;
        this.visitedCities = [];
        this.collectedClues = [];
        this.currentClueLevel = 'hard';
        this.gameStats = {
            startTime: null,
            score: 0,
            attemptsRemaining: 3,
            citiesCompleted: 0
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
                cityRoute: [...this.cityRoute],
                currentCityIndex: this.currentCityIndex,
                visitedCities: [...this.visitedCities],
                collectedClues: [...this.collectedClues],
                currentClueLevel: this.currentClueLevel,
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
                this.cityRoute = state.cityRoute || [];
                this.currentCityIndex = state.currentCityIndex || 0;
                this.visitedCities = state.visitedCities || [];
                this.collectedClues = state.collectedClues || [];
                this.currentClueLevel = state.currentClueLevel || 'hard';
                this.gameStats = state.gameStats || {
                    startTime: new Date(),
                    score: 0,
                    attemptsRemaining: 3,
                    citiesCompleted: 0
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
        
        // Validate cityRoute array (should be empty or contain exactly 5 cities)
        if (state.cityRoute && (!Array.isArray(state.cityRoute) || state.cityRoute.length > 5)) {
            return false;
        }

        // Validate currentCityIndex
        if (state.currentCityIndex !== undefined &&
            (typeof state.currentCityIndex !== 'number' ||
                state.currentCityIndex < 0 ||
                state.currentCityIndex > 4)) {
            return false;
        }

        // Validate currentClueLevel
        if (state.currentClueLevel && !['easy', 'medium', 'hard'].includes(state.currentClueLevel)) {
            return false;
        }

        // Validate game stats structure
        if (!state.gameStats || typeof state.gameStats !== 'object') {
            return false;
        }
        
        const requiredStats = ['score', 'attemptsRemaining', 'citiesCompleted'];
        for (const stat of requiredStats) {
            if (typeof state.gameStats[stat] !== 'number') {
                return false;
            }
        }
        
        // Validate attempts remaining is within reasonable bounds (0-3)
        if (state.gameStats.attemptsRemaining < 0 || state.gameStats.attemptsRemaining > 3) {
            return false;
        }

        // Validate score is non-negative
        if (state.gameStats.score < 0) {
            return false;
        }

        // Validate cities completed is within bounds (0-5)
        if (state.gameStats.citiesCompleted < 0 || state.gameStats.citiesCompleted > 5) {
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

    // Get the next city in the predetermined route
    getNextCityInRoute() {
        if (this.currentCityIndex >= this.cityRoute.length - 1) {
            return null; // Already at the final city
        }
        return this.cityRoute[this.currentCityIndex + 1];
    }

    // Advance to the next city in the route
    advanceToNextCity() {
        if (this.currentCityIndex < this.cityRoute.length - 1) {
            this.currentCityIndex++;
            this.currentCity = this.cityRoute[this.currentCityIndex];
            this.gameStats.citiesCompleted++;

            // Reset clue level for new city
            this.currentClueLevel = 'hard';

            return true;
        }
        return false; // Cannot advance further
    }

    // Check if current city is the final destination (Buenos Aires)
    isFinalDestination() {
        return this.currentCityIndex === this.cityRoute.length - 1;
    }

    // Add points based on clue difficulty
    addScore(clueLevel) {
        const pointValues = {
            'hard': 3,
            'medium': 2,
            'easy': 1
        };

        const points = pointValues[clueLevel] || 0;
        this.gameStats.score += points;

        console.log(`Added ${points} points for ${clueLevel} clue. Total score: ${this.gameStats.score}`);
        return points;
    }

    // Progress clue difficulty level (hard → medium → easy)
    progressClueLevel() {
        const progression = {
            'hard': 'medium',
            'medium': 'easy',
            'easy': 'easy' // Stay at easy
        };

        this.currentClueLevel = progression[this.currentClueLevel] || 'easy';
        return this.currentClueLevel;
    }

    // Check if the game should end due to failure conditions
    checkFailureConditions() {
        // Out of attempts
        if (this.gameStats.attemptsRemaining <= 0) {
            return {
                hasFailed: true,
                reason: 'attempts_exhausted',
                message: 'You have run out of attempts to find Nadine.'
            };
        }

        return {
            hasFailed: false,
            reason: 'game_continues'
        };
    }

    // Check if the game should end due to victory conditions
    checkVictoryConditions() {
        // Reached Buenos Aires (final destination)
        if (this.isFinalDestination() && this.currentCity === this.cityRoute[this.cityRoute.length - 1]) {
            return {
                hasWon: true,
                reason: 'reached_final_destination',
                message: 'Congratulations! You have found Nadine in Buenos Aires!'
            };
        }

        return {
            hasWon: false,
            reason: 'game_continues'
        };
    }

    // Validate generated route for correctness and fairness
    validateGeneratedRoute(route, gameData) {
        const errors = [];
        const warnings = [];

        // Check route length
        if (!Array.isArray(route) || route.length !== 5) {
            errors.push(`Route must contain exactly 5 cities, got ${route ? route.length : 0}`);
            return { isValid: false, errors: errors, warnings: warnings };
        }

        // Check for duplicates
        const uniqueCities = new Set(route);
        if (uniqueCities.size !== route.length) {
            errors.push('Route contains duplicate cities');
        }

        // Validate each city exists in game data
        const allCityIds = gameData.cities.map(city => city.id);
        route.forEach((cityId, index) => {
            if (!allCityIds.includes(cityId)) {
                errors.push(`City at position ${index} (${cityId}) not found in game data`);
            }
        });

        // Check that Buenos Aires is the final destination
        const finalCityId = route[route.length - 1];
        const finalCityData = gameData.cities.find(city => city.id === finalCityId);
        if (!finalCityData || !finalCityData.is_final) {
            errors.push('Final city in route is not Buenos Aires');
        }

        // Check that first 4 cities are not final destinations
        for (let i = 0; i < 4; i++) {
            const cityData = gameData.cities.find(city => city.id === route[i]);
            if (cityData && cityData.is_final) {
                errors.push(`City at position ${i} (${route[i]}) is marked as final destination`);
            }
        }

        // Validate geographic distribution (warning only)
        const countries = route.slice(0, 4).map(cityId => {
            const cityData = gameData.cities.find(city => city.id === cityId);
            return cityData ? cityData.country : null;
        }).filter(country => country !== null);

        const uniqueCountries = new Set(countries);
        if (uniqueCountries.size < 3) {
            warnings.push(`Route has limited geographic diversity: only ${uniqueCountries.size} different countries`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings,
            routeStats: {
                totalCities: route.length,
                uniqueCities: uniqueCities.size,
                countries: uniqueCountries.size,
                finalDestination: finalCityId
            }
        };
    }
}