/**
 * InformantSystem.js - Informant Interaction Management
 * Handles all informant dialogue and interaction logic
 */

export class InformantSystem {
    constructor(gameState, clueSystem = null) {
        this.gameState = gameState;
        this.clueSystem = clueSystem;
        
        // Track dialogue state for each city
        this.dialogueState = new Map(); // cityId -> dialogue progression
        
        // Dialogue types and their progression
        this.dialogueTypes = {
            'greeting': 'initial',
            'clue_presentation': 'helpful',
            'farewell_helpful': 'helpful_end',
            'farewell_unhelpful': 'unhelpful_end',
            'not_here': 'unhelpful'
        };
    }

    // Create showInformantDialogue() function with enhanced interaction
    showInformantDialogue(cityId, dialogueType = 'greeting') {
        const cityData = this.getCityDataFromGameState(cityId);
        
        if (!cityData || !cityData.informant) {
            console.warn(`No informant data found for city: ${cityId}`);
            const fallbackDialogue = 'Hello, traveler. How can I help you?';
            const dialogueData = this.displayDialogue(fallbackDialogue, 'Unknown Informant', dialogueType);
            return {
                text: fallbackDialogue,
                informantName: 'Unknown Informant',
                dialogueType: dialogueType
            };
        }
        
        const informant = cityData.informant;
        let dialogue = '';
        
        // Update dialogue state
        this.updateDialogueState(cityId, dialogueType);
        
        switch (dialogueType) {
            case 'greeting':
                dialogue = this.generateGreeting(informant, cityData);
                break;
            case 'farewell_helpful':
                dialogue = this.generateHelpfulFarewell(informant, cityData);
                break;
            case 'farewell_unhelpful':
                dialogue = this.generateUnhelpfulFarewell(informant, cityData);
                break;
            case 'not_here':
                dialogue = this.generateNotHereResponse(cityData);
                break;
            case 'clue_presentation':
                dialogue = this.generateCluePresentation(informant, cityData);
                break;
            default:
                console.warn(`Unknown dialogue type: ${dialogueType}`);
                dialogue = informant.greeting || 'Hello, traveler.';
        }
        
        // Display dialogue with enhanced formatting
        const dialogueData = this.displayDialogue(dialogue, informant.name, dialogueType, cityData);
        
        // Return the structured dialogue data that GameController expects
        return {
            text: dialogue,
            informantName: informant.name,
            dialogueType: dialogueType
        };
    }

    // Generate contextual greeting based on investigation state
    generateGreeting(informant, cityData) {
        const baseGreeting = informant.greeting || 'Hello, traveler.';
        const hasClues = this.hasCityClues(cityData.id);
        
        if (hasClues) {
            // Add contextual information if Nadine was here
            const contextualAddition = this.generateContextualGreeting(cityData);
            return `${baseGreeting} ${contextualAddition}`;
        } else {
            return baseGreeting;
        }
    }

    // Generate contextual greeting additions
    generateContextualGreeting(cityData) {
        const greetingVariations = [
            "Yes, I remember someone matching that description!",
            "Ah, you're looking for that woman who was asking questions?",
            "I saw someone like that recently. Let me tell you what I observed...",
            "That person you're looking for - yes, she was here!",
            "I have information about the person you seek."
        ];
        
        const randomIndex = Math.floor(Math.random() * greetingVariations.length);
        return greetingVariations[randomIndex];
    }

    // Generate helpful farewell with encouragement
    generateHelpfulFarewell(informant, cityData) {
        const baseFarewell = informant.farewell_helpful || 'Good luck on your journey!';
        
        // Add encouraging context based on clue difficulty
        const lastClue = this.getLastCollectedClue(cityData.id);
        if (lastClue) {
            const encouragement = this.generateEncouragementByDifficulty(lastClue.difficulty);
            return `${baseFarewell} ${encouragement}`;
        }
        
        return baseFarewell;
    }

