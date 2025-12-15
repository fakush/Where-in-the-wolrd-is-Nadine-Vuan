# Requirements Document

## Introduction

"Where in the World is Nadine Vuan?" is an interactive detective adventure game inspired by Carmen Sandiego. Players take the role of Steve, a job candidate at Caylent, who must track down Nadine Vuan (Talent Recruiter) across 11 global cities by following clues from local informants. The game combines educational geography elements with corporate recruitment themes in a retro 1980s aesthetic.

## Glossary

- **Game_System**: The complete web-based detective adventure game application
- **Player**: The user controlling Steve's character in the game
- **Informant**: Non-player characters in each city who provide clues about Nadine's next destination
- **Clue**: Information provided by informants that hints at Nadine's next destination, available in three difficulty levels
- **Difficulty_Level**: Clue complexity rating (hard = 3 points, medium = 2 points, easy = 1 point)
- **Attempt**: One of three chances the player has to make incorrect guesses before game over
- **Score**: Points accumulated by making correct guesses based on clue difficulty used
- **Game_State**: The current status including visited cities, collected clues, score, and remaining attempts
- **City_Route**: The predetermined 5-city sequence ending with Buenos Aires that the player must follow during their investigation
- **Final_Encounter**: The concluding scene when the player successfully finds Nadine in Buenos Aires

## Requirements

### Requirement 1

**User Story:** As a player, I want to start a new game session with a randomized 5-city journey, so that I can begin tracking down Nadine Vuan.

#### Acceptance Criteria

1. WHEN a player loads the game THEN the Game_System SHALL display the game cover using portada_juego.png and introductory story with steve.png character portrait
2. WHEN a player clicks the start button THEN the Game_System SHALL initialize a new game session with randomized starting conditions
3. WHEN a new game begins THEN the Game_System SHALL randomly select a starting city from the 10 available non-Buenos Aires locations
4. WHEN the game initializes THEN the Game_System SHALL generate a 5-city route ending with Buenos Aires as the final destination
5. WHEN the intro sequence completes THEN the Game_System SHALL transition the player to the first city investigation screen

### Requirement 2

**User Story:** As a player, I want to investigate cities and gather clues from informants about Nadine's next destination, so that I can determine where to travel next.

#### Acceptance Criteria

1. WHEN a player enters a city THEN the Game_System SHALL display the appropriate scene image and informant dialogue
2. WHEN an informant has information about Nadine THEN the Game_System SHALL provide one clue at a time about Nadine's next destination, starting with hard difficulty
3. WHEN an informant has no information THEN the Game_System SHALL display the "not here" response and scene
4. WHEN a clue is presented THEN the Game_System SHALL display it in the informant dialogue box and store it in the player's collected clues list with its difficulty level
5. WHEN a player requests additional clues THEN the Game_System SHALL provide the next difficulty level (hard → medium → easy) for the same destination in the informant dialogue
6. WHEN a player views evidence THEN the Game_System SHALL display all collected clues in an organized evidence list interface

### Requirement 3

**User Story:** As a player, I want to make travel guesses based on the clues I've gathered, so that I can continue tracking Nadine's route and earn points.

#### Acceptance Criteria

1. WHEN a player chooses to make a guess THEN the Game_System SHALL present the world map for destination selection
2. WHEN a player selects the correct destination THEN the Game_System SHALL award points based on clue difficulty (3 for hard, 2 for medium, 1 for easy) and advance to that city
3. WHEN a player selects an incorrect destination THEN the Game_System SHALL deduct one attempt, display the "not here" scene image for that city, and provide feedback without advancing
4. WHEN a player visits a previously explored city THEN the Game_System SHALL prevent revisiting and maintain route integrity
5. WHEN travel occurs THEN the Game_System SHALL display travel animation from current city to destination and transition to the investigation phase for the new city

### Requirement 4

**User Story:** As a player, I want the game to track my score, attempts, and progress, so that I can understand my performance and remaining chances.

#### Acceptance Criteria

1. WHEN a player makes correct guesses THEN the Game_System SHALL award points (3 for hard clue, 2 for medium, 1 for easy) and provide positive feedback
2. WHEN a player makes incorrect guesses THEN the Game_System SHALL deduct one attempt from the remaining three attempts and provide feedback
3. WHEN game progress updates THEN the Game_System SHALL display current score, remaining attempts, and cities visited
4. WHEN a player has one attempt remaining THEN the Game_System SHALL provide clear warning about the final chance
5. WHEN a player exhausts all three attempts THEN the Game_System SHALL trigger game over condition

### Requirement 5

**User Story:** As a player, I want to follow a 5-city journey that leads to Buenos Aires, so that I can complete the recruitment challenge successfully.

#### Acceptance Criteria

1. WHEN a player successfully navigates through 4 cities THEN the Game_System SHALL present Buenos Aires as the final destination
2. WHEN a player reaches Buenos Aires through correct deduction THEN the Game_System SHALL trigger the final encounter sequence
3. WHEN the final encounter begins THEN the Game_System SHALL display Nadine's victory speech and Steve's response
4. WHEN the victory condition is met THEN the Game_System SHALL show the success message, final score, and completion status
5. WHEN the game concludes successfully THEN the Game_System SHALL provide options to restart or exit

### Requirement 6

**User Story:** As a player, I want the game to handle failure conditions when I run out of attempts, so that I can restart and try different approaches.

#### Acceptance Criteria

1. WHEN a player makes three incorrect guesses THEN the Game_System SHALL display game over message and final score
2. WHEN a game over occurs THEN the Game_System SHALL provide clear restart options to begin a new investigation
3. WHEN restarting THEN the Game_System SHALL reset all game state variables including score and attempts to initial conditions
4. WHEN multiple games are played THEN the Game_System SHALL maintain independent game sessions without data contamination
5. WHEN restart is selected THEN the Game_System SHALL regenerate randomized elements for replay value

### Requirement 7

**User Story:** As a player, I want the game interface to be responsive and visually appealing, so that I can enjoy the retro aesthetic across different devices.

#### Acceptance Criteria

1. WHEN the game loads on any device THEN the Game_System SHALL display a mobile-responsive interface
2. WHEN scene images are shown THEN the Game_System SHALL load and display the appropriate PNG assets including portada_juego.png for game cover, steve.png for character introduction, and city-specific scenes from the assets/scenes directory
3. WHEN text is presented THEN the Game_System SHALL use retro game fonts that match the 1980s theme
4. WHEN interactive elements are displayed THEN the Game_System SHALL use icon libraries for UI elements and provide clear visual feedback for user actions
5. WHEN the interface updates THEN the Game_System SHALL maintain consistent Carmen Sandiego-style UI design for clue presentation and travel selection across all game screens

### Requirement 8

**User Story:** As a player, I want the game to preserve data integrity and handle edge cases, so that I have a reliable gaming experience.

#### Acceptance Criteria

1. WHEN game data is accessed THEN the Game_System SHALL validate all JSON data structure before processing
2. WHEN random selections occur THEN the Game_System SHALL ensure fair distribution across available options
3. WHEN user inputs are received THEN the Game_System SHALL validate and sanitize all player interactions
4. WHEN errors occur THEN the Game_System SHALL handle exceptions gracefully without breaking the game flow
5. WHEN browser storage is used THEN the Game_System SHALL implement proper data persistence for game state