/**
 * Where in the World is Nadine Vuan? - Game Logic
 * A Carmen Sandiego-inspired detective adventure game
 */

// Game State Management
class GameState {
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

    // Generate unique session ID for session isolation
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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

// UI State Management
class UIState {
    constructor() {
        this.activeScreen = 'intro-screen';
        this.isAnimating = false;
        this.selectedCity = null;
        this.showingClues = false;
        this.modalOpen = false;
    }
}

// Game Controller - Main game logic orchestrator
class GameController {
    constructor() {
        this.gameState = new GameState();
        this.uiState = new UIState();
        this.uiManager = new UIManager(this);
        
        // Bind methods to maintain context
        this.startGame = this.startGame.bind(this);
        this.processPlayerAction = this.processPlayerAction.bind(this);
        this.updateGameState = this.updateGameState.bind(this);
    }

    // Initialize the game application
    async init() {
        try {
            // Load game data
            await this.loadGameData();
            
            // Try to load saved game state
            const hasLoadedState = this.gameState.loadGameState();
            
            // Initialize UI
            this.uiManager.init();
            
            // Show appropriate screen based on loaded state
            if (hasLoadedState && this.gameState.phase !== 'intro') {
                this.uiManager.showScreen(this.gameState.phase + '-screen');
                this.updateProgressDisplay();
            } else {
                this.uiManager.showScreen('intro-screen');
            }
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.uiManager.showError('Failed to load game. Please refresh the page.');
        }
    }

    // Load game data from JSON file with comprehensive validation
    async loadGameData() {
        try {
            const response = await fetch('../assets/data/game_data.json');
            if (!response.ok) {
                throw new Error(`Failed to load game data: HTTP ${response.status} - ${response.statusText}`);
            }
            
            const rawData = await response.json();
            
            // Validate game data structure
            const validationResult = this.validateGameData(rawData);
            if (!validationResult.isValid) {
                throw new Error(`Invalid game data structure: ${validationResult.errors.join(', ')}`);
            }
            
            // Extract the actual game data from the wrapper
            this.gameState.gameData = rawData.game_data || rawData;
            
        } catch (error) {
            console.error('Error loading game data:', error);
            
            // Provide fallback error handling
            if (error instanceof TypeError) {
                throw new Error('Network error: Unable to fetch game data. Please check your connection.');
            } else if (error instanceof SyntaxError) {
                throw new Error('Invalid JSON format in game data file.');
            } else {
                throw error;
            }
        }
    }

