/**
 * game_modular.js - Modular Game Entry Point
 * Main entry point for the modular "Where in the World is Nadine Vuan?" game
 */

import { GameController } from './modules/GameController.js';

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const gameController = new GameController();
    gameController.init().catch(error => {
        console.error('Failed to start game:', error);
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4757;
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
            <h3 data-translate-key="ui.messages.game_loading_error">🚫 Game Loading Error</h3>
            <p data-translate-key="ui.messages.game_loading_error_text">Failed to initialize the game. Please refresh the page and try again.</p>
            <p><small>Error: ${error.message}</small></p>
            <button onclick="location.reload()" style="
                background: white;
                color: #ff4757;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            " data-translate-key="ui.buttons.refresh_page">Refresh Page</button>
        `;
        document.body.appendChild(errorDiv);
    });
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GameController };
}