    // Generate encouragement based on clue difficulty
    generateEncouragementByDifficulty(difficulty) {
        const encouragements = {
            'difficult': [
                "That was a challenging clue - you're thinking like a true detective!",
                "Excellent deduction skills! That clue should lead you in the right direction.",
                "Impressive! You understood that complex clue perfectly."
            ],
            'medium': [
                "Good detective work! That clue should help guide your investigation.",
                "Well done! You're getting closer to solving this case.",
                "Nice work! That clue contains valuable information."
            ],
            'easy': [
                "Great start! Even simple clues can lead to big breakthroughs.",
                "Good! Sometimes the most obvious clues are the most important.",
                "Well spotted! That clue will definitely help your investigation."
            ]
        };
        
        const options = encouragements[difficulty] || encouragements['easy'];
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
    }

    // Generate unhelpful farewell
    generateUnhelpfulFarewell(informant, cityData) {
        const baseFarewell = informant.farewell_unhelpful || 'Sorry I could not help.';
        
        // Add helpful suggestions for continuing the investigation
        const suggestions = [
            "Try checking other cities - someone there might have seen her.",
            "Keep investigating! Every detective faces dead ends.",
            "Don't give up! The trail will lead somewhere eventually.",
            "Perhaps someone in another location has information.",
            "Keep following your leads - persistence pays off in detective work."
        ];
        
        const randomIndex = Math.floor(Math.random() * suggestions.length);
        return `${baseFarewell} ${suggestions[randomIndex]}`;
    }

    // Implement "not here" response handling for incorrect cities
    generateNotHereResponse(cityData) {
        const baseResponse = cityData.not_here_response || 'That person has not been here.';
        
        // Add helpful redirection based on city characteristics
        const redirectionHint = this.generateRedirectionHint(cityData);
        return `${baseResponse} ${redirectionHint}`;
    }

    // Generate redirection hints based on city characteristics
    generateRedirectionHint(cityData) {
        const hints = [
            "Try looking in cities with more international connections.",
            "Perhaps check locations known for cultural attractions.",
            "Consider cities that are popular with travelers and tourists.",
            "Look for places where someone might go to experience local culture.",
            "Think about destinations that offer unique cultural experiences."
        ];
        
        // Add region-specific hints based on city country
        if (cityData.country) {
            const regionHints = this.getRegionSpecificHints(cityData.country);
            hints.push(...regionHints);
        }
        
        const randomIndex = Math.floor(Math.random() * hints.length);
        return hints[randomIndex];
    }

    // Get region-specific redirection hints
    getRegionSpecificHints(country) {
        const regionHints = {
            'Japan': ["Maybe try looking in other Asian cultural centers."],
            'Italy': ["Perhaps check other European destinations with rich history."],
            'Morocco': ["Consider other North African or Middle Eastern locations."],
            'England': ["Try other English-speaking countries or European capitals."],
            'Iceland': ["Look in other Nordic countries or unique natural destinations."],
            'Mexico': ["Check other Latin American countries with vibrant cultures."],
            'Australia': ["Consider other Pacific region destinations."],
            'Turkey': ["Try other countries that bridge Europe and Asia."],
            'Thailand': ["Look in other Southeast Asian cultural centers."],
            'United States': ["Check other major international cities."],
            'Argentina': ["This is often the final destination - are you sure you're on the right trail?"]
        };
        
        return regionHints[country] || ["Keep searching in other international destinations."];
    }

    // Add clue presentation logic with difficulty selection
    generateCluePresentation(informant, cityData) {
        const baseGreeting = informant.greeting || 'Hello, traveler.';
        
        // Get the next clue difficulty for progression
        const nextDifficulty = this.clueSystem ? 
            this.clueSystem.getNextClueDifficulty(cityData.id) : 'difficult';
        
        // Create contextual clue presentation based on difficulty
        const presentationIntro = this.generateClueIntroduction(nextDifficulty);
        
        return `${baseGreeting} ${presentationIntro}`;
    }

