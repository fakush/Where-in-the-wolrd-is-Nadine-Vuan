/**
 * LanguageSelector.js - Language Selection Component
 * Provides UI component for language selection with Spanish and English options
 */

export class LanguageSelector {
    constructor(localizationManager, uiManager, sessionManager = null) {
        this.localizationManager = localizationManager;
        this.uiManager = uiManager;
        this.sessionManager = sessionManager;
        this.containerElement = null;
        this.isRendered = false;
        this.eventListeners = [];
        
        // Bind methods to maintain context
        this.render = this.render.bind(this);
        this.handleLanguageChange = this.handleLanguageChange.bind(this);
        this.updateVisualState = this.updateVisualState.bind(this);
        this.destroy = this.destroy.bind(this);
    }

    /**
     * Render the language selector UI component
     * @param {HTMLElement} containerElement - Container element to render into
     * @returns {boolean} Success status
     */
    render(containerElement) {
        if (!containerElement) {
            console.error('LanguageSelector: Container element is required');
            return false;
        }

        this.containerElement = containerElement;

        try {
            // Get available languages from localization manager
            const availableLanguages = this.localizationManager.getAvailableLanguages();
            const currentLanguage = this.localizationManager.getCurrentLanguage();

            // Create language selector container
            const selectorContainer = document.createElement('div');
            selectorContainer.className = 'language-selector';
            selectorContainer.setAttribute('role', 'group');
            selectorContainer.setAttribute('aria-label', 'Language Selection');

            // Create language selector header
            const selectorHeader = document.createElement('div');
            selectorHeader.className = 'language-selector-header';
            selectorHeader.innerHTML = `
                <i class="fas fa-globe"></i>
                <span class="selector-label" data-translate-key="ui.labels.select_language">Select Language</span>
            `;
            selectorContainer.appendChild(selectorHeader);

            // Create language options container
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'language-options';
            optionsContainer.setAttribute('role', 'radiogroup');
            optionsContainer.setAttribute('aria-label', 'Available Languages');

            // Create language option buttons
            availableLanguages.forEach((language, index) => {
                const optionButton = this.createLanguageOption(language, currentLanguage, index);
                optionsContainer.appendChild(optionButton);
            });

            selectorContainer.appendChild(optionsContainer);

            // Clear container and add selector
            containerElement.innerHTML = '';
            containerElement.appendChild(selectorContainer);

            // Update visual state
            this.updateVisualState();

            this.isRendered = true;
            console.log('LanguageSelector: Rendered successfully');
            return true;

        } catch (error) {
            console.error('LanguageSelector: Failed to render:', error);
            return false;
        }
    }

    /**
     * Create a language option button
     * @param {Object} language - Language metadata
     * @param {string} currentLanguage - Currently selected language
     * @param {number} index - Option index for accessibility
     * @returns {HTMLElement} Language option button element
     * @private
     */
    createLanguageOption(language, currentLanguage, index) {
        const isSelected = language.code === currentLanguage;

        // Create option button
        const optionButton = document.createElement('button');
        optionButton.className = `language-option ${isSelected ? 'selected' : ''}`;
        optionButton.setAttribute('type', 'button');
        optionButton.setAttribute('role', 'radio');
        optionButton.setAttribute('aria-checked', isSelected.toString());
        optionButton.setAttribute('data-language-code', language.code);
        optionButton.setAttribute('tabindex', isSelected ? '0' : '-1');

        // Create option content
        const flagIcon = language.metadata?.flag || '🌐';
        const languageName = language.name || language.code.toUpperCase();
        const nativeName = language.metadata?.nativeName || languageName;

        optionButton.innerHTML = `
            <div class="language-flag">${flagIcon}</div>
            <div class="language-info">
                <div class="language-name">${languageName}</div>
                <div class="language-native">${nativeName}</div>
            </div>
            <div class="selection-indicator">
                <i class="fas fa-check-circle"></i>
            </div>
        `;

        // Add click event listener
        const clickHandler = (event) => {
            event.preventDefault();
            this.handleLanguageChange(language.code);
        };
        optionButton.addEventListener('click', clickHandler);

        // Add keyboard event listener
        const keyHandler = (event) => {
            switch (event.key) {
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.handleLanguageChange(language.code);
                    break;
                case 'ArrowDown':
                case 'ArrowRight':
                    event.preventDefault();
                    this.focusNextOption(optionButton);
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    event.preventDefault();
                    this.focusPreviousOption(optionButton);
                    break;
            }
        };
        optionButton.addEventListener('keydown', keyHandler);

        // Store event listeners for cleanup
        this.eventListeners.push({
            element: optionButton,
            type: 'click',
            handler: clickHandler
        });
        this.eventListeners.push({
            element: optionButton,
            type: 'keydown',
            handler: keyHandler
        });

        return optionButton;
    }

