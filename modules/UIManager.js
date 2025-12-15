/**
 * UIManager.js - UI Management and Interactions
 * Handles all visual updates and user interface interactions
 */

import { AssetLoader } from './AssetLoader.js';
import { NetworkMonitor } from './NetworkMonitor.js';

export class UIManager {
    constructor(gameController) {
        this.gameController = gameController;
        this.screens = {};
        this.elements = {};
        this.assetLoader = null; // Will be initialized after ErrorHandler is available
        this.networkMonitor = null;
        this.loadingIndicators = new Map();
    }

    // Initialize UI elements and event listeners
    init() {
        // Initialize AssetLoader with ErrorHandler
        if (this.gameController.errorHandler) {
            this.assetLoader = new AssetLoader(this.gameController.errorHandler);
            this.setupAssetLoadingListeners();
        }

        // Initialize NetworkMonitor
        this.networkMonitor = new NetworkMonitor(this);

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
            scoreCount: document.getElementById('score-count'),
            attemptsRemainingCount: document.getElementById('attempts-remaining-count'),
            citiesVisitedCount: document.getElementById('cities-visited-count'),
            cluesCollectedCount: document.getElementById('clues-collected-count'),
            cityScene: document.getElementById('city-scene'),
            dialogueText: document.getElementById('dialogue-text'),
            cluesList: document.getElementById('clues-list'),
            cityMarkers: document.getElementById('city-markers')
        };

        // Set up event listeners
        this.setupEventListeners();

