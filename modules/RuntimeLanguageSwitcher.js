/**
 * RuntimeLanguageSwitcher.js - Runtime Language Switching Component
 * Provides settings menu with language switching capability during gameplay
 */

export class RuntimeLanguageSwitcher {
    constructor(localizationManager, uiManager, sessionManager = null) {
        this.localizationManager = localizationManager;
        this.uiManager = uiManager;
        this.sessionManager = sessionManager;
        
        this.settingsButton = null;
        this.settingsDropdown = null;
        this.languageSelectorContainer = null;
        this.isDropdownOpen = false;
        this.eventListeners = [];
        
        // Bind methods to maintain context
        this.init = this.init.bind(this);
        this.toggleSettingsMenu = this.toggleSettingsMenu.bind(this);
        this.handleLanguageChange = this.handleLanguageChange.bind(this);
        this.closeSettingsMenu = this.closeSettingsMenu.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
    }

    /**
     * Initialize the runtime language switcher
     */
    init() {
        try {
            // Find DOM elements
            this.settingsButton = document.getElementById('settings-menu-btn');
            this.settingsDropdown = document.getElementById('settings-dropdown');
            this.languageSelectorContainer = document.getElementById('runtime-language-selector');

            if (!this.settingsButton || !this.settingsDropdown || !this.languageSelectorContainer) {
                console.warn('RuntimeLanguageSwitcher: Required DOM elements not found');
                return false;
            }

            // Set up event listeners
            this.setupEventListeners();

            // Render language options
            this.renderLanguageOptions();

            console.log('RuntimeLanguageSwitcher: Initialized successfully');
            return true;

        } catch (error) {
            console.error('RuntimeLanguageSwitcher: Failed to initialize:', error);
            return false;
        }
    }

    /**
     * Set up event listeners for the settings menu
     */
    setupEventListeners() {
        // Settings button click
        const settingsClickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.toggleSettingsMenu();
        };
        this.settingsButton.addEventListener('click', settingsClickHandler);
        this.eventListeners.push({
            element: this.settingsButton,
            type: 'click',
            handler: settingsClickHandler
        });

        // Outside click to close menu
        const outsideClickHandler = (event) => {
            this.handleOutsideClick(event);
        };
        document.addEventListener('click', outsideClickHandler);
        this.eventListeners.push({
            element: document,
            type: 'click',
            handler: outsideClickHandler
        });