    /**
     * Handle language selection change
     * @param {string} languageCode - Selected language code
     */
    async handleLanguageChange(languageCode) {
        if (!languageCode) {
            console.warn('LanguageSelector: Invalid language code provided');
            return;
        }

        const currentLanguage = this.localizationManager.getCurrentLanguage();
        
        // Don't process if already selected
        if (languageCode === currentLanguage) {
            console.log(`LanguageSelector: Language ${languageCode} already selected`);
            return;
        }

        try {
            // Show loading state
            this.showLoadingState(languageCode);

            // Set language through localization manager
            const success = await this.localizationManager.setLanguage(languageCode);

            if (success) {
                // Update visual state
                this.updateVisualState();

                // Notify UI manager of language change for UI updates
                if (this.uiManager && this.uiManager.gameController && this.uiManager.gameController.translationService) {
                    // Trigger UI translation update
                    this.uiManager.gameController.translationService.translateAll(document);
                    
                    // Notify translation observers
                    this.uiManager.gameController.translationService.notifyLanguageChange(languageCode, currentLanguage);
                }

                // Store language preference
                this.storeLanguagePreference(languageCode);

                // Show success feedback
                this.showLanguageChangeSuccess(languageCode);

                console.log(`LanguageSelector: Successfully changed language to ${languageCode}`);

            } else {
                throw new Error(`Failed to set language to ${languageCode}`);
            }

        } catch (error) {
            console.error('LanguageSelector: Language change failed:', error);
            
            // Show error feedback
            this.showLanguageChangeError(languageCode, error.message);
            
            // Revert visual state
            this.updateVisualState();
        } finally {
            // Hide loading state
            this.hideLoadingState();
        }
    }

    /**
     * Update visual state to reflect current language selection
     */
    updateVisualState() {
        if (!this.isRendered || !this.containerElement) {
            return;
        }

        const currentLanguage = this.localizationManager.getCurrentLanguage();
        const languageOptions = this.containerElement.querySelectorAll('.language-option');

        languageOptions.forEach(option => {
            const languageCode = option.getAttribute('data-language-code');
            const isSelected = languageCode === currentLanguage;

            // Update selection state
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-checked', isSelected.toString());
            option.setAttribute('tabindex', isSelected ? '0' : '-1');

            // Update visual indicators
            const indicator = option.querySelector('.selection-indicator');
            if (indicator) {
                indicator.style.opacity = isSelected ? '1' : '0';
            }
        });

        // Update focus management
        const selectedOption = this.containerElement.querySelector('.language-option.selected');
        if (selectedOption && document.activeElement && 
            document.activeElement.classList.contains('language-option')) {
            selectedOption.focus();
        }
    }

    /**
     * Show loading state for language change
     * @param {string} languageCode - Language being loaded
     * @private
     */
    showLoadingState(languageCode) {
        if (!this.containerElement) return;

        const targetOption = this.containerElement.querySelector(`[data-language-code="${languageCode}"]`);
        if (targetOption) {
            targetOption.classList.add('loading');
            targetOption.disabled = true;

            // Add loading spinner
            const indicator = targetOption.querySelector('.selection-indicator');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            }
        }