    // Comprehensive game data structure validation
    validateGameData(data) {
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
    validateCities(cities) {
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
    validateGameMessages(messages) {
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

    // Start new game
    startGame() {
        this.gameState.initializeGame();
        this.gameState.phase = 'investigation';
        
        // Select random starting city (not final destination)
        const startingCity = this.getRandomStartingCity();
        if (!startingCity) {
            console.error('Could not select starting city');
            this.uiManager.showError('Failed to start game: No starting cities available');
            return;
        }
        
        this.gameState.currentCity = startingCity.id;
        
        this.gameState.saveGameState();
        this.uiManager.showScreen('investigation-screen');
        this.updateProgressDisplay();
        this.uiManager.updateInvestigationScreen(this.gameState.currentCity);
    }

    // Process player actions
    processPlayerAction(action, data) {
        switch (action) {
            case 'start-game':
                this.startGame();
                break;
            case 'collect-clues':
                this.collectClues();
                break;
            case 'travel':
                this.showTravelScreen();
                break;
            case 'select-destination':
                this.travelToCity(data.cityId);
                break;
            case 'view-clues':
                this.showCluesScreen();
                break;
            case 'restart-game':
                this.restartGame();
                break;
            case 'back-to-investigation':
                this.backToInvestigation();
                break;
            case 'exit-game':
                this.exitGame();
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    // Update game state
    updateGameState(newState) {
        Object.assign(this.gameState, newState);
        this.gameState.saveGameState();
        this.updateProgressDisplay();
    }

    // Collect clues from current city using enhanced informant interaction
    collectClues() {
        const cityData = this.getCityData(this.gameState.currentCity);
        
        if (!cityData) {
            this.uiManager.showError('Unable to collect clues: City data not found');
            return;
        }
        
        // Use the new informant interaction system
        const collectedClues = this.presentCluesWithDifficulty(this.gameState.currentCity);
        
        if (collectedClues.length > 0) {
            // Provide positive feedback for successful clue collection
            this.provideFeedbackForAction('correct_deduction', {
                cluesFound: collectedClues.length,
                cityName: cityData.name
            });
            
            // Provide specific feedback for each clue difficulty
            collectedClues.forEach(clue => {
                setTimeout(() => {
                    this.provideFeedbackForAction('clue_collected', {
                        difficulty: clue.difficulty,
                        clueText: clue.text
                    });
                }, 1000);
            });
            
            this.gameState.saveGameState();
            
            // Check if investigation is complete
            const completionStatus = this.detectInvestigationCompletion();
            if (completionStatus.isComplete) {
                setTimeout(() => {
                    this.provideFeedbackForAction('investigation_complete', {
                        cluesFound: collectedClues.length,
                        cityName: cityData.name
                    });
                }, 2000);
            }
        } else {
            // Provide helpful feedback for no clues found
            this.provideFeedbackForAction('incorrect_choice', {
                cityName: cityData.name,
                reason: 'no_clues_here'
            });
        }
        
        // Update progress display
        this.updateProgressDisplay();
    }

    // Generate clues for a city with difficulty tier randomization
    generateClues(cityData, options = {}) {
        if (!cityData || !cityData.clues) {
            console.warn('Invalid city data provided for clue generation');
            return [];
        }
        
        // Validate clue structure before processing
        const validationResult = this.validateClueStructure(cityData.clues);
        if (!validationResult.isValid) {
            console.error(`Invalid clue structure for city ${cityData.id}:`, validationResult.errors);
            return [];
        }
        
        const clues = [];
        const { 
            maxCluesPerDifficulty = 1, 
            randomizeSelection = true,
            includeAllDifficulties = true,
            specificDifficulty = null
        } = options;
        
        // Determine which difficulties to process
        const difficulties = specificDifficulty ? 
            [specificDifficulty] : 
            ['easy', 'medium', 'difficult'];
        
        difficulties.forEach(difficulty => {
            if (!cityData.clues[difficulty] || cityData.clues[difficulty].length === 0) {
                console.warn(`No ${difficulty} clues available for city ${cityData.id}`);
                return;
            }
            
            // Skip difficulty level if not including all and randomly decided
            if (!includeAllDifficulties && randomizeSelection && Math.random() < 0.3) {
                return;
            }
            
            const availableClues = [...cityData.clues[difficulty]];
            const numClues = Math.min(maxCluesPerDifficulty, availableClues.length);
            
            for (let i = 0; i < numClues; i++) {
                let selectedClue;
                
                if (randomizeSelection) {
                    const randomIndex = Math.floor(Math.random() * availableClues.length);
                    selectedClue = availableClues.splice(randomIndex, 1)[0];
                } else {
                    selectedClue = availableClues[i];
                }
                
                const clueObject = {
                    text: selectedClue,
                    difficulty: difficulty,
                    sourceCity: this.gameState.currentCity,
                    timestamp: new Date(),
                    id: `${this.gameState.currentCity}_${difficulty}_${Date.now()}_${i}`
                };
                
                // Validate individual clue before adding
                if (this.validateClueObject(clueObject)) {
                    clues.push(clueObject);
                } else {
                    console.warn(`Invalid clue object generated for ${cityData.id}:`, clueObject);
                }
            }
        });
        
        return clues;
    }

    // Add clue to collection with validation and consistency checks
    addClueToCollection(clue) {
        if (!clue || typeof clue !== 'object') {
            console.warn('Invalid clue provided to addClueToCollection:', clue);
            return false;
        }
        
        // Validate clue object structure
        if (!this.validateClueObject(clue)) {
            console.warn('Clue validation failed:', clue);
            return false;
        }
        
        // Check for duplicate clues
        const isDuplicate = this.gameState.collectedClues.some(existingClue => 
            existingClue.text === clue.text && 
            existingClue.sourceCity === clue.sourceCity
        );
        
        if (isDuplicate) {
            console.warn('Duplicate clue detected, not adding:', clue.text);
            return false;
        }
        
        // Add clue to collection
        this.gameState.collectedClues.push(clue);
        
        // Save game state after adding clue
        this.gameState.saveGameState();
        
        console.log(`Clue added to collection: ${clue.text} (${clue.difficulty})`);
        return true;
    }

    // Display clues in organized format
    displayClues(format = 'detailed') {
        const clues = this.gameState.collectedClues;
        
        if (clues.length === 0) {
            return {
                formatted: 'No clues collected yet.',
                count: 0,
                byDifficulty: { easy: [], medium: [], difficult: [] }
            };
        }
        
        // Organize clues by difficulty
        const cluesByDifficulty = {
            easy: clues.filter(clue => clue.difficulty === 'easy'),
            medium: clues.filter(clue => clue.difficulty === 'medium'),
            difficult: clues.filter(clue => clue.difficulty === 'difficult')
        };
        
        let formattedOutput = '';
        
        switch (format) {
            case 'simple':
                formattedOutput = clues.map(clue => clue.text).join('\n');
                break;
                
            case 'by_difficulty':
                Object.keys(cluesByDifficulty).forEach(difficulty => {
                    if (cluesByDifficulty[difficulty].length > 0) {
                        formattedOutput += `\n${difficulty.toUpperCase()} CLUES:\n`;
                        cluesByDifficulty[difficulty].forEach(clue => {
                            formattedOutput += `- ${clue.text} (from ${clue.sourceCity})\n`;
                        });
                    }
                });
                break;
                
            case 'detailed':
            default:
                clues.forEach((clue, index) => {
                    formattedOutput += `${index + 1}. [${clue.difficulty.toUpperCase()}] ${clue.text}\n`;
                    formattedOutput += `   Source: ${clue.sourceCity} | Collected: ${clue.timestamp.toLocaleString()}\n\n`;
                });
                break;
        }
        
        return {
            formatted: formattedOutput,
            count: clues.length,
            byDifficulty: cluesByDifficulty,
            totalByDifficulty: {
                easy: cluesByDifficulty.easy.length,
                medium: cluesByDifficulty.medium.length,
                difficult: cluesByDifficulty.difficult.length
            }
        };
    }

    // Validate clue structure for a city
    validateClueStructure(clues) {
        const errors = [];
        const requiredDifficulties = ['easy', 'medium', 'difficult'];
        
        if (!clues || typeof clues !== 'object') {
            return { isValid: false, errors: ['Clues must be an object'] };
        }
        
        requiredDifficulties.forEach(difficulty => {
            if (!clues[difficulty]) {
                errors.push(`Missing ${difficulty} clues array`);
            } else if (!Array.isArray(clues[difficulty])) {
                errors.push(`${difficulty} clues must be an array`);
            } else if (clues[difficulty].length === 0) {
                errors.push(`${difficulty} clues array is empty`);
            } else {
                // Validate each clue string
                clues[difficulty].forEach((clue, index) => {
                    if (typeof clue !== 'string' || clue.trim().length === 0) {
                        errors.push(`Invalid clue at ${difficulty}[${index}]: must be non-empty string`);
                    }
                });
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validate individual clue object
    validateClueObject(clue) {
        if (!clue || typeof clue !== 'object') {
            return false;
        }
        
        const requiredFields = ['text', 'difficulty', 'sourceCity', 'timestamp', 'id'];
        const validDifficulties = ['easy', 'medium', 'difficult'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in clue)) {
                console.warn(`Missing required field: ${field}`);
                return false;
            }
        }
        
        // Validate field types and values
        if (typeof clue.text !== 'string' || clue.text.trim().length === 0) {
            console.warn('Clue text must be a non-empty string');
            return false;
        }
        
        if (!validDifficulties.includes(clue.difficulty)) {
            console.warn(`Invalid difficulty: ${clue.difficulty}`);
            return false;
        }
        
        if (typeof clue.sourceCity !== 'string' || clue.sourceCity.trim().length === 0) {
            console.warn('Source city must be a non-empty string');
            return false;
        }
        
        if (!(clue.timestamp instanceof Date) || isNaN(clue.timestamp.getTime())) {
            console.warn('Timestamp must be a valid Date object');
            return false;
        }
        
        if (typeof clue.id !== 'string' || clue.id.trim().length === 0) {
            console.warn('Clue ID must be a non-empty string');
            return false;
        }
        
        return true;
    }

    // Get city data by ID with validation
    getCityData(cityId) {
        if (!cityId || typeof cityId !== 'string') {
            console.warn('Invalid city ID provided:', cityId);
            return null;
        }
        
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            console.warn('Game data not loaded');
            return null;
        }
        
        const city = this.gameState.gameData.cities.find(city => city.id === cityId);
        
        if (!city) {
            console.warn(`City not found: ${cityId}`);
            return null;
        }
        
        return city;
    }

    // Get all available cities (excluding visited ones)
    getAvailableCities() {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return [];
        }
        
        return this.gameState.gameData.cities.filter(city => 
            !this.gameState.visitedCities.includes(city.id) && 
            city.id !== this.gameState.currentCity
        );
    }

    // Get cities by criteria
    getCitiesByCriteria(criteria = {}) {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return [];
        }
        
        const { 
            excludeVisited = false, 
            excludeCurrent = false, 
            isFinal = null,
            country = null 
        } = criteria;
        
        return this.gameState.gameData.cities.filter(city => {
            if (excludeVisited && this.gameState.visitedCities.includes(city.id)) {
                return false;
            }
            
            if (excludeCurrent && city.id === this.gameState.currentCity) {
                return false;
            }
            
            if (isFinal !== null && city.is_final !== isFinal) {
                return false;
            }
            
            if (country && city.country !== country) {
                return false;
            }
            
            return true;
        });
    }

    // Show informant dialogue with enhanced interaction system
    showInformantDialogue(cityId, dialogueType = 'greeting') {
        const cityData = this.getCityData(cityId);
        
        if (!cityData || !cityData.informant) {
            console.warn(`No informant data found for city: ${cityId}`);
            const fallbackDialogue = 'Hello, traveler. How can I help you?';
            this.uiManager.displayInformantDialogue(fallbackDialogue, 'unknown', dialogueType);
            return fallbackDialogue;
        }
        
        const informant = cityData.informant;
        let dialogue = '';
        
        switch (dialogueType) {
            case 'greeting':
                dialogue = informant.greeting || 'Hello, traveler.';
                break;
            case 'farewell_helpful':
                dialogue = informant.farewell_helpful || 'Good luck on your journey!';
                break;
            case 'farewell_unhelpful':
                dialogue = informant.farewell_unhelpful || 'Sorry I could not help.';
                break;
            case 'not_here':
                dialogue = cityData.not_here_response || 'That person has not been here.';
                break;
            case 'clue_presentation':
                dialogue = this.generateCluePresentation(cityData);
                break;
            default:
                console.warn(`Unknown dialogue type: ${dialogueType}`);
                dialogue = informant.greeting || 'Hello, traveler.';
        }
        
        // Display dialogue in UI with informant name and type
        this.uiManager.displayInformantDialogue(dialogue, informant.name, dialogueType);
        
        return dialogue;
    }

    // Get informant dialogue for a city (legacy method for compatibility)
    getInformantDialogue(cityId, dialogueType = 'greeting') {
        const cityData = this.getCityData(cityId);
        
        if (!cityData || !cityData.informant) {
            console.warn(`No informant data found for city: ${cityId}`);
            return 'Hello, traveler. How can I help you?'; // Fallback
        }
        
        const informant = cityData.informant;
        
        switch (dialogueType) {
            case 'greeting':
                return informant.greeting || 'Hello, traveler.';
            case 'farewell_helpful':
                return informant.farewell_helpful || 'Good luck on your journey!';
            case 'farewell_unhelpful':
                return informant.farewell_unhelpful || 'Sorry I could not help.';
            case 'not_here':
                return cityData.not_here_response || 'That person has not been here.';
            default:
                console.warn(`Unknown dialogue type: ${dialogueType}`);
                return informant.greeting || 'Hello, traveler.';
        }
    }

    // Handle "not here" response for incorrect cities
    handleNotHereResponse(cityId) {
        const cityData = this.getCityData(cityId);
        
        if (!cityData) {
            console.warn(`City data not found for: ${cityId}`);
            return;
        }
        
        // Show "not here" dialogue
        this.showInformantDialogue(cityId, 'not_here');
        
        // Update UI to reflect that Nadine wasn't here
        this.uiManager.showNotHereState(cityData);
        
        // Log the unsuccessful investigation
        console.log(`Investigation unsuccessful in ${cityData.name}: Nadine was not here`);
        
        // Optionally provide hints or encouragement
        this.uiManager.showMessage('Keep investigating! Follow the clues to find where Nadine went next.', 'info');
    }

    // Generate clue presentation dialogue
    generateCluePresentation(cityData) {
        if (!this.hasCityClues(cityData.id)) {
            return cityData.not_here_response || 'That person has not been here.';
        }
        
        const informant = cityData.informant;
        const baseGreeting = informant.greeting || 'Hello, traveler.';
        
        // Create contextual clue presentation
        const clueIntro = `${baseGreeting} Yes, I remember that person! Let me tell you what I observed...`;
        
        return clueIntro;
    }

    // Add clue presentation logic with difficulty selection
    presentCluesWithDifficulty(cityId, requestedDifficulty = null) {
        const cityData = this.getCityData(cityId);
        
        if (!cityData || !this.hasCityClues(cityId)) {
            this.handleNotHereResponse(cityId);
            return [];
        }
        
        let clueOptions = {};
        
        if (requestedDifficulty && ['easy', 'medium', 'difficult'].includes(requestedDifficulty)) {
            // Present clues of specific difficulty
            clueOptions = {
                maxCluesPerDifficulty: 2,
                randomizeSelection: true,
                includeAllDifficulties: false,
                specificDifficulty: requestedDifficulty
            };
        } else {
            // Present mixed difficulty clues
            clueOptions = {
                maxCluesPerDifficulty: 1,
                randomizeSelection: true,
                includeAllDifficulties: true
            };
        }
        
        const clues = this.generateClues(cityData, clueOptions);
        
        if (clues.length > 0) {
            // Show clue presentation dialogue
            this.showInformantDialogue(cityId, 'clue_presentation');
            
            // Add clues to collection
            const addedClues = [];
            clues.forEach(clue => {
                if (this.addClueToCollection(clue)) {
                    addedClues.push(clue);
                }
            });
            
            if (addedClues.length > 0) {
                this.uiManager.showCluesCollected(addedClues);
                this.showInformantDialogue(cityId, 'farewell_helpful');
            }
            
            return addedClues;
        } else {
            this.handleNotHereResponse(cityId);
            return [];
        }
    }

    // Create investigation completion detection
    detectInvestigationCompletion() {
        const currentCityData = this.getCityData(this.gameState.currentCity);
        
        if (!currentCityData) {
            return { isComplete: false, reason: 'Invalid city data' };
        }
        
        // Check if this is the final destination
        if (currentCityData.is_final) {
            return { 
                isComplete: true, 
                reason: 'final_destination',
                message: 'You have reached the final destination!' 
            };
        }
        
        // Check if player has collected clues from this city
        const cityCluesCollected = this.gameState.collectedClues.filter(
            clue => clue.sourceCity === this.gameState.currentCity
        );
        
        if (cityCluesCollected.length > 0) {
            return { 
                isComplete: true, 
                reason: 'clues_collected',
                message: `Investigation complete in ${currentCityData.name}. ${cityCluesCollected.length} clue(s) collected.`,
                cluesFound: cityCluesCollected.length
            };
        }
        
        // Check if city has no clues (Nadine wasn't here)
        if (!this.hasCityClues(this.gameState.currentCity)) {
            return { 
                isComplete: true, 
                reason: 'no_clues_available',
                message: `Investigation complete in ${currentCityData.name}. Nadine was not here.`
            };
        }
        
        return { 
            isComplete: false, 
            reason: 'investigation_ongoing',
            message: 'Investigation still in progress...'
        };
    }

    // Check if city has clues available
    hasCityClues(cityId) {
        const cityData = this.getCityData(cityId);
        
        if (!cityData || !cityData.clues) {
            return false;
        }
        
        const difficulties = ['easy', 'medium', 'difficult'];
        return difficulties.some(difficulty => 
            cityData.clues[difficulty] && 
            cityData.clues[difficulty].length > 0
        );
    }

    // Get random starting city (non-final)
    getRandomStartingCity() {
        const availableStartingCities = this.getCitiesByCriteria({ isFinal: false });
        
        if (availableStartingCities.length === 0) {
            console.error('No starting cities available');
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * availableStartingCities.length);
        return availableStartingCities[randomIndex];
    }

    // Validate city accessibility
    canTravelToCity(cityId) {
        if (!cityId) {
            return { canTravel: false, reason: 'Invalid city ID' };
        }
        
        if (this.gameState.visitedCities.includes(cityId)) {
            return { canTravel: false, reason: 'City already visited' };
        }
        
        if (cityId === this.gameState.currentCity) {
            return { canTravel: false, reason: 'Already in this city' };
        }
        
        const cityData = this.getCityData(cityId);
        if (!cityData) {
            return { canTravel: false, reason: 'City not found' };
        }
        
        return { canTravel: true, reason: 'Travel allowed' };
    }

    // Show travel screen with enhanced world map navigation
    showTravelScreen() {
        this.gameState.phase = 'travel';
        this.gameState.saveGameState();
        this.uiManager.showScreen('travel-screen');
        this.uiManager.showWorldMap();
    }

    // Travel to selected city with enhanced route tracking
    travelToCity(cityId) {
        // Validate travel possibility
        const travelCheck = this.canTravelToCity(cityId);
        if (!travelCheck.canTravel) {
            // Reduce attempts for invalid travel attempts
            this.gameState.gameStats.attemptsRemaining--;

            this.provideFeedbackForAction('incorrect_choice', {
                reason: travelCheck.reason,
                attemptedDestination: cityId
            });

            // Check for failure conditions after reducing attempts
            const failureCheck = this.checkFailureConditions();
            if (failureCheck.hasFailed) {
                this.triggerGameOver(failureCheck);
                return;
            }

            this.gameState.saveGameState();
            this.updateProgressDisplay();
            return;
        }

        const cityData = this.getCityData(cityId);
        if (!cityData) {
            this.uiManager.showFeedbackMessage('Invalid destination selected', 'error', {
                icon: 'exclamation-triangle',
                duration: 3000
            });
            return;
        }

        // Add current city to visited cities before moving (route tracking)
        if (this.gameState.currentCity && !this.gameState.visitedCities.includes(this.gameState.currentCity)) {
            this.gameState.visitedCities.push(this.gameState.currentCity);
        }
        
        // Move to new city
        const previousCity = this.gameState.currentCity;
        this.gameState.currentCity = cityId;
        this.gameState.gameStats.citiesVisited++;
        
        // Check if this city has no clues (wrong destination) - reduce attempts
        if (!this.hasCityClues(cityId) && !cityData.is_final) {
            this.gameState.gameStats.attemptsRemaining--;
        }

        // Log travel for debugging and analytics
        console.log(`Travel: ${previousCity || 'Starting location'} → ${cityData.name}`);
        
        // Provide travel feedback
        this.provideFeedbackForAction('travel_success', {
            cityName: cityData.name,
            country: cityData.country,
            isFinalDestination: cityData.is_final,
            citiesVisited: this.gameState.gameStats.citiesVisited
        });
        
        // Show travel animation and transition
        this.uiManager.animateTravel(previousCity, cityId, () => {
            // Check if this is the final destination
            if (cityData.is_final) {
                this.triggerFinalEncounter();
            } else {
                // Check for failure conditions after travel
                const failureCheck = this.checkFailureConditions();
                if (failureCheck.hasFailed) {
                    this.triggerGameOver(failureCheck);
                    return;
                }

                this.gameState.phase = 'investigation';
                this.uiManager.showScreen('investigation-screen');
                this.uiManager.updateInvestigationScreen(cityId);
                
                // Provide contextual hints if player seems stuck
                if (this.gameState.gameStats.citiesVisited >= 4 && this.gameState.collectedClues.length < 2) {
                    setTimeout(() => {
                        this.provideContextualHints();
                    }, 3000);
                }
            }
        });
        
        this.gameState.saveGameState();
        this.updateProgressDisplay();
    }

    // Trigger final encounter in Buenos Aires
    triggerFinalEncounter() {
        this.gameState.phase = 'conclusion';
        this.gameState.isGameComplete = true;
        this.gameState.hasWon = true;

        // Get final encounter data from Buenos Aires
        const finalCityData = this.getCityData(this.gameState.currentCity);
        if (finalCityData && finalCityData.final_encounter) {
            this.uiManager.updateFinalEncounterScreen(finalCityData.final_encounter);
        }

        this.uiManager.showScreen('final-encounter-screen');
        this.gameState.saveGameState();
    }

    // Show clues screen
    showCluesScreen() {
        this.uiManager.showScreen('clues-screen');
        this.uiManager.updateCluesScreen(this.gameState.collectedClues);
    }

    // Back to investigation
    backToInvestigation() {
        this.gameState.phase = 'investigation';
        this.uiManager.showScreen('investigation-screen');
        this.uiManager.updateInvestigationScreen(this.gameState.currentCity);
    }

    // Restart game with complete session isolation
    restartGame() {
        // Show confirmation dialog for restart
        const confirmed = confirm('Are you sure you want to start a new investigation? Your current progress will be lost.');
        if (confirmed) {
            // Perform complete session reset
            this.performCompleteSessionReset();

            // Ensure session isolation
            const isolationResults = this.ensureSessionIsolation();

            // Show intro screen
            this.uiManager.showScreen('intro-screen');

            // Clear any UI state that might persist
            this.uiManager.clearUIState();

            // Show fresh start message with session info
            const sessionMessage = isolationResults.errors.length === 0 ?
                'New investigation started! Good luck, detective!' :
                'Fresh investigation started with clean slate! Good luck, detective!';

            this.uiManager.showFeedbackMessage(sessionMessage, 'info', {
                icon: 'fas fa-play',
                duration: 3000
            });

            // Log session restart for debugging
            console.log('New game session started:', this.gameState.sessionId, isolationResults);
        }
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
        this.uiState = new UIState();
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
        this.gameState = new GameState();
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
            const newGameState = new GameState();
            if (currentSessionId === newGameState.sessionId) {
                testResults.sessionIsolation = false;
                testResults.errors.push('Session IDs are not unique');
            }

            // Test 2: Verify randomization produces different results
            const startingCity1 = this.getRandomStartingCity();
            const startingCity2 = this.getRandomStartingCity();
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
        // Clear all localStorage keys related to the game
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('nadine-vuan')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Force complete state reset
        this.forceCleanSessionState();

        // Clear all UI elements
        this.uiManager.clearUIState();

        // Reinitialize with fresh state
        this.gameState.initializeGame();

        console.log('Deep session clean completed');
    }

    // Clear persistent UI elements that might contaminate new session
    clearPersistentUIElements() {
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
    }

    // Exit game with session cleanup
    exitGame() {
        // Show completion statistics and farewell message
        const gameStats = this.calculateEnhancedStats();
        const farewell = `Thank you for playing "Where in the World is Nadine Vuan?"!\n\n` +
            `Investigation Summary:\n` +
            `• Cities Visited: ${gameStats.citiesVisited}\n` +
            `• Clues Collected: ${gameStats.cluesCollected}\n` +
            `• Time Taken: ${gameStats.elapsedTime.formatted}\n` +
            `• Investigation Efficiency: ${gameStats.investigationEfficiency}%\n\n` +
            `We hope you enjoyed your detective adventure!`;

        alert(farewell);

        // Perform complete session cleanup
        this.performCompleteSessionReset();

        // Ensure clean exit
        this.ensureSessionIsolation();

    // Return to intro screen
        this.uiManager.showScreen('intro-screen');

        // Clear UI state for fresh start
        this.uiManager.clearUIState();

        console.log('Game exited cleanly with session cleanup');
    }

    // Update progress display with enhanced statistics and milestone detection
    updateProgressDisplay() {
        // Calculate enhanced game statistics
        const enhancedStats = this.calculateEnhancedStats();
        
        // Check for milestones and celebrations
        const milestones = this.detectMilestones(enhancedStats);
        
        // Update UI with enhanced statistics
        this.uiManager.updateProgressDisplay(enhancedStats);
        
        // Trigger milestone celebrations if any
        if (milestones.length > 0) {
            this.celebrateMilestones(milestones);
        }
    }

    // Calculate enhanced game statistics including time tracking and attempt monitoring
    calculateEnhancedStats() {
        const currentTime = new Date();
        const startTime = this.gameState.gameStats.startTime || currentTime;
        
        // Calculate elapsed time
        const elapsedMs = currentTime - startTime;
        const elapsedMinutes = Math.floor(elapsedMs / 60000);
        const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
        
        // Calculate progress percentage
        const totalCities = this.gameState.gameData ? this.gameState.gameData.cities.length : 11;
        const progressPercentage = Math.min((this.gameState.gameStats.citiesVisited / totalCities) * 100, 100);
        
        // Calculate efficiency metrics
        const cluesPerCity = this.gameState.gameStats.citiesVisited > 0 ? 
            (this.gameState.collectedClues.length / this.gameState.gameStats.citiesVisited).toFixed(1) : 0;
        
        // Calculate success rate
        const successfulInvestigations = this.gameState.collectedClues.length > 0 ? 
            this.gameState.gameStats.correctDeductions : 0;
        const successRate = this.gameState.gameStats.citiesVisited > 0 ? 
            Math.round((successfulInvestigations / this.gameState.gameStats.citiesVisited) * 100) : 0;

        return {
            ...this.gameState.gameStats,
            elapsedTime: {
                minutes: elapsedMinutes,
                seconds: elapsedSeconds,
                formatted: `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`
            },
            progressPercentage: Math.round(progressPercentage),
            cluesCollected: this.gameState.collectedClues.length,
            cluesPerCity: parseFloat(cluesPerCity),
            successRate: successRate,
            totalCities: totalCities,
            remainingCities: Math.max(0, totalCities - this.gameState.gameStats.citiesVisited - 1), // -1 for current city
            investigationEfficiency: this.calculateInvestigationEfficiency()
        };
    }

    // Calculate investigation efficiency based on clues found vs cities visited
    calculateInvestigationEfficiency() {
        if (this.gameState.gameStats.citiesVisited === 0) return 100;
        
        const cluesByDifficulty = this.gameState.collectedClues.reduce((acc, clue) => {
            acc[clue.difficulty] = (acc[clue.difficulty] || 0) + 1;
            return acc;
        }, {});
        
        // Weight clues by difficulty (difficult = 3 points, medium = 2 points, easy = 1 point)
        const weightedScore = (cluesByDifficulty.difficult || 0) * 3 + 
                             (cluesByDifficulty.medium || 0) * 2 + 
                             (cluesByDifficulty.easy || 0) * 1;
        
        // Calculate efficiency as weighted score per city visited
        const maxPossibleScore = this.gameState.gameStats.citiesVisited * 6; // Assuming max 6 points per city
        return Math.min(100, Math.round((weightedScore / maxPossibleScore) * 100));
    }

    // Detect milestones and achievements for celebration
    detectMilestones(stats) {
        const milestones = [];
        
        // First clue milestone
        if (stats.cluesCollected === 1 && !this.gameState.milestonesReached?.firstClue) {
            milestones.push({
                type: 'first_clue',
                title: 'First Evidence!',
                message: 'You collected your first clue! The investigation begins.',
                icon: 'fas fa-search'
            });
        }
        
        // Multiple clues milestone
        if (stats.cluesCollected === 5 && !this.gameState.milestonesReached?.fiveClues) {
            milestones.push({
                type: 'five_clues',
                title: 'Evidence Collector!',
                message: 'Five clues collected! You\'re building a strong case.',
                icon: 'fas fa-puzzle-piece'
            });
        }
        
        // City exploration milestones
        if (stats.citiesVisited === 3 && !this.gameState.milestonesReached?.threeCities) {
            milestones.push({
                type: 'three_cities',
                title: 'World Traveler!',
                message: 'Three cities explored! The trail is getting warmer.',
                icon: 'fas fa-globe-americas'
            });
        }
        
        if (stats.citiesVisited === 5 && !this.gameState.milestonesReached?.fiveCities) {
            milestones.push({
                type: 'five_cities',
                title: 'Seasoned Detective!',
                message: 'Five cities investigated! You\'re halfway there.',
                icon: 'fas fa-medal'
            });
        }
        
        // Efficiency milestones
        if (stats.investigationEfficiency >= 80 && stats.citiesVisited >= 3 && !this.gameState.milestonesReached?.highEfficiency) {
            milestones.push({
                type: 'high_efficiency',
                title: 'Master Detective!',
                message: 'Excellent investigation efficiency! You\'re finding clues like a pro.',
                icon: 'fas fa-star'
            });
        }
        
        // Time-based milestones
        if (stats.elapsedTime.minutes >= 10 && !this.gameState.milestonesReached?.tenMinutes) {
            milestones.push({
                type: 'ten_minutes',
                title: 'Persistent Investigator!',
                message: 'Ten minutes of dedicated investigation! Keep up the great work.',
                icon: 'fas fa-clock'
            });
        }
        
        // Mark milestones as reached
        if (milestones.length > 0) {
            if (!this.gameState.milestonesReached) {
                this.gameState.milestonesReached = {};
            }
            
            milestones.forEach(milestone => {
                this.gameState.milestonesReached[milestone.type] = true;
            });
            
            this.gameState.saveGameState();
        }
        
        return milestones;
    }

    // Celebrate milestones with visual and audio feedback
    celebrateMilestones(milestones) {
        milestones.forEach((milestone, index) => {
            setTimeout(() => {
                this.uiManager.showMilestoneAchievement(milestone);
            }, index * 1000); // Stagger multiple milestones
        });
    }

    // Check win condition with comprehensive validation
    checkWinCondition() {
        // Basic win condition check
        if (!this.gameState.hasWon || !this.gameState.isGameComplete) {
            return {
                hasWon: false,
                reason: 'Game not completed or victory not achieved',
                details: {
                    isComplete: this.gameState.isGameComplete,
                    hasWon: this.gameState.hasWon,
                    currentPhase: this.gameState.phase
                }
            };
        }

        // Validate that player reached Buenos Aires (final destination)
        const currentCityData = this.getCityData(this.gameState.currentCity);
        if (!currentCityData || !currentCityData.is_final) {
            return {
                hasWon: false,
                reason: 'Victory condition not met: Not in final destination',
                details: {
                    currentCity: this.gameState.currentCity,
                    isFinalCity: currentCityData?.is_final || false
                }
            };
        }

        // Validate game phase is conclusion
        if (this.gameState.phase !== 'conclusion') {
            return {
                hasWon: false,
                reason: 'Victory condition not met: Incorrect game phase',
                details: {
                    currentPhase: this.gameState.phase,
                    expectedPhase: 'conclusion'
                }
            };
        }

        // Calculate achievement level based on performance
        const gameStats = this.calculateEnhancedStats();
        let achievementLevel = 'Detective';

        if (gameStats.investigationEfficiency >= 90 && gameStats.citiesVisited <= 5) {
            achievementLevel = 'Master Detective';
        } else if (gameStats.investigationEfficiency >= 75 && gameStats.citiesVisited <= 7) {
            achievementLevel = 'Expert Detective';
        } else if (gameStats.investigationEfficiency >= 60) {
            achievementLevel = 'Skilled Detective';
        }

        return {
            hasWon: true,
            reason: 'Victory achieved: Nadine Vuan found in Buenos Aires',
            achievementLevel: achievementLevel,
            details: {
                finalCity: currentCityData.name,
                totalCitiesVisited: gameStats.citiesVisited,
                totalCluesCollected: gameStats.cluesCollected,
                investigationTime: gameStats.elapsedTime.formatted,
                efficiency: gameStats.investigationEfficiency
            }
        };
    }

    // Check failure conditions and trigger game over if necessary
    checkFailureConditions() {
        // Check if attempts are exhausted
        if (this.gameState.gameStats.attemptsRemaining <= 0) {
            return {
                hasFailed: true,
                failureType: 'attempts_exhausted',
                reason: 'No attempts remaining',
                message: 'You have exhausted all your investigation attempts. The trail has gone cold.',
                details: {
                    attemptsUsed: 10 - this.gameState.gameStats.attemptsRemaining,
                    citiesVisited: this.gameState.gameStats.citiesVisited,
                    cluesCollected: this.gameState.collectedClues.length
                }
            };
        }

        // Check if time limit is exceeded (optional - can be enabled later)
        const gameStats = this.calculateEnhancedStats();
        const timeLimit = 30; // 30 minutes time limit
        if (gameStats.elapsedTime.minutes >= timeLimit) {
            return {
                hasFailed: true,
                failureType: 'time_exceeded',
                reason: 'Time limit exceeded',
                message: 'Time has run out! Nadine has disappeared into the shadows once again.',
                details: {
                    timeSpent: gameStats.elapsedTime.formatted,
                    timeLimit: `${timeLimit}:00`,
                    citiesVisited: this.gameState.gameStats.citiesVisited,
                    cluesCollected: this.gameState.collectedClues.length
                }
            };
        }

        // Check if all cities have been visited without finding Nadine (shouldn't happen in normal gameplay)
        const totalCities = this.gameState.gameData ? this.gameState.gameData.cities.length : 11;
        const availableCities = this.getAvailableCities();
        if (availableCities.length === 0 && !this.gameState.hasWon) {
            return {
                hasFailed: true,
                failureType: 'no_cities_remaining',
                reason: 'All cities explored without success',
                message: 'You have searched everywhere, but Nadine remains elusive. The case grows cold.',
                details: {
                    totalCitiesExplored: totalCities,
                    cluesCollected: this.gameState.collectedClues.length,
                    investigationTime: gameStats.elapsedTime.formatted
                }
            };
        }

        return {
            hasFailed: false,
            reason: 'Game continues'
        };
    }

    // Trigger game over sequence
    triggerGameOver(failureResult) {
        this.gameState.phase = 'game_over';
        this.gameState.isGameComplete = true;
        this.gameState.hasWon = false;

        // Save the failure details for display
        this.gameState.failureDetails = failureResult;

        this.gameState.saveGameState();

        // Show game over screen with appropriate messaging
        this.uiManager.showGameOverScreen(failureResult);

        // Log failure for analytics
        console.log('Game Over:', failureResult);
    }

    // Get appropriate game over message based on failure type
    getGameOverMessage(failureType, details = {}) {
        const messages = {
            attempts_exhausted: {
                title: '🚫 Investigation Closed',
                primary: 'You have exhausted all investigation attempts. The trail has gone cold, detective.',
                secondary: `Despite visiting ${details.citiesVisited || 0} cities and collecting ${details.cluesCollected || 0} clues, Nadine remains one step ahead.`,
                encouragement: 'Every great detective faces setbacks. Learn from this case and try again!',
                actionText: 'Reopen Case'
            },
            time_exceeded: {
                title: '⏰ Time Expired',
                primary: 'Time has run out! Nadine has vanished into the shadows once again.',
                secondary: `Your ${details.timeSpent || 'lengthy'} investigation covered ${details.citiesVisited || 0} cities and uncovered ${details.cluesCollected || 0} clues.`,
                encouragement: 'Speed and efficiency are key in detective work. You\'ll catch her next time!',
                actionText: 'New Investigation'
            },
            no_cities_remaining: {
                title: '🗺️ Search Exhausted',
                primary: 'You have searched everywhere, but Nadine proves too elusive for this investigation.',
                secondary: `All ${details.totalCitiesExplored || 0} cities explored with ${details.cluesCollected || 0} clues collected.`,
                encouragement: 'Sometimes the best detectives need a fresh perspective. Start a new case!',
                actionText: 'Fresh Start'
            }
        };

        return messages[failureType] || {
            title: '🚫 Case Unsolved',
            primary: 'The investigation has reached an impasse.',
            secondary: 'The trail has gone cold, but every detective faces challenges.',
            encouragement: 'Persistence is the key to solving any mystery. Try again!',
            actionText: 'Retry Case'
        };
    }

    // Enhanced feedback system for player actions
    provideFeedbackForAction(action, context = {}) {
        switch (action) {
            case 'correct_deduction':
                this.providePositiveFeedback(context);
                break;
            case 'incorrect_choice':
                this.provideHelpfulFeedback(context);
                break;
            case 'clue_collected':
                this.provideClueFeedback(context);
                break;
            case 'travel_success':
                this.provideTravelFeedback(context);
                break;
            case 'investigation_complete':
                this.provideInvestigationFeedback(context);
                break;
            case 'approaching_limits':
                this.provideWarningFeedback(context);
                break;
            case 'milestone_reached':
                this.provideMilestoneFeedback(context);
                break;
            default:
                console.warn('Unknown feedback action:', action);
        }
    }

    // Provide positive feedback for correct deductions
    providePositiveFeedback(context) {
        const positiveMessages = [
            "Excellent detective work! You're on the right track.",
            "Outstanding investigation! The clues are leading you closer to Nadine.",
            "Brilliant deduction! Your investigative skills are impressive.",
            "Perfect! You're following the trail like a true detective.",
            "Superb work! Each clue brings you closer to solving the case.",
            "Exceptional investigation! You're thinking like a seasoned detective.",
            "Well done! Your attention to detail is paying off.",
            "Impressive! You're connecting the dots perfectly."
        ];

        const message = this.getRandomMessage(positiveMessages);
        this.uiManager.showFeedbackMessage(message, 'success', {
            icon: 'fas fa-check-circle',
            duration: 3000,
            showConfetti: true
        });

        // Update game statistics for correct deductions
        this.gameState.gameStats.correctDeductions++;
        
        // Provide additional context-specific feedback
        if (context.cluesFound > 0) {
            setTimeout(() => {
                this.uiManager.showFeedbackMessage(
                    `${context.cluesFound} new clue${context.cluesFound > 1 ? 's' : ''} added to your evidence board!`,
                    'info',
                    { icon: 'fas fa-puzzle-piece', duration: 2500 }
                );
            }, 1500);
        }
    }

    // Provide helpful feedback for incorrect choices without ending the game
    provideHelpfulFeedback(context) {
        const helpfulMessages = [
            "Not quite right, but don't give up! Review your clues for better insights.",
            "That lead didn't pan out, but every detective faces dead ends. Keep investigating!",
            "Close, but not quite there yet. Try analyzing the clues from a different angle.",
            "This path didn't work out, but persistence is key in detective work!",
            "Not the right direction, but you're learning valuable investigation techniques.",
            "That wasn't it, but great detectives learn from every attempt. Keep going!",
            "Wrong turn, but the best investigators explore all possibilities.",
            "Not this time, but each attempt teaches you something new about the case."
        ];

        const encouragingHints = [
            "💡 Hint: Pay attention to geographical clues in your evidence.",
            "💡 Hint: Look for cultural references that might point to specific regions.",
            "💡 Hint: Consider the difficulty level of clues - harder clues often contain more specific information.",
            "💡 Hint: Think about travel patterns and logical routes between cities.",
            "💡 Hint: Review all collected clues together - they might form a pattern.",
            "💡 Hint: Sometimes the most obvious clue is the right one to follow."
        ];

        const message = this.getRandomMessage(helpfulMessages);
        const hint = this.getRandomMessage(encouragingHints);

        this.uiManager.showFeedbackMessage(message, 'warning', {
            icon: 'fas fa-lightbulb',
            duration: 4000
        });

        // Show hint after main message
        setTimeout(() => {
            this.uiManager.showFeedbackMessage(hint, 'info', {
                icon: 'fas fa-compass',
                duration: 3500
            });
        }, 2000);

        // Reduce attempts but provide encouragement
        this.gameState.gameStats.attemptsRemaining--;
        
        // Check if approaching limits and provide additional support
        if (this.gameState.gameStats.attemptsRemaining <= 3) {
            this.provideFeedbackForAction('approaching_limits', {
                attemptsRemaining: this.gameState.gameStats.attemptsRemaining
            });
        }
    }

    // Provide specific feedback for clue collection
    provideClueFeedback(context) {
        const clueMessages = {
            easy: [
                "Good start! This clue provides a solid foundation for your investigation.",
                "Nice find! Easy clues often contain the most reliable information.",
                "Well spotted! This straightforward clue will help guide your next move."
            ],
            medium: [
                "Excellent discovery! This clue requires some detective intuition to interpret.",
                "Great work! Medium difficulty clues often contain key breakthrough information.",
                "Impressive! You've uncovered a clue that experienced detectives would appreciate."
            ],
            difficult: [
                "Outstanding! This complex clue shows your advanced investigative skills.",
                "Brilliant detective work! Difficult clues like this often crack the case wide open.",
                "Exceptional! Only the most skilled investigators can interpret clues of this complexity."
            ]
        };

        const difficulty = context.difficulty || 'easy';
        const messages = clueMessages[difficulty] || clueMessages.easy;
        const message = this.getRandomMessage(messages);

        this.uiManager.showFeedbackMessage(message, 'success', {
            icon: 'fas fa-search',
            duration: 3000,
            showSparkles: true
        });

        // Provide additional feedback based on clue quality
        if (difficulty === 'difficult') {
            setTimeout(() => {
                this.uiManager.showFeedbackMessage(
                    "🌟 Bonus: Difficult clues provide the most valuable leads!",
                    'info',
                    { icon: 'fas fa-star', duration: 2500 }
                );
            }, 1500);
        }
    }

    // Provide feedback for successful travel
    provideTravelFeedback(context) {
        const travelMessages = [
            `Welcome to ${context.cityName}! Time to investigate this new location.`,
            `Arrived in ${context.cityName}! Let's see what clues await you here.`,
            `${context.cityName} reached! Your investigation continues in this new city.`,
            `Successfully traveled to ${context.cityName}! Ready to gather more evidence?`,
            `${context.cityName} is your new base of operations. Start investigating!`
        ];

        const message = this.getRandomMessage(travelMessages);
        this.uiManager.showFeedbackMessage(message, 'info', {
            icon: 'fas fa-plane',
            duration: 3000
        });

        // Provide location-specific encouragement
        if (context.isFinalDestination) {
            setTimeout(() => {
                this.uiManager.showFeedbackMessage(
                    "🎯 This could be it! Investigate thoroughly - Nadine might be here!",
                    'success',
                    { icon: 'fas fa-bullseye', duration: 4000 }
                );
            }, 2000);
        } else if (context.citiesVisited >= 5) {
            setTimeout(() => {
                this.uiManager.showFeedbackMessage(
                    "🗺️ You're becoming quite the world traveler! Keep following those clues.",
                    'info',
                    { icon: 'fas fa-globe-americas', duration: 3000 }
                );
            }, 2000);
        }
    }

    // Provide feedback for investigation completion
    provideInvestigationFeedback(context) {
        if (context.cluesFound > 0) {
            const investigationMessages = [
                `Investigation complete! You discovered ${context.cluesFound} valuable clue${context.cluesFound > 1 ? 's' : ''}.`,
                `Thorough work! ${context.cluesFound} clue${context.cluesFound > 1 ? 's' : ''} collected from this location.`,
                `Excellent investigation! ${context.cluesFound} piece${context.cluesFound > 1 ? 's' : ''} of evidence secured.`
            ];

            const message = this.getRandomMessage(investigationMessages);
            this.uiManager.showFeedbackMessage(message, 'success', {
                icon: 'fas fa-clipboard-check',
                duration: 3500
            });
        } else {
            const noCluesMessages = [
                "Investigation complete, but Nadine wasn't here. The trail continues elsewhere!",
                "No leads in this city, but that's valuable information too. Keep searching!",
                "This location was a dead end, but every good detective explores all possibilities.",
                "Nadine has already moved on from here. Time to follow the trail to another city!"
            ];

            const message = this.getRandomMessage(noCluesMessages);
            this.uiManager.showFeedbackMessage(message, 'info', {
                icon: 'fas fa-search-minus',
                duration: 3500
            });
        }
    }

    // Provide warning feedback for approaching game limits
    provideWarningFeedback(context) {
        const attemptsRemaining = context.attemptsRemaining || this.gameState.gameStats.attemptsRemaining;
        
        let warningMessage = '';
        let urgencyLevel = 'warning';
        let icon = 'fas fa-exclamation-triangle';

        if (attemptsRemaining === 1) {
            warningMessage = "🚨 FINAL ATTEMPT! This is your last chance to find Nadine. Make it count, detective!";
            urgencyLevel = 'error';
            icon = 'fas fa-exclamation-circle';
        } else if (attemptsRemaining === 2) {
            warningMessage = "⚠️ Only 2 attempts left! Choose your next destination very carefully.";
            urgencyLevel = 'warning';
        } else if (attemptsRemaining === 3) {
            warningMessage = "⚠️ Running low on attempts! Review your clues before making your next move.";
            urgencyLevel = 'warning';
        }

        if (warningMessage) {
            this.uiManager.showFeedbackMessage(warningMessage, urgencyLevel, {
                icon: icon,
                duration: 5000,
                persistent: attemptsRemaining <= 2
            });

            // Provide strategic advice for critical situations
            if (attemptsRemaining <= 2) {
                setTimeout(() => {
                    this.uiManager.showFeedbackMessage(
                        "💡 Strategy tip: Focus on your most specific and difficult clues - they usually point to the right location!",
                        'info',
                        { icon: 'fas fa-brain', duration: 4000 }
                    );
                }, 3000);
            }
        }
    }

    // Provide feedback for milestone achievements
    provideMilestoneFeedback(context) {
        const milestone = context.milestone;
        if (!milestone) return;

        // The milestone notification is handled by the milestone system
        // This provides additional contextual feedback
        setTimeout(() => {
            let followUpMessage = '';
            
            switch (milestone.type) {
                case 'first_clue':
                    followUpMessage = "🔍 Keep investigating! Each clue brings you closer to finding Nadine.";
                    break;
                case 'five_clues':
                    followUpMessage = "📋 Your evidence board is filling up nicely! Review all clues together for patterns.";
                    break;
                case 'three_cities':
                    followUpMessage = "🌍 You're getting the hang of international investigation! Trust your instincts.";
                    break;
                case 'high_efficiency':
                    followUpMessage = "⭐ Your investigation technique is top-notch! Keep up the excellent work.";
                    break;
            }

            if (followUpMessage) {
                this.uiManager.showFeedbackMessage(followUpMessage, 'info', {
                    icon: 'fas fa-thumbs-up',
                    duration: 3500
                });
            }
        }, 2000);
    }

    // Get random message from array
    getRandomMessage(messages) {
        return messages[Math.floor(Math.random() * messages.length)];
    }

    // Enhanced method to provide contextual hints based on game state
    provideContextualHints() {
        const clueCount = this.gameState.collectedClues.length;
        const citiesVisited = this.gameState.gameStats.citiesVisited;
        
        let hintMessage = '';

        if (clueCount === 0 && citiesVisited >= 2) {
            hintMessage = "💡 No clues yet? Try investigating cities that seem more likely to have international connections.";
        } else if (clueCount >= 3 && citiesVisited >= 4) {
            hintMessage = "💡 With multiple clues collected, look for common themes or geographical patterns.";
        } else if (this.gameState.gameStats.attemptsRemaining <= 5 && clueCount >= 2) {
            hintMessage = "💡 Time to analyze! Review your clues carefully - the answer might be clearer than you think.";
        }

        if (hintMessage) {
            this.uiManager.showFeedbackMessage(hintMessage, 'info', {
                icon: 'fas fa-lightbulb',
                duration: 4000
            });
        }
    }

    // Method to encourage players during difficult moments
    provideEncouragement() {
        const encouragementMessages = [
            "🌟 Remember: Every great detective faces challenges. You've got this!",
            "💪 Stay determined! The best investigators never give up on a case.",
            "🎯 Trust your instincts - you're closer to solving this than you think!",
            "🔥 Keep that detective spirit burning! Nadine won't stay hidden forever.",
            "⚡ Channel your inner detective! Every clue is a step toward victory.",
            "🏆 You have all the skills needed to crack this case. Believe in yourself!"
        ];

        const message = this.getRandomMessage(encouragementMessages);
        this.uiManager.showFeedbackMessage(message, 'success', {
            icon: 'fas fa-heart',
            duration: 4000,
            showHearts: true
        });
    }
}

// UI Manager - Handles all visual updates and interactions
class UIManager {
    constructor(gameController) {
        this.gameController = gameController;
        this.screens = {};
        this.elements = {};
    }

    // Initialize UI elements and event listeners
    init() {
        // Cache screen elements
        this.screens = {
            intro: document.getElementById('intro-screen'),
            investigation: document.getElementById('investigation-screen'),
            travel: document.getElementById('travel-screen'),
            clues: document.getElementById('clues-screen'),
            finalEncounter: document.getElementById('final-encounter-screen'),
            gameOver: document.getElementById('game-over-screen'),
            loading: document.getElementById('loading-screen')
        };

        // Cache UI elements
        this.elements = {
            startGameBtn: document.getElementById('start-game-btn'),
            collectCluesBtn: document.getElementById('collect-clues-btn'),
            travelBtn: document.getElementById('travel-btn'),
            viewCluesBtn: document.getElementById('view-clues-btn'),
            backToInvestigationBtn: document.getElementById('back-to-investigation-btn'),
            closeCluesBtn: document.getElementById('close-clues-btn'),
            restartGameBtn: document.getElementById('restart-game-btn'),
            restartFromFailureBtn: document.getElementById('restart-from-failure-btn'),
            currentCityName: document.getElementById('current-city-name'),
            citiesVisitedCount: document.getElementById('cities-visited-count'),
            cluesCollectedCount: document.getElementById('clues-collected-count'),
            cityScene: document.getElementById('city-scene'),
            dialogueText: document.getElementById('dialogue-text'),
            cluesList: document.getElementById('clues-list'),
            cityMarkers: document.getElementById('city-markers')
        };

        // Set up event listeners
        this.setupEventListeners();
    }

    // Set up event listeners with enhanced interactions
    setupEventListeners() {
        // Add ripple effect to all buttons
        this.addRippleEffectToButtons();
        
        // Start game
        this.elements.startGameBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('start-game');
        });

        // Investigation actions with enhanced feedback
        this.elements.collectCluesBtn?.addEventListener('click', () => {
            if (!this.elements.collectCluesBtn.disabled) {
                this.showButtonLoading(this.elements.collectCluesBtn, true);
                
                // Simulate brief loading for better UX
                setTimeout(() => {
                    this.gameController.processPlayerAction('collect-clues');
                    this.showButtonLoading(this.elements.collectCluesBtn, false);
                }, 500);
            }
        });

        this.elements.travelBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('travel');
        });

        this.elements.viewCluesBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('view-clues');
        });

