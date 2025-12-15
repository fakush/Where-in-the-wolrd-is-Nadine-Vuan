# Implementation Plan

- [x] 1. Set up project structure and core HTML framework
  - Create src directory with index.html, styles.css, and game.js files
  - Set up basic HTML5 structure with semantic elements for game screens
  - Link CSS and JavaScript files with proper asset references
  - Configure viewport and meta tags for mobile responsiveness
  - _Requirements: 7.1, 7.2_

- [x] 2. Implement core game state management system
  - [x] 2.1 Create GameState class with initialization and reset methods
    - Define GameState object structure with 5-city route, scoring, and attempt tracking
    - Implement initializeGame() method with random starting city and predetermined route generation
    - Create resetGameState() method for restart functionality
    - _Requirements: 1.3, 1.4, 6.3_

  - [ ]* 2.2 Write property test for journey initialization consistency
    - **Property 1: Journey initialization consistency**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 2.3 Implement browser storage persistence for game state
    - Create saveGameState() and loadGameState() methods
    - Handle localStorage availability and quota scenarios
    - Implement state validation before save/load operations
    - _Requirements: 8.5_

  - [ ]* 2.4 Write property test for state persistence reliability
    - **Property 11: State persistence reliability**
    - **Validates: Requirements 8.5**

- [x] 3. Create data loading and validation system
  - [x] 3.1 Implement JSON data loader with validation
    - Create loadGameData() function to fetch and parse game_data.json
    - Implement data structure validation for cities, clues, and messages
    - Add error handling for malformed or missing data
    - _Requirements: 8.1, 8.4_

  - [ ]* 3.2 Write property test for data validation robustness
    - **Property 9: Data validation robustness**
    - **Validates: Requirements 8.1, 8.3, 8.4**

  - [x] 3.3 Create city and clue management functions
    - Implement getCityData(cityId) function with validation
    - Create clue selection logic with difficulty tier randomization
    - Add informant dialogue retrieval functions
    - _Requirements: 2.1, 2.2_

  - [ ]* 3.4 Write property test for city scene asset consistency
    - **Property 2: City scene asset consistency**
    - **Validates: Requirements 2.1, 7.2**

- [x] 4. Build user interface components and styling
  - [x] 4.1 Create retro-themed CSS with Carmen Sandiego styling
    - Implement retro 1980s color scheme and typography
    - Add Carmen Sandiego-style UI elements for clues and travel
    - Create responsive layout with mobile-first approach
    - Import and configure retro game fonts
    - _Requirements: 7.3, 7.5_

  - [x] 4.2 Implement game screen layouts and transitions
    - Create intro screen with portada_juego.png and steve.png
    - Design investigation screen with scene images and informant dialogue
    - Build world map interface for travel selection
    - Add clue collection and display interface
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 4.3 Add interactive elements and visual feedback
    - Implement button hover effects and click animations
    - Create loading states for asset loading
    - Add icon library integration for UI elements
    - Design progress indicators and statistics display
    - _Requirements: 7.4, 4.3_

- [x] 5. Implement clue system and investigation mechanics
  - [x] 5.1 Create clue progression and storage system
    - Implement clue progression logic (hard → medium → easy) for next destination
    - Create addClueToCollection() method with difficulty and point value tracking
    - Build evidence interface for viewing collected clues
    - Add clue validation and consistency checks
    - _Requirements: 2.2, 2.4, 2.6_

  - [ ]* 5.2 Write property test for clue progression integrity
    - **Property 2: Clue progression integrity**
    - **Validates: Requirements 2.2, 2.4**

  - [ ]* 5.3 Write property test for evidence collection consistency
    - **Property 7: Evidence collection consistency**
    - **Validates: Requirements 2.4, 2.6**

  - [x] 5.4 Implement informant interaction system
    - Create showInformantDialogue() function
    - Implement "not here" response handling for incorrect cities
    - Add clue presentation logic with difficulty selection
    - Create investigation completion detection
    - _Requirements: 2.1, 2.3_

