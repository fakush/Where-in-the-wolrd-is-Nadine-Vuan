/**
 * UIState.js - UI State Management
 * Handles UI-specific state and interactions
 */

export class UIState {
    constructor() {
        this.activeScreen = 'intro-screen';
        this.isAnimating = false;
        this.selectedCity = null;
        this.showingClues = false;
        this.modalOpen = false;
    }
}