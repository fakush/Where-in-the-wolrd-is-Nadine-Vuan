/**
 * GameController.js - Main Game Logic Coordinator
 * Orchestrates all game systems and handles player actions
 */

import { GameState } from './GameState.js';
import { UIState } from './UIState.js';
import { DataValidator } from './DataValidator.js';
import { ClueSystem } from './ClueSystem.js';
import { FailureHandler } from './FailureHandler.js';
import { SessionManager } from './SessionManager.js';
import { UIManager } from './UIManager.js';
import { RandomizationSystem } from './RandomizationSystem.js';
import { InputValidator } from './InputValidator.js';
import { ErrorHandler } from './ErrorHandler.js';

export class GameController {
    constructor() {
        this.gameState = new GameState();
        this.uiState = new UIState();
        this.randomizationSystem = new RandomizationSystem(this.gameState);
        this.clueSystem = new ClueSystem(this.gameState, this.randomizationSystem);
        this.failureHandler = new FailureHandler(this.gameState);
        this.sessionManager = new SessionManager(this.gameState, null); // UIManager will be set later
        this.uiManager = new UIManager(this);
        
        // Initialize input validation and error handling
        this.inputValidator = new InputValidator(this);
        this.errorHandler = new ErrorHandler(this);

        // Set UIManager reference in SessionManager
        this.sessionManager.uiManager = this.uiManager;
        
        // Bind methods to maintain context
        this.startGame = this.startGame.bind(this);
        this.processPlayerAction = this.processPlayerAction.bind(this);
        this.updateGameState = this.updateGameState.bind(this);
    }

    // Initialize the game application
    async init() {
        try {
            // Show loading screen first
            this.showLoadingScreen();

            // Initialize UI first so AssetLoader is available
            this.uiManager.init();

            // Load game data with enhanced error handling
            await this.loadGameData();
            
            // Try to load saved game state
            const hasLoadedState = this.gameState.loadGameState();
            
            // Enable graceful degradation if needed
            this.uiManager.enableGracefulDegradation();
            
            // Hide loading screen and show appropriate screen based on loaded state
            this.hideLoadingScreen();

            if (hasLoadedState && this.gameState.phase !== 'intro') {
                this.uiManager.showScreen(this.gameState.phase + '-screen');
                this.updateProgressDisplay();
            } else {
                this.uiManager.showScreen('intro-screen');
            }
            
        } catch (error) {
            console.error('Failed to initialize game:', error);

            // Hide loading screen even on error
            this.hideLoadingScreen();

            // Enhanced error handling with fallback options
            if (this.uiManager) {
                this.uiManager.showFeedbackMessage(
                    'Failed to load game completely. Some features may not work.',
                    'error',
                    { duration: 8000, persistent: true }
                );

                // Try to show intro screen anyway
                try {
                    this.uiManager.showScreen('intro-screen');
                } catch (uiError) {
                    console.error('UI initialization also failed:', uiError);
                    // Last resort - show basic error message
                    document.body.innerHTML = `
                        <div style="
                            position: fixed; top: 50%; left: 50%; 
                            transform: translate(-50%, -50%);
                            background: #000; color: #0f0; 
                            padding: 20px; border: 2px solid #0f0;
                            font-family: monospace; text-align: center;
                        ">
                            <h2>🚫 Game Loading Error</h2>
                            <p>The game could not be loaded properly.</p>
                            <p>Please refresh the page and try again.</p>
                            <button onclick="location.reload()" style="
                                background: #0f0; color: #000; 
                                border: none; padding: 10px 20px; 
                                margin-top: 10px; cursor: pointer;
                            ">Refresh Page</button>
                        </div>
                    `;
                }
            }
        }
    }

