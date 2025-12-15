# Where in the World is Nadine Vuan? 🌍✈️

An interactive detective adventure game inspired by the classic "Where in the World is Carmen Sandiego?" where players follow clues across 11 global cities to find Nadine Vuan, a mysterious traveler and Caylent's Director of Corporate Travel.

## 📖 Story

You are **Steve**, a candidate applying for a position at Caylent. To prove your research and problem-solving skills, you must track down **Nadine Vuan**, who is traveling around the world. Follow clues from informants in each city, make strategic decisions about where to travel next, and demonstrate that you have what it takes to join the team.

## 🎮 Game Mechanics

### Core Gameplay
- **Start in a random city** where Nadine has already left
- **Talk to local informants** who provide 3 clues about where Nadine went next
- **Choose your next destination** based on the clues
- **If correct**: Arrive at the new city and receive new clues
- **If wrong**: The informant tells you Nadine wasn't there; you must try again
- **Always stay one step behind** Nadine until you catch up in Buenos Aires

### Difficulty Levels
Each city's clues come in three difficulty tiers:
- **Easy**: Obvious stereotypes and universally known landmarks
- **Medium**: Recognizable cultural elements requiring general knowledge
- **Hard**: Specific details requiring deeper cultural understanding

### Victory Condition
Successfully track Nadine through multiple cities and find her in **Buenos Aires** (always the final destination).

## 🌆 Cities Included

The game features 11 iconic cities across 6 continents: (city name, country, coordinates in pixels for map placement)

1. **Tokyo** 🇯🇵 - Japan - (2347,706)
2. **Rome** 🇮🇹 - Italy - (1415,650)
3. **Marrakech** 🇲🇦 - Morocco - (1245,762)
4. **London** 🇬🇧 - England - (1298.555)
5. **Reykjavik** 🇮🇸 - Iceland - (1167,400)
6. **Mexico City** 🇲🇽 - Mexico - (579,848)
7. **Sydney** 🇦🇺 - Australia - (2431,1268)
8. **Istanbul** 🇹🇷 - Turkey - (1585,729)
9. **Bangkok** 🇹🇭 - Thailand - (2063,889)
10. **New York** 🇺🇸 - USA - (764,662)
11. **Buenos Aires** 🇦🇷 - Argentina ⭐ (Final Destination) - (883,1270)

## 🎨 Art Style

The game features a **retro 1980s educational game aesthetic** reminiscent of the original Carmen Sandiego series:
- Vibrant flat colors with bold outlines
- Simplified geometric shapes
- Nostalgic educational illustration style
- Dramatic shadows and stylized proportions
- Detective mystery atmosphere

## 📁 Project Structure
```
/where-in-the-world-is-nadine-vuan
│
├── /assets
│   ├── /scenes
│   │   ├── tokyo_pistas.png
│   │   ├── tokyo_notHere.png
│   │   ├── rome_pistas.png
│   │   ├── rome_notHere.png
│   │   └── ... (2 images per city)
│   │
│   └── /data
│       └── game_data.json
│
├── /src
│   ├── index.html
│   ├── styles.css
│   └── game.js
│
├── README.md
└── LICENSE
```

## 📊 Game Data Structure

The game uses a comprehensive JSON database containing:

### Cities
```json
{
  "id": "tokyo",
  "name": "Tokio",
  "country": "Japón",
  "is_final": false,
  "informant": {
    "name": "Hiroshi",
    "greeting": "...",
    "farewell_helpful": "...",
    "farewell_unhelpful": "..."
  },
  "clues": {
    "difficult": [...],
    "medium": [...],
    "easy": [...]
  }
}
```

### Special Features in Buenos Aires
- Unique final encounter dialogue
- Victory message
- Nadine's reveal speech about the Caylent opportunity

## 🎯 Educational Value