    // Generate clue introduction based on difficulty
    generateClueIntroduction(difficulty) {
        const introductions = {
            'difficult': [
                "I have some detailed observations that might help you...",
                "Let me share some specific details I noticed...",
                "I observed some particular behaviors that caught my attention...",
                "There were some subtle clues in what she said and did..."
            ],
            'medium': [
                "I remember some interesting details about her visit...",
                "She mentioned a few things that might be helpful...",
                "I noticed some things that could guide your investigation...",
                "There were some clear signs about where she might be headed..."
            ],
            'easy': [
                "I can tell you some basic things I observed...",
                "She left some obvious clues about her interests...",
                "I remember some straightforward details...",
                "There were some clear indicators about her destination..."
            ]
        };
        
        const options = introductions[difficulty] || introductions['easy'];
        const randomIndex = Math.floor(Math.random() * options.length);
        return options[randomIndex];
    }

    // Create investigation completion detection
    detectInvestigationCompletion(cityId) {
        const cityData = this.getCityDataFromGameState(cityId);
        
        if (!cityData) {
            return { isComplete: false, reason: 'Invalid city data' };
        }
        
        // Check if this is the final destination
        if (cityData.is_final) {
            return { 
                isComplete: true, 
                reason: 'final_destination',
                message: 'You have reached the final destination!',
                dialogueType: 'final_encounter'
            };
        }
        
        // Check dialogue progression state
        const dialogueState = this.dialogueState.get(cityId);
        if (dialogueState && dialogueState.interactionComplete) {
            return {
                isComplete: true,
                reason: 'interaction_complete',
                message: `Investigation complete in ${cityData.name}.`,
                dialogueType: dialogueState.lastDialogueType
            };
        }
        
        // Check if player has collected clues from this city
        const cityCluesCollected = this.gameState.collectedClues.filter(
            clue => clue.sourceCity === cityId
        );
        
        if (cityCluesCollected.length > 0) {
            return { 
                isComplete: true, 
                reason: 'clues_collected',
                message: `Investigation complete in ${cityData.name}. ${cityCluesCollected.length} clue(s) collected.`,
                cluesFound: cityCluesCollected.length,
                dialogueType: 'farewell_helpful'
            };
        }
        
        // Check if city has no clues (Nadine wasn't here)
        if (!this.hasCityClues(cityId)) {
            return { 
                isComplete: true, 
                reason: 'no_clues_available',
                message: `Investigation complete in ${cityData.name}. Nadine was not here.`,
                dialogueType: 'farewell_unhelpful'
            };
        }
        
        return { 
            isComplete: false, 
            reason: 'investigation_ongoing',
            message: 'Investigation still in progress...',
            dialogueType: 'greeting'
        };
    }

    // Update dialogue state tracking
    updateDialogueState(cityId, dialogueType) {
        const existing = this.dialogueState.get(cityId) || {
            interactions: 0,
            dialogueHistory: [],
            lastDialogueType: null,
            interactionComplete: false
        };
        
        existing.interactions++;
        existing.dialogueHistory.push({
            type: dialogueType,
            timestamp: new Date()
        });
        existing.lastDialogueType = dialogueType;
        
        // Mark interaction as complete for certain dialogue types
        if (['farewell_helpful', 'farewell_unhelpful', 'not_here'].includes(dialogueType)) {
            existing.interactionComplete = true;
        }
        
        this.dialogueState.set(cityId, existing);
    }

    // Display dialogue with enhanced formatting and UI integration
    displayDialogue(dialogue, informantName, dialogueType, cityData = null) {
        // This method would integrate with the UI system
        // For now, we'll log the dialogue and prepare data for UI display
        
        const dialogueData = {
            text: dialogue,
            informantName: informantName,
            dialogueType: dialogueType,
            cityName: cityData ? cityData.name : 'Unknown',
            timestamp: new Date(),
            formatting: this.getDialogueFormatting(dialogueType)
        };
        
        console.log(`[${informantName}]: ${dialogue}`);
        
        // Return formatted dialogue data for UI integration
        return dialogueData;
    }