    // Load game data from JSON file with comprehensive validation and fallback handling
    async loadGameData() {
        try {
            // Use AssetLoader if available for enhanced error handling
            let rawData;

            if (this.uiManager && this.uiManager.assetLoader) {
                rawData = await this.uiManager.assetLoader.loadGameData('../assets/data/game_data.json', {
                    timeout: 15000,
                    retryOnFailure: true,
                    showLoadingState: true
                });
            } else {
            // Fallback to direct fetch
                const response = await fetch('../assets/data/game_data.json');
                if (!response.ok) {
                    throw new Error(`Failed to load game data: HTTP ${response.status} - ${response.statusText}`);
                }
                rawData = await response.json();
            }
            
            // Validate game data structure
            const validationResult = DataValidator.validateGameData(rawData);
            if (!validationResult.isValid) {
                console.warn('Game data validation failed:', validationResult.errors);

                // If validation fails but we have basic structure, try to use it anyway
                if (rawData && (rawData.game_data || rawData.cities)) {
                    console.log('Using potentially incomplete game data');
                    this.gameState.gameData = rawData.game_data || rawData;

                    // Show warning to user
                    if (this.uiManager) {
                        this.uiManager.showFeedbackMessage(
                            'Game data may be incomplete. Some features might not work correctly.',
                            'warning',
                            { duration: 5000 }
                        );
                    }
                    return;
                }

                throw new Error(`Invalid game data structure: ${validationResult.errors.join(', ')}`);
            }
            
            // Extract the actual game data from the wrapper
            this.gameState.gameData = rawData.game_data || rawData;
            
        } catch (error) {
            console.error('Error loading game data:', error);
            
            // Enhanced error handling with user-friendly messages
            let userMessage = 'Failed to load game data. ';

            if (error instanceof TypeError || error.message.includes('fetch')) {
                userMessage += 'Please check your internet connection and try refreshing the page.';
            } else if (error instanceof SyntaxError || error.message.includes('JSON')) {
                userMessage += 'The game data appears to be corrupted. Please refresh the page.';
            } else if (error.message.includes('timeout')) {
                userMessage += 'Loading is taking longer than expected. Please check your connection.';
            } else {
                userMessage += 'Please refresh the page and try again.';
            }

            // Show user-friendly error message
            if (this.uiManager) {
                this.uiManager.showFeedbackMessage(userMessage, 'error', {
                    duration: 10000,
                    persistent: true
                });
            }

            // Try to use fallback data if available
            if (this.uiManager && this.uiManager.assetLoader) {
                console.log('Attempting to use fallback game data...');
                try {
                    const fallbackData = this.uiManager.assetLoader.createFallbackGameData();
                    this.gameState.gameData = fallbackData.game_data;

                    this.uiManager.showFeedbackMessage(
                        'Using offline mode. Limited functionality available.',
                        'info',
                        { duration: 5000 }
                    );
                    return;
                } catch (fallbackError) {
                    console.error('Fallback data creation failed:', fallbackError);
                }
            }

            throw error;
        }
    }

