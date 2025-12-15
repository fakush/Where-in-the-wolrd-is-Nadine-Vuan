# Design Document

## Overview

The "Where in the World is Nadine Vuan?" game is a single-page web application that recreates the classic Carmen Sandiego detective adventure experience. The game uses vanilla HTML5, CSS3, and JavaScript to create an immersive detective experience where players follow a 5-city journey to track down Nadine Vuan, with clues about each next destination provided by local informants.

The game features a scoring system (3 points for hard clues, 2 for medium, 1 for easy) and a three-attempt failure system. Players start at a random city and must successfully navigate through 4 cities before reaching the final destination of Buenos Aires. The application follows a state-driven architecture with distinct game phases: introduction, investigation, travel, and conclusion. The design emphasizes the retro 1980s aesthetic with Carmen Sandiego-style UI elements, retro fonts, and smooth animations.

## Architecture

### Client-Side Architecture
The game operates entirely in the browser with no backend dependencies. The architecture consists of:

- **Presentation Layer**: HTML structure with CSS styling and animations
- **Game Logic Layer**: JavaScript modules handling game state, mechanics, and user interactions  
- **Data Layer**: JSON-based game configuration and local storage for state persistence
- **Asset Layer**: PNG images for scenes, characters, and UI elements

### Module Structure
```
src/
├── index.html          # Main game interface and structure
├── styles.css          # Complete styling with retro theme
├── game.js            # Core game logic and state management
└── assets/            # Images and data (existing)
    ├── data/game_data.json
    └── scenes/*.png
```

### State Management
The game uses a centralized state object that tracks:
- Current game phase (intro, investigation, travel, conclusion)
- Player location and predetermined 5-city route
- Collected clues about next destinations and investigation progress
- Game statistics (score, remaining attempts out of 3, cities completed)
- Current clue difficulty level (hard → medium → easy progression)
- UI state (active screens, animations, evidence list)

## Components and Interfaces

### Game Controller
**Purpose**: Central orchestrator for all game logic and state transitions
**Key Methods**:
- `initializeGame()`: Sets up new game session with randomized elements
- `processPlayerAction(action, data)`: Handles all user interactions
- `updateGameState(newState)`: Manages state transitions and persistence
- `checkWinCondition()`: Evaluates victory/failure conditions

### UI Manager
**Purpose**: Handles all visual updates and user interface interactions
**Key Methods**:
- `renderScreen(screenType, data)`: Displays appropriate game screens
- `showAnimation(type, params)`: Manages travel and transition animations
- `updateProgressDisplay()`: Refreshes game statistics and progress indicators
- `handleUserInput(element, callback)`: Manages click and interaction events

### Clue System
**Purpose**: Manages clue generation, storage, and presentation
**Key Methods**:
- `generateClues(cityId, difficulty)`: Randomly selects clues from available pool
- `addClueToCollection(clue)`: Stores clues in player's investigation notes
- `displayClues(format)`: Presents collected clues in organized format
- `validateClueLogic(clues)`: Ensures clue consistency and game balance

### Travel System
**Purpose**: Handles city navigation, route tracking, and travel animations
**Key Methods**:
- `showWorldMap()`: Displays interactive world map for destination selection
- `validateDestination(cityId)`: Checks if travel to city is allowed
- `animateTravel(fromCity, toCity)`: Shows travel animation between cities
- `updateRoute(newCity)`: Adds city to visited route and prevents revisits

## Data Models

### GameState
```javascript
{
  phase: 'intro' | 'investigation' | 'travel' | 'conclusion',
  currentCity: string,
  cityRoute: string[], // Predetermined 5-city journey ending with Buenos Aires
  currentCityIndex: number, // Position in the route (0-4)
  collectedClues: Clue[],
  currentClueLevel: 'hard' | 'medium' | 'easy',
  gameStats: {
    score: number,
    attemptsRemaining: number, // Starts at 3
    citiesCompleted: number
  },
  isGameComplete: boolean,
  hasWon: boolean
}
```

### City
```javascript
{
  id: string,
  name: string,
  country: string,
  isFinal: boolean,
  informant: Informant,
  clues: ClueSet,
  notHereResponse: string,
  finalEncounter?: FinalEncounter
}
```

### Clue
```javascript
{
  text: string,
  difficulty: 'easy' | 'medium' | 'hard',
  targetCity: string, // The next destination this clue points to
  sourceCity: string, // The city where this clue was obtained
  pointValue: number, // 3 for hard, 2 for medium, 1 for easy
  timestamp: Date
}
```

