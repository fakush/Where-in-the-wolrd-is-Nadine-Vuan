/**
 * FailureHandler.js - Failure Detection and Game Over Logic
 * Handles all failure conditions and game over scenarios
 */

export class FailureHandler {
    constructor(gameState) {
        this.gameState = gameState;
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
}