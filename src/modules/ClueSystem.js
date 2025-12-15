/**
 * ClueSystem.js - Clue Generation and Management
 * Handles all clue-related functionality
 */

export class ClueSystem {
    constructor(gameState, randomizationSystem = null) {
        this.gameState = gameState;
        this.randomizationSystem = randomizationSystem;

        // Clue progression tracking for each city
        this.clueProgression = new Map(); // cityId -> current difficulty level

        // Point values for different difficulty levels
        this.pointValues = {
            'difficult': 3,
            'medium': 2,
            'easy': 1
        };
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

    // Add clue to collection with difficulty and point value tracking
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
        
        // Add point value based on difficulty
        clue.pointValue = this.pointValues[clue.difficulty] || 1;

        // Add clue to collection
        this.gameState.collectedClues.push(clue);
        
        // Update clue progression for the source city
        this.updateClueProgression(clue.sourceCity, clue.difficulty);

        // Save game state after adding clue
        this.gameState.saveGameState();
        
        console.log(`Clue added to collection: ${clue.text} (${clue.difficulty}, ${clue.pointValue} points)`);
        return true;
    }

    // Implement clue progression logic (hard → medium → easy) for next destination
    getNextClueDifficulty(cityId) {
        const currentProgression = this.clueProgression.get(cityId);

        if (!currentProgression) {
            // Start with difficult clues for new cities
            return 'difficult';
        }

        // Progress through difficulties: difficult → medium → easy
        switch (currentProgression.lastDifficulty) {
            case 'difficult':
                return 'medium';
            case 'medium':
                return 'easy';
            case 'easy':
                return 'easy'; // Stay at easy if player requests more clues
            default:
                return 'difficult';
        }
    }

    // Update clue progression tracking
    updateClueProgression(cityId, difficulty) {
        const existing = this.clueProgression.get(cityId) || {
            cluesCollected: 0,
            difficultiesUsed: [],
            lastDifficulty: null
        };

        existing.cluesCollected++;
        existing.lastDifficulty = difficulty;

        if (!existing.difficultiesUsed.includes(difficulty)) {
            existing.difficultiesUsed.push(difficulty);
        }

        this.clueProgression.set(cityId, existing);
    }

    // Get clues with automatic difficulty progression
    getCluesWithProgression(cityId, forceProgression = true) {
        const cityData = this.getCityDataFromGameState(cityId);
        if (!cityData) {
            console.warn(`City data not found for: ${cityId}`);
            return [];
        }

        let targetDifficulty;
        if (forceProgression) {
            targetDifficulty = this.getNextClueDifficulty(cityId);
        } else {
            // Use current difficulty or start with difficult
            const progression = this.clueProgression.get(cityId);
            targetDifficulty = progression?.lastDifficulty || 'difficult';
        }

        const clueOptions = {
            maxCluesPerDifficulty: 1,
            randomizeSelection: true,
            includeAllDifficulties: false,
            specificDifficulty: targetDifficulty
        };

        return this.generateClues(cityData, clueOptions);
    }

    // Helper method to get city data from game state
    getCityDataFromGameState(cityId) {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return null;
        }