    // Start new game
    startGame() {
        this.gameState.initializeGame();
        this.gameState.phase = 'investigation';
        
        // Initialize randomization system for new game
        this.randomizationSystem.initialize();

        // Select random starting city using fair randomization
        const startingCity = this.selectFairStartingCity();
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

    // Collect clues from current city
    collectClues() {
        const cityData = this.getCityData(this.gameState.currentCity);
        
        if (!cityData) {
            this.uiManager.showError('Unable to collect clues: City data not found');
            return;
        }
        
        // Use the clue system to present clues
        const collectedClues = this.presentCluesWithDifficulty(this.gameState.currentCity);
        
        if (collectedClues.length > 0) {
            // Provide positive feedback for successful clue collection
            this.uiManager.showFeedbackMessage('Clues collected successfully!', 'success');
            this.gameState.saveGameState();
        } else {
            // Provide helpful feedback for no clues found
            this.uiManager.showFeedbackMessage('No clues found in this city.', 'info');
        }
        
        // Update progress display
        this.updateProgressDisplay();
    }

    // Present clues with difficulty selection
    presentCluesWithDifficulty(cityId, requestedDifficulty = null) {
        const cityData = this.getCityData(cityId);
        
        if (!cityData || !this.hasCityClues(cityId)) {
            this.uiManager.showNotHereState(cityData);
            return [];
        }
        
        let clueOptions = {};
        
        if (requestedDifficulty && ['easy', 'medium', 'difficult'].includes(requestedDifficulty)) {
            clueOptions = {
                maxCluesPerDifficulty: 2,
                randomizeSelection: true,
                includeAllDifficulties: false,
                specificDifficulty: requestedDifficulty
            };
        } else {
            clueOptions = {
                maxCluesPerDifficulty: 1,
                randomizeSelection: true,
                includeAllDifficulties: true
            };
        }
        
        const clues = this.clueSystem.generateClues(cityData, clueOptions);
        
        if (clues.length > 0) {
            const addedClues = [];
            clues.forEach(clue => {
                if (this.clueSystem.addClueToCollection(clue)) {
                    addedClues.push(clue);
                }
            });
            
            if (addedClues.length > 0) {
                this.uiManager.showCluesCollected(addedClues);
            }
            
            return addedClues;
        } else {
            return [];
        }
    }

    // Show travel screen
    showTravelScreen() {
        this.gameState.phase = 'travel';
        this.gameState.saveGameState();
        this.uiManager.showScreen('travel-screen');
        this.uiManager.showWorldMap();
    }

    // Travel to selected city
    travelToCity(cityId) {
        // Validate travel possibility
        const travelCheck = this.canTravelToCity(cityId);
        if (!travelCheck.canTravel) {
            // Reduce attempts for invalid travel attempts
            this.gameState.gameStats.attemptsRemaining--;
            
            this.uiManager.showFeedbackMessage(`Cannot travel: ${travelCheck.reason}`, 'error');
            
            // Check for failure conditions after reducing attempts
            const failureCheck = this.failureHandler.checkFailureConditions();
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
            this.uiManager.showFeedbackMessage('Invalid destination selected', 'error');
            return;
        }

        // Add current city to visited cities before moving
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
        
        // Log travel for debugging
        console.log(`Travel: ${previousCity || 'Starting location'} → ${cityData.name}`);
        
        // Show travel animation and transition
        this.uiManager.animateTravel(previousCity, cityId, () => {
            // Check if this is the final destination
            if (cityData.is_final) {
                this.triggerFinalEncounter();
            } else {
                // Check for failure conditions after travel
                const failureCheck = this.failureHandler.checkFailureConditions();
                if (failureCheck.hasFailed) {
                    this.triggerGameOver(failureCheck);
                    return;
                }
                
                this.gameState.phase = 'investigation';
                this.uiManager.showScreen('investigation-screen');
                this.uiManager.updateInvestigationScreen(cityId);
            }
        });
        
        this.gameState.saveGameState();
        this.updateProgressDisplay();
    }

    // Trigger final encounter
    triggerFinalEncounter() {
        this.gameState.phase = 'conclusion';
        this.gameState.isGameComplete = true;
        this.gameState.hasWon = true;

        const finalCityData = this.getCityData(this.gameState.currentCity);
        if (finalCityData && finalCityData.final_encounter) {
            this.uiManager.updateFinalEncounterScreen(finalCityData.final_encounter);
        }

        this.uiManager.showScreen('final-encounter-screen');
        this.gameState.saveGameState();
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
        const confirmed = confirm('Are you sure you want to start a new investigation? Your current progress will be lost.');
        if (confirmed) {
            // Perform complete session reset
            this.sessionManager.performCompleteSessionReset();

            // Reset randomization system for fresh session
            this.randomizationSystem.initialize();

            // Ensure session isolation
            const isolationResults = this.sessionManager.ensureSessionIsolation();

            // Show intro screen
            this.uiManager.showScreen('intro-screen');

            // Clear any UI state that might persist
            this.uiManager.clearUIState();

            // Show fresh start message with session info
            const sessionMessage = isolationResults.errors.length === 0 ? 
                'New investigation started! Good luck, detective!' :
                'Fresh investigation started with clean slate! Good luck, detective!';
                
            this.uiManager.showFeedbackMessage(sessionMessage, 'info');

            // Log session restart for debugging
            console.log('New game session started:', this.gameState.sessionId, isolationResults);
            console.log('Randomization system reset for new session');
        }
    }

    // Exit game with session cleanup
    exitGame() {
        // Show completion statistics and farewell message
        const gameStats = this.failureHandler.calculateEnhancedStats();
        const farewell = `Thank you for playing "Where in the World is Nadine Vuan?"!\n\n` +
            `Investigation Summary:\n` +
            `• Cities Visited: ${gameStats.citiesVisited}\n` +
            `• Clues Collected: ${gameStats.cluesCollected}\n` +
            `• Time Taken: ${gameStats.elapsedTime.formatted}\n` +
            `• Investigation Efficiency: ${gameStats.investigationEfficiency}%\n\n` +
            `We hope you enjoyed your detective adventure!`;

        alert(farewell);

        // Perform complete session cleanup
        this.sessionManager.performCompleteSessionReset();
        
        // Ensure clean exit
        this.sessionManager.ensureSessionIsolation();
        
        // Return to intro screen
        this.uiManager.showScreen('intro-screen');
        
        // Clear UI state for fresh start
        this.uiManager.clearUIState();
        
        console.log('Game exited cleanly with session cleanup');
    }

    // Update progress display
    updateProgressDisplay() {
        const enhancedStats = this.failureHandler.calculateEnhancedStats();
        this.uiManager.updateProgressDisplay(enhancedStats);
    }

    // Helper methods
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

    // Fair starting city selection using RandomizationSystem
    selectFairStartingCity() {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            console.error('Game data not loaded for starting city selection');
            return null;
        }
        
        return this.randomizationSystem.selectRandomStartingCity(this.gameState.gameData.cities);
    }

