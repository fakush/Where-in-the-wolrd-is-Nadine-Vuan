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
            { path: '../assets/scenes/portada_juego.png', type: 'cover' },
            { path: '../assets/scenes/steve.png', type: 'character' },
            { path: '../assets/scenes/world_map.png', type: 'map' }
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
            const imagePath = `../assets/scenes/${cityId}_${sceneType}.png`;

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
            this.elements.cityScene.src = `../assets/scenes/${cityId}_${sceneType}.png`;
            this.elements.cityScene.alt = `${cityData.name} Scene`;

            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load scene image: ${cityId}_${sceneType}.png`);
                this.elements.cityScene.src = '../assets/scenes/world_map.png';
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
        
        if (availableCities.length === 0) {
            this.elements.cityMarkers.innerHTML = '<p class="no-cities-message">🚫 No more cities available to visit.</p>';
            return;
        }

        // Add city selection buttons
        availableCities.forEach((city) => {
            const cityButton = document.createElement('button');
            cityButton.textContent = `${city.name}, ${city.country}`;
            cityButton.className = 'city-marker-button';
            cityButton.addEventListener('click', () => {
                this.gameController.processPlayerAction('select-destination', { cityId: city.id });
            });
            
            this.elements.cityMarkers.appendChild(cityButton);
        });
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
        if (this.elements.citiesVisitedCount) {
            this.elements.citiesVisitedCount.textContent = stats.citiesVisited || 0;
        }
        
        if (this.elements.cluesCollectedCount) {
            this.elements.cluesCollectedCount.textContent = stats.cluesCollected || 0;
        }
    }

    // Show game over screen
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
        const message = `${clues.length} clue${clues.length > 1 ? 's' : ''} collected!`;
        this.showFeedbackMessage(message, 'success');
    }

    // Show "not here" state with enhanced asset loading
    async showNotHereState(cityData) {
        if (this.elements.cityScene && cityData && this.assetLoader) {
            const imagePath = `../assets/scenes/${cityData.id}_notHere.png`;

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
            this.elements.cityScene.src = `../assets/scenes/${cityData.id}_notHere.png`;
            this.elements.cityScene.onerror = () => {
                console.warn(`Failed to load not here scene: ${cityData.id}_notHere.png`);
                this.elements.cityScene.src = '../assets/scenes/world_map.png';
            };
        }
        
        if (this.elements.collectCluesBtn) {
            this.elements.collectCluesBtn.disabled = true;
            this.elements.collectCluesBtn.innerHTML = '<i class="fas fa-times"></i> No Clues Here';
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
}