While entertaining, the game teaches:
- **Geography**: Learn about cities, countries, and continents
- **Cultural awareness**: Discover customs, landmarks, and traditions
- **Critical thinking**: Analyze clues and make logical deductions
- **Research skills**: Connect information to reach conclusions
- **Persistence**: Learn from mistakes and keep trying

## 🛠️ Technical Implementation

### Recommended Technologies
- **Frontend**: HTML5, CSS3, JavaScript (vanilla or React)
- **State Management**: Local storage for game progress
- **Animation**: CSS animations or JavaScript libraries
- **Responsive Design**: Mobile-first approach

### Core Features to Implement
1. **Fair random city generation** for starting location with balanced distribution
2. **Advanced clue randomization** within difficulty tiers with fairness guarantees
3. **Route tracking** to prevent revisiting cities
4. **Score/time tracking** system
5. **Win/loss conditions**
6. **Restart functionality** with session isolation

## 🎭 Characters

### Nadine Vuan
- Sophisticated traveler and Caylent's Director of Corporate Travel
- Mysterious, elegant, and always one step ahead
- Passionate about authentic travel experiences

### Steve
- The player character
- Job candidate at Caylent
- Determined, curious, and resourceful

### Informants (11 unique characters)
Each city features a unique informant with:
- Localized personality and dialogue
- Cultural authenticity
- Helpful or unhelpful poses depending on game state

## 🌟 Easter Eggs & Special Clues

- **Rome**: References to **pasta** (mandatory clue)
- **London**: References to **Queen** (the band and royalty)
- Cultural phrases in local languages throughout dialogues
- Historical and contemporary references blended together

## 🚀 Getting Started

### For Players
1. Open the game in a web browser
2. Read the introduction from the Caylent HR director
3. Begin your search in a random city
4. Follow clues, choose destinations wisely
5. Track down Nadine in Buenos Aires!

### For Developers
1. Clone the repository
2. Review the `game_data.json` file for all content
3. Implement the game logic using your preferred framework
4. Use the provided image assets in `/assets/scenes`
5. Test thoroughly with different difficulty settings

## 📝 Game Design Notes

### Replayability
- **Fair random starting city** ensures different experiences with balanced distribution
- **Advanced randomized clue selection** from each difficulty tier with fairness guarantees
- **Multiple paths** to reach Buenos Aires
- **Session isolation** ensures each playthrough is completely independent

### 🎲 Randomization System
The game features a sophisticated randomization system that ensures fair and balanced gameplay:

#### Fair Starting City Selection
- Prevents recently selected cities from being chosen again immediately
- Ensures all non-final cities have equal probability over multiple games
- Validates selection integrity and provides fallback mechanisms

#### Balanced Clue Randomization
- Maintains fair distribution across difficulty tiers (easy, medium, difficult)
- Tracks selection history to prevent bias toward specific difficulties
- Supports both seeded and unseeded randomization for testing and gameplay

#### Quality Assurance
- Built-in fairness testing with configurable iteration counts
- System validation and integrity checks
- Comprehensive statistics and monitoring
- Session isolation to prevent data contamination between games

#### Testing and Validation
Run the randomization test suite:
```bash
# Simple Node.js test
node test_randomization_simple.js

# Interactive browser test (requires local server)
# Open test_randomization_system.html in browser
```

### Difficulty Balancing
- Three clues per city, varying in difficulty from hard to easy

## 🎨 Asset Credits

All illustrations generated by Gemini Nano Banana PRO text-to-image model.
Icons sourced from [FontAwesome](https://fontawesome.com/) & Lucide (https://lucide.dev/) under their free license.

**Image Count**:
- 2 main character portraits (Nadine, Steve)
- 22 city scene illustrations (2 per city × 11 cities)
- 1 final encounter scene (Buenos Aires)
- **Total: 25 unique illustrations**


---

**Built with ❤️ for travel lovers and problem solvers everywhere.**

*"The world is a book, and those who do not travel read only one page." - Saint Augustine*