        // Disable all options during loading
        const allOptions = this.containerElement.querySelectorAll('.language-option');
        allOptions.forEach(option => {
            option.disabled = true;
        });
    }

    /**
     * Hide loading state
     * @private
     */
    hideLoadingState() {
        if (!this.containerElement) return;

        const allOptions = this.containerElement.querySelectorAll('.language-option');
        allOptions.forEach(option => {
            option.classList.remove('loading');
            option.disabled = false;

            // Restore selection indicator
            const indicator = option.querySelector('.selection-indicator');
            if (indicator) {
                indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
            }
        });
    }

    /**
     * Show success feedback for language change
     * @param {string} languageCode - Successfully changed language
     * @private
     */
    showLanguageChangeSuccess(languageCode) {
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
     * @private
     */
    showLanguageChangeError(languageCode, errorMessage) {
        if (this.uiManager && this.uiManager.showFeedbackMessage) {
            this.uiManager.showFeedbackMessage(
                `Failed to change language: ${errorMessage}`,
                'error',
                { duration: 4000, icon: 'fas fa-exclamation-triangle' }
            );
        }
    }

    /**
     * Store language preference in session/local storage
     * @param {string} languageCode - Language code to store
     * @private
     */
    storeLanguagePreference(languageCode) {
        try {
            // Use SessionManager if available for consistent preference handling
            if (this.sessionManager) {
                this.sessionManager.storeLanguagePreference(languageCode);
            } else {
                // Fallback to direct storage if SessionManager not available
                const languageConfig = this.localizationManager.getLanguageConfig();
                const storageKey = languageConfig.getLanguagePreferenceKey();
                
                // Store in both session and local storage for persistence
                if (typeof sessionStorage !== 'undefined') {
                    sessionStorage.setItem(storageKey, languageCode);
                }
                
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(storageKey, languageCode);
                }
            }

            console.log(`LanguageSelector: Stored language preference: ${languageCode}`);

        } catch (error) {
            console.warn('LanguageSelector: Failed to store language preference:', error);
        }
    }

    /**
     * Focus next language option (keyboard navigation)
     * @param {HTMLElement} currentOption - Currently focused option
     * @private
     */
    focusNextOption(currentOption) {
        const allOptions = Array.from(this.containerElement.querySelectorAll('.language-option'));
        const currentIndex = allOptions.indexOf(currentOption);
        const nextIndex = (currentIndex + 1) % allOptions.length;
        
        allOptions[nextIndex].focus();
    }

    /**
     * Focus previous language option (keyboard navigation)
     * @param {HTMLElement} currentOption - Currently focused option
     * @private
     */
    focusPreviousOption(currentOption) {
        const allOptions = Array.from(this.containerElement.querySelectorAll('.language-option'));
        const currentIndex = allOptions.indexOf(currentOption);
        const previousIndex = currentIndex === 0 ? allOptions.length - 1 : currentIndex - 1;
        
        allOptions[previousIndex].focus();
    }

    /**
     * Get current language selection
     * @returns {string} Current language code
     */
    getCurrentSelection() {
        return this.localizationManager.getCurrentLanguage();
    }

    /**
     * Set language selection programmatically
     * @param {string} languageCode - Language code to select
     * @returns {Promise<boolean>} Success status
     */
    async setSelection(languageCode) {
        return await this.handleLanguageChange(languageCode);
    }

    /**
     * Check if the selector is currently rendered
     * @returns {boolean} Render status
     */
    isCurrentlyRendered() {
        return this.isRendered && this.containerElement !== null;
    }

    /**
     * Get available language options
     * @returns {Array} Available language options
     */
    getAvailableLanguages() {
        return this.localizationManager.getAvailableLanguages();
    }

    /**
     * Refresh the selector (re-render with current state)
     */
    refresh() {
        if (this.isRendered && this.containerElement) {
            this.render(this.containerElement);
        }
    }

    /**
     * Destroy the language selector and clean up resources
     */
    destroy() {
        // Remove event listeners
        this.eventListeners.forEach(({ element, type, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(type, handler);
            }
        });
        this.eventListeners = [];

        // Clear container
        if (this.containerElement) {
            this.containerElement.innerHTML = '';
            this.containerElement = null;
        }

        // Reset state
        this.isRendered = false;

        console.log('LanguageSelector: Destroyed successfully');
    }
}