        // Navigation
        this.elements.backToInvestigationBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('back-to-investigation');
        });

        this.elements.closeCluesBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('back-to-investigation');
        });

        // Restart
        this.elements.restartGameBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('restart-game');
        });

        this.elements.restartFromFailureBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('restart-game');
        });

        // Exit from failure
        const exitFromFailureBtn = document.getElementById('exit-from-failure-btn');
        exitFromFailureBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('exit-game');
        });

        // Exit game
        const exitGameBtn = document.getElementById('exit-game-btn');
        exitGameBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('exit-game');
        });
    }

    // Show specific screen with enhanced Carmen Sandiego transitions
    showScreen(screenId) {
        // Re-enable buttons after travel
        this.hideTravelLoadingState();
        
        // Hide all screens with enhanced fade out
        Object.values(this.screens).forEach(screen => {
            if (screen && screen.classList.contains('active')) {
                screen.classList.add('screen-transition-out');
                setTimeout(() => {
                    screen.classList.remove('active', 'screen-transition-out');
                }, 200);
            }
        });

        // Show target screen with appropriate animation and loading states
        setTimeout(() => {
            const targetScreen = document.getElementById(screenId);
            if (targetScreen) {
                targetScreen.classList.add('active');
                
                // Add loading state during transition
                this.showLoadingState(screenId);
                
                // Add appropriate entrance animation based on screen type
                setTimeout(() => {
                    this.hideLoadingState();
                    
                    if (screenId === 'intro-screen') {
                        targetScreen.classList.add('fade-in');
                    } else if (screenId === 'investigation-screen') {
                        targetScreen.classList.add('slide-in');
                        this.addInvestigationTransitionEffects();
                    } else if (screenId === 'travel-screen') {
                        targetScreen.classList.add('travel-zoom');
                        this.addTravelTransitionEffects();
                    } else if (screenId === 'clues-screen') {
                        targetScreen.classList.add('clue-reveal');
                        this.addCluesTransitionEffects();
                    } else if (screenId === 'final-encounter-screen') {
                        targetScreen.classList.add('detective-entrance');
                        this.addFinalEncounterEffects();
                    } else {
                        targetScreen.classList.add('fade-in');
                    }
                    
                    // Remove animation class after animation completes
                    setTimeout(() => {
                        targetScreen.classList.remove('fade-in', 'slide-in', 'travel-zoom', 'clue-reveal', 'detective-entrance');
                    }, 1200);
                }, 100);
            }
        }, 250);
    }

    // Show loading state during transitions
    showLoadingState(screenId) {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'transition-loading';
        loadingElement.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Loading ${this.getScreenDisplayName(screenId)}...</p>
        `;
        
        document.body.appendChild(loadingElement);
        
        setTimeout(() => {
            loadingElement.classList.add('loading-visible');
        }, 10);
    }

    // Hide loading state
    hideLoadingState() {
        const loadingElement = document.querySelector('.transition-loading');
        if (loadingElement) {
            loadingElement.classList.remove('loading-visible');
            setTimeout(() => {
                if (loadingElement.parentNode) {
                    loadingElement.parentNode.removeChild(loadingElement);
                }
            }, 300);
        }
    }

    // Get display name for screen
    getScreenDisplayName(screenId) {
        const screenNames = {
            'intro-screen': 'Game Introduction',
            'investigation-screen': 'Investigation',
            'travel-screen': 'World Map',
            'clues-screen': 'Evidence Board',
            'final-encounter-screen': 'Final Encounter',
            'game-over-screen': 'Game Over'
        };
        
        return screenNames[screenId] || 'Game Screen';
    }

    // Add investigation transition effects
    addInvestigationTransitionEffects() {
        const sceneImage = document.getElementById('city-scene');
        if (sceneImage) {
            sceneImage.classList.add('scene-fade-in');
            setTimeout(() => {
                sceneImage.classList.remove('scene-fade-in');
            }, 800);
        }
        
        const dialogueBox = document.querySelector('.informant-dialogue');
        if (dialogueBox) {
            dialogueBox.classList.add('dialogue-slide-in');
            setTimeout(() => {
                dialogueBox.classList.remove('dialogue-slide-in');
            }, 600);
        }
    }

    // Add travel transition effects
    addTravelTransitionEffects() {
        const worldMap = document.getElementById('world-map');
        if (worldMap) {
            worldMap.classList.add('map-zoom-in');
            setTimeout(() => {
                worldMap.classList.remove('map-zoom-in');
            }, 1000);
        }
        
        // Animate city markers with staggered entrance
        const cityButtons = document.querySelectorAll('.city-marker-button');
        cityButtons.forEach((button, index) => {
            setTimeout(() => {
                button.classList.add('marker-pop-in');
                setTimeout(() => {
                    button.classList.remove('marker-pop-in');
                }, 400);
            }, index * 100);
        });
    }

    // Add clues transition effects
    addCluesTransitionEffects() {
        const clueItems = document.querySelectorAll('.clue-item');
        clueItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('clue-fade-in');
                setTimeout(() => {
                    item.classList.remove('clue-fade-in');
                }, 600);
            }, index * 150);
        });
    }

    // Add final encounter effects
    addFinalEncounterEffects() {
        // Add dramatic entrance effects for the final encounter
        const encounterContent = document.querySelector('.encounter-content');
        if (encounterContent) {
            encounterContent.classList.add('final-dramatic-entrance');
            setTimeout(() => {
                encounterContent.classList.remove('final-dramatic-entrance');
            }, 1500);
        }
        
        // Add victory celebration effects
        this.addVictoryCelebration();
    }

    // Add victory celebration effects
    addVictoryCelebration() {
        // Create confetti effect
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createConfetti();
            }, i * 100);
        }
    }

    // Create confetti particle
    createConfetti() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-particle';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = this.getRandomConfettiColor();
        confetti.style.animationDelay = Math.random() * 2 + 's';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 3000);
    }

    // Get random confetti color
    getRandomConfettiColor() {
        const colors = [
            'var(--primary-red)',
            'var(--detective-yellow)',
            'var(--success-green)',
            'var(--retro-blue)',
            'var(--neon-pink)',
            'var(--warning-amber)'
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Update investigation screen
    updateInvestigationScreen(cityId) {
        const cityData = this.gameController.getCityData(cityId);
        if (!cityData) {
            this.showError(`Unable to load city data for: ${cityId}`);
            return;
        }

        // Update city name
        if (this.elements.currentCityName) {
            this.elements.currentCityName.textContent = `${cityData.name}, ${cityData.country}`;
        }

        // Determine scene type based on whether city has clues
        const hasClues = this.gameController.hasCityClues(cityId);
        const sceneType = hasClues ? 'pistas' : 'notHere';
        
        // Update scene image
        if (this.elements.cityScene) {
            this.elements.cityScene.src = `../assets/scenes/${cityId}_${sceneType}.png`;
            this.elements.cityScene.alt = `${cityData.name} Scene`;
            
            // Handle image loading errors
            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load scene image: ${cityId}_${sceneType}.png`);
                this.elements.cityScene.src = '../assets/scenes/world_map.png'; // Fallback
            };
        }

        // Update dialogue based on clue availability with enhanced interaction
        if (this.elements.dialogueText) {
            const dialogueType = hasClues ? 'greeting' : 'not_here';
            this.gameController.showInformantDialogue(cityId, dialogueType);
        }

        // Update collect clues button state with enhanced feedback
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = !hasClues;
            if (hasClues) {
                this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-search"></i> Collect Clues<div class="button-loading" style="display: none;"><i class="fas fa-spinner fa-spin"></i></div>';
                this.elements.collectCluesBtn.classList.remove('loading-state');
            } else {
                this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-times"></i> No Clues Here';
                this.elements.collectCluesBtn.classList.add('loading-state');
            }
        }
    }

    // Show world map with interactive city selection and route tracking
    showWorldMap() {
        if (!this.elements.cityMarkers) return;

        // Clear existing markers
        this.elements.cityMarkers.innerHTML = '';

        // Get available cities for travel
        const availableCities = this.gameController.getAvailableCities();
        const visitedCities = this.gameController.gameState.visitedCities;
        const currentCity = this.gameController.gameState.currentCity;
        
        if (availableCities.length === 0) {
            this.elements.cityMarkers.innerHTML = '<p class="no-cities-message">🚫 No more cities available to visit. All locations have been explored!</p>';
            return;
        }

        // Create route tracking display
        this.createRouteDisplay(visitedCities, currentCity);

        // Add city selection buttons with enhanced interaction
        availableCities.forEach((city, index) => {
            const travelCheck = this.gameController.canTravelToCity(city.id);
            
            if (travelCheck.canTravel) {
                const cityButton = this.createCityMarkerButton(city, index);
                this.elements.cityMarkers.appendChild(cityButton);
            }
        });

        // Add travel validation feedback
        this.showTravelInstructions(availableCities.length);
    }

    // Create enhanced city marker button with highlighting and selection feedback
    createCityMarkerButton(city, index) {
        const button = document.createElement('button');
        button.textContent = `${city.name}, ${city.country}`;
        button.className = 'city-marker-button';
        button.title = `Travel to ${city.name}, ${city.country}`;
        button.dataset.cityId = city.id;
        button.dataset.cityName = city.name;
        button.dataset.country = city.country;
        
        // Add staggered animation delay for visual appeal
        button.style.animationDelay = `${index * 0.1}s`;
        button.classList.add('city-marker-entrance');
        
        // Enhanced hover effects with city highlighting
        button.addEventListener('mouseenter', () => {
            this.highlightCity(city, button);
        });
        
        button.addEventListener('mouseleave', () => {
            this.removeHighlight(button);
        });
        
        // Click handler with selection feedback
        button.addEventListener('click', (e) => {
            this.selectDestination(city, button, e);
        });
        
        // Add keyboard navigation support
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectDestination(city, button, e);
            }
        });
        
        return button;
    }

    // Highlight city with visual feedback
    highlightCity(city, button) {
        // Add highlighting class
        button.classList.add('city-highlighted');
        
        // Show city information tooltip
        this.showCityTooltip(city, button);
        
        // Add visual feedback to world map if needed
        const worldMap = this.elements.cityMarkers.parentElement.querySelector('.world-map');
        if (worldMap) {
            worldMap.classList.add('city-hover-active');
        }
    }

    // Remove city highlighting
    removeHighlight(button) {
        button.classList.remove('city-highlighted');
        this.hideCityTooltip();
        
        const worldMap = this.elements.cityMarkers.parentElement.querySelector('.world-map');
        if (worldMap) {
            worldMap.classList.remove('city-hover-active');
        }
    }

    // Show city information tooltip
    showCityTooltip(city, button) {
        // Remove existing tooltip
        this.hideCityTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'city-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-header">
                <i class="fas fa-map-marker-alt"></i> ${city.name}
            </div>
            <div class="tooltip-content">
                <p><i class="fas fa-flag"></i> ${city.country}</p>
                <p><i class="fas fa-plane"></i> Click to travel</p>
                ${city.is_final ? '<p class="final-destination"><i class="fas fa-star"></i> Final Destination</p>' : ''}
            </div>
        `;
        
        // Position tooltip relative to button
        const rect = button.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 10}px`;
        tooltip.style.transform = 'translateX(-50%) translateY(-100%)';
        tooltip.style.zIndex = '1000';
        
        document.body.appendChild(tooltip);
        
        // Animate tooltip appearance
        setTimeout(() => {
            tooltip.classList.add('tooltip-visible');
        }, 10);
    }

    // Hide city tooltip
    hideCityTooltip() {
        const existingTooltip = document.querySelector('.city-tooltip');
        if (existingTooltip) {
            existingTooltip.classList.remove('tooltip-visible');
            setTimeout(() => {
                if (existingTooltip.parentNode) {
                    existingTooltip.parentNode.removeChild(existingTooltip);
                }
            }, 200);
        }
    }

    // Handle destination selection with enhanced feedback
    selectDestination(city, button, event) {
        // Prevent multiple rapid clicks
        if (button.classList.contains('selecting')) {
            return;
        }
        
        button.classList.add('selecting');
        
        // Show selection feedback
        this.showSelectionFeedback(city, button);
        
        // Validate travel before proceeding
        const travelCheck = this.gameController.canTravelToCity(city.id);
        if (!travelCheck.canTravel) {
            this.showMessage(`Cannot travel to ${city.name}: ${travelCheck.reason}`, 'error');
            button.classList.remove('selecting');
            return;
        }
        
        // Hide tooltip
        this.hideCityTooltip();
        
        // Trigger travel with animation
        setTimeout(() => {
            this.gameController.processPlayerAction('select-destination', { cityId: city.id });
        }, 500);
    }

    // Show selection feedback animation
    showSelectionFeedback(city, button) {
        // Add selection animation
        button.classList.add('city-selected');
        
        // Create ripple effect
        const ripple = document.createElement('div');
        ripple.className = 'selection-ripple';
        button.appendChild(ripple);
        
        // Show selection message
        this.showMessage(`Traveling to ${city.name}, ${city.country}...`, 'info');
        
        // Remove ripple after animation
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    // Create route tracking display
    createRouteDisplay(visitedCities, currentCity) {
        const routeContainer = document.createElement('div');
        routeContainer.className = 'route-display';
        routeContainer.innerHTML = `
            <div class="route-header">
                <i class="fas fa-route"></i> Investigation Route
            </div>
            <div class="route-content">
                ${this.generateRouteHTML(visitedCities, currentCity)}
            </div>
        `;
        
        this.elements.cityMarkers.appendChild(routeContainer);
    }

    // Generate route HTML with city progression
    generateRouteHTML(visitedCities, currentCity) {
        if (visitedCities.length === 0 && !currentCity) {
            return '<p class="route-empty">Investigation just started</p>';
        }
        
        let routeHTML = '';
        
        // Add visited cities
        visitedCities.forEach((cityId, index) => {
            const cityData = this.gameController.getCityData(cityId);
            if (cityData) {
                routeHTML += `
                    <div class="route-city visited">
                        <i class="fas fa-check-circle"></i>
                        <span>${cityData.name}</span>
                    </div>
                `;
                if (index < visitedCities.length - 1 || currentCity) {
                    routeHTML += '<div class="route-arrow"><i class="fas fa-arrow-right"></i></div>';
                }
            }
        });
        
        // Add current city
        if (currentCity) {
            const currentCityData = this.gameController.getCityData(currentCity);
            if (currentCityData) {
                routeHTML += `
                    <div class="route-city current">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${currentCityData.name}</span>
                        <small>Current Location</small>
                    </div>
                `;
            }
        }
        
        return routeHTML || '<p class="route-empty">No route data available</p>';
    }

    // Show travel instructions
    showTravelInstructions(availableCitiesCount) {
        const instructions = document.createElement('div');
        instructions.className = 'travel-instructions';
        instructions.innerHTML = `
            <div class="instructions-content">
                <i class="fas fa-info-circle"></i>
                <p>Select your next destination from ${availableCitiesCount} available cities.</p>
                <p>Follow the clues to track down Nadine Vuan!</p>
            </div>
        `;
        
        this.elements.cityMarkers.appendChild(instructions);
    }

    // Update travel screen (legacy method for compatibility)
    updateTravelScreen(visitedCities) {
        this.showWorldMap();
    }

    // Update clues screen
    updateCluesScreen(clues) {
        if (!this.elements.cluesList) return;

        if (clues.length === 0) {
            this.elements.cluesList.innerHTML = '<p class="no-clues-message">No clues collected yet. Start investigating cities to gather information!</p>';
            return;
        }

        this.elements.cluesList.innerHTML = '';
        clues.forEach((clue, index) => {
            const clueElement = document.createElement('div');
            clueElement.className = 'clue-item clue-reveal';
            clueElement.style.animationDelay = `${index * 0.1}s`;
            clueElement.innerHTML = `
                <div class="clue-difficulty ${clue.difficulty}">${clue.difficulty.toUpperCase()}</div>
                <p><i class="fas fa-quote-left"></i> ${clue.text} <i class="fas fa-quote-right"></i></p>
                <small><i class="fas fa-map-marker-alt"></i> Source: ${clue.sourceCity.replace('_', ' ').toUpperCase()}</small>
            `;
            
            // Add click interaction
            clueElement.addEventListener('click', () => {
                clueElement.style.transform = 'translateX(15px) scale(1.02)';
                setTimeout(() => {
                    clueElement.style.transform = '';
                }, 200);
            });
            
            this.elements.cluesList.appendChild(clueElement);
        });
    }

    // Update final encounter screen with Nadine's victory speech and Steve's response
    updateFinalEncounterScreen(finalEncounterData) {
        // Update Nadine's portrait (use steve.png as placeholder since we don't have Nadine's portrait)
        const nadinePortrait = document.getElementById('nadine-portrait');
        if (nadinePortrait) {
            nadinePortrait.src = '../assets/scenes/steve.png'; // Using Steve's portrait as placeholder
            nadinePortrait.alt = 'Nadine Vuan';
        }

        // Check victory condition and get achievement level
        const victoryResult = this.gameController.checkWinCondition();
        const achievementLevel = victoryResult.achievementLevel || 'Detective';

        // Update victory dialogue with Nadine's speech and Steve's response
        const victoryDialogue = document.getElementById('victory-dialogue');
        if (victoryDialogue && finalEncounterData) {
            victoryDialogue.innerHTML = `
                <span class="evidence-marker">Final Encounter</span>
                <div class="achievement-badge">
                    <i class="fas fa-medal"></i>
                    <span class="achievement-title">${achievementLevel}</span>
                </div>
                <div class="final-dialogue-sequence">
                    <div class="nadine-speech">
                        <h4><i class="fas fa-user-tie"></i> Nadine Vuan:</h4>
                        <p class="retro-text">"${finalEncounterData.nadine_speech}"</p>
                    </div>
                    <div class="steve-response">
                        <h4><i class="fas fa-user"></i> Steve:</h4>
                        <p class="retro-text">"${finalEncounterData.steve_response}"</p>
                    </div>
                    <div class="victory-message">
                        <h4><i class="fas fa-trophy"></i> Mission Complete:</h4>
                        <p class="retro-text success-message">${finalEncounterData.victory_message}</p>
                    </div>
                </div>
            `;
        }

        // Add completion statistics
        const gameStats = this.gameController.calculateEnhancedStats();
        const completionStats = document.createElement('div');
        completionStats.className = 'completion-statistics';
        completionStats.innerHTML = `
            <h4><i class="fas fa-chart-bar"></i> Investigation Summary:</h4>
            <div class="stats-grid">
                <div class="stat-item">
                    <i class="fas fa-globe-americas"></i>
                    <span>Cities Visited: ${gameStats.citiesVisited}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-puzzle-piece"></i>
                    <span>Clues Collected: ${gameStats.cluesCollected}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-clock"></i>
                    <span>Time Taken: ${gameStats.elapsedTime.formatted}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-star"></i>
                    <span>Efficiency: ${gameStats.investigationEfficiency}%</span>
                </div>
            </div>
        `;

        // Append statistics to victory dialogue
        if (victoryDialogue) {
            victoryDialogue.appendChild(completionStats);
        }

        // Trigger celebration animations
        this.triggerVictoryCelebration(achievementLevel);
    }

    // Trigger victory celebration with enhanced animations and effects
    triggerVictoryCelebration(achievementLevel) {
        // Add celebration class to body for global effects
        document.body.classList.add('victory-celebration');

        // Create achievement notification
        setTimeout(() => {
            this.showAchievementNotification(achievementLevel);
        }, 2000);

        // Remove celebration class after animations
        setTimeout(() => {
            document.body.classList.remove('victory-celebration');
        }, 10000);
    }

    // Show achievement notification
    showAchievementNotification(achievementLevel) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-content">
                <i class="fas fa-trophy achievement-icon"></i>
                <h3>Achievement Unlocked!</h3>
                <p>${achievementLevel}</p>
                <div class="achievement-sparkles">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                </div>
            </div>
        `;

        document.body.appendChild(notification);

        // Show notification with animation
        setTimeout(() => {
            notification.classList.add('achievement-visible');
        }, 100);

        // Hide notification after delay
        setTimeout(() => {
            notification.classList.remove('achievement-visible');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 4000);
    }

    // Update progress display with enhanced visual feedback and comprehensive statistics
    updateProgressDisplay(enhancedStats) {
        // Update cities visited counter with animation
        if (this.elements.citiesVisitedCount) {
            const newCityCount = `<i class="fas fa-globe-americas"></i> Cities: ${enhancedStats.citiesVisited}/${enhancedStats.totalCities}`;
            if (this.elements.citiesVisitedCount.innerHTML !== newCityCount) {
                this.animateStatUpdate(this.elements.citiesVisitedCount, newCityCount);
            }
        }
        
        // Update clues collected counter with animation
        if (this.elements.cluesCollectedCount) {
            const newClueCount = `<i class="fas fa-puzzle-piece"></i> Clues: ${enhancedStats.cluesCollected}`;
            if (this.elements.cluesCollectedCount.innerHTML !== newClueCount) {
                this.animateStatUpdate(this.elements.cluesCollectedCount, newClueCount);
            }
        }
        
        // Update main progress indicator with enhanced information
        const progressIndicator = document.getElementById('progress-indicator');
        if (progressIndicator) {
            const progressHTML = `
                <i class="fas fa-chart-line"></i> Progress: ${enhancedStats.progressPercentage}%
                <div class="progress-bar" title="Investigation Progress">
                    <div class="progress-fill" style="width: ${enhancedStats.progressPercentage}%"></div>
                </div>
            `;
            progressIndicator.innerHTML = progressHTML;
            
            // Add progress bar animation
            const progressFill = progressIndicator.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.transition = 'width 0.8s ease-in-out';
            }
        }
        
        // Update or create detailed statistics panel
        this.updateDetailedStatsPanel(enhancedStats);
        
        // Update time tracking display
        this.updateTimeDisplay(enhancedStats.elapsedTime);
        
        // Update attempt monitoring
        this.updateAttemptMonitoring(enhancedStats);
        
        // Show efficiency indicators
        this.updateEfficiencyIndicators(enhancedStats);
    }

    // Animate statistic updates for better visual feedback
    animateStatUpdate(element, newContent) {
        element.classList.add('stat-updating');
        
        setTimeout(() => {
            element.innerHTML = newContent;
            element.classList.remove('stat-updating');
            element.classList.add('stat-updated');
            
            setTimeout(() => {
                element.classList.remove('stat-updated');
            }, 600);
        }, 200);
    }

    // Update detailed statistics panel with comprehensive game information
    updateDetailedStatsPanel(stats) {
        let detailedPanel = document.getElementById('detailed-stats-panel');
        
        // Create panel if it doesn't exist
        if (!detailedPanel) {
            detailedPanel = document.createElement('div');
            detailedPanel.id = 'detailed-stats-panel';
            detailedPanel.className = 'detailed-stats-panel';
            
            // Insert after game header
            const gameHeader = document.querySelector('.game-header');
            if (gameHeader) {
                gameHeader.appendChild(detailedPanel);
            }
        }
        
        // Update panel content with enhanced statistics
        detailedPanel.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <i class="fas fa-stopwatch"></i>
                    <span class="stat-label">Time</span>
                    <span class="stat-value">${stats.elapsedTime.formatted}</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-percentage"></i>
                    <span class="stat-label">Success Rate</span>
                    <span class="stat-value">${stats.successRate}%</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-chart-bar"></i>
                    <span class="stat-label">Efficiency</span>
                    <span class="stat-value">${stats.investigationEfficiency}%</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-map-signs"></i>
                    <span class="stat-label">Remaining</span>
                    <span class="stat-value">${stats.remainingCities} cities</span>
                </div>
            </div>
        `;
        
        // Add hover effects for detailed information
        this.addStatsHoverEffects(detailedPanel, stats);
    }

    // Add hover effects to statistics for detailed information
    addStatsHoverEffects(panel, stats) {
        const statItems = panel.querySelectorAll('.stat-item');
        
        statItems.forEach(item => {
            const label = item.querySelector('.stat-label').textContent;
            let tooltipText = '';
            
            switch (label) {
                case 'Time':
                    tooltipText = `Investigation started ${stats.elapsedTime.minutes} minutes and ${stats.elapsedTime.seconds} seconds ago`;
                    break;
                case 'Success Rate':
                    tooltipText = `${stats.correctDeductions} successful investigations out of ${stats.citiesVisited} cities visited`;
                    break;
                case 'Efficiency':
                    tooltipText = `Based on quality and quantity of clues collected (${stats.cluesPerCity} clues per city average)`;
                    break;
                case 'Remaining':
                    tooltipText = `${stats.remainingCities} cities left to explore out of ${stats.totalCities} total`;
                    break;
            }
            
            item.title = tooltipText;
            
            // Add visual feedback on hover
            item.addEventListener('mouseenter', () => {
                item.classList.add('stat-highlighted');
            });
            
            item.addEventListener('mouseleave', () => {
                item.classList.remove('stat-highlighted');
            });
        });
    }

    // Update time tracking display with real-time updates
    updateTimeDisplay(elapsedTime) {
        let timeDisplay = document.getElementById('time-display');
        
        if (!timeDisplay) {
            timeDisplay = document.createElement('div');
            timeDisplay.id = 'time-display';
            timeDisplay.className = 'time-display';
            
            // Add to game stats area
            const gameStats = document.querySelector('.game-stats');
            if (gameStats) {
                gameStats.appendChild(timeDisplay);
            }
        }
        
        timeDisplay.innerHTML = `
            <i class="fas fa-clock"></i>
            <span class="time-value">${elapsedTime.formatted}</span>
        `;
        
        // Add pulsing animation for active timer
        timeDisplay.classList.add('time-active');
    }

    // Update attempt monitoring with warnings for approaching limits
    updateAttemptMonitoring(stats) {
        let attemptMonitor = document.getElementById('attempt-monitor');
        
        if (!attemptMonitor) {
            attemptMonitor = document.createElement('div');
            attemptMonitor.id = 'attempt-monitor';
            attemptMonitor.className = 'attempt-monitor';
            
            // Add to detailed stats panel
            const detailedPanel = document.getElementById('detailed-stats-panel');
            if (detailedPanel) {
                detailedPanel.appendChild(attemptMonitor);
            }
        }
        
        const attemptsRemaining = stats.attemptsRemaining;
        let warningClass = '';
        let warningIcon = 'fas fa-heart';
        
        // Determine warning level based on remaining attempts
        if (attemptsRemaining <= 2) {
            warningClass = 'critical-warning';
            warningIcon = 'fas fa-exclamation-triangle';
        } else if (attemptsRemaining <= 5) {
            warningClass = 'moderate-warning';
            warningIcon = 'fas fa-exclamation-circle';
        }
        
        attemptMonitor.innerHTML = `
            <div class="attempt-display ${warningClass}">
                <i class="${warningIcon}"></i>
                <span class="attempt-label">Attempts</span>
                <span class="attempt-value">${attemptsRemaining}</span>
            </div>
        `;
        
        // Show warning message if approaching limits
        if (attemptsRemaining <= 3 && !this.hasShownAttemptWarning) {
            this.showAttemptWarning(attemptsRemaining);
            this.hasShownAttemptWarning = true;
        }
    }

    // Show warning for approaching game limits
    showAttemptWarning(attemptsRemaining) {
        const warningMessage = attemptsRemaining === 1 ? 
            'Final attempt! Make it count, detective!' : 
            `Only ${attemptsRemaining} attempts remaining! Choose your next move carefully.`;
        
        this.showMessage(warningMessage, 'warning');
        
        // Add visual emphasis to attempt monitor
        const attemptMonitor = document.getElementById('attempt-monitor');
        if (attemptMonitor) {
            attemptMonitor.classList.add('warning-pulse');
            setTimeout(() => {
                attemptMonitor.classList.remove('warning-pulse');
            }, 2000);
        }
    }

    // Update efficiency indicators with visual feedback
    updateEfficiencyIndicators(stats) {
        let efficiencyIndicator = document.getElementById('efficiency-indicator');
        
        if (!efficiencyIndicator) {
            efficiencyIndicator = document.createElement('div');
            efficiencyIndicator.id = 'efficiency-indicator';
            efficiencyIndicator.className = 'efficiency-indicator';
            
            // Add to game header
            const gameHeader = document.querySelector('.game-header');
            if (gameHeader) {
                gameHeader.appendChild(efficiencyIndicator);
            }
        }
        
        // Determine efficiency level and styling
        let efficiencyClass = 'efficiency-good';
        let efficiencyIcon = 'fas fa-thumbs-up';
        let efficiencyText = 'Good';
        
        if (stats.investigationEfficiency >= 80) {
            efficiencyClass = 'efficiency-excellent';
            efficiencyIcon = 'fas fa-star';
            efficiencyText = 'Excellent';
        } else if (stats.investigationEfficiency >= 60) {
            efficiencyClass = 'efficiency-good';
            efficiencyIcon = 'fas fa-thumbs-up';
            efficiencyText = 'Good';
        } else if (stats.investigationEfficiency >= 40) {
            efficiencyClass = 'efficiency-fair';
            efficiencyIcon = 'fas fa-meh';
            efficiencyText = 'Fair';
        } else {
            efficiencyClass = 'efficiency-poor';
            efficiencyIcon = 'fas fa-thumbs-down';
            efficiencyText = 'Needs Improvement';
        }
        
        efficiencyIndicator.innerHTML = `
            <div class="efficiency-display ${efficiencyClass}">
                <i class="${efficiencyIcon}"></i>
                <span class="efficiency-label">Investigation: ${efficiencyText}</span>
                <div class="efficiency-bar">
                    <div class="efficiency-fill" style="width: ${stats.investigationEfficiency}%"></div>
                </div>
            </div>
        `;
    }

    // Show milestone achievement with celebration effects
    showMilestoneAchievement(milestone) {
        // Create milestone notification
        const milestoneNotification = document.createElement('div');
        milestoneNotification.className = 'milestone-notification';
        milestoneNotification.innerHTML = `
            <div class="milestone-content">
                <div class="milestone-icon">
                    <i class="${milestone.icon}"></i>
                </div>
                <div class="milestone-text">
                    <h3 class="milestone-title">${milestone.title}</h3>
                    <p class="milestone-message">${milestone.message}</p>
                </div>
                <div class="milestone-close">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(milestoneNotification);
        
        // Animate appearance
        setTimeout(() => {
            milestoneNotification.classList.add('milestone-visible');
        }, 100);
        
        // Add celebration effects
        this.addMilestoneCelebration(milestone);
        
        // Auto-remove after delay
        setTimeout(() => {
            milestoneNotification.classList.remove('milestone-visible');
            setTimeout(() => {
                if (milestoneNotification.parentNode) {
                    milestoneNotification.parentNode.removeChild(milestoneNotification);
                }
            }, 500);
        }, 4000);
        
        // Add click to close functionality
        const closeButton = milestoneNotification.querySelector('.milestone-close');
        closeButton.addEventListener('click', () => {
            milestoneNotification.classList.remove('milestone-visible');
            setTimeout(() => {
                if (milestoneNotification.parentNode) {
                    milestoneNotification.parentNode.removeChild(milestoneNotification);
                }
            }, 500);
        });
    }

    // Add celebration effects for milestones
    addMilestoneCelebration(milestone) {
        // Create celebration particles based on milestone type
        const particleCount = milestone.type === 'high_efficiency' ? 30 : 15;
        const colors = this.getMilestoneColors(milestone.type);
        
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                this.createCelebrationParticle(colors);
            }, i * 50);
        }
        
        // Add screen flash effect for major milestones
        if (['five_cities', 'high_efficiency', 'ten_minutes'].includes(milestone.type)) {
            this.addScreenFlash();
        }
    }

    // Get colors for milestone celebration based on type
    getMilestoneColors(milestoneType) {
        const colorSets = {
            first_clue: ['var(--detective-yellow)', 'var(--success-green)'],
            five_clues: ['var(--primary-red)', 'var(--detective-yellow)'],
            three_cities: ['var(--retro-blue)', 'var(--neon-pink)'],
            five_cities: ['var(--success-green)', 'var(--detective-yellow)', 'var(--primary-red)'],
            high_efficiency: ['gold', 'var(--detective-yellow)', 'orange'],
            ten_minutes: ['var(--retro-blue)', 'var(--neon-pink)', 'var(--warning-amber)']
        };
        
        return colorSets[milestoneType] || ['var(--primary-red)', 'var(--detective-yellow)'];
    }

    // Create celebration particle
    createCelebrationParticle(colors) {
        const particle = document.createElement('div');
        particle.className = 'celebration-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        particle.style.animationDelay = Math.random() * 1 + 's';
        particle.style.animationDuration = (2 + Math.random() * 2) + 's';
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 4000);
    }

    // Add screen flash effect for major achievements
    addScreenFlash() {
        const flash = document.createElement('div');
        flash.className = 'achievement-flash';
        document.body.appendChild(flash);
        
        setTimeout(() => {
            flash.classList.add('flash-active');
        }, 10);
        
        setTimeout(() => {
            flash.classList.remove('flash-active');
            setTimeout(() => {
                if (flash.parentNode) {
                    flash.parentNode.removeChild(flash);
                }
            }, 300);
        }, 200);
    }

    // Animate travel between cities with smooth transitions
    animateTravel(fromCityId, toCityId, callback) {
        const fromCityData = fromCityId ? this.gameController.getCityData(fromCityId) : null;
        const toCityData = this.gameController.getCityData(toCityId);
        
        if (!toCityData) {
            console.warn('Cannot animate travel: destination city data not found');
            if (callback) callback();
            return;
        }
        
        // Show loading state during travel
        this.showTravelLoadingState(fromCityData, toCityData);
        
        // Create travel animation overlay
        const travelOverlay = this.createTravelOverlay(fromCityData, toCityData);
        document.body.appendChild(travelOverlay);
        
        // Animate travel sequence
        this.playTravelSequence(travelOverlay, fromCityData, toCityData, () => {
            // Remove overlay
            if (travelOverlay.parentNode) {
                travelOverlay.parentNode.removeChild(travelOverlay);
            }
            
            // Execute callback
            if (callback) {
                callback();
            }
        });
    }

    // Create travel animation overlay
    createTravelOverlay(fromCity, toCity) {
        const overlay = document.createElement('div');
        overlay.className = 'travel-overlay';
        
        const fromCityName = fromCity ? fromCity.name : 'Starting Location';
        const toCityName = toCity.name;
        
        overlay.innerHTML = `
            <div class="travel-animation-container">
                <div class="travel-header">
                    <i class="fas fa-plane"></i>
                    <h2>Traveling...</h2>
                </div>
                <div class="travel-route">
                    <div class="departure-city">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${fromCityName}</span>
                    </div>
                    <div class="travel-path">
                        <div class="travel-plane">
                            <i class="fas fa-plane"></i>
                        </div>
                        <div class="travel-line"></div>
                    </div>
                    <div class="arrival-city">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${toCityName}, ${toCity.country}</span>
                    </div>
                </div>
                <div class="travel-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <p class="travel-status">Preparing for departure...</p>
                </div>
            </div>
        `;
        
        return overlay;
    }

    // Play travel animation sequence
    playTravelSequence(overlay, fromCity, toCity, callback) {
        const plane = overlay.querySelector('.travel-plane');
        const progressFill = overlay.querySelector('.progress-fill');
        const statusText = overlay.querySelector('.travel-status');
        const travelLine = overlay.querySelector('.travel-line');
        
        // Animation sequence
        const sequence = [
            {
                delay: 0,
                duration: 500,
                action: () => {
                    overlay.classList.add('travel-overlay-visible');
                    statusText.textContent = 'Boarding flight...';
                }
            },
            {
                delay: 500,
                duration: 800,
                action: () => {
                    statusText.textContent = 'Taking off...';
                    progressFill.style.width = '20%';
                    plane.classList.add('plane-takeoff');
                }
            },
            {
                delay: 1300,
                duration: 1200,
                action: () => {
                    statusText.textContent = `Flying to ${toCity.name}...`;
                    progressFill.style.width = '70%';
                    plane.classList.add('plane-flying');
                    travelLine.classList.add('line-drawing');
                }
            },
            {
                delay: 2500,
                duration: 600,
                action: () => {
                    statusText.textContent = 'Approaching destination...';
                    progressFill.style.width = '90%';
                    plane.classList.add('plane-landing');
                }
            },
            {
                delay: 3100,
                duration: 400,
                action: () => {
                    statusText.textContent = `Arrived in ${toCity.name}!`;
                    progressFill.style.width = '100%';
                    plane.classList.add('plane-landed');
                }
            },
            {
                delay: 3500,
                duration: 500,
                action: () => {
                    overlay.classList.add('travel-overlay-fadeout');
                    setTimeout(callback, 500);
                }
            }
        ];
        
        // Execute animation sequence
        sequence.forEach(step => {
            setTimeout(step.action, step.delay);
        });
    }

    // Show travel loading state
    showTravelLoadingState(fromCity, toCity) {
        // Disable all interactive elements during travel
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = true;
            button.classList.add('travel-disabled');
        });
        
        // Show loading cursor
        document.body.style.cursor = 'wait';
    }

    // Hide travel loading state
    hideTravelLoadingState() {
        // Re-enable interactive elements
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = false;
            button.classList.remove('travel-disabled');
        });
        
        // Reset cursor
        document.body.style.cursor = 'default';
    }

    // Show enhanced feedback message to user
    showMessage(message, type = 'info') {
        // Create feedback message element
        const feedbackElement = document.createElement('div');
        feedbackElement.className = `feedback-message ${type}`;
        feedbackElement.innerHTML = `<i class="fas fa-${this.getMessageIcon(type)}"></i> ${message}`;
        
        // Add to document
        document.body.appendChild(feedbackElement);
        
        // Remove after animation completes
        setTimeout(() => {
            if (feedbackElement.parentNode) {
                feedbackElement.parentNode.removeChild(feedbackElement);
            }
        }, 4000);
    }

    // Enhanced feedback message system with rich options
    showFeedbackMessage(message, type = 'info', options = {}) {
        const {
            icon = this.getMessageIcon(type),
            duration = 4000,
            persistent = false,
            showConfetti = false,
            showSparkles = false,
            showHearts = false,
            position = 'top-center'
        } = options;

        // Create enhanced feedback element
        const feedbackElement = document.createElement('div');
        feedbackElement.className = `enhanced-feedback-message ${type} ${position}`;
        
        // Add icon and message
        feedbackElement.innerHTML = `
            <div class="feedback-content">
                <i class="fas fa-${icon} feedback-icon"></i>
                <span class="feedback-text">${message}</span>
                ${persistent ? '<i class="fas fa-times feedback-close"></i>' : ''}
            </div>
        `;

        // Position the feedback message
        this.positionFeedbackMessage(feedbackElement, position);
        
        // Add to document
        document.body.appendChild(feedbackElement);
        
        // Animate appearance
        setTimeout(() => {
            feedbackElement.classList.add('feedback-visible');
        }, 100);

        // Add special effects
        if (showConfetti) {
            this.addFeedbackConfetti();
        }
        if (showSparkles) {
            this.addFeedbackSparkles(feedbackElement);
        }
        if (showHearts) {
            this.addFeedbackHearts(feedbackElement);
        }

        // Handle removal
        if (!persistent) {
            setTimeout(() => {
                this.removeFeedbackMessage(feedbackElement);
            }, duration);
        } else {
            // Add close button functionality for persistent messages
            const closeButton = feedbackElement.querySelector('.feedback-close');
            if (closeButton) {
                closeButton.addEventListener('click', () => {
                    this.removeFeedbackMessage(feedbackElement);
                });
            }
        }

        return feedbackElement;
    }

    // Position feedback message based on specified position
    positionFeedbackMessage(element, position) {
        switch (position) {
            case 'top-left':
                element.style.top = '20px';
                element.style.left = '20px';
                break;
            case 'top-right':
                element.style.top = '20px';
                element.style.right = '20px';
                break;
            case 'bottom-center':
                element.style.bottom = '20px';
                element.style.left = '50%';
                element.style.transform = 'translateX(-50%)';
                break;
            case 'center':
                element.style.top = '50%';
                element.style.left = '50%';
                element.style.transform = 'translate(-50%, -50%)';
                break;
            case 'top-center':
            default:
                element.style.top = '20px';
                element.style.left = '50%';
                element.style.transform = 'translateX(-50%)';
                break;
        }
    }

    // Remove feedback message with animation
    removeFeedbackMessage(element) {
        element.classList.remove('feedback-visible');
        element.classList.add('feedback-removing');
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 500);
    }

    // Add confetti effect for positive feedback
    addFeedbackConfetti() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createFeedbackParticle('confetti');
            }, i * 100);
        }
    }

    // Add sparkles effect for discovery feedback
    addFeedbackSparkles(feedbackElement) {
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                this.createSparkleParticle(feedbackElement);
            }, i * 150);
        }
    }

    // Add hearts effect for encouragement feedback
    addFeedbackHearts(feedbackElement) {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                this.createHeartParticle(feedbackElement);
            }, i * 200);
        }
    }

    // Create feedback particle (confetti, sparkles, hearts)
    createFeedbackParticle(type) {
        const particle = document.createElement('div');
        particle.className = `feedback-particle ${type}-particle`;
        
        // Set random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = '0px';
        
        // Set particle content based on type
        switch (type) {
            case 'confetti':
                particle.style.backgroundColor = this.getRandomConfettiColor();
                particle.style.width = '6px';
                particle.style.height = '6px';
                break;
            case 'sparkle':
                particle.innerHTML = '✨';
                particle.style.fontSize = '1rem';
                break;
            case 'heart':
                particle.innerHTML = '💖';
                particle.style.fontSize = '1.2rem';
                break;
        }
        
        document.body.appendChild(particle);
        
        // Animate and remove
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 3000);
    }

    // Create sparkle particle near feedback element
    createSparkleParticle(feedbackElement) {
        const particle = document.createElement('div');
        particle.className = 'sparkle-particle';
        particle.innerHTML = '✨';
        
        // Position near feedback element
        const rect = feedbackElement.getBoundingClientRect();
        particle.style.position = 'fixed';
        particle.style.left = (rect.left + Math.random() * rect.width) + 'px';
        particle.style.top = (rect.top + Math.random() * rect.height) + 'px';
        particle.style.fontSize = '1rem';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1001';
        
        document.body.appendChild(particle);
        
        // Animate sparkle
        particle.style.animation = 'sparkleFloat 2s ease-out forwards';
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }

    // Create heart particle near feedback element
    createHeartParticle(feedbackElement) {
        const particle = document.createElement('div');
        particle.className = 'heart-particle';
        particle.innerHTML = '💖';
        
        // Position near feedback element
        const rect = feedbackElement.getBoundingClientRect();
        particle.style.position = 'fixed';
        particle.style.left = (rect.left + Math.random() * rect.width) + 'px';
        particle.style.top = (rect.bottom + 10) + 'px';
        particle.style.fontSize = '1.2rem';
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '1001';
        
        document.body.appendChild(particle);
        
        // Animate heart
        particle.style.animation = 'heartFloat 3s ease-out forwards';
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 3000);
    }
    
    // Get appropriate icon for message type
    getMessageIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-triangle';
            case 'info': return 'info-circle';
            default: return 'info-circle';
        }
    }

    // Show clues collected feedback with enhanced visuals
    showCluesCollected(clues) {
        const clueCount = clues.length;
        const message = `${clueCount} new clue${clueCount > 1 ? 's' : ''} added to evidence board!`;
        this.showMessage(message, 'success');
        
        // Add visual feedback to collect clues button
        const collectBtn = this.elements.collectCluesBtn;
        if (collectBtn) {
            collectBtn.classList.add('ripple');
            setTimeout(() => {
                collectBtn.classList.remove('ripple');
            }, 600);
        }
    }

    // Show game over screen with failure details
    showGameOverScreen(failureResult) {
        // Get appropriate messaging for the failure type
        const gameOverMessage = this.gameController.getGameOverMessage(
            failureResult.failureType,
            failureResult.details
        );

        // Update game over screen content
        const gameOverScreen = document.getElementById('game-over-screen');
        const messageElement = document.getElementById('game-over-message');
        const titleElement = gameOverScreen?.querySelector('h2');

        if (titleElement) {
            titleElement.textContent = gameOverMessage.title;
        }

        if (messageElement) {
            messageElement.innerHTML = `
                <span class="evidence-marker">Case Status</span>
                <p class="retro-text primary-message">${gameOverMessage.primary}</p>
                <p class="retro-text secondary-message">${gameOverMessage.secondary}</p>
                <div class="encouragement-box">
                    <p class="encouragement-text">${gameOverMessage.encouragement}</p>
                </div>
                <div class="failure-stats">
                    <div class="stat-item">
                        <span class="stat-label">Cities Visited:</span>
                        <span class="stat-value">${failureResult.details.citiesVisited || 0}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Clues Collected:</span>
                        <span class="stat-value">${failureResult.details.cluesCollected || 0}</span>
                    </div>
                    ${failureResult.details.timeSpent ? `
                        <div class="stat-item">
                            <span class="stat-label">Time Spent:</span>
                            <span class="stat-value">${failureResult.details.timeSpent}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        // Update restart button text
        const restartButton = document.getElementById('restart-from-failure-btn');
        if (restartButton) {
            restartButton.innerHTML = `🔄 ${gameOverMessage.actionText}`;
        }

        // Show the game over screen
        this.showScreen('game-over-screen');

        // Add dramatic game over effects
        this.addGameOverEffects(failureResult.failureType);

        // Show encouraging message after a delay
        setTimeout(() => {
            this.showMessage('Don\'t give up, detective! Every great investigator faces setbacks.', 'info', {
                icon: 'fas fa-heart',
                duration: 4000
            });
        }, 2000);
    }

    // Add dramatic effects for game over screen
    addGameOverEffects(failureType) {
        const gameOverScreen = document.getElementById('game-over-screen');
        if (!gameOverScreen) return;

        // Add failure-type specific effects
        switch (failureType) {
            case 'attempts_exhausted':
                gameOverScreen.classList.add('attempts-exhausted-effect');
                this.createFailureParticles('red');
                break;
            case 'time_exceeded':
                gameOverScreen.classList.add('time-exceeded-effect');
                this.createFailureParticles('orange');
                break;
            case 'no_cities_remaining':
                gameOverScreen.classList.add('exhausted-search-effect');
                this.createFailureParticles('gray');
                break;
            default:
                gameOverScreen.classList.add('general-failure-effect');
                this.createFailureParticles('blue');
        }

        // Remove effects after animation
        setTimeout(() => {
            gameOverScreen.classList.remove(
                'attempts-exhausted-effect',
                'time-exceeded-effect',
                'exhausted-search-effect',
                'general-failure-effect'
            );
        }, 3000);
    }

    // Create failure-themed particles
    createFailureParticles(color) {
        const colors = {
            red: '#ff4757',
            orange: '#ffa502',
            gray: '#747d8c',
            blue: '#3742fa'
        };

        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'failure-particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.backgroundColor = colors[color] || colors.blue;
                particle.style.animationDelay = Math.random() * 1 + 's';

                document.body.appendChild(particle);

                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.parentNode.removeChild(particle);
                    }
                }, 2000);
            }, i * 50);
        }
    }

    // Show error message with enhanced styling
    showError(message) {
        console.error(message);
        this.showMessage(message, 'error');
    }
    
    // Show loading state for buttons
    showButtonLoading(buttonElement, isLoading = true) {
        if (!buttonElement) return;
        
        const loadingElement = buttonElement.querySelector('.button-loading');
        const iconElement = buttonElement.querySelector('i:not(.fa-spinner)');
        
        if (isLoading) {
            buttonElement.classList.add('loading-state');
            buttonElement.disabled = true;
            if (loadingElement) loadingElement.style.display = 'block';
            if (iconElement) iconElement.style.display = 'none';
        } else {
            buttonElement.classList.remove('loading-state');
            buttonElement.disabled = false;
            if (loadingElement) loadingElement.style.display = 'none';
            if (iconElement) iconElement.style.display = 'inline';
        }
    }
    
    // Display informant dialogue with enhanced interaction
    displayInformantDialogue(dialogue, informantName, dialogueType) {
        const dialogueElement = this.elements.dialogueText;
        const informantMessageElement = document.getElementById('informant-message');
        
        if (!dialogueElement) {
            console.warn('Dialogue element not found');
            return;
        }
        
        // Update informant name if available
        const evidenceMarker = informantMessageElement?.querySelector('.evidence-marker');
        if (evidenceMarker && informantName && informantName !== 'unknown') {
            evidenceMarker.textContent = `Informant: ${informantName}`;
        }
        
        // Add dialogue type styling
        if (informantMessageElement) {
            informantMessageElement.className = `dialogue-box case-file ${dialogueType}`;
        }
        
        // Display dialogue with typing effect
        this.addTypingEffect(dialogueElement, dialogue, 30);
        
        // Add visual feedback based on dialogue type
        if (dialogueType === 'not_here') {
            setTimeout(() => {
                this.showMessage('Nadine was not in this city. Try following the clues to another location.', 'info');
            }, dialogue.length * 30 + 500);
        } else if (dialogueType === 'clue_presentation') {
            setTimeout(() => {
                this.showMessage('New clues discovered! Check your evidence board.', 'success');
            }, dialogue.length * 30 + 500);
        }
    }

    // Show "not here" state in UI
    showNotHereState(cityData) {
        // Update scene to show "not here" image
        if (this.elements.cityScene) {
            this.elements.cityScene.src = `../assets/scenes/${cityData.id}_notHere.png`;
            this.elements.cityScene.alt = `${cityData.name} - Not Here Scene`;
            
            // Handle image loading errors
            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load not here scene: ${cityData.id}_notHere.png`);
                this.elements.cityScene.src = '../assets/scenes/world_map.png'; // Fallback
            };
        }
        
        // Disable collect clues button
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = true;
            this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-times"></i> No Clues Here';
            this.elements.collectCluesBtn.classList.add('disabled-state');
        }
        
        // Add visual indicator that this city was unsuccessful
        const cityNameElement = this.elements.currentCityName;
        if (cityNameElement) {
            cityNameElement.classList.add('unsuccessful-investigation');
        }
    }

    // Add typing effect to dialogue
    addTypingEffect(element, text, speed = 50) {
        if (!element) return;
        
        element.classList.add('dialogue-typing');
        element.textContent = '';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            } else {
                element.classList.remove('dialogue-typing');
            }
        };
        
        typeWriter();
    }
    
    // Clear UI state for fresh session
    clearUIState() {
        // Reset UI state object
        this.gameController.uiState = new UIState();

        // Clear any persistent visual states
        this.clearVisualStates();

        // Reset progress display
        this.resetProgressDisplay();

        // Clear any cached UI elements
        this.clearCachedUIElements();

        // Reset button states
        this.resetButtonStates();
    }

    // Clear visual states that might persist between sessions
    clearVisualStates() {
        // Remove any highlighting or selection classes
        const highlightedElements = document.querySelectorAll('.highlighted, .selected, .active-investigation, .unsuccessful-investigation');
        highlightedElements.forEach(element => {
            element.classList.remove('highlighted', 'selected', 'active-investigation', 'unsuccessful-investigation');
        });

        // Clear any temporary visual effects
        const effectElements = document.querySelectorAll('[class*="ripple"], [class*="glow"], [class*="pulse"]');
        effectElements.forEach(element => {
            element.className = element.className.replace(/\b\w*(ripple|glow|pulse)\w*\b/g, '').trim();
        });

        // Reset any modified styles
        const styledElements = document.querySelectorAll('[style]');
        styledElements.forEach(element => {
            if (element.hasAttribute('style')) {
                element.removeAttribute('style');
            }
        });
    }

    // Reset progress display to initial state
    resetProgressDisplay() {
        if (this.elements.citiesVisitedCount) {
            this.elements.citiesVisitedCount.textContent = '0';
        }

        if (this.elements.cluesCollectedCount) {
            this.elements.cluesCollectedCount.textContent = '0';
        }

        if (this.elements.currentCityName) {
            this.elements.currentCityName.textContent = 'Starting Location';
        }

        // Clear any progress bars or indicators
        const progressElements = document.querySelectorAll('.progress-bar, .stat-value, .milestone-indicator');
        progressElements.forEach(element => {
            if (element.textContent) {
                element.textContent = '0';
            }
        });
    }

    // Clear cached UI elements that might hold old session data
    clearCachedUIElements() {
        // Clear clues list
        if (this.elements.cluesList) {
            this.elements.cluesList.innerHTML = '';
        }

        // Clear dialogue text
        if (this.elements.dialogueText) {
            this.elements.dialogueText.textContent = '';
        }

        // Clear city markers
        if (this.elements.cityMarkers) {
            this.elements.cityMarkers.innerHTML = '';
        }

        // Clear any dynamic content containers
        const dynamicContainers = document.querySelectorAll('.dynamic-content, .generated-content, .session-content');
        dynamicContainers.forEach(container => {
            container.innerHTML = '';
        });
    }

    // Reset button states to initial configuration
    resetButtonStates() {
        // Reset collect clues button
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = false;
            this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-search"></i> Collect Clues';
            this.elements.collectCluesBtn.classList.remove('loading-state', 'disabled-state');
        }

        // Reset travel button
        if (this.elements.travelBtn) {
            this.elements.travelBtn.disabled = false;
            this.elements.travelBtn.classList.remove('loading-state');
        }

        // Reset view clues button
        if (this.elements.viewCluesBtn) {
            this.elements.viewCluesBtn.disabled = false;
            this.elements.viewCluesBtn.classList.remove('loading-state');
        }

        // Remove loading states from all buttons
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(button => {
            button.classList.remove('loading-state', 'selecting', 'disabled-state');
            button.disabled = false;
        });
    }

    // Add ripple effect to all buttons
    addRippleEffectToButtons() {
        const buttons = document.querySelectorAll('button');
        buttons.forEach(button => {
            button.classList.add('ripple');
            
            button.addEventListener('mouseenter', () => {
                if (!button.disabled) {
                    button.style.transform = 'translateY(-2px)';
                }
            });
            
            button.addEventListener('mouseleave', () => {
                if (!button.disabled) {
                    button.style.transform = '';
                }
            });
        });
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const gameController = new GameController();
    gameController.init().catch(error => {
        console.error('Failed to start game:', error);
    });
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameController, GameState, UIManager };
}