### UIState
```javascript
{
  activeScreen: string,
  isAnimating: boolean,
  selectedCity: string | null,
  showingClues: boolean,
  modalOpen: boolean
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:
- Route generation and starting city selection can be combined into journey initialization
- Scoring and attempt tracking can be unified into game mechanics consistency
- Clue progression and storage can be merged into clue system integrity
- Game over conditions can be consolidated into failure handling

### Core Properties

**Property 1: Journey initialization consistency**
*For any* game initialization, the system should generate a valid 5-city route ending with Buenos Aires and select a random starting city from the 10 non-Buenos Aires locations
**Validates: Requirements 1.3, 1.4**

**Property 2: Clue progression integrity**
*For any* city in the route, clues should be provided in the correct sequence (hard → medium → easy) and point to the next destination in the predetermined route
**Validates: Requirements 2.2, 2.4**

**Property 3: Scoring system consistency**
*For any* correct guess, the system should award points based on the current clue difficulty (3 for hard, 2 for medium, 1 for easy) and advance to the next city in the route
**Validates: Requirements 3.2**

**Property 4: Attempt tracking reliability**
*For any* incorrect guess, the system should deduct exactly one attempt, display the "not here" scene, and maintain the current game state without advancing
**Validates: Requirements 3.3, 4.2**

**Property 5: Game over condition accuracy**
*For any* game state where attempts reach zero, the system should trigger game over and display the final score
**Validates: Requirements 4.5, 6.1**

**Property 6: Journey completion detection**
*For any* game where 4 cities are successfully completed, Buenos Aires should be presented as the final destination
**Validates: Requirements 5.1**

**Property 7: Evidence collection consistency**
*For any* clue presented, it should be stored in the evidence list with correct metadata (difficulty, target city, point value) and be accessible through the evidence interface
**Validates: Requirements 2.4, 2.6**

**Property 8: Session isolation**
*For any* restart operation, the new game session should be completely independent with fresh randomized elements and no data contamination from previous sessions
**Validates: Requirements 6.4, 6.5**

**Property 9: Data validation robustness**
*For any* JSON data access or user input, the system should validate the data structure and handle invalid inputs gracefully without breaking game flow
**Validates: Requirements 8.1, 8.3, 8.4**

**Property 10: Starting city randomization fairness**
*For any* series of game initializations, all 10 non-Buenos Aires cities should appear as starting cities with roughly equal probability
**Validates: Requirements 1.3, 8.2**

**Property 11: State persistence reliability**
*For any* game state change, the data should be properly persisted to browser storage and accurately restored when needed
**Validates: Requirements 8.5**

## Error Handling

### Input Validation
- Validate all user clicks and selections against current game state
- Sanitize any text inputs to prevent injection attacks
- Handle malformed JSON data gracefully with fallback responses
- Validate city IDs against the available cities list before processing

### Asset Loading
- Implement fallback images for missing scene assets
- Handle network failures when loading game data
- Provide loading states and error messages for asset failures
- Gracefully degrade functionality if critical assets fail to load

### State Management Errors
- Detect and recover from corrupted game state
- Handle browser storage quota exceeded scenarios
- Implement state validation before each major operation
- Provide clear error messages for unrecoverable states

### Browser Compatibility
- Handle missing localStorage support with in-memory fallback
- Detect and adapt to different screen sizes and orientations
- Provide graceful degradation for older browsers
- Handle JavaScript disabled scenarios with static content

## Testing Strategy

### Unit Testing Approach
The game will use Jest as the testing framework for unit tests. Unit tests will focus on:
- Individual function behavior with specific inputs
- Edge cases like empty data sets or invalid parameters
- Integration points between game modules
- Error condition handling with known problematic inputs

### Property-Based Testing Approach
The game will use fast-check library for property-based testing in JavaScript. Property-based tests will:
- Run a minimum of 100 iterations per property to ensure statistical validity
- Use smart generators that create realistic game scenarios
- Test universal properties that should hold across all valid inputs
- Each property-based test will be tagged with comments referencing the design document property

**Property-based testing requirements:**
- Each correctness property must be implemented by a single property-based test
- Tests must be tagged using the format: `**Feature: nadine-vuan-game, Property {number}: {property_text}**`
- Tests should avoid mocking when possible to validate real functionality
- Generators should intelligently constrain inputs to valid game scenarios

### Test Coverage Strategy
- Unit tests verify specific examples and critical edge cases
- Property tests verify universal behaviors across many inputs
- Integration tests ensure proper coordination between game modules
- Both testing approaches are complementary and provide comprehensive coverage

The dual testing approach ensures that concrete bugs are caught by unit tests while general correctness is verified through property-based testing, providing confidence in the game's reliability across all possible player interactions.