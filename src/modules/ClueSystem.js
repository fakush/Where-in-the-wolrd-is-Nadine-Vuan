/**
 * ClueSystem.js - Clue Generation and Management
 * Handles all clue-related functionality
 */

export class ClueSystem {
    constructor(gameState, randomizationSystem = null) {
        this.gameState = gameState;
        this.randomizationSystem = randomizationSystem;
    }

    // Generate clues for a city with fair difficulty tier randomization
    generateClues(cityData, options = {}) {
        if (!cityData || !cityData.clues) {
            console.warn('Invalid city data provided for clue generation');
            return [];
        }
        
        // Validate clue structure before processing
        const validationResult = this.validateClueStructure(cityData.clues);
        if (!validationResult.isValid) {
            console.error(`Invalid clue structure for city ${cityData.id}:`, validationResult.errors);
            return [];
        }
        
        const {
            maxCluesPerDifficulty = 1,
            randomizeSelection = true,
            includeAllDifficulties = true,
            specificDifficulty = null
        } = options;

        // Use RandomizationSystem for fair clue selection if available
        if (this.randomizationSystem && randomizeSelection) {
            return this.generateFairRandomizedClues(cityData, options);
        }

        // Fallback to original randomization method
        return this.generateLegacyRandomizedClues(cityData, options);
    }

    // Generate clues using fair randomization system
    generateFairRandomizedClues(cityData, options) {
        const {
            maxCluesPerDifficulty = 1,
            includeAllDifficulties = true,
            specificDifficulty = null
        } = options;

        // Use RandomizationSystem for fair clue selection
        const randomizedClueData = this.randomizationSystem.selectRandomClues(cityData.clues, {
            maxCluesPerDifficulty: maxCluesPerDifficulty,
            ensureFairDistribution: true,
            specificDifficulty: specificDifficulty,
            includeAllDifficulties: includeAllDifficulties
        });

        // Convert randomized clue data to clue objects
        const clues = randomizedClueData.map((clueData, index) => {
            const clueObject = {
                text: clueData.text,
                difficulty: clueData.difficulty,
                sourceCity: this.gameState.currentCity,
                timestamp: new Date(),
                id: `${this.gameState.currentCity}_${clueData.difficulty}_${Date.now()}_${index}`,
                selectionMetadata: {
                    selectionIndex: clueData.selectionIndex,
                    totalAvailable: clueData.totalAvailable,
                    fairnessApplied: true
                }
            };

            // Validate individual clue before adding
            if (this.validateClueObject(clueObject)) {
                return clueObject;
            } else {
                console.warn(`Invalid clue object generated for ${cityData.id}:`, clueObject);
                return null;
            }
        }).filter(clue => clue !== null);

        console.log(`Fair randomization generated ${clues.length} clues for ${cityData.id}`);
        return clues;
    }

    // Legacy randomization method for backward compatibility
    generateLegacyRandomizedClues(cityData, options) {
        const clues = [];
        const { 
            maxCluesPerDifficulty = 1, 
            randomizeSelection = true,
            includeAllDifficulties = true,
            specificDifficulty = null
        } = options;
        
        // Determine which difficulties to process
        const difficulties = specificDifficulty ? 
            [specificDifficulty] : 
            ['easy', 'medium', 'difficult'];
        
        difficulties.forEach(difficulty => {
            if (!cityData.clues[difficulty] || cityData.clues[difficulty].length === 0) {
                console.warn(`No ${difficulty} clues available for city ${cityData.id}`);
                return;
            }
            
            // Skip difficulty level if not including all and randomly decided
            if (!includeAllDifficulties && randomizeSelection && Math.random() < 0.3) {
                return;
            }
            
            const availableClues = [...cityData.clues[difficulty]];
            const numClues = Math.min(maxCluesPerDifficulty, availableClues.length);
            
            for (let i = 0; i < numClues; i++) {
                let selectedClue;
                
                if (randomizeSelection) {
                    const randomIndex = Math.floor(Math.random() * availableClues.length);
                    selectedClue = availableClues.splice(randomIndex, 1)[0];
                } else {
                    selectedClue = availableClues[i];
                }
                
                const clueObject = {
                    text: selectedClue,
                    difficulty: difficulty,
                    sourceCity: this.gameState.currentCity,
                    timestamp: new Date(),
                    id: `${this.gameState.currentCity}_${difficulty}_${Date.now()}_${i}`,
                    selectionMetadata: {
                        fairnessApplied: false
                    }
                };
                
                // Validate individual clue before adding
                if (this.validateClueObject(clueObject)) {
                    clues.push(clueObject);
                } else {
                    console.warn(`Invalid clue object generated for ${cityData.id}:`, clueObject);
                }
            }
        });
        
        return clues;
    }