    // Legacy method for compatibility - now uses fair randomization
    getRandomStartingCity() {
        return this.selectFairStartingCity();
    }

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

    // Delegate methods to appropriate systems
    getGameOverMessage(failureType, details) {
        return this.failureHandler.getGameOverMessage(failureType, details);
    }

    checkFailureConditions() {
        return this.failureHandler.checkFailureConditions();
    }

    testSessionIndependence() {
        return this.sessionManager.testSessionIndependence();
    }

    ensureSessionIsolation() {
        return this.sessionManager.ensureSessionIsolation();
    }

    performCompleteSessionReset() {
        return this.sessionManager.performCompleteSessionReset();
    }

    // Randomization testing and validation methods
    testRandomizationFairness(iterations = 100) {
        console.log(`Testing randomization fairness over ${iterations} iterations...`);

        // Test starting city selection fairness
        const startingCityTest = () => {
            if (!this.gameState.gameData || !this.gameState.gameData.cities) {
                throw new Error('Game data not loaded');
            }
            return this.randomizationSystem.selectRandomStartingCity(this.gameState.gameData.cities);
        };

        const startingCityResults = this.randomizationSystem.testRandomizationFairness(startingCityTest, iterations);

        // Test clue selection fairness
        const clueSelectionTest = () => {
            if (!this.gameState.gameData || !this.gameState.gameData.cities) {
                throw new Error('Game data not loaded');
            }

            // Use first non-final city for testing
            const testCity = this.gameState.gameData.cities.find(city => !city.is_final);
            if (!testCity || !testCity.clues) {
                throw new Error('No valid test city found');
            }

            return this.randomizationSystem.selectRandomClues(testCity.clues, {
                maxCluesPerDifficulty: 1,
                ensureFairDistribution: true,
                includeAllDifficulties: true
            });
        };

        const clueSelectionResults = this.randomizationSystem.testRandomizationFairness(clueSelectionTest, iterations);

        return {
            startingCityFairness: startingCityResults,
            clueSelectionFairness: clueSelectionResults,
            overallFairness: {
                isBalanced: startingCityResults.isBalanced && clueSelectionResults.isBalanced,
                averageFairnessScore: (startingCityResults.fairnessScore + clueSelectionResults.fairnessScore) / 2
            }
        };
    }

