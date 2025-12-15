/**
 * GameController.js - Main Game Logic Coordinator
 * Orchestrates all game systems and handles player actions
 */

import { GameState } from './GameState.js';
import { UIState } from './UIState.js';
import { DataValidator } from './DataValidator.js';
import { ClueSystem } from './ClueSystem.js';
import { InformantSystem } from './InformantSystem.js';
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
        this.informantSystem = new InformantSystem(this.gameState, this.clueSystem);
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
                rawData = await this.uiManager.assetLoader.loadGameData('assets/data/game_data.json', {
                    timeout: 15000,
                    retryOnFailure: true,
                    showLoadingState: true
                });
            } else {
            // Fallback to direct fetch
                const response = await fetch('assets/data/game_data.json');
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
        // Initialize randomization system first for new game
        this.randomizationSystem.initialize();

        // Initialize game state with route generation using fair randomization
        this.gameState.initializeGame(this.gameState.gameData, this.randomizationSystem);
        this.gameState.phase = 'investigation';

        // Ensure we have a valid route and starting city
        if (!this.gameState.cityRoute || this.gameState.cityRoute.length === 0) {
            console.error('Failed to generate city route');
            this.uiManager.showError('Failed to start game: Could not generate route');
            return;
        }

        // The starting city should already be set by initializeGame
        if (!this.gameState.currentCity) {
            console.error('No starting city set');
            this.uiManager.showError('Failed to start game: No starting city available');
            return;
        }

        // Validate randomization quality
        const randomizationStats = this.randomizationSystem.getRandomizationStats();
        console.log('Game started with fair randomization:', randomizationStats);
        console.log('Generated route:', this.gameState.cityRoute);
        console.log('Starting city:', this.gameState.currentCity);
        
        this.gameState.saveGameState();
        this.uiManager.showScreen('investigation-screen');
        this.updateProgressDisplay();
        this.uiManager.updateInvestigationScreen(this.gameState.currentCity);

        // Show initial greeting dialogue when starting in the first city
        this.showInformantDialogue(this.gameState.currentCity, 'greeting');
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

    // Collect clues from current city about the NEXT city in the route
    collectClues() {
        const currentCityData = this.getCityData(this.gameState.currentCity);
        
        if (!currentCityData) {
            this.uiManager.showError('Unable to collect clues: City data not found');
            return;
        }

        // Check if we're in Buenos Aires (final destination) FIRST
        if (currentCityData.is_final) {
            // In Buenos Aires, show the final encounter dialogs instead of regular clues
            this.handleBuenosAiresFinalEncounter();
            return;
        }

        // Get the next city in the route - this is what the clues should be about
        const nextCityId = this.gameState.getNextCityInRoute();

        if (!nextCityId) {
            this.uiManager.showError('No next destination available');
            return;
        }

        // Check if we're in "no more info" state first
        const nextDifficulty = this.clueSystem.getNextClueDifficulty(this.gameState.currentCity);
        if (nextDifficulty === 'no_more_info') {
            // Show "no more information" message with farewell_helpful
            const noMoreInfoMessage = "I have no more information.";
            this.uiManager.displayInformantDialogue(noMoreInfoMessage, currentCityData.informant.name, 'no_more_info');

            // Show farewell_helpful message
            this.showInformantDialogue(this.gameState.currentCity, 'farewell_helpful');
            return;
        }

        // Check if current city has clues about the next city
        const hasClues = this.hasCityClues(this.gameState.currentCity);

        if (!hasClues) {
            // Show "not here" response - Nadine wasn't in this city
            this.showInformantDialogue(this.gameState.currentCity, 'not_here');
            // this.uiManager.showFeedbackMessage('No clues found in this city.', 'info');
            return;
        }

        // Use the enhanced clue system with progression logic to get clues about the NEXT city
        const collectedClues = this.presentCluesAboutNextCity(this.gameState.currentCity, nextCityId);
        
        if (collectedClues.length > 0) {
            // Clues are already displayed in dialogue format by presentCluesAboutNextCity

            // Update current clue difficulty level based on collected clues
            // Use the hardest difficulty collected for scoring purposes
            const difficulties = ['easy', 'medium', 'difficult'];
            const hardestDifficulty = collectedClues.reduce((hardest, clue) => {
                const currentIndex = difficulties.indexOf(clue.difficulty);
                const hardestIndex = difficulties.indexOf(hardest);
                return currentIndex > hardestIndex ? clue.difficulty : hardest;
            }, 'easy');

            this.gameState.currentClueLevel = hardestDifficulty;

            // Debug logging for clue collection
            console.log(`Clue collection: Set difficulty to ${hardestDifficulty} based on collected clues:`, collectedClues.map(c => c.difficulty));

            // Provide positive feedback for successful clue collection with point information
            const totalPoints = collectedClues.reduce((sum, clue) => sum + (clue.pointValue || 1), 0);
            // this.uiManager.showFeedbackMessage(
            //     `Clues collected successfully! +${totalPoints} points`,
            //     'success'
            // );

            // Validate clue consistency after collection
            const validationResult = this.clueSystem.validateClueConsistency();
            if (!validationResult.isValid) {
                console.warn('Clue consistency issues detected:', validationResult.errors);
                // Auto-repair if needed
                this.clueSystem.repairClueConsistency();
            }

            this.gameState.saveGameState();
        } else {
            // Show "not here" response
            this.showInformantDialogue(this.gameState.currentCity, 'not_here');

            // Provide helpful feedback for no clues found
            // this.uiManager.showFeedbackMessage('No clues found in this city.', 'info');
        }

        // Check for investigation completion
        const completionStatus = this.detectInvestigationCompletion();
        if (completionStatus.isComplete) {
            // Commented out distractive popup dialog
            // setTimeout(() => {
            //     this.uiManager.showFeedbackMessage(completionStatus.message, 'info');
            // }, 3000);
        }
        
        // Update progress display
        this.updateProgressDisplay();
    }

    // Present clues about the next city in the route
    presentCluesAboutNextCity(currentCityId, nextCityId) {
        const currentCityData = this.getCityData(currentCityId);
        const nextCityData = this.getCityData(nextCityId);

        if (!currentCityData || !nextCityData) {
            return [];
        }

        // Get clues from the NEXT city's data (these are clues about where Nadine went)
        let clues = [];

        // Get clues from next city's data but track progression for current city
        clues = this.clueSystem.getCluesWithProgressionFromCity(nextCityData, currentCityId, true);

        if (clues.length > 0) {
            const addedClues = [];
            clues.forEach(clue => {
                // Modify the clue to indicate it's about the next city
                clue.aboutCity = nextCityId;
                clue.aboutCityName = nextCityData.name;
                clue.sourceCity = currentCityId;
                clue.sourceCityName = currentCityData.name;

                // Transform the clue text to be from the informant's perspective
                clue.text = this.transformClueToInformantPerspective(clue.text, currentCityData.informant.name);

                if (this.clueSystem.addClueToCollection(clue)) {
                    addedClues.push(clue);
                }
            });

            if (addedClues.length > 0) {
                // Show clues in dialogue format
                this.displayCluesInDialogue(addedClues, currentCityData.informant.name);

                // Also add to evidence list
                this.uiManager.showCluesCollected(addedClues);
            }

            return addedClues;
        } else {
            return [];
        }
    }

    // Display clues in dialogue format
    displayCluesInDialogue(clues, informantName) {
        let clueText = "I have some information about where she went next:\n\n";

        clues.forEach((clue, index) => {
            clueText += `${clue.text}\n`;
        });

        // Show the clues as dialogue
        this.uiManager.displayInformantDialogue(clueText, informantName, 'clue_presentation');
    }

    // Transform clue text to be from the informant's perspective
    transformClueToInformantPerspective(clueText, informantName) {
        // Transform clues to be from the informant's observation
        const transformations = [
            `I saw her ${clueText.toLowerCase()}`,
            `She mentioned ${clueText.toLowerCase()}`,
            `I noticed she ${clueText.toLowerCase()}`,
            `She was interested in ${clueText.toLowerCase()}`,
            `I observed her ${clueText.toLowerCase()}`
        ];
        
        // Pick a random transformation
        const randomIndex = Math.floor(Math.random() * transformations.length);
        return transformations[randomIndex];
    }

    // Present clues with automatic difficulty progression (hard → medium → easy) - kept for compatibility
    presentCluesWithDifficulty(cityId, requestedDifficulty = null) {
        const cityData = this.getCityData(cityId);
        
        if (!cityData || !this.hasCityClues(cityId)) {
            this.uiManager.showNotHereState(cityData);
            return [];
        }
        
        let clues = [];
        
        if (requestedDifficulty && ['easy', 'medium', 'difficult'].includes(requestedDifficulty)) {
            // Use specific difficulty if requested
            const clueOptions = {
                maxCluesPerDifficulty: 1,
                randomizeSelection: true,
                includeAllDifficulties: false,
                specificDifficulty: requestedDifficulty
            };
            clues = this.clueSystem.generateClues(cityData, clueOptions);
        } else {
            // Use automatic progression system (hard → medium → easy)
            clues = this.clueSystem.getCluesWithProgression(cityId, true);
        }

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
        // Show farewell dialogue before traveling
        const cityData = this.getCityData(this.gameState.currentCity);
        const hasClues = this.hasCityClues(this.gameState.currentCity);
        const cityCluesCollected = this.gameState.collectedClues.filter(
            clue => clue.sourceCity === this.gameState.currentCity
        );

        // Show appropriate farewell based on whether clues were collected
        if (cityCluesCollected.length > 0) {
            this.showInformantDialogue(this.gameState.currentCity, 'farewell_helpful');
        } else if (hasClues) {
            // City has clues but player didn't collect them
            this.showInformantDialogue(this.gameState.currentCity, 'farewell_unhelpful');
        } else {
            // City has no clues (Nadine wasn't here)
            this.showInformantDialogue(this.gameState.currentCity, 'farewell_unhelpful');
        }

        this.gameState.phase = 'travel';
        this.gameState.saveGameState();
        this.uiManager.showScreen('travel-screen');
        this.uiManager.showWorldMap();
        // Ensure travel button is in correct state
        this.uiManager.resetTravelButton();
    }

    // Travel to selected city with guess validation and scoring
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

        // Validate guess against predetermined route
        const guessResult = this.validateGuessAgainstRoute(cityId);

        if (guessResult.isCorrect) {
            // Handle correct guess
            this.handleCorrectGuess(cityId, guessResult);
        } else {
            // Handle incorrect guess
            this.handleIncorrectGuess(cityId, guessResult);
        }
    }

    // Validate guess against the predetermined route
    validateGuessAgainstRoute(cityId) {
        const nextCityInRoute = this.gameState.getNextCityInRoute();

        if (!nextCityInRoute) {
            // Already at final destination or route not properly initialized
            return {
                isCorrect: false,
                reason: 'no_next_city',
                message: 'No next destination in route'
            };
        }

        const isCorrect = cityId === nextCityInRoute;

        return {
            isCorrect: isCorrect,
            expectedCity: nextCityInRoute,
            guessedCity: cityId,
            reason: isCorrect ? 'correct_destination' : 'incorrect_destination',
            message: isCorrect ?
                'Correct destination! Following the trail perfectly.' :
                'Incorrect destination. Nadine wasn\'t here.'
        };
    }

    // Handle correct guess with scoring and journey completion detection
    handleCorrectGuess(cityId, guessResult) {
        const cityData = this.getCityData(cityId);

        // Add current city to visited cities before moving
        if (this.gameState.currentCity && !this.gameState.visitedCities.includes(this.gameState.currentCity)) {
            this.gameState.visitedCities.push(this.gameState.currentCity);
        }
        
        // Award points based on current clue difficulty level BEFORE advancing
        const pointsAwarded = this.awardPointsForCorrectGuess();

        // Move to new city
        const previousCity = this.gameState.currentCity;
        this.gameState.currentCity = cityId;
        this.gameState.gameStats.citiesVisited++;
        
        // Advance to next city in route (this resets clue level for new city)
        this.gameState.advanceToNextCity();

        // Check for journey completion after 4 cities (before Buenos Aires)
        const journeyStatus = this.checkJourneyCompletion();

        // Log successful travel
        console.log(`Correct guess: ${previousCity || 'Starting location'} → ${cityData.name} (+${pointsAwarded} points)`);
        console.log(`Journey status:`, journeyStatus);

        // Provide positive feedback with score information
        let feedbackMessage = `Excellent detective work! +${pointsAwarded} points`;
        if (journeyStatus.shouldPresentFinalDestination) {
            feedbackMessage += ` | ${journeyStatus.message}`;
        }

        // this.uiManager.showFeedbackMessage(
        //     feedbackMessage,
        //     'success',
        //     { icon: 'fas fa-check-circle', duration: 3000 }
        // );
        
        // Show travel animation and transition
        this.uiManager.animateTravel(previousCity, cityId, () => {
            // Check if this is the final destination
            if (cityData.is_final) {
                // For Buenos Aires, first show the investigation screen like a regular city
                this.gameState.phase = 'investigation';
                this.uiManager.showScreen('investigation-screen');
                this.uiManager.updateInvestigationScreen(cityId);

                // Show greeting dialogue when entering Buenos Aires
                this.showInformantDialogue(cityId, 'greeting');
            } else if (journeyStatus.shouldPresentFinalDestination) {
                // Present Buenos Aires as the final destination after 4 cities
                this.presentFinalDestination();
            } else {
                this.gameState.phase = 'investigation';
                this.uiManager.showScreen('investigation-screen');
                this.uiManager.updateInvestigationScreen(cityId);

                // Show greeting dialogue when entering a new city
                this.showInformantDialogue(cityId, 'greeting');
            }
        });

        this.gameState.saveGameState();
        this.updateProgressDisplay();
    }

    // Check journey completion status after each successful city visit
    checkJourneyCompletion() {
        const citiesCompleted = this.gameState.gameStats.citiesCompleted;
        const totalCitiesInRoute = this.gameState.cityRoute.length;
        const currentCityData = this.getCityData(this.gameState.currentCity);

        // Check if we've completed 4 cities and are ready for Buenos Aires
        if (citiesCompleted === 4 && totalCitiesInRoute === 5) {
            return {
                shouldPresentFinalDestination: true,
                isJourneyComplete: false,
                message: 'Four cities completed! Buenos Aires awaits as your final destination.',
                nextAction: 'present_final_destination',
                progress: '4/5 cities completed'
            };
        }

        // Check if we're at the final destination (Buenos Aires)
        if (currentCityData && currentCityData.is_final) {
            return {
                shouldPresentFinalDestination: false,
                isJourneyComplete: true,
                message: 'Journey complete! You have found Nadine in Buenos Aires!',
                nextAction: 'trigger_final_encounter',
                progress: '5/5 cities completed'
            };
        }

        // Normal journey progression
        return {
            shouldPresentFinalDestination: false,
            isJourneyComplete: false,
            message: `Journey continues... ${citiesCompleted}/${totalCitiesInRoute} cities completed.`,
            nextAction: 'continue_investigation',
            progress: `${citiesCompleted}/${totalCitiesInRoute} cities completed`
        };
    }

    // Present Buenos Aires as the final destination after 4 cities
    presentFinalDestination() {
        // Show special message about reaching the final stage
        // this.uiManager.showFeedbackMessage(
        //     '🎯 Final Stage: Buenos Aires is your last destination! Nadine awaits...',
        //     'info',
        //     { icon: 'fas fa-flag-checkered', duration: 5000 }
        // );

        // Transition to travel screen with Buenos Aires highlighted
        setTimeout(() => {
            this.gameState.phase = 'travel';
            this.uiManager.showScreen('travel-screen');
            this.uiManager.showWorldMapWithFinalDestination();
        }, 2000);
    }

    // Handle incorrect guess with attempt deduction and "not here" scene
    handleIncorrectGuess(cityId, guessResult) {
        const cityData = this.getCityData(cityId);

        // Deduct one attempt for incorrect guess
        this.gameState.gameStats.attemptsRemaining--;

        // Log incorrect guess
        console.log(`Incorrect guess: ${cityId} (Expected: ${guessResult.expectedCity}). Attempts remaining: ${this.gameState.gameStats.attemptsRemaining}`);

        // Display "not here" scene for incorrect guess
        this.displayNotHereScene(cityData);

        // Provide feedback about incorrect guess
        // this.uiManager.showFeedbackMessage(
        //     `Nadine wasn't in ${cityData.name}. ${this.gameState.gameStats.attemptsRemaining} attempts remaining.`,
        //     'warning',
        //     { icon: 'fas fa-exclamation-triangle', duration: 4000 }
        // );

        // Check for failure conditions after reducing attempts
        const failureCheck = this.failureHandler.checkFailureConditions();
        if (failureCheck.hasFailed) {
            this.triggerGameOver(failureCheck);
            return;
        }

        // Return to travel screen for another attempt
        setTimeout(() => {
            this.gameState.phase = 'travel';
            this.uiManager.showScreen('travel-screen');
            this.uiManager.showWorldMap();
            // Reset travel button state
            this.uiManager.resetTravelButton();
        }, 3000);
        
        this.gameState.saveGameState();
        this.updateProgressDisplay();
    }

    // Award points based on current clue difficulty level
    awardPointsForCorrectGuess() {
        const currentClueLevel = this.gameState.currentClueLevel || 'easy';

        const pointValues = {
            'difficult': 3,
            'medium': 2,
            'easy': 1
        };

        const points = pointValues[currentClueLevel] || 1;
        this.gameState.gameStats.score += points;

        // Debug logging for scoring
        console.log(`Scoring: ${currentClueLevel} clue = ${points} points (Total: ${this.gameState.gameStats.score})`);

        return points;
    }

    // Display "not here" scene for incorrect guesses
    displayNotHereScene(cityData) {
        // Show the "not here" scene image
        const notHereImagePath = `assets/scenes/${cityData.id}_notHere.png`;
        this.uiManager.showNotHereScene(cityData, notHereImagePath);

        // Display informant's "not here" response
        const notHereResponse = cityData.not_here_response ||
            `No, that person hasn't been here. Try looking elsewhere.`;

        this.uiManager.displayInformantDialogue(
            notHereResponse,
            cityData.informant?.name || 'Local Informant',
            'not_here'
        );
    }

    // Handle Buenos Aires final encounter sequence
    handleBuenosAiresFinalEncounter() {
        const buenosAiresData = this.getCityData(this.gameState.currentCity);

        if (!buenosAiresData || !buenosAiresData.final_encounter) {
            console.error('Buenos Aires final encounter data not found');
            return;
        }

        // Initialize final encounter state
        this.gameState.finalEncounterStep = 0;
        this.gameState.finalEncounterData = buenosAiresData.final_encounter;

        // First, show the buenosAires_youFoundMe.png image
        this.uiManager.showFinalEncounterImage('buenosAires_youFoundMe.png');

        // Start the final encounter sequence
        this.showNextFinalEncounterStep();
    }

    // Show the next step in the final encounter sequence
    showNextFinalEncounterStep() {
        const encounter = this.gameState.finalEncounterData;
        const step = this.gameState.finalEncounterStep;

        switch (step) {
            case 0:
                // Show Nadine's speech with proper timing
                this.uiManager.displayFinalEncounterDialogue(
                    encounter.nadine_speech,
                    'Nadine Vuan',
                    'final_encounter_nadine',
                    'Continue',
                    () => {
                        this.gameState.finalEncounterStep++;
                        this.showNextFinalEncounterStep();
                    }
                );
                break;

            case 1:
                // Show Steve's response with proper timing
                this.uiManager.displayFinalEncounterDialogue(
                    encounter.steve_response,
                    'Steve',
                    'final_encounter_steve',
                    'Continue',
                    () => {
                        this.gameState.finalEncounterStep++;
                        this.showNextFinalEncounterStep();
                    }
                );
                break;

            case 2:
                // Show victory message with proper timing
                this.uiManager.displayFinalEncounterDialogue(
                    encounter.victory_message,
                    'Game Complete',
                    'final_encounter_victory',
                    'Finish',
                    () => {
                        this.triggerFinalEncounter();
                    }
                );
                break;

            default:
                // Fallback - go directly to final screen
                this.triggerFinalEncounter();
                break;
        }
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

    // Trigger game over sequence with enhanced detection
    triggerGameOver(failureResult) {
        this.gameState.phase = 'game_over';
        this.gameState.isGameComplete = true;
        this.gameState.hasWon = false;
        
        // Save the failure details for display
        this.gameState.failureDetails = failureResult;
        
        // Calculate final statistics for game over display
        const finalStats = this.failureHandler.calculateEnhancedStats();
        failureResult.details = {
            ...failureResult.details,
            ...finalStats,
            finalScore: this.gameState.gameStats.score,
            citiesCompleted: this.gameState.gameStats.citiesCompleted,
            routeProgress: `${this.gameState.currentCityIndex}/${this.gameState.cityRoute.length}`,
            investigationSummary: this.generateInvestigationSummary()
        };

        this.gameState.saveGameState();
        
        // Show game over screen with comprehensive messaging
        this.uiManager.showGameOverScreen(failureResult);
        
        // Log failure for analytics
        console.log('Game Over:', failureResult);
        console.log('Final Investigation Summary:', failureResult.details.investigationSummary);
    }

    // Generate investigation summary for game over display
    generateInvestigationSummary() {
        const summary = {
            routeProgress: `Completed ${this.gameState.currentCityIndex} of ${this.gameState.cityRoute.length} cities`,
            citiesVisited: this.gameState.visitedCities.length,
            cluesCollected: this.gameState.collectedClues.length,
            averageCluesPerCity: this.gameState.visitedCities.length > 0 ?
                (this.gameState.collectedClues.length / this.gameState.visitedCities.length).toFixed(1) : 0,
            highestScoringClue: this.getHighestScoringClue(),
            investigationPath: this.gameState.visitedCities.join(' → '),
            nextDestination: this.gameState.getNextCityInRoute()
        };

        return summary;
    }

    // Get highest scoring clue for summary
    getHighestScoringClue() {
        if (this.gameState.collectedClues.length === 0) return null;

        const pointValues = { 'difficult': 3, 'medium': 2, 'easy': 1 };
        return this.gameState.collectedClues.reduce((highest, clue) => {
            const cluePoints = pointValues[clue.difficulty] || 0;
            const highestPoints = pointValues[highest.difficulty] || 0;
            return cluePoints > highestPoints ? clue : highest;
        });
    }

    // Show clues screen with enhanced evidence interface
    showCluesScreen() {
        this.uiManager.showScreen('clues-screen');

        // Use enhanced evidence interface
        const evidenceData = this.clueSystem.buildEvidenceInterface('evidence_board');
        this.uiManager.updateCluesScreen(this.gameState.collectedClues, evidenceData);
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

            // Reset informant dialogue state for fresh session
            this.informantSystem.resetDialogueState();

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
                
            // Commented out distractive session message
            // this.uiManager.showFeedbackMessage(sessionMessage, 'info');

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

    // Add randomization testing and validation methods for task 10.1
    addRandomizationTestingAndValidation() {
        console.log('Adding randomization testing and validation capabilities...');

        // Test starting city fairness
        const startingCityFairness = this.testStartingCityFairness(50);
        console.log('Starting city fairness test results:', startingCityFairness);

        // Test route generation fairness
        const routeGenerationFairness = this.testRouteGenerationFairness(50);
        console.log('Route generation fairness test results:', routeGenerationFairness);

        // Validate overall randomization system
        const systemValidation = this.validateRandomizationSystem();
        console.log('Randomization system validation:', systemValidation);

        return {
            startingCityFairness: startingCityFairness,
            routeGenerationFairness: routeGenerationFairness,
            systemValidation: systemValidation,
            overallQuality: this.calculateOverallRandomizationQuality(
                startingCityFairness,
                routeGenerationFairness,
                systemValidation
            )
        };
    }

    // Test starting city selection fairness
    testStartingCityFairness(iterations = 50) {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return { error: 'Game data not loaded' };
        }

        const results = {
            iterations: iterations,
            selections: {},
            fairnessScore: 0,
            isBalanced: false,
            errors: []
        };

        const nonFinalCities = this.gameState.gameData.cities.filter(city => !city.is_final);

        // Initialize selection counters
        nonFinalCities.forEach(city => {
            results.selections[city.id] = 0;
        });

        // Run fairness test
        for (let i = 0; i < iterations; i++) {
            try {
                const selectedCity = this.randomizationSystem.selectRandomStartingCity(this.gameState.gameData.cities);
                if (selectedCity && selectedCity.id) {
                    results.selections[selectedCity.id]++;
                } else {
                    results.errors.push(`Iteration ${i}: No city selected`);
                }
            } catch (error) {
                results.errors.push(`Iteration ${i}: ${error.message}`);
            }
        }

        // Calculate fairness score
        const expectedFrequency = iterations / nonFinalCities.length;
        let totalDeviation = 0;

        Object.values(results.selections).forEach(count => {
            totalDeviation += Math.abs(count - expectedFrequency);
        });

        results.fairnessScore = Math.max(0, 1 - (totalDeviation / iterations));
        results.isBalanced = results.fairnessScore >= 0.7; // 70% fairness threshold

        return results;
    }

    // Test route generation fairness
    testRouteGenerationFairness(iterations = 50) {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return { error: 'Game data not loaded' };
        }

        const results = {
            iterations: iterations,
            cityAppearances: {},
            routeValidations: { valid: 0, invalid: 0 },
            fairnessScore: 0,
            isBalanced: false,
            errors: []
        };

        const nonFinalCities = this.gameState.gameData.cities.filter(city => !city.is_final);

        // Initialize appearance counters
        nonFinalCities.forEach(city => {
            results.cityAppearances[city.id] = 0;
        });

        // Run route generation test
        for (let i = 0; i < iterations; i++) {
            try {
                const route = this.gameState.generateCityRoute(this.gameState.gameData, this.randomizationSystem);

                if (route && route.length === 5) {
                    // Count city appearances (first 4 cities, excluding Buenos Aires)
                    route.slice(0, 4).forEach(cityId => {
                        if (results.cityAppearances[cityId] !== undefined) {
                            results.cityAppearances[cityId]++;
                        }
                    });

                    // Validate route
                    const validation = this.gameState.validateGeneratedRoute(route, this.gameState.gameData);
                    if (validation.isValid) {
                        results.routeValidations.valid++;
                    } else {
                        results.routeValidations.invalid++;
                        results.errors.push(`Iteration ${i}: Invalid route - ${validation.errors.join(', ')}`);
                    }
                } else {
                    results.routeValidations.invalid++;
                    results.errors.push(`Iteration ${i}: Invalid route length or null route`);
                }
            } catch (error) {
                results.routeValidations.invalid++;
                results.errors.push(`Iteration ${i}: ${error.message}`);
            }
        }

        // Calculate fairness score for city appearances
        const totalAppearances = Object.values(results.cityAppearances).reduce((sum, count) => sum + count, 0);
        const expectedAppearances = totalAppearances / nonFinalCities.length;
        let totalDeviation = 0;

        Object.values(results.cityAppearances).forEach(count => {
            totalDeviation += Math.abs(count - expectedAppearances);
        });

        results.fairnessScore = totalAppearances > 0 ?
            Math.max(0, 1 - (totalDeviation / totalAppearances)) : 0;
        results.isBalanced = results.fairnessScore >= 0.6; // 60% fairness threshold for routes

        return results;
    }

    // Calculate overall randomization quality
    calculateOverallRandomizationQuality(startingCityResults, routeResults, systemValidation) {
        const scores = {
            startingCityFairness: startingCityResults.fairnessScore || 0,
            routeGenerationFairness: routeResults.fairnessScore || 0,
            systemIntegrity: systemValidation.overallValid ? 1 : 0,
            errorRate: 1 - ((startingCityResults.errors?.length || 0) + (routeResults.errors?.length || 0)) / 100
        };

        const overallScore = (
            scores.startingCityFairness * 0.3 +
            scores.routeGenerationFairness * 0.4 +
            scores.systemIntegrity * 0.2 +
            scores.errorRate * 0.1
        );

        return {
            scores: scores,
            overallScore: overallScore,
            quality: overallScore >= 0.8 ? 'excellent' :
                overallScore >= 0.6 ? 'good' :
                    overallScore >= 0.4 ? 'fair' : 'poor',
            recommendations: this.generateRandomizationRecommendations(scores)
        };
    }

    // Generate recommendations for improving randomization
    generateRandomizationRecommendations(scores) {
        const recommendations = [];

        if (scores.startingCityFairness < 0.7) {
            recommendations.push('Improve starting city selection fairness - consider adjusting selection history tracking');
        }

        if (scores.routeGenerationFairness < 0.6) {
            recommendations.push('Enhance route generation balance - ensure all cities have equal opportunity to appear');
        }

        if (scores.systemIntegrity < 1) {
            recommendations.push('Fix randomization system integrity issues - check system validation errors');
        }

        if (scores.errorRate < 0.9) {
            recommendations.push('Reduce randomization errors - improve error handling and validation');
        }

        if (recommendations.length === 0) {
            recommendations.push('Randomization system is performing well - continue monitoring');
        }

        return recommendations;
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

    // Informant System delegation methods

    // Create showInformantDialogue() function
    showInformantDialogue(cityId, dialogueType = 'greeting') {
        const dialogueData = this.informantSystem.showInformantDialogue(cityId, dialogueType);

        // Integrate with UI system
        if (this.uiManager && this.uiManager.displayInformantDialogue) {
            this.uiManager.displayInformantDialogue(
                dialogueData.text,
                dialogueData.informantName,
                dialogueData.dialogueType
            );
        }

        return dialogueData.text;
    }

    // Create investigation completion detection
    detectInvestigationCompletion() {
        return this.informantSystem.detectInvestigationCompletion(this.gameState.currentCity);
    }

    // Get informant dialogue statistics
    getInformantStatistics() {
        return this.informantSystem.getDialogueStatistics();
    }

    // Validate informant system integrity
    validateInformantSystem() {
        return this.informantSystem.validateInformantData();
    }
}