/**
 * RandomizationSystem.js - Fair Randomization and Balance System
 * Handles all randomization with fairness guarantees and validation
 */

export class RandomizationSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.randomSeed = null;
        this.selectionHistory = {
            startingCities: [],
            clueSelections: new Map(),
            difficultyDistribution: { easy: 0, medium: 0, difficult: 0 }
        };
    }

    // Initialize randomization system with optional seed
    initialize(seed = null) {
        if (seed !== null) {
            this.randomSeed = seed;
        } else {
            this.randomSeed = Date.now() + Math.random();
        }
        
        // Reset selection history for new session
        this.resetSelectionHistory();
        
        console.log('RandomizationSystem initialized with seed:', this.randomSeed);
    }

    // Reset selection history for fresh randomization
    resetSelectionHistory() {
        this.selectionHistory = {
            startingCities: [],
            clueSelections: new Map(),
            difficultyDistribution: { easy: 0, medium: 0, difficult: 0 }
        };
    }

    // Generate seeded random number (0-1) for consistent randomization
    seededRandom() {
        // Simple linear congruential generator for consistent randomization
        this.randomSeed = (this.randomSeed * 9301 + 49297) % 233280;
        return this.randomSeed / 233280;
    }

    // Get random number using either seeded or native Math.random
    getRandom() {
        return this.randomSeed !== null ? this.seededRandom() : Math.random();
    }

    // Fair random starting city selection with validation
    selectRandomStartingCity(cities) {
        if (!cities || !Array.isArray(cities) || cities.length === 0) {
            console.error('Invalid cities array provided for starting city selection');
            return null;
        }

        // Filter out final cities (Buenos Aires)
        const availableStartingCities = cities.filter(city => !city.is_final);
        
        if (availableStartingCities.length === 0) {
            console.error('No valid starting cities available');
            return null;
        }

        // Ensure fair distribution by avoiding recently selected cities
        const eligibleCities = this.getEligibleStartingCities(availableStartingCities);
        
        // Select random city from eligible cities
        const randomIndex = Math.floor(this.getRandom() * eligibleCities.length);
        const selectedCity = eligibleCities[randomIndex];
        
        // Record selection for fairness tracking
        this.recordStartingCitySelection(selectedCity);
        
        // Validate selection
        const validationResult = this.validateStartingCitySelection(selectedCity, cities);
        if (!validationResult.isValid) {
            console.error('Starting city selection validation failed:', validationResult.errors);
            return null;
        }
        
        console.log(`Fair starting city selected: ${selectedCity.name} (${selectedCity.id})`);
        return selectedCity;
    }

    // Get eligible starting cities with fairness considerations
    getEligibleStartingCities(availableStartingCities) {
        // If we haven't selected many cities yet, all are eligible
        if (this.selectionHistory.startingCities.length < 3) {
            return availableStartingCities;
        }
        
        // Filter out recently selected cities to ensure variety
        const recentSelections = this.selectionHistory.startingCities.slice(-3);
        const eligibleCities = availableStartingCities.filter(city => 
            !recentSelections.includes(city.id)
        );
        
        // If all cities have been recently selected, reset and use all
        return eligibleCities.length > 0 ? eligibleCities : availableStartingCities;
    }

    // Record starting city selection for fairness tracking
    recordStartingCitySelection(selectedCity) {
        this.selectionHistory.startingCities.push(selectedCity.id);
        
        // Keep only last 10 selections to prevent memory bloat
        if (this.selectionHistory.startingCities.length > 10) {
            this.selectionHistory.startingCities = this.selectionHistory.startingCities.slice(-10);
        }
    }

    // Validate starting city selection
    validateStartingCitySelection(selectedCity, allCities) {
        const errors = [];
        
        if (!selectedCity) {
            errors.push('Selected city is null or undefined');
        } else {
            if (!selectedCity.id || typeof selectedCity.id !== 'string') {
                errors.push('Selected city missing valid ID');
            }
            
            if (!selectedCity.name || typeof selectedCity.name !== 'string') {
                errors.push('Selected city missing valid name');
            }
            
            if (selectedCity.is_final === true) {
                errors.push('Selected city is marked as final destination');
            }
            
            // Verify city exists in the provided cities array
            const cityExists = allCities.some(city => city.id === selectedCity.id);
            if (!cityExists) {
                errors.push('Selected city not found in cities array');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Fair clue randomization across difficulty tiers
    selectRandomClues(cityClues, options = {}) {
        const {
            maxCluesPerDifficulty = 1,
            ensureFairDistribution = true,
            specificDifficulty = null,
            includeAllDifficulties = true
        } = options;

        if (!cityClues || typeof cityClues !== 'object') {
            console.error('Invalid city clues provided for randomization');
            return [];
        }

        const selectedClues = [];
        const difficulties = specificDifficulty ? 
            [specificDifficulty] : 
            ['easy', 'medium', 'difficult'];

        difficulties.forEach(difficulty => {
            if (!cityClues[difficulty] || !Array.isArray(cityClues[difficulty]) || cityClues[difficulty].length === 0) {
                console.warn(`No ${difficulty} clues available for selection`);
                return;
            }

            // Apply fairness logic for difficulty distribution
            if (ensureFairDistribution && !specificDifficulty) {
                const shouldIncludeDifficulty = this.shouldIncludeDifficulty(difficulty, includeAllDifficulties);
                if (!shouldIncludeDifficulty) {
                    return;
                }
            }

            // Select clues from this difficulty tier
            const cluesFromDifficulty = this.selectCluesFromDifficulty(
                cityClues[difficulty], 
                difficulty, 
                maxCluesPerDifficulty
            );
            
            selectedClues.push(...cluesFromDifficulty);
        });

        // Validate selected clues
        const validationResult = this.validateClueSelection(selectedClues, cityClues);
        if (!validationResult.isValid) {
            console.error('Clue selection validation failed:', validationResult.errors);
            return [];
        }

        console.log(`Fair clue selection completed: ${selectedClues.length} clues selected`);
        return selectedClues;
    }

    // Determine if a difficulty should be included based on fair distribution
    shouldIncludeDifficulty(difficulty, includeAllDifficulties) {
        if (includeAllDifficulties) {
            return true;
        }

        // Check current distribution balance
        const totalSelections = Object.values(this.selectionHistory.difficultyDistribution).reduce((a, b) => a + b, 0);
        
        if (totalSelections === 0) {
            return true; // First selection, include all
        }

        const currentCount = this.selectionHistory.difficultyDistribution[difficulty];
        const averageCount = totalSelections / 3;
        
        // Include difficulty if it's underrepresented
        if (currentCount < averageCount) {
            return true;
        }

        // Random chance to include even if not underrepresented (30% chance)
        return this.getRandom() < 0.3;
    }

    // Select clues from a specific difficulty tier
    selectCluesFromDifficulty(availableClues, difficulty, maxClues) {
        const selectedClues = [];
        const cluesCopy = [...availableClues];
        const numToSelect = Math.min(maxClues, cluesCopy.length);

        for (let i = 0; i < numToSelect; i++) {
            const randomIndex = Math.floor(this.getRandom() * cluesCopy.length);
            const selectedClue = cluesCopy.splice(randomIndex, 1)[0];
            
            selectedClues.push({
                text: selectedClue,
                difficulty: difficulty,
                selectionIndex: randomIndex,
                totalAvailable: availableClues.length
            });

            // Record difficulty selection for fairness tracking
            this.selectionHistory.difficultyDistribution[difficulty]++;
        }

        return selectedClues;
    }

    // Validate clue selection results
    validateClueSelection(selectedClues, originalClues) {
        const errors = [];

        if (!Array.isArray(selectedClues)) {
            errors.push('Selected clues must be an array');
            return { isValid: false, errors: errors };
        }

        selectedClues.forEach((clue, index) => {
            if (!clue || typeof clue !== 'object') {
                errors.push(`Clue at index ${index} is not a valid object`);
                return;
            }

            if (!clue.text || typeof clue.text !== 'string') {
                errors.push(`Clue at index ${index} missing valid text`);
            }

            if (!clue.difficulty || !['easy', 'medium', 'difficult'].includes(clue.difficulty)) {
                errors.push(`Clue at index ${index} has invalid difficulty`);
            }

            // Verify clue exists in original clues
            if (clue.difficulty && originalClues[clue.difficulty]) {
                const clueExists = originalClues[clue.difficulty].includes(clue.text);
                if (!clueExists) {
                    errors.push(`Clue at index ${index} not found in original ${clue.difficulty} clues`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Balanced random selection algorithm for general use
    balancedRandomSelection(items, count = 1, options = {}) {
        const {
            avoidRecentSelections = true,
            ensureUniqueness = true,
            weightingFunction = null
        } = options;

        if (!Array.isArray(items) || items.length === 0) {
            console.error('Invalid items array for balanced selection');
            return [];
        }

        if (count <= 0 || count > items.length) {
            console.warn(`Invalid count ${count} for selection from ${items.length} items`);
            count = Math.min(Math.max(1, count), items.length);
        }

        let eligibleItems = [...items];

        // Apply weighting if provided
        if (weightingFunction && typeof weightingFunction === 'function') {
            eligibleItems = this.applyWeighting(eligibleItems, weightingFunction);
        }

        const selectedItems = [];
        
        for (let i = 0; i < count; i++) {
            if (eligibleItems.length === 0) {
                break;
            }

            const randomIndex = Math.floor(this.getRandom() * eligibleItems.length);
            const selectedItem = eligibleItems[randomIndex];
            
            selectedItems.push(selectedItem);

            // Remove selected item if uniqueness is required
            if (ensureUniqueness) {
                eligibleItems.splice(randomIndex, 1);
            }
        }

        return selectedItems;
    }

    // Apply weighting function to items for biased selection
    applyWeighting(items, weightingFunction) {
        const weightedItems = [];
        
        items.forEach(item => {
            const weight = weightingFunction(item);
            const normalizedWeight = Math.max(1, Math.floor(weight * 10)); // Ensure minimum weight of 1
            
            // Add item multiple times based on weight
            for (let i = 0; i < normalizedWeight; i++) {
                weightedItems.push(item);
            }
        });
        
        return weightedItems;
    }

    // Test randomization fairness over multiple iterations
    testRandomizationFairness(testFunction, iterations = 100) {
        const results = {
            totalIterations: iterations,
            distributions: {},
            fairnessScore: 0,
            isBalanced: false,
            details: []
        };

        console.log(`Testing randomization fairness over ${iterations} iterations...`);

        for (let i = 0; i < iterations; i++) {
            try {
                const result = testFunction();
                
                // Track result distribution
                const resultKey = this.getResultKey(result);
                results.distributions[resultKey] = (results.distributions[resultKey] || 0) + 1;
                
            } catch (error) {
                console.error(`Fairness test iteration ${i} failed:`, error);
                results.details.push(`Iteration ${i}: ${error.message}`);
            }
        }

        // Calculate fairness metrics
        results.fairnessScore = this.calculateFairnessScore(results.distributions, iterations);
        results.isBalanced = results.fairnessScore >= 0.8; // 80% fairness threshold

        console.log('Randomization fairness test completed:', results);
        return results;
    }

    // Get a key to represent the result for distribution tracking
    getResultKey(result) {
        if (result === null || result === undefined) {
            return 'null';
        }
        
        if (typeof result === 'object') {
            if (result.id) return result.id;
            if (result.name) return result.name;
            if (result.difficulty) return result.difficulty;
            return JSON.stringify(result);
        }
        
        return String(result);
    }

    // Calculate fairness score based on distribution uniformity
    calculateFairnessScore(distributions, totalIterations) {
        const keys = Object.keys(distributions);
        if (keys.length === 0) return 0;

        const expectedFrequency = totalIterations / keys.length;
        let totalDeviation = 0;

        keys.forEach(key => {
            const actualFrequency = distributions[key];
            const deviation = Math.abs(actualFrequency - expectedFrequency);
            totalDeviation += deviation;
        });

        // Normalize deviation to get fairness score (1.0 = perfect fairness)
        const maxPossibleDeviation = totalIterations;
        const fairnessScore = 1 - (totalDeviation / maxPossibleDeviation);
        
        return Math.max(0, fairnessScore);
    }

    // Validate randomization system integrity
    validateRandomizationIntegrity() {
        const validationResults = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // Test 1: Verify random number generation
        try {
            const randomNumbers = [];
            for (let i = 0; i < 10; i++) {
                const num = this.getRandom();
                if (typeof num !== 'number' || num < 0 || num >= 1) {
                    validationResults.errors.push(`Invalid random number generated: ${num}`);
                    validationResults.isValid = false;
                }
                randomNumbers.push(num);
            }

            // Check for obvious patterns (all same number)
            const uniqueNumbers = new Set(randomNumbers);
            if (uniqueNumbers.size === 1) {
                validationResults.errors.push('Random number generator producing identical values');
                validationResults.isValid = false;
            }

        } catch (error) {
            validationResults.errors.push(`Random number generation failed: ${error.message}`);
            validationResults.isValid = false;
        }

        // Test 2: Verify selection history integrity
        if (!this.selectionHistory || typeof this.selectionHistory !== 'object') {
            validationResults.errors.push('Selection history is corrupted');
            validationResults.isValid = false;
        } else {
            if (!Array.isArray(this.selectionHistory.startingCities)) {
                validationResults.errors.push('Starting cities history is not an array');
                validationResults.isValid = false;
            }

            if (!this.selectionHistory.difficultyDistribution || 
                typeof this.selectionHistory.difficultyDistribution !== 'object') {
                validationResults.errors.push('Difficulty distribution tracking is corrupted');
                validationResults.isValid = false;
            }
        }

        // Test 3: Verify seed consistency (if using seeded random)
        if (this.randomSeed !== null) {
            const originalSeed = this.randomSeed;
            const firstRandom = this.seededRandom();
            
            // Reset seed and verify we get the same result
            this.randomSeed = originalSeed;
            const secondRandom = this.seededRandom();
            
            if (Math.abs(firstRandom - secondRandom) > 0.0001) {
                validationResults.warnings.push('Seeded random generator may not be deterministic');
            }
        }

        console.log('Randomization system validation completed:', validationResults);
        return validationResults;
    }

    // Get randomization statistics for debugging and analysis
    getRandomizationStats() {
        const totalDifficultySelections = Object.values(this.selectionHistory.difficultyDistribution)
            .reduce((a, b) => a + b, 0);

        return {
            sessionSeed: this.randomSeed,
            startingCitySelections: this.selectionHistory.startingCities.length,
            recentStartingCities: this.selectionHistory.startingCities.slice(-5),
            difficultyDistribution: { ...this.selectionHistory.difficultyDistribution },
            totalDifficultySelections: totalDifficultySelections,
            difficultyBalance: this.calculateDifficultyBalance(),
            systemIntegrity: this.validateRandomizationIntegrity()
        };
    }

    // Calculate balance score for difficulty distribution
    calculateDifficultyBalance() {
        const distribution = this.selectionHistory.difficultyDistribution;
        const total = Object.values(distribution).reduce((a, b) => a + b, 0);
        
        if (total === 0) return 1.0; // Perfect balance when no selections made
        
        const expectedPerDifficulty = total / 3;
        let totalDeviation = 0;
        
        Object.values(distribution).forEach(count => {
            totalDeviation += Math.abs(count - expectedPerDifficulty);
        });
        
        const maxDeviation = total;
        return Math.max(0, 1 - (totalDeviation / maxDeviation));
    }
}