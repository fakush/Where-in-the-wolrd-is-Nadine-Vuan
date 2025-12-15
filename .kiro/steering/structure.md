# Project Structure

## Current Directory Layout
```
/where-in-the-world-is-nadine-vuan/
├── assets/
│   ├── data/
│   │   └── game_data.json          # Central game configuration
│   └── scenes/
│       ├── [city]_pistas.png       # City clue scenes (11 cities)
│       ├── [city]_notHere.png      # City "not here" scenes (11 cities)
│       ├── portada_juego.png       # Game cover/intro
│       ├── steve.png               # Player character
│       └── world_map.png           # World map for navigation
├── .kiro/
│   └── steering/                   # AI assistant guidance
├── README.md                       # Comprehensive project documentation
└── LICENSE                         # Apache 2.0 license
```

## Missing Implementation Files
The project currently lacks the actual game implementation. Expected structure:
```
├── src/                            # Source code (to be created)
│   ├── index.html                  # Main game interface
│   ├── styles.css                  # Game styling (retro 1980s theme)
│   └── game.js                     # Core game logic
```

## Asset Organization
- **Scene Images**: Follow naming convention `{cityId}_{state}.png`
  - `pistas` = clue scenes when city has information
  - `notHere` = scenes when Nadine wasn't in that city
- **Data**: Single JSON file contains all game content (cities, clues, dialogue)
- **Characters**: Separate portrait files for main characters

## Key Conventions
- City IDs use lowercase with underscores (e.g., `new_york`, `mexico_city`)
- Spanish as primary language with English elements
- Consistent informant dialogue structure (greeting, farewell_helpful, farewell_unhelpful)
- Three-tier clue difficulty system (difficult, medium, easy)
- Buenos Aires always marked as `is_final: true`

## Development Guidelines
- Keep game logic modular and data-driven
- Maintain separation between game data (JSON) and presentation logic
- Preserve retro aesthetic in all UI implementations
- Ensure mobile-responsive design for cross-platform play