    // Get dialogue formatting based on type
    getDialogueFormatting(dialogueType) {
        const formatting = {
            'greeting': { 
                icon: '👋', 
                style: 'greeting',
                priority: 'normal'
            },
            'clue_presentation': { 
                icon: '🔍', 
                style: 'clue-presentation',
                priority: 'high'
            },
            'farewell_helpful': { 
                icon: '✅', 
                style: 'farewell-helpful',
                priority: 'normal'
            },
            'farewell_unhelpful': { 
                icon: '❌', 
                style: 'farewell-unhelpful',
                priority: 'low'
            },
            'not_here': { 
                icon: '🚫', 
                style: 'not-here',
                priority: 'low'
            }
        };
        
        return formatting[dialogueType] || { 
            icon: '💬', 
            style: 'default',
            priority: 'normal'
        };
    }

    // Helper methods
    getCityDataFromGameState(cityId) {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return null;
        }
        
        return this.gameState.gameData.cities.find(city => city.id === cityId);
    }

    hasCityClues(cityId) {
        const cityData = this.getCityDataFromGameState(cityId);
        
        if (!cityData || !cityData.clues) {
            return false;
        }
        
        const difficulties = ['easy', 'medium', 'difficult'];
        return difficulties.some(difficulty => 
            cityData.clues[difficulty] && 
            cityData.clues[difficulty].length > 0
        );
    }

    getLastCollectedClue(cityId) {
        const cityClues = this.gameState.collectedClues.filter(
            clue => clue.sourceCity === cityId
        );
        
        if (cityClues.length === 0) {
            return null;
        }
        
        // Return the most recently collected clue
        return cityClues.sort((a, b) => b.timestamp - a.timestamp)[0];
    }

    // Get dialogue statistics for debugging and analytics
    getDialogueStatistics() {
        const stats = {
            totalInteractions: 0,
            citiesInteracted: this.dialogueState.size,
            dialogueTypeCount: {},
            averageInteractionsPerCity: 0,
            completedInvestigations: 0
        };
        
        this.dialogueState.forEach((state, cityId) => {
            stats.totalInteractions += state.interactions;
            
            if (state.interactionComplete) {
                stats.completedInvestigations++;
            }
            
            state.dialogueHistory.forEach(dialogue => {
                stats.dialogueTypeCount[dialogue.type] = 
                    (stats.dialogueTypeCount[dialogue.type] || 0) + 1;
            });
        });
        
        if (stats.citiesInteracted > 0) {
            stats.averageInteractionsPerCity = 
                stats.totalInteractions / stats.citiesInteracted;
        }
        
        return stats;
    }

    // Reset dialogue state for new game session
    resetDialogueState() {
        this.dialogueState.clear();
        console.log('Dialogue state reset for new game session');
    }

    // Validate informant data integrity
    validateInformantData() {
        if (!this.gameState.gameData || !this.gameState.gameData.cities) {
            return { isValid: false, errors: ['Game data not loaded'] };
        }
        
        const errors = [];
        const warnings = [];
        
        this.gameState.gameData.cities.forEach((city, index) => {
            if (!city.informant) {
                errors.push(`City ${city.id} missing informant data`);
                return;
            }
            
            const informant = city.informant;
            const requiredFields = ['name', 'greeting', 'farewell_helpful', 'farewell_unhelpful'];
            
            requiredFields.forEach(field => {
                if (!informant[field] || typeof informant[field] !== 'string') {
                    errors.push(`City ${city.id} informant missing or invalid ${field}`);
                }
            });
            
            if (!city.not_here_response || typeof city.not_here_response !== 'string') {
                errors.push(`City ${city.id} missing not_here_response`);
            }
            
            // Check for dialogue quality
            if (informant.greeting && informant.greeting.length < 10) {
                warnings.push(`City ${city.id} informant greeting is very short`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
}