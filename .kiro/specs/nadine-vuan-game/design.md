# Design Document

## Overview

The "Where in the World is Nadine Vuan?" game is a single-page web application that recreates the classic Carmen Sandiego detective adventure experience. The game uses vanilla HTML5, CSS3, and JavaScript to create an immersive detective experience where players track down Nadine Vuan across 11 global cities by gathering clues from local informants.

The application follows a state-driven architecture with distinct game phases: introduction, investigation, travel, and conclusion. The design emphasizes the retro 1980s aesthetic with Carmen Sandiego-style UI elements, retro fonts, and smooth animations.

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
- Player location and visited cities
- Collected clues and investigation progress
- Game statistics (time, attempts, score)
- UI state (active screens, animations)

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
  visitedCities: string[],
  collectedClues: Clue[],
  gameStats: {
    startTime: Date,
    citiesVisited: number,
    correctDeductions: number,
    attemptsRemaining: number
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
  difficulty: 'easy' | 'medium' | 'difficult',
  sourceCity: string,
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
- Game initialization properties (1.2, 1.4, 6.3) can be combined into a comprehensive reset property
- Clue handling properties (2.2, 2.4, 2.5) can be unified into clue system consistency
- Travel system properties (3.2, 3.3, 3.4) can be merged into route management integrity
- State update properties (4.3, 4.5) can be combined into progress tracking consistency

### Core Properties

**Property 1: Game initialization consistency**
*For any* game initialization, all state variables should be reset to default values and a valid starting city should be randomly selected from available non-final cities
**Validates: Requirements 1.2, 1.4, 6.3**

**Property 2: City scene asset consistency**
*For any* valid city ID, the system should load the correct scene image and informant data matching that city's configuration
**Validates: Requirements 2.1, 7.2**

**Property 3: Clue system integrity**
*For any* city with available clues, the system should randomly select clues from the appropriate difficulty tiers and properly store them in the player's collection
**Validates: Requirements 2.2, 2.4, 2.5**

**Property 4: Route management integrity**
*For any* travel decision, the selected city should be added to the visited list and prevented from future selection, maintaining route uniqueness
**Validates: Requirements 3.2, 3.3, 3.4**

**Property 5: Game phase transitions**
*For any* valid game action, the system should transition to the appropriate game phase and update the interface accordingly
**Validates: Requirements 3.5, 4.5**

**Property 6: Progress tracking consistency**
*For any* game state change, all progress statistics should accurately reflect the current game status including cities visited and clues collected
**Validates: Requirements 4.3, 4.5**

**Property 7: Feedback system reliability**
*For any* player action (correct or incorrect), the system should provide appropriate feedback without terminating the game prematurely
**Validates: Requirements 4.1, 4.2**

**Property 8: Session isolation**
*For any* restart operation, the new game session should be completely independent with fresh randomized elements and no data contamination from previous sessions
**Validates: Requirements 6.4, 6.5**

**Property 9: Data validation robustness**
*For any* JSON data access or user input, the system should validate the data structure and handle invalid inputs gracefully without breaking game flow
**Validates: Requirements 8.1, 8.3, 8.4**

**Property 10: Randomization fairness**
*For any* random selection process (starting cities, clues), all available options should have equal probability of selection over multiple iterations
**Validates: Requirements 8.2**

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