        // Escape key to close menu
        const keyHandler = (event) => {
            if (event.key === 'Escape' && this.isDropdownOpen) {
                this.closeSettingsMenu();
            }
        };
        document.addEventListener('keydown', keyHandler);
        this.eventListeners.push({
            element: document,
            type: 'keydown',
            handler: keyHandler
        });
    }

    /**
     * Render language options in the settings menu
     */
    renderLanguageOptions() {
        if (!this.languageSelectorContainer) return;

        try {
            // Get available languages
            const availableLanguages = this.localizationManager.getAvailableLanguages();
            const currentLanguage = this.localizationManager.getCurrentLanguage();

            // Clear existing options
            this.languageSelectorContainer.innerHTML = '';

            // Create language options
            availableLanguages.forEach((language) => {
                const optionElement = this.createLanguageOption(language, currentLanguage);
                this.languageSelectorContainer.appendChild(optionElement);
            });

            console.log('RuntimeLanguageSwitcher: Language options rendered');

        } catch (error) {
            console.error('RuntimeLanguageSwitcher: Failed to render language options:', error);
        }
    }

    /**
     * Create a language option element
     * @param {Object} language - Language metadata
     * @param {string} currentLanguage - Currently selected language
     * @returns {HTMLElement} Language option element
     */
    createLanguageOption(language, currentLanguage) {
        const isSelected = language.code === currentLanguage;

        // Create option element
        const optionElement = document.createElement('button');
        optionElement.className = `runtime-language-option ${isSelected ? 'selected' : ''}`;
        optionElement.setAttribute('type', 'button');
        optionElement.setAttribute('data-language-code', language.code);

        // Create option content
        const flagIcon = language.metadata?.flag || '🌐';
        const languageName = language.name || language.code.toUpperCase();
        const nativeName = language.metadata?.nativeName || languageName;

        optionElement.innerHTML = `
            <div class="language-flag">${flagIcon}</div>
            <div class="language-info">
                <div class="language-name">${languageName}</div>
                <div class="language-native">${nativeName}</div>
            </div>
        `;

        // Add click event listener
        const clickHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.handleLanguageChange(language.code);
        };
        optionElement.addEventListener('click', clickHandler);

        // Store event listener for cleanup
        this.eventListeners.push({
            element: optionElement,
            type: 'click',
            handler: clickHandler
        });

        return optionElement;
    }

    /**
     * Toggle the settings menu open/closed
     */
    toggleSettingsMenu() {
        if (this.isDropdownOpen) {
            this.closeSettingsMenu();
        } else {
            this.openSettingsMenu();
        }
    }

    /**
     * Open the settings menu
     */
    openSettingsMenu() {
        if (!this.settingsDropdown) return;

        this.settingsDropdown.style.display = 'block';
        this.isDropdownOpen = true;

        // Update button state
        this.settingsButton.classList.add('active');

        // Focus management for accessibility
        const firstOption = this.settingsDropdown.querySelector('.runtime-language-option');
        if (firstOption) {
            firstOption.focus();
        }

        console.log('RuntimeLanguageSwitcher: Settings menu opened');
    }

    /**
     * Close the settings menu
     */
    closeSettingsMenu() {
        if (!this.settingsDropdown) return;

        this.settingsDropdown.style.display = 'none';
        this.isDropdownOpen = false;

        // Update button state
        this.settingsButton.classList.remove('active');

        console.log('RuntimeLanguageSwitcher: Settings menu closed');
    }

    /**
     * Handle clicks outside the settings menu to close it
     * @param {Event} event - Click event
     */
    handleOutsideClick(event) {
        if (!this.isDropdownOpen) return;

        const settingsContainer = this.settingsButton.closest('.settings-menu-container');
        if (settingsContainer && !settingsContainer.contains(event.target)) {
            this.closeSettingsMenu();
        }
    }

    /**
     * Handle language change selection
     * @param {string} languageCode - Selected language code
     */
    async handleLanguageChange(languageCode) {
        if (!languageCode) {
            console.warn('RuntimeLanguageSwitcher: Invalid language code provided');
            return;
        }

        const currentLanguage = this.localizationManager.getCurrentLanguage();
        
        // Don't process if already selected
        if (languageCode === currentLanguage) {
            console.log(`RuntimeLanguageSwitcher: Language ${languageCode} already selected`);
            this.closeSettingsMenu();
            return;
        }

        try {
            // Show loading state
            this.showLanguageChangeLoading(languageCode);

            // Preserve current game state and screen context
            const currentScreen = this.getCurrentScreen();
            const gameState = this.preserveGameState();

            // Change language through localization manager
            const success = await this.localizationManager.setLanguage(languageCode);

            if (success) {
                // Update language options to reflect new selection
                this.updateLanguageOptionStates(languageCode);

                // Trigger immediate UI updates
                await this.updateAllUIElements();

                // Restore screen context
                this.restoreScreenContext(currentScreen, gameState);

                // Store language preference
                this.storeLanguagePreference(languageCode);

                // Show success feedback
                this.showLanguageChangeSuccess(languageCode);

                // Close settings menu
                this.closeSettingsMenu();

                console.log(`RuntimeLanguageSwitcher: Successfully changed language to ${languageCode}`);

            } else {
                throw new Error(`Failed to set language to ${languageCode}`);
            }

        } catch (error) {
            console.error('RuntimeLanguageSwitcher: Language change failed:', error);
            
            // Show error feedback
            this.showLanguageChangeError(languageCode, error.message);
            
            // Revert loading state
            this.hideLanguageChangeLoading();
        }
    }

    /**
     * Show loading state during language change
     * @param {string} languageCode - Language being loaded
     */
    showLanguageChangeLoading(languageCode) {
        try {
            // Show loading overlay
            const overlay = document.createElement('div');
            overlay.id = 'language-change-overlay';
            overlay.className = 'language-change-overlay';
            overlay.innerHTML = `
                <div class="language-change-message">
                    <div class="language-change-spinner"></div>
                    <div>Switching language...</div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Update option state
            if (this.languageSelectorContainer) {
                const targetOption = this.languageSelectorContainer.querySelector(`[data-language-code="${languageCode}"]`);
                if (targetOption) {
                    targetOption.classList.add('loading');
                }

                // Disable all options during loading
                const allOptions = this.languageSelectorContainer.querySelectorAll('.runtime-language-option');
                allOptions.forEach(option => {
                    option.disabled = true;
                });
            }
        } catch (error) {
            console.warn('RuntimeLanguageSwitcher: Failed to show loading state:', error);
        }
    }

    /**
     * Hide language change loading state
     */
    hideLanguageChangeLoading() {
        try {
            // Remove loading overlay
            const overlay = document.getElementById('language-change-overlay');
            if (overlay) {
                if (overlay.remove) {
                    overlay.remove();
                } else if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
            }

            // Remove loading states from options
            if (this.languageSelectorContainer) {
                const allOptions = this.languageSelectorContainer.querySelectorAll('.runtime-language-option');
                allOptions.forEach(option => {
                    option.classList.remove('loading');
                    option.disabled = false;
                });
            }
        } catch (error) {
            console.warn('RuntimeLanguageSwitcher: Failed to hide loading state:', error);
        }
    }

    /**
     * Update language option states to reflect current selection
     * @param {string} selectedLanguageCode - Currently selected language
     */
    updateLanguageOptionStates(selectedLanguageCode) {
        try {
            if (this.languageSelectorContainer) {
                const allOptions = this.languageSelectorContainer.querySelectorAll('.runtime-language-option');

                allOptions.forEach(option => {
                    const languageCode = option.getAttribute('data-language-code');
                    const isSelected = languageCode === selectedLanguageCode;

                    option.classList.toggle('selected', isSelected);
                });
            }
        } catch (error) {
            console.warn('RuntimeLanguageSwitcher: Failed to update language option states:', error);
        }
    }

    /**
     * Get current screen information
     * @returns {Object} Current screen context
     */
    getCurrentScreen() {
        try {
            const activeScreen = document.querySelector('.game-screen.active');
            return {
                screenId: activeScreen ? activeScreen.id : null,
                scrollPosition: typeof window !== 'undefined' ? window.scrollY : 0
            };
        } catch (error) {
            // Handle Node.js environment or DOM errors
            return {
                screenId: null,
                scrollPosition: 0
            };
        }
    }

    /**
     * Preserve current game state during language change
     * @returns {Object} Preserved game state
     */
    preserveGameState() {
        if (!this.uiManager || !this.uiManager.gameController) {
            return {};
        }

        const gameController = this.uiManager.gameController;
        
        return {
            currentCity: gameController.gameState?.currentCity,
            phase: gameController.gameState?.phase,
            visitedCities: [...(gameController.gameState?.visitedCities || [])],
            collectedClues: [...(gameController.gameState?.collectedClues || [])],
            gameStats: { ...(gameController.gameState?.gameStats || {}) }
        };
    }

    /**
     * Update all UI elements with new language
     */
    async updateAllUIElements() {
        try {
            // Update all translatable elements
            if (this.uiManager.gameController.translationService) {
                this.uiManager.gameController.translationService.translateAll(document);
            }

            // Update dynamic content
            if (this.uiManager.updateAllTranslatableElements) {
                this.uiManager.updateAllTranslatableElements();
            }

            // Update progress display
            if (this.uiManager.gameController.updateProgressDisplay) {
                this.uiManager.gameController.updateProgressDisplay();
            }

            // Update current screen content
            if (this.uiManager.gameController.gameState?.currentCity) {
                await this.uiManager.updateInvestigationScreen(this.uiManager.gameController.gameState.currentCity);
            }

            console.log('RuntimeLanguageSwitcher: All UI elements updated');

        } catch (error) {
            console.error('RuntimeLanguageSwitcher: Failed to update UI elements:', error);
        }
    }

    /**
     * Restore screen context after language change
     * @param {Object} screenContext - Previous screen context
     * @param {Object} gameState - Preserved game state
     */
    restoreScreenContext(screenContext, gameState) {
        try {
            // Restore active screen
            if (screenContext.screenId) {
                const targetScreen = document.getElementById(screenContext.screenId);
                if (targetScreen) {
                    // Hide all screens
                    document.querySelectorAll('.game-screen').forEach(screen => {
                        screen.classList.remove('active');
                    });
                    
                    // Show target screen
                    targetScreen.classList.add('active');
                }
            }

            // Restore scroll position
            if (screenContext.scrollPosition && typeof window !== 'undefined') {
                window.scrollTo(0, screenContext.scrollPosition);
            }

            console.log('RuntimeLanguageSwitcher: Screen context restored');

        } catch (error) {
            console.error('RuntimeLanguageSwitcher: Failed to restore screen context:', error);
        }
    }

    /**
     * Store language preference
     * @param {string} languageCode - Language code to store
     */
    storeLanguagePreference(languageCode) {
        try {
            if (this.sessionManager) {
                this.sessionManager.storeLanguagePreference(languageCode);
            } else {
                // Fallback to direct storage
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('nadine_game_language_preference', languageCode);
                }
            }

            console.log(`RuntimeLanguageSwitcher: Stored language preference: ${languageCode}`);

        } catch (error) {
            console.warn('RuntimeLanguageSwitcher: Failed to store language preference:', error);
        }
    }

    /**
     * Show success feedback for language change
     * @param {string} languageCode - Successfully changed language
     */
    showLanguageChangeSuccess(languageCode) {
        this.hideLanguageChangeLoading();

        const languageConfig = this.localizationManager.getLanguageConfig();
        const languageName = languageConfig.getLanguageName(languageCode);

        if (this.uiManager && this.uiManager.showFeedbackMessage) {
            this.uiManager.showFeedbackMessage(
                `Language changed to ${languageName}`,
                'success',
                { duration: 2000, icon: 'fas fa-check-circle' }
            );
        }
    }

    /**
     * Show error feedback for language change
     * @param {string} languageCode - Failed language code
     * @param {string} errorMessage - Error message
     */
    showLanguageChangeError(languageCode, errorMessage) {
        this.hideLanguageChangeLoading();

        if (this.uiManager && this.uiManager.showFeedbackMessage) {
            this.uiManager.showFeedbackMessage(
                `Failed to change language: ${errorMessage}`,
                'error',
                { duration: 4000, icon: 'fas fa-exclamation-triangle' }
            );
        }
    }

    /**
     * Refresh the language options (useful after language data changes)
     */
    refresh() {
        this.renderLanguageOptions();
    }

    /**
     * Check if the settings menu is currently open
     * @returns {boolean} True if open, false otherwise
     */
    isMenuOpen() {
        return this.isDropdownOpen;
    }

    /**
     * Destroy the runtime language switcher and clean up resources
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, type, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(type, handler);
            }
        });
        this.eventListeners = [];

        // Close menu if open
        if (this.isDropdownOpen) {
            this.closeSettingsMenu();
        }

        // Remove loading overlay if present
        this.hideLanguageChangeLoading();

        console.log('RuntimeLanguageSwitcher: Destroyed successfully');
    }
}