    // Add clue to collection with validation and consistency checks
    addClueToCollection(clue) {
        if (!clue || typeof clue !== 'object') {
            console.warn('Invalid clue provided to addClueToCollection:', clue);
            return false;
        }
        
        // Validate clue object structure
        if (!this.validateClueObject(clue)) {
            console.warn('Clue validation failed:', clue);
            return false;
        }
        
        // Check for duplicate clues
        const isDuplicate = this.gameState.collectedClues.some(existingClue => 
            existingClue.text === clue.text && 
            existingClue.sourceCity === clue.sourceCity
        );
        
        if (isDuplicate) {
            console.warn('Duplicate clue detected, not adding:', clue.text);
            return false;
        }
        
        // Add clue to collection
        this.gameState.collectedClues.push(clue);
        
        // Save game state after adding clue
        this.gameState.saveGameState();
        
        console.log(`Clue added to collection: ${clue.text} (${clue.difficulty})`);
        return true;
    }

    // Display clues in organized format
    displayClues(format = 'detailed') {
        const clues = this.gameState.collectedClues;
        
        if (clues.length === 0) {
            return {
                formatted: 'No clues collected yet.',
                count: 0,
                byDifficulty: { easy: [], medium: [], difficult: [] }
            };
        }
        
        // Organize clues by difficulty
        const cluesByDifficulty = {
            easy: clues.filter(clue => clue.difficulty === 'easy'),
            medium: clues.filter(clue => clue.difficulty === 'medium'),
            difficult: clues.filter(clue => clue.difficulty === 'difficult')
        };
        
        let formattedOutput = '';
        
        switch (format) {
            case 'simple':
                formattedOutput = clues.map(clue => clue.text).join('\n');
                break;
                
            case 'by_difficulty':
                Object.keys(cluesByDifficulty).forEach(difficulty => {
                    if (cluesByDifficulty[difficulty].length > 0) {
                        formattedOutput += `\n${difficulty.toUpperCase()} CLUES:\n`;
                        cluesByDifficulty[difficulty].forEach(clue => {
                            formattedOutput += `- ${clue.text} (from ${clue.sourceCity})\n`;
                        });
                    }
                });
                break;
                
            case 'detailed':
            default:
                clues.forEach((clue, index) => {
                    formattedOutput += `${index + 1}. [${clue.difficulty.toUpperCase()}] ${clue.text}\n`;
                    formattedOutput += `   Source: ${clue.sourceCity} | Collected: ${clue.timestamp.toLocaleString()}\n\n`;
                });
                break;
        }
        
        return {
            formatted: formattedOutput,
            count: clues.length,
            byDifficulty: cluesByDifficulty,
            totalByDifficulty: {
                easy: cluesByDifficulty.easy.length,
                medium: cluesByDifficulty.medium.length,
                difficult: cluesByDifficulty.difficult.length
            }
        };
    }

    // Validate clue structure for a city
    validateClueStructure(clues) {
        const errors = [];
        const requiredDifficulties = ['easy', 'medium', 'difficult'];
        
        if (!clues || typeof clues !== 'object') {
            return { isValid: false, errors: ['Clues must be an object'] };
        }
        
        requiredDifficulties.forEach(difficulty => {
            if (!clues[difficulty]) {
                errors.push(`Missing ${difficulty} clues array`);
            } else if (!Array.isArray(clues[difficulty])) {
                errors.push(`${difficulty} clues must be an array`);
            } else if (clues[difficulty].length === 0) {
                errors.push(`${difficulty} clues array is empty`);
            } else {
                // Validate each clue string
                clues[difficulty].forEach((clue, index) => {
                    if (typeof clue !== 'string' || clue.trim().length === 0) {
                        errors.push(`Invalid clue at ${difficulty}[${index}]: must be non-empty string`);
                    }
                });
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Validate individual clue object
    validateClueObject(clue) {
        if (!clue || typeof clue !== 'object') {
            return false;
        }
        
        const requiredFields = ['text', 'difficulty', 'sourceCity', 'timestamp', 'id'];
        const validDifficulties = ['easy', 'medium', 'difficult'];
        
        // Check required fields
        for (const field of requiredFields) {
            if (!(field in clue)) {
                console.warn(`Missing required field: ${field}`);
                return false;
            }
        }
        
        // Validate field types and values
        if (typeof clue.text !== 'string' || clue.text.trim().length === 0) {
            console.warn('Clue text must be a non-empty string');
            return false;
        }
        
        if (!validDifficulties.includes(clue.difficulty)) {
            console.warn(`Invalid difficulty: ${clue.difficulty}`);
            return false;
        }
        
        if (typeof clue.sourceCity !== 'string' || clue.sourceCity.trim().length === 0) {
            console.warn('Source city must be a non-empty string');
            return false;
        }
        
        if (!(clue.timestamp instanceof Date) || isNaN(clue.timestamp.getTime())) {
            console.warn('Timestamp must be a valid Date object');
            return false;
        }
        
        if (typeof clue.id !== 'string' || clue.id.trim().length === 0) {
            console.warn('Clue ID must be a non-empty string');
            return false;
        }
        
        return true;
    }
}