- [-] 6. Build travel system and scoring mechanics
  - [x] 6.1 Create guess validation and scoring system
    - Implement guess validation against the predetermined route
    - Add scoring system (3 points for hard, 2 for medium, 1 for easy)
    - Create attempt tracking and deduction logic
    - Build "not here" scene display for incorrect guesses
    - _Requirements: 3.2, 3.3, 4.2_

  - [ ]* 6.2 Write property test for scoring system consistency
    - **Property 3: Scoring system consistency**
    - **Validates: Requirements 3.2**

  - [ ]* 6.3 Write property test for attempt tracking reliability
    - **Property 4: Attempt tracking reliability**
    - **Validates: Requirements 3.3, 4.2**

  - [x] 6.3 Implement travel animations and transitions
    - Create animateTravel() function for city-to-city movement
    - Add smooth transitions between game phases
    - Implement loading states during travel
    - Create visual feedback for destination selection
    - _Requirements: 3.5_

  - [ ]* 6.4 Write property test for game phase transitions
    - **Property 5: Game phase transitions**
    - **Validates: Requirements 3.5, 4.5**

- [-] 7. Create game over and journey completion systems
  - [x] 7.1 Implement game over condition handling
    - Create game over detection when attempts reach zero
    - Add final score display and game over messaging
    - Implement journey completion detection after 4 cities
    - Create Buenos Aires presentation as final destination
    - _Requirements: 4.5, 5.1, 6.1_

  - [ ]* 7.2 Write property test for game over condition accuracy
    - **Property 5: Game over condition accuracy**
    - **Validates: Requirements 4.5, 6.1**

  - [ ]* 7.3 Write property test for journey completion detection
    - **Property 6: Journey completion detection**
    - **Validates: Requirements 5.1**

- [x] 8. Implement final encounter and victory conditions
  - [x] 8.1 Create Buenos Aires final encounter sequence
    - Implement final encounter detection when reaching Buenos Aires
    - Add Nadine's victory speech and Steve's response dialogue
    - Create victory screen with success message and completion status
    - Display appropriate character portraits for final scene
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 8.2 Build game completion and restart functionality
    - Implement victory condition checking
    - Create end-game options (restart/exit)
    - Add completion statistics and achievement display
    - Design celebration animations and effects
    - _Requirements: 5.4, 6.2_

- [x] 9. Add failure handling and restart mechanisms
  - [x] 9.1 Implement game over conditions and messaging
    - Create failure condition detection (time/attempts)
    - Add appropriate game over messages for different scenarios
    - Implement clear restart options from failure states
    - Design encouraging retry messaging
    - _Requirements: 6.1, 6.2_

  - [x] 9.2 Build session isolation and restart system
    - Implement complete game state reset on restart
    - Create fresh randomization for new game sessions
    - Add session independence validation
    - Ensure no data contamination between games
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 9.3 Write property test for session isolation
    - **Property 8: Session isolation**
    - **Validates: Requirements 6.4, 6.5**

- [x] 10. Implement randomization and fairness systems
  - [x] 10.1 Create fair randomization for game elements
    - Implement random starting city selection from 10 non-Buenos Aires cities
    - Add 5-city route generation with Buenos Aires as final destination
    - Create balanced random selection algorithms
    - Add randomization testing and validation
    - _Requirements: 1.3, 1.4, 8.2_

  - [ ]* 10.2 Write property test for starting city randomization fairness
    - **Property 10: Starting city randomization fairness**
    - **Validates: Requirements 1.3, 8.2**

- [-] 11. Add comprehensive error handling and input validation
  - [x] 11.1 Implement robust input validation system
    - Create user input sanitization and validation
    - Add click and selection validation against game state
    - Implement graceful error handling for all user actions
    - Create fallback responses for invalid operations
    - _Requirements: 8.3, 8.4_

  - [x] 11.2 Build asset loading error handling
    - Implement fallback images for missing assets
    - Add network failure handling for game data loading
    - Create loading states and error messages
    - Design graceful degradation for asset failures
    - _Requirements: 7.2, 8.4_

- [-] 12. Final integration and testing checkpoint
  - [x] 12.1 Integrate all game systems and test complete workflow
    - Connect all modules and ensure proper communication
    - Test complete game flow from start to finish
    - Validate all user interactions and edge cases
    - Ensure proper error handling throughout the application
    - _Requirements: All_

  - [ ]* 12.2 Write comprehensive integration tests
    - Create end-to-end game flow tests
    - Test complete user journey scenarios
    - Validate cross-module interactions
    - Test error recovery and edge cases

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.