    // Validate randomization system integrity
    validateRandomizationSystem() {
        const validationResults = {
            systemIntegrity: this.randomizationSystem.validateRandomizationIntegrity(),
            gameDataCompatibility: this.validateGameDataForRandomization(),
            integrationStatus: this.validateRandomizationIntegration()
        };

        validationResults.overallValid =
            validationResults.systemIntegrity.isValid &&
            validationResults.gameDataCompatibility.isValid &&
            validationResults.integrationStatus.isValid;

        return validationResults;
    }

    // Validate game data compatibility with randomization system
    validateGameDataForRandomization() {
        const errors = [];
        const warnings = [];

        if (!this.gameState.gameData) {
            errors.push('Game data not loaded');
            return { isValid: false, errors: errors, warnings: warnings };
        }

        const cities = this.gameState.gameData.cities;
        if (!cities || !Array.isArray(cities)) {
            errors.push('Cities data is missing or invalid');
            return { isValid: false, errors: errors, warnings: warnings };
        }

        // Check for adequate number of starting cities
        const startingCities = cities.filter(city => !city.is_final);
        if (startingCities.length < 3) {
            warnings.push(`Only ${startingCities.length} starting cities available - may affect randomization quality`);
        }

        // Check clue availability for each city
        cities.forEach(city => {
            if (!city.clues) {
                errors.push(`City ${city.id} missing clues data`);
                return;
            }

            const difficulties = ['easy', 'medium', 'difficult'];
            difficulties.forEach(difficulty => {
                if (!city.clues[difficulty] || !Array.isArray(city.clues[difficulty])) {
                    errors.push(`City ${city.id} missing ${difficulty} clues array`);
                } else if (city.clues[difficulty].length === 0) {
                    warnings.push(`City ${city.id} has no ${difficulty} clues`);
                } else if (city.clues[difficulty].length < 2) {
                    warnings.push(`City ${city.id} has only ${city.clues[difficulty].length} ${difficulty} clue(s) - limited randomization`);
                }
            });
        });

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    // Validate randomization system integration
    validateRandomizationIntegration() {
        const errors = [];
        const warnings = [];

        // Check if RandomizationSystem is properly initialized
        if (!this.randomizationSystem) {
            errors.push('RandomizationSystem not initialized');
            return { isValid: false, errors: errors, warnings: warnings };
        }

        // Check if ClueSystem has RandomizationSystem reference
        if (!this.clueSystem.randomizationSystem) {
            warnings.push('ClueSystem not using RandomizationSystem - falling back to legacy randomization');
        }

        // Test basic functionality
        try {
            const testRandom = this.randomizationSystem.getRandom();
            if (typeof testRandom !== 'number' || testRandom < 0 || testRandom >= 1) {
                errors.push('RandomizationSystem getRandom() not working correctly');
            }
        } catch (error) {
            errors.push(`RandomizationSystem basic functionality test failed: ${error.message}`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }

    // Get comprehensive randomization statistics
    getRandomizationStats() {
        return {
            systemStats: this.randomizationSystem.getRandomizationStats(),
            validationResults: this.validateRandomizationSystem(),
            gameCompatibility: this.validateGameDataForRandomization()
        };
    }

    // Show loading screen
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            // Hide all other screens
            const allScreens = document.querySelectorAll('.game-screen');
            allScreens.forEach(screen => screen.classList.remove('active'));

            // Show loading screen
            loadingScreen.classList.add('active');
        }
    }

    // Hide loading screen
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.remove('active');
        }
    }
}