        // Preload critical assets
        this.preloadCriticalAssets();
    }

    // Set up event listeners
    setupEventListeners() {
        // Start game
        this.elements.startGameBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('start-game');
        });

        // Investigation actions
        this.elements.collectCluesBtn?.addEventListener('click', () => {
            this.gameController.processPlayerAction('collect-clues');
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

    // Setup asset loading event listeners
    setupAssetLoadingListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('assetLoadingState', (event) => {
                this.handleAssetLoadingState(event.detail);
            });
        }
    }

    // Handle asset loading state changes
    handleAssetLoadingState(detail) {
        const { assetId, state } = detail;

        switch (state) {
            case 'loading':
                this.showLoadingIndicator(assetId);
                break;
            case 'loaded':
                this.hideLoadingIndicator(assetId);
                break;
            case 'failed':
                this.hideLoadingIndicator(assetId);
                this.showAssetFailureMessage(assetId);
                break;
        }
    }

    // Show loading indicator for asset
    showLoadingIndicator(assetId) {
        // Create or update loading indicator
        let indicator = this.loadingIndicators.get(assetId);

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'asset-loading-indicator';
            indicator.innerHTML = `
                <div class="loading-spinner"></div>
                <span class="loading-text">Loading...</span>
            `;

            // Position indicator based on asset type
            if (assetId.includes('scene') || assetId === 'city-scene') {
                const sceneContainer = this.elements.cityScene?.parentElement;
                if (sceneContainer) {
                    sceneContainer.appendChild(indicator);
                }
            } else {
                document.body.appendChild(indicator);
            }

            this.loadingIndicators.set(assetId, indicator);
        }

        indicator.style.display = 'block';
    }

    // Hide loading indicator
    hideLoadingIndicator(assetId) {
        const indicator = this.loadingIndicators.get(assetId);
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // Show asset failure message
    showAssetFailureMessage(assetId) {
        if (assetId === 'game_data') {
            this.showFeedbackMessage(
                'Game data could not be loaded. Using offline mode.',
                'warning',
                { duration: 5000, icon: 'fas fa-exclamation-triangle' }
            );
        } else {
            // Don't show individual image failure messages to avoid spam
            console.log(`Asset failed to load: ${assetId}`);
        }
    }

    // Preload critical assets
    async preloadCriticalAssets() {
        if (!this.assetLoader) return;

        const criticalAssets = [
            { path: 'assets/scenes/portada_juego.png', type: 'cover' },
            { path: 'assets/scenes/steve.png', type: 'character' },
            { path: 'assets/scenes/world_map.png', type: 'map' }
        ];

        try {
            const results = await this.assetLoader.preloadCriticalAssets(criticalAssets);
            console.log(`Critical assets preloaded: ${results.successRate.toFixed(1)}% success rate`);

            if (results.successRate < 50) {
                this.showFeedbackMessage(
                    'Some game images may not display correctly due to loading issues.',
                    'warning',
                    { duration: 5000 }
                );
            }
        } catch (error) {
            console.warn('Critical asset preloading failed:', error);
        }
    }

    // Show specific screen
    showScreen(screenId) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });

        // Show target screen
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    // Update investigation screen with enhanced asset loading
    async updateInvestigationScreen(cityId) {
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
        
        // Update scene image with enhanced error handling
        if (this.elements.cityScene && this.assetLoader) {
            const imagePath = `assets/scenes/${cityId}_${sceneType}.png`;

            try {
                // Show loading state
                this.elements.cityScene.style.opacity = '0.5';

                // Load image with fallback handling
                const image = await this.assetLoader.loadImage(imagePath, 'scene', {
                    timeout: 8000,
                    showLoadingState: true,
                    retryOnFailure: true,
                    fallbackOnError: true
                });

                // Update the image element
                this.elements.cityScene.src = image.src;
                this.elements.cityScene.alt = `${cityData.name} Scene`;
                this.elements.cityScene.style.opacity = '1';

            } catch (error) {
                console.warn(`Failed to load scene image with fallback: ${imagePath}`, error);
                // Final fallback - use a placeholder
                this.elements.cityScene.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkNpdHkgU2NlbmU8L3RleHQ+PC9zdmc+';
                this.elements.cityScene.alt = `${cityData.name} Scene (Placeholder)`;
                this.elements.cityScene.style.opacity = '1';
            }
        } else if (this.elements.cityScene) {
        // Fallback to original method if AssetLoader not available
            this.elements.cityScene.src = `assets/scenes/${cityId}_${sceneType}.png`;
            this.elements.cityScene.alt = `${cityData.name} Scene`;

            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load scene image: ${cityId}_${sceneType}.png`);
                this.elements.cityScene.src = 'assets/scenes/world_map.png';
            };
        }

        // Update collect clues button state
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = !hasClues;
            if (hasClues) {
                this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-search"></i> Collect Clues';
            } else {
                this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-times"></i> No Clues Here';
            }
        }
    }

    // Show world map
    showWorldMap() {
        if (!this.elements.cityMarkers) return;

        // Clear existing markers
        this.elements.cityMarkers.innerHTML = '';

        // Get available cities for travel
        const availableCities = this.gameController.getCitiesByCriteria({ 
            excludeVisited: true, 
            excludeCurrent: true 
        });
        
        // Debug: Log available cities
        console.log('Available cities for travel:', availableCities.map(c => `${c.id} (${c.name})`));

        if (availableCities.length === 0) {
            this.elements.cityMarkers.innerHTML = '<p class="no-cities-message">🚫 No more cities available to visit.</p>';
            return;
        }

        // City positions on the world map (optimized for maximum clarity and no overlaps)
        // Strategic positioning to use map space efficiently
        const cityPositions = {
            'tokyo': { left: '87%', top: '45%' },            // Far right, clear space
            'roma': { left: '48%', top: '45%' },             // Central Europe, moved up
            'marruecos': { left: '36%', top: '50%' },        // North Africa, clear space
            'london': { left: '46%', top: '32%' },           // Northern Europe, well separated
            'reykjavik': { left: '32%', top: '26%' },        // Far north, isolated
            'mexico': { left: '12%', top: '56%' },           // Central America, moved left
            'sydney': { left: '80%', top: '82%' },           // Far southeast, isolated
            'estambul': { left: '56%', top: '45%' },         // Turkey, moved right and down
            'bangkok': { left: '67%', top: '60%' },          // Southeast Asia, moved down
            'newYork': { left: '26%', top: '42%' },          // East coast US, moved left
            'buenosAires': { left: '31%', top: '82%' }       // South America, moved left
        };

        // Add city selection buttons with proper positioning
        availableCities.forEach((city, index) => {
            const cityButton = document.createElement('button');
            cityButton.className = 'city-marker-button';
            cityButton.setAttribute('data-city-id', city.id);

            // Position the button on the map
            const position = cityPositions[city.id];
            if (position) {
                cityButton.style.position = 'absolute';
                cityButton.style.left = position.left;
                cityButton.style.top = position.top;
                cityButton.style.transform = 'translate(-50%, -50%)';
            } else {
                console.warn(`No position found for city: ${city.id} (${city.name})`);
                // Fallback positioning - place in a grid if no position found
                cityButton.style.position = 'relative';
                cityButton.style.display = 'inline-block';
                cityButton.style.margin = '5px';
            }

            // All cities look the same - don't spoil Buenos Aires as final destination
            cityButton.innerHTML = `
                <i class="fas fa-map-marker-alt"></i> ${city.name}
            `;

            // Adjust button width based on city name length
            const nameLength = city.name.length;
            if (nameLength > 12) {
                // Long names like "Ciudad de México" (16 chars), "Buenos Aires" (12 chars)
                cityButton.style.minWidth = '120px';
                cityButton.style.maxWidth = '160px';
            } else if (nameLength > 8) {
                // Medium names like "Marrakech" (9 chars), "Reykjavik" (9 chars)
                cityButton.style.minWidth = '90px';
                cityButton.style.maxWidth = '150px';
            } else {
                // Short names like "Roma" (4 chars), "Tokyo" (5 chars)
                cityButton.style.minWidth = '75px';
                cityButton.style.maxWidth = '110px';
            }

            // Add entrance animation with delay
            cityButton.style.animationDelay = `${index * 0.1}s`;
            cityButton.classList.add('city-marker-entrance');

            cityButton.addEventListener('click', () => {
                this.gameController.processPlayerAction('select-destination', { cityId: city.id });
            });
            
            this.elements.cityMarkers.appendChild(cityButton);
        });

        // Add map interaction hints
        this.addMapInteractionHints();
    }

    // Add interactive hints to the world map
    addMapInteractionHints() {
        if (!this.elements.cityMarkers) return;

        // Add a hint overlay
        const hintOverlay = document.createElement('div');
        hintOverlay.className = 'map-interaction-hint';
        hintOverlay.innerHTML = `
            <div class="hint-content">
                <i class="fas fa-hand-pointer"></i>
                <span>Click on a city to travel there</span>
            </div>
        `;

        this.elements.cityMarkers.appendChild(hintOverlay);

        // Remove hint after a few seconds
        setTimeout(() => {
            if (hintOverlay.parentNode) {
                hintOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (hintOverlay.parentNode) {
                        hintOverlay.parentNode.removeChild(hintOverlay);
                    }
                }, 500);
            }
        }, 3000);
    }

    // Show world map with Buenos Aires highlighted as final destination
    showWorldMapWithFinalDestination() {
        if (!this.elements.cityMarkers) return;

        // Clear existing markers
        this.elements.cityMarkers.innerHTML = '';

        // Get Buenos Aires (should be the only available city at this point)
        const availableCities = this.gameController.getCitiesByCriteria({
            excludeVisited: true,
            excludeCurrent: true
        });

        // Find Buenos Aires specifically
        const buenosAires = availableCities.find(city => city.is_final);

        if (!buenosAires) {
            this.elements.cityMarkers.innerHTML = '<p class="error-message">🚫 Final destination not available.</p>';
            return;
        }

        // Create special final destination display
        const finalDestinationContainer = document.createElement('div');
        finalDestinationContainer.className = 'final-destination-container';
        finalDestinationContainer.innerHTML = `
            <div class="final-destination-header">
                <h3><i class="fas fa-flag-checkered"></i> Final Destination</h3>
                <p class="journey-progress">4 of 5 cities completed</p>
            </div>
            <button class="final-destination-button" id="final-destination-btn">
                <div class="destination-icon">🏆</div>
                <div class="destination-info">
                    <h4>${buenosAires.name}, ${buenosAires.country}</h4>
                    <p class="destination-subtitle">Where Nadine Vuan awaits...</p>
                </div>
                <div class="destination-action">
                    <i class="fas fa-arrow-right"></i> Complete Journey
                </div>
            </button>
        `;

        // Add click handler for final destination
        const finalDestinationBtn = finalDestinationContainer.querySelector('#final-destination-btn');
        finalDestinationBtn.addEventListener('click', () => {
            this.gameController.processPlayerAction('select-destination', { cityId: buenosAires.id });
        });

        this.elements.cityMarkers.appendChild(finalDestinationContainer);

        // Add special styling and animation
        setTimeout(() => {
            finalDestinationContainer.classList.add('final-destination-reveal');
        }, 100);
    }

    // Update clues screen
    updateCluesScreen(clues) {
        if (!this.elements.cluesList) return;

        if (clues.length === 0) {
            this.elements.cluesList.innerHTML = '<p class="no-clues-message">No clues collected yet.</p>';
            return;
        }

        let cluesHTML = '';
        clues.forEach((clue, index) => {
            cluesHTML += `
                <div class="clue-item">
                    <div class="clue-header">
                        <span class="clue-number">${index + 1}</span>
                        <span class="clue-difficulty ${clue.difficulty}">${clue.difficulty.toUpperCase()}</span>
                    </div>
                    <div class="clue-text">${clue.text}</div>
                    <div class="clue-source">Source: ${clue.sourceCity}</div>
                </div>
            `;
        });

        this.elements.cluesList.innerHTML = cluesHTML;
    }

    // Update progress display
    updateProgressDisplay(stats) {
        if (this.elements.scoreCount) {
            this.elements.scoreCount.innerHTML = `<i class="fas fa-star"></i> Score: ${stats.score || 0}`;
        }

        if (this.elements.attemptsRemainingCount) {
            const attempts = stats.attemptsRemaining || 0;
            const icon = attempts <= 1 ? 'fas fa-heart-broken' : 'fas fa-heart';
            const color = attempts <= 1 ? 'color: #ff4444;' : '';
            this.elements.attemptsRemainingCount.innerHTML = `<i class="${icon}" style="${color}"></i> Attempts: ${attempts}`;
        }

        if (this.elements.citiesVisitedCount) {
            this.elements.citiesVisitedCount.innerHTML = `<i class="fas fa-globe-americas"></i> Cities: ${stats.citiesVisited || 0}`;
        }
        
        if (this.elements.cluesCollectedCount) {
            this.elements.cluesCollectedCount.innerHTML = `<i class="fas fa-puzzle-piece"></i> Clues: ${stats.cluesCollected || 0}`;
        }
    }

    // Show game over screen with enhanced information
    showGameOverScreen(failureResult) {
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
            const details = failureResult.details;
            const investigationSummary = details.investigationSummary || {};

            messageElement.innerHTML = `
                <span class="evidence-marker">Case Status</span>
                <p class="retro-text primary-message">${gameOverMessage.primary}</p>
                <p class="retro-text secondary-message">${gameOverMessage.secondary}</p>

                <div class="investigation-summary">
                    <h4><i class="fas fa-clipboard-list"></i> Investigation Summary</h4>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-label">Final Score:</span>
                            <span class="summary-value">${details.finalScore || 0} points</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Route Progress:</span>
                            <span class="summary-value">${details.routeProgress || '0/5'}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Cities Completed:</span>
                            <span class="summary-value">${details.citiesCompleted || 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Clues Collected:</span>
                            <span class="summary-value">${details.cluesCollected || 0}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Investigation Time:</span>
                            <span class="summary-value">${details.elapsedTime?.formatted || '0:00'}</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">Efficiency:</span>
                            <span class="summary-value">${details.investigationEfficiency || 0}%</span>
                        </div>
                    </div>
                    
                    ${investigationSummary.investigationPath ? `
                        <div class="investigation-path">
                            <h5><i class="fas fa-route"></i> Investigation Path</h5>
                            <p class="path-text">${investigationSummary.investigationPath}</p>
                        </div>
                    ` : ''}
                    
                    ${investigationSummary.nextDestination ? `
                        <div class="next-destination">
                            <h5><i class="fas fa-compass"></i> Next Destination</h5>
                            <p class="next-text">You were heading to: ${investigationSummary.nextDestination}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="encouragement-box">
                    <p class="encouragement-text">${gameOverMessage.encouragement}</p>
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

        // Add fade-in animation for summary elements
        setTimeout(() => {
            const summaryElements = messageElement.querySelectorAll('.summary-item, .investigation-path, .next-destination');
            summaryElements.forEach((element, index) => {
                setTimeout(() => {
                    element.classList.add('summary-reveal');
                }, index * 100);
            });
        }, 500);
    }

    // Update final encounter screen
    updateFinalEncounterScreen(encounter) {
        const encounterScreen = document.getElementById('final-encounter-screen');
        if (encounterScreen) {
            // Update encounter content based on the encounter data
            const speechElement = encounterScreen.querySelector('.nadine-speech');
            const responseElement = encounterScreen.querySelector('.steve-response');
            const victoryElement = encounterScreen.querySelector('.victory-message');
            
            if (speechElement) speechElement.textContent = encounter.nadine_speech;
            if (responseElement) responseElement.textContent = encounter.steve_response;
            if (victoryElement) victoryElement.textContent = encounter.victory_message;
        }
    }

    // Show feedback message
    showFeedbackMessage(message, type = 'info', options = {}) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `feedback-message ${type}`;
        feedback.textContent = message;
        
        // Position and show
        document.body.appendChild(feedback);
        
        // Auto-remove after duration
        const duration = options.duration || 3000;
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, duration);
    }

    // Show clues collected
    showCluesCollected(clues) {
        // Commented out distractive popup message
        // const message = `${clues.length} clue${clues.length > 1 ? 's' : ''} collected!`;
        // this.showFeedbackMessage(message, 'success');
    }

    // Show "not here" state with enhanced asset loading
    async showNotHereState(cityData) {
        if (this.elements.cityScene && cityData && this.assetLoader) {
            const imagePath = `assets/scenes/${cityData.id}_notHere.png`;

            try {
                const image = await this.assetLoader.loadImage(imagePath, 'scene', {
                    timeout: 5000,
                    showLoadingState: false,
                    retryOnFailure: true,
                    fallbackOnError: true
                });

                this.elements.cityScene.src = image.src;
                this.elements.cityScene.alt = `${cityData.name} - Not Here Scene`;

            } catch (error) {
                console.warn(`Failed to load not here scene: ${cityData.id}_notHere.png`);
                // Use fallback placeholder
                this.elements.cityScene.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vdCBIZXJlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNTUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNjY2MiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OYWRpbmUgd2FzIG5vdCBpbiB0aGlzIGNpdHk8L3RleHQ+PC9zdmc+';
            }
        } else if (this.elements.cityScene && cityData) {
    // Fallback to original method
            this.elements.cityScene.src = `assets/scenes/${cityData.id}_notHere.png`;
            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load not here scene: ${cityData.id}_notHere.png`);
                this.elements.cityScene.src = 'assets/scenes/world_map.png';
            };
        }
        
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = true;
            this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-times"></i> No Clues Here';
        }
    }

    // Show "not here" scene for incorrect guesses
    async showNotHereScene(cityData, imagePath) {
        // Switch to investigation screen to show the scene
        this.showScreen('investigation-screen');

        // Update city name
        if (this.elements.currentCityName) {
            this.elements.currentCityName.textContent = `${cityData.name}, ${cityData.country}`;
        }

        // Load and display the "not here" scene image
        if (this.elements.cityScene && this.assetLoader) {
            try {
                this.elements.cityScene.style.opacity = '0.5';

                const image = await this.assetLoader.loadImage(imagePath, 'scene', {
                    timeout: 5000,
                    showLoadingState: false,
                    retryOnFailure: true,
                    fallbackOnError: true
                });

                this.elements.cityScene.src = image.src;
                this.elements.cityScene.alt = `${cityData.name} - Not Here Scene`;
                this.elements.cityScene.style.opacity = '1';

            } catch (error) {
                console.warn(`Failed to load not here scene: ${imagePath}`);
                // Use fallback placeholder
                this.elements.cityScene.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjNDQ0Ii8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vdCBIZXJlPC90ZXh0Pjx0ZXh0IHg9IjUwJSIgeT0iNTUlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiNjY2MiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5OYWRpbmUgd2FzIG5vdCBpbiB0aGlzIGNpdHk8L3RleHQ+PC9zdmc+';
                this.elements.cityScene.style.opacity = '1';
            }
        } else if (this.elements.cityScene) {
            // Fallback to original method
            this.elements.cityScene.src = imagePath;
            this.elements.cityScene.alt = `${cityData.name} - Not Here Scene`;
            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load not here scene: ${imagePath}`);
                this.elements.cityScene.src = 'assets/scenes/world_map.png';
            };
        }

        // Disable collect clues button
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = true;
            this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-times"></i> Nadine Not Here';
        }

        // Disable travel button temporarily
        if (this.elements.travelBtn) {
            this.elements.travelBtn.disabled = true;
            this.elements.travelBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> Processing...';
        }
    }

    // Reset travel button to normal state
    resetTravelButton() {
        if (this.elements.travelBtn) {
            this.elements.travelBtn.disabled = false;
            this.elements.travelBtn.innerHTML = '<i class="fas fa-plane"></i> Travel';
        }
    }

    // Animate travel (simplified)
    animateTravel(fromCity, toCity, callback) {
        // Simple animation - just call callback after short delay
        setTimeout(() => {
            if (callback) callback();
        }, 500);
    }

    // Clear UI state for fresh session
    clearUIState() {
        // Reset progress display
        if (this.elements.citiesVisitedCount) {
            this.elements.citiesVisitedCount.textContent = '0';
        }
        
        if (this.elements.cluesCollectedCount) {
            this.elements.cluesCollectedCount.textContent = '0';
        }
        
        if (this.elements.currentCityName) {
            this.elements.currentCityName.textContent = 'Starting Location';
        }
        
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
        
        // Reset button states
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = false;
            this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-search"></i> Collect Clues';
        }

        // Reset travel button
        this.resetTravelButton();

        // Clear loading indicators
        this.loadingIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
        this.loadingIndicators.clear();

        // Clear asset loader cache if available
        if (this.assetLoader) {
            this.assetLoader.clearCache();
        }
    }

    // Handle graceful degradation for poor network conditions
    enableGracefulDegradation() {
        if (!this.networkMonitor) return;

        const networkStatus = this.networkMonitor.getNetworkStatus();

        if (networkStatus.shouldShowWarnings) {
            // Reduce image quality expectations
            if (this.assetLoader) {
                this.assetLoader.maxRetries = 1; // Reduce retries for poor connections
            }

            // Show degraded mode message
            this.showFeedbackMessage(
                'Running in reduced quality mode due to connection issues.',
                'info',
                { duration: 4000 }
            );
        }
    }

    // Get asset loading statistics for debugging
    getAssetLoadingStats() {
        const stats = {
            assetLoader: this.assetLoader ? this.assetLoader.getLoadingStats() : null,
            networkStatus: this.networkMonitor ? this.networkMonitor.getNetworkStatus() : null,
            activeLoadingIndicators: this.loadingIndicators.size
        };

        return stats;
    }

    // Cleanup method for proper resource management
    destroy() {
        // Cleanup network monitor
        if (this.networkMonitor) {
            this.networkMonitor.destroy();
        }

        // Clear loading indicators
        this.loadingIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        });
        this.loadingIndicators.clear();

        // Clear asset loader cache
        if (this.assetLoader) {
            this.assetLoader.clearCache();
        }
    }

    // Show error message
    showError(message) {
        console.error(message);
        this.showFeedbackMessage(message, 'error');
    }

    // Display informant dialogue with enhanced formatting
    displayInformantDialogue(dialogueText, informantName, dialogueType) {
        const dialogueElement = this.elements.dialogueText;

        if (!dialogueElement) {
            console.warn('Dialogue element not found in UI');
            return;
        }

        // Safety checks for parameters
        if (!dialogueText || typeof dialogueText !== 'string') {
            console.warn('displayInformantDialogue called with invalid dialogueText:', dialogueText);
            dialogueText = 'No dialogue available.';
        }

        if (!informantName || typeof informantName !== 'string') {
            console.warn('displayInformantDialogue called with invalid informantName:', informantName);
            informantName = 'Unknown Informant';
        }

        if (!dialogueType || typeof dialogueType !== 'string') {
            console.warn('displayInformantDialogue called with invalid dialogueType:', dialogueType);
            dialogueType = 'greeting';
        }

        // Clear previous dialogue
        dialogueElement.innerHTML = '';

        // Create formatted dialogue content
        const dialogueContent = document.createElement('div');
        dialogueContent.className = `dialogue-content dialogue-${dialogueType}`;

        // Add informant name header
        const nameHeader = document.createElement('div');
        nameHeader.className = 'informant-name';
        nameHeader.innerHTML = `<i class="fas fa-user-tie"></i> ${informantName}`;
        dialogueContent.appendChild(nameHeader);

        // Add dialogue text with typing effect
        const textElement = document.createElement('p');
        textElement.className = 'dialogue-text';
        dialogueContent.appendChild(textElement);

        // Add to dialogue element
        dialogueElement.appendChild(dialogueContent);

        // Animate dialogue appearance
        dialogueContent.classList.add('dialogue-fade-in');

        // Type out the dialogue text
        this.typeDialogue(textElement, dialogueText, 50);

        // No dialogue type indicator needed
    }

    // Type out dialogue text with animation
    typeDialogue(element, text, speed = 50) {
        // Safety check for undefined text
        if (!text || typeof text !== 'string') {
            console.warn('typeDialogue called with invalid text:', text);
            element.textContent = 'No dialogue available.';
            element.classList.add('dialogue-complete');
            return;
        }

        let index = 0;
        element.textContent = '';

        const typeInterval = setInterval(() => {
            if (index < text.length) {
                element.textContent += text.charAt(index);
                index++;
            } else {
                clearInterval(typeInterval);
                // Add completion animation
                element.classList.add('dialogue-complete');
            }
        }, speed);
    }


}