        return this.gameState.gameData.cities.find(city => city.id === cityId);
    }

    // Build evidence interface for viewing collected clues
    buildEvidenceInterface(format = 'detailed') {
        const clues = this.gameState.collectedClues;
        
        if (clues.length === 0) {
            return {
                formatted: 'No clues collected yet.',
                count: 0,
                byDifficulty: { easy: [], medium: [], difficult: [] },
                totalPoints: 0,
                evidenceBoard: this.createEmptyEvidenceBoard()
            };
        }
        
        // Organize clues by difficulty and calculate points
        const cluesByDifficulty = {
            easy: clues.filter(clue => clue.difficulty === 'easy'),
            medium: clues.filter(clue => clue.difficulty === 'medium'),
            difficult: clues.filter(clue => clue.difficulty === 'difficult')
        };
        
        // Calculate total points
        const totalPoints = clues.reduce((sum, clue) => sum + (clue.pointValue || this.pointValues[clue.difficulty] || 1), 0);

        // Organize clues by source city for better investigation tracking
        const cluesByCity = this.organizeCluesByCity(clues);

        let formattedOutput = '';
        
        switch (format) {
            case 'simple':
                formattedOutput = clues.map(clue => clue.text).join('\n');
                break;
                
            case 'by_difficulty':
                formattedOutput = this.formatCluesByDifficulty(cluesByDifficulty);
                break;

            case 'by_city':
                formattedOutput = this.formatCluesByCity(cluesByCity);
                break;

            case 'evidence_board':
                formattedOutput = this.createEvidenceBoard(clues, cluesByDifficulty, totalPoints);
                break;
                
            case 'detailed':
            default:
                formattedOutput = this.formatDetailedClues(clues);
                break;
        }
        
        return {
            formatted: formattedOutput,
            count: clues.length,
            byDifficulty: cluesByDifficulty,
            byCity: cluesByCity,
            totalPoints: totalPoints,
            totalByDifficulty: {
                easy: cluesByDifficulty.easy.length,
                medium: cluesByDifficulty.medium.length,
                difficult: cluesByDifficulty.difficult.length
            },
            pointsByDifficulty: {
                easy: cluesByDifficulty.easy.reduce((sum, clue) => sum + (clue.pointValue || 1), 0),
                medium: cluesByDifficulty.medium.reduce((sum, clue) => sum + (clue.pointValue || 2), 0),
                difficult: cluesByDifficulty.difficult.reduce((sum, clue) => sum + (clue.pointValue || 3), 0)
            },
            evidenceBoard: this.createEvidenceBoard(clues, cluesByDifficulty, totalPoints)
        };
    }

    // Legacy method for backward compatibility
    displayClues(format = 'detailed') {
        return this.buildEvidenceInterface(format);
    }

    // Organize clues by source city
    organizeCluesByCity(clues) {
        const cluesByCity = {};

        clues.forEach(clue => {
            if (!cluesByCity[clue.sourceCity]) {
                cluesByCity[clue.sourceCity] = [];
            }
            cluesByCity[clue.sourceCity].push(clue);
        });

        return cluesByCity;
    }

    // Format clues by difficulty with point values
    formatCluesByDifficulty(cluesByDifficulty) {
        let output = '';

        // Order by difficulty (difficult first, then medium, then easy)
        const orderedDifficulties = ['difficult', 'medium', 'easy'];

        orderedDifficulties.forEach(difficulty => {
            const clues = cluesByDifficulty[difficulty];
            if (clues && clues.length > 0) {
                const totalPoints = clues.reduce((sum, clue) => sum + (clue.pointValue || this.pointValues[difficulty]), 0);
                output += `\n🔍 ${difficulty.toUpperCase()} CLUES (${totalPoints} points):\n`;
                clues.forEach((clue, index) => {
                    const points = clue.pointValue || this.pointValues[difficulty];
                    output += `  ${index + 1}. ${clue.text} (${points}pts from ${clue.sourceCity})\n`;
                });
            }
        });

        return output;
    }

    // Format clues by city
    formatCluesByCity(cluesByCity) {
        let output = '';

        Object.keys(cluesByCity).forEach(cityId => {
            const clues = cluesByCity[cityId];
            const totalPoints = clues.reduce((sum, clue) => sum + (clue.pointValue || 1), 0);

            output += `\n🏙️ ${cityId.toUpperCase()} (${clues.length} clues, ${totalPoints} points):\n`;
            clues.forEach((clue, index) => {
                const points = clue.pointValue || this.pointValues[clue.difficulty];
                output += `  ${index + 1}. [${clue.difficulty.toUpperCase()}] ${clue.text} (${points}pts)\n`;
            });
        });

        return output;
    }

    // Format detailed clues with all information
    formatDetailedClues(clues) {
        let output = '';

        clues.forEach((clue, index) => {
            const points = clue.pointValue || this.pointValues[clue.difficulty];
            output += `${index + 1}. [${clue.difficulty.toUpperCase()}] ${clue.text}\n`;
            output += `   📍 Source: ${clue.sourceCity} | 🕒 Collected: ${clue.timestamp.toLocaleString()}\n`;
            output += `   💎 Points: ${points} | 🆔 ID: ${clue.id}\n\n`;
        });

        return output;
    }

    // Create evidence board display
    createEvidenceBoard(clues, cluesByDifficulty, totalPoints) {
        const board = {
            header: `🕵️ DETECTIVE EVIDENCE BOARD 🕵️`,
            summary: `Total Clues: ${clues.length} | Total Points: ${totalPoints}`,
            sections: {
                difficult: {
                    title: '🔴 HIGH-VALUE CLUES (3 points each)',
                    clues: cluesByDifficulty.difficult || [],
                    totalPoints: (cluesByDifficulty.difficult || []).reduce((sum, clue) => sum + (clue.pointValue || 3), 0)
                },
                medium: {
                    title: '🟡 MEDIUM-VALUE CLUES (2 points each)',
                    clues: cluesByDifficulty.medium || [],
                    totalPoints: (cluesByDifficulty.medium || []).reduce((sum, clue) => sum + (clue.pointValue || 2), 0)
                },
                easy: {
                    title: '🟢 BASIC CLUES (1 point each)',
                    clues: cluesByDifficulty.easy || [],
                    totalPoints: (cluesByDifficulty.easy || []).reduce((sum, clue) => sum + (clue.pointValue || 1), 0)
                }
            },
            investigation_tips: this.generateInvestigationTips(clues, cluesByDifficulty)
        };

        return board;
    }

    // Create empty evidence board for when no clues are collected
    createEmptyEvidenceBoard() {
        return {
            header: '🕵️ DETECTIVE EVIDENCE BOARD 🕵️',
            summary: 'No evidence collected yet',
            message: 'Start investigating cities to collect clues!',
            tips: [
                '🔍 Visit cities to gather clues from local informants',
                '💡 Difficult clues (red) are worth 3 points and contain specific information',
                '📝 Medium clues (yellow) are worth 2 points and provide good leads',
                '📋 Easy clues (green) are worth 1 point but are straightforward to understand'
            ]
        };
    }

    // Generate investigation tips based on collected clues
    generateInvestigationTips(clues, cluesByDifficulty) {
        const tips = [];

        if (clues.length === 0) {
            tips.push('🔍 Start investigating cities to collect clues!');
            return tips;
        }

        // Analyze clue patterns and provide tips
        if (cluesByDifficulty.difficult && cluesByDifficulty.difficult.length > 0) {
            tips.push('🎯 You have high-value clues! These often contain the most specific location hints.');
        }

        if (clues.length >= 3) {
            tips.push('📊 Look for patterns across your clues - they might point to a specific region or culture.');
        }

        // Check for clues from multiple cities
        const cities = [...new Set(clues.map(clue => clue.sourceCity))];
        if (cities.length > 1) {
            tips.push(`🗺️ You've investigated ${cities.length} cities. Compare clues to find Nadine's trail.`);
        }

        // Progression tips
        const progression = this.analyzeClueProgression();
        if (progression.needsMoreDifficultClues) {
            tips.push('⚡ Try to collect more difficult clues for better leads to the next destination.');
        }

        return tips;
    }

    // Analyze clue progression and provide recommendations
    analyzeClueProgression() {
        const clues = this.gameState.collectedClues;
        const difficultClues = clues.filter(clue => clue.difficulty === 'difficult').length;
        const totalClues = clues.length;

        return {
            needsMoreDifficultClues: totalClues > 0 && (difficultClues / totalClues) < 0.3,
            hasGoodProgression: difficultClues > 0 && totalClues >= 3,
            recommendedNextAction: difficultClues === 0 ? 'collect_difficult' : 'analyze_patterns'
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

    // Add clue validation and consistency checks
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
        
        // Validate point value consistency
        const expectedPoints = this.pointValues[clue.difficulty];
        if (clue.pointValue && clue.pointValue !== expectedPoints) {
            console.warn(`Point value mismatch: expected ${expectedPoints} for ${clue.difficulty}, got ${clue.pointValue}`);
            // Auto-correct the point value
            clue.pointValue = expectedPoints;
        }

        return true;
    }

    // Comprehensive clue consistency validation
    validateClueConsistency() {
        const clues = this.gameState.collectedClues;
        const validationResults = {
            isValid: true,
            errors: [],
            warnings: [],
            statistics: {
                totalClues: clues.length,
                duplicates: 0,
                invalidPointValues: 0,
                missingFields: 0,
                progressionIssues: 0
            }
        };

        // Check for duplicate clues
        const clueTexts = new Set();
        const duplicates = [];

        clues.forEach((clue, index) => {
            const clueKey = `${clue.text}_${clue.sourceCity}`;
            if (clueTexts.has(clueKey)) {
                duplicates.push({ index, clue: clue.text, city: clue.sourceCity });
                validationResults.statistics.duplicates++;
            } else {
                clueTexts.add(clueKey);
            }
        });

        if (duplicates.length > 0) {
            validationResults.errors.push(`Found ${duplicates.length} duplicate clues`);
            validationResults.isValid = false;
        }

        // Validate point value consistency
        clues.forEach((clue, index) => {
            const expectedPoints = this.pointValues[clue.difficulty];
            if (!clue.pointValue) {
                validationResults.warnings.push(`Clue ${index + 1} missing point value, should be ${expectedPoints}`);
                validationResults.statistics.missingFields++;
            } else if (clue.pointValue !== expectedPoints) {
                validationResults.errors.push(`Clue ${index + 1} has incorrect point value: ${clue.pointValue}, expected ${expectedPoints}`);
                validationResults.statistics.invalidPointValues++;
                validationResults.isValid = false;
            }
        });

        // Validate clue progression logic
        const progressionValidation = this.validateClueProgression();
        if (!progressionValidation.isValid) {
            validationResults.errors.push(...progressionValidation.errors);
            validationResults.warnings.push(...progressionValidation.warnings);
            validationResults.statistics.progressionIssues = progressionValidation.issues;
            validationResults.isValid = false;
        }

        // Check for temporal consistency (clues should be collected in chronological order per city)
        const temporalValidation = this.validateTemporalConsistency(clues);
        if (!temporalValidation.isValid) {
            validationResults.warnings.push(...temporalValidation.warnings);
        }

        return validationResults;
    }

    // Validate clue progression logic
    validateClueProgression() {
        const results = {
            isValid: true,
            errors: [],
            warnings: [],
            issues: 0
        };

        // Check each city's clue progression
        this.clueProgression.forEach((progression, cityId) => {
            const { difficultiesUsed, lastDifficulty, cluesCollected } = progression;

            // Validate progression order (should generally go difficult → medium → easy)
            if (difficultiesUsed.length > 1) {
                const expectedOrder = ['difficult', 'medium', 'easy'];
                let lastValidIndex = -1;

                for (const difficulty of difficultiesUsed) {
                    const currentIndex = expectedOrder.indexOf(difficulty);
                    if (currentIndex < lastValidIndex) {
                        results.warnings.push(`City ${cityId}: Clue progression out of order (${difficultiesUsed.join(' → ')})`);
                        results.issues++;
                    }
                    lastValidIndex = Math.max(lastValidIndex, currentIndex);
                }
            }

            // Check for excessive clue collection from one city
            if (cluesCollected > 5) {
                results.warnings.push(`City ${cityId}: Collected ${cluesCollected} clues (may indicate stuck player)`);
            }
        });

        return results;
    }

    // Validate temporal consistency of clue collection
    validateTemporalConsistency(clues) {
        const results = {
            isValid: true,
            warnings: []
        };

        // Group clues by city and check timestamps
        const cluesByCity = this.organizeCluesByCity(clues);

        Object.keys(cluesByCity).forEach(cityId => {
            const cityClues = cluesByCity[cityId];

            // Sort by timestamp
            const sortedClues = [...cityClues].sort((a, b) => a.timestamp - b.timestamp);

            // Check if progression follows expected difficulty order
            for (let i = 1; i < sortedClues.length; i++) {
                const prevClue = sortedClues[i - 1];
                const currentClue = sortedClues[i];

                const difficultyOrder = { 'difficult': 0, 'medium': 1, 'easy': 2 };
                const prevOrder = difficultyOrder[prevClue.difficulty];
                const currentOrder = difficultyOrder[currentClue.difficulty];

                if (currentOrder < prevOrder) {
                    results.warnings.push(`City ${cityId}: Clue difficulty regression detected (${prevClue.difficulty} → ${currentClue.difficulty})`);
                    results.isValid = false;
                }
            }
        });

        return results;
    }

    // Auto-repair clue consistency issues
    repairClueConsistency() {
        const clues = this.gameState.collectedClues;
        const repairResults = {
            repaired: 0,
            removed: 0,
            actions: []
        };

        // Remove duplicate clues
        const uniqueClues = [];
        const seenClues = new Set();

        clues.forEach(clue => {
            const clueKey = `${clue.text}_${clue.sourceCity}`;
            if (!seenClues.has(clueKey)) {
                seenClues.add(clueKey);
                uniqueClues.push(clue);
            } else {
                repairResults.removed++;
                repairResults.actions.push(`Removed duplicate clue: "${clue.text}" from ${clue.sourceCity}`);
            }
        });

        // Fix point values
        uniqueClues.forEach(clue => {
            const expectedPoints = this.pointValues[clue.difficulty];
            if (!clue.pointValue || clue.pointValue !== expectedPoints) {
                clue.pointValue = expectedPoints;
                repairResults.repaired++;
                repairResults.actions.push(`Fixed point value for clue: "${clue.text}" (${clue.difficulty} = ${expectedPoints} points)`);
            }
        });

        // Update game state with repaired clues
        this.gameState.collectedClues = uniqueClues;
        this.gameState.saveGameState();

        console.log(`Clue consistency repair completed: ${repairResults.repaired} repaired, ${repairResults.removed} removed`);
        return repairResults;
    }
}