<img width="530" height="166" alt="Screenshot 2026-01-07 164341" src="https://github.com/user-attachments/assets/40b8419a-07af-4df0-8380-a546aea66e62" />


# Cinematch CLI v1.10.0

Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.

Created by **Jonah Cecil**.

<img width="568" height="925" alt="Screenshot 2026-01-07 153457" src="https://github.com/user-attachments/assets/cddfed5f-954f-4dab-b47a-e3eee8020206" />

<img width="573" height="424" alt="Screenshot 2026-01-07 083320" src="https://github.com/user-attachments/assets/e194ba34-ca3f-44a5-8940-3a5921e4ea1d" />




## What's New in v1.10.0
- **TV Shows:** Now featuring a curated selection of top-tier TV shows! Enable them by selecting the "TV Shows" genre in the menu.
- **2024-2025 Library Expansion:** Added 20 brand new titles, covering hits from 2024 and 2025.
- **Visual & Stability Refinements:** Perfectly aligned UI borders using new ANSI-aware padding and a fully unified state engine for rock-solid performance.
- **Stability Improvements:** Fixed navigation buttons at the end of rounds and resolved color rendering crashes.
- **Under-the-Hood Overhaul:** Fully modularized code structure for better performance and easier updates.
- **Perfect Match Roulette:** Too many good choices? If your group agrees on multiple movies, Cinematch now spins the wheel to pick the ultimate winner from your unanimous likes!
- **Monochrome Mode & Color Flags:** Added a high-resolution grayscale fallback for non-color terminals. You can now also force color levels using `--no-color`, `--color=16`, `--color=256`, or `--color=truecolor`.
- **Dynamic Genre Themes:** Selecting **Crime**, **Fantasy**, **Horror**, **Sci-Fi**, **Western**, or **Romance** now triggers a unique UI redesign (colors, borders, and icons) that matches the mood of your chosen genre!
- **Smarter Summaries:** The summary view now includes word wrapping for long movie lists and is accessible after every type of round conclusion.

## What's New in v1.9.0
- **Deep Session Summary:** After the matches are revealed, press `[S]` to see a full breakdown of the session, including who liked what and how compatible your tastes were!
- **Smart Adaptive Decks:** If your group is having trouble deciding, Cinematch now automatically adjusts. It will show more of the same movies to everyone and prioritize highly-rated "crowd-pleasers" to help find common ground.
- **Enhanced Data Metrics:** The summary view now calculates a **Compatibility Score** between users based on their shared interests.
- **10 New Movies:** Fresh hits like *Dune: Part Two*, *Spider-Man: Across the Spider-Verse*, and *Poor Things* have been added to the database.

## Major Features
- **Info Flip (Deep Dive):** Press `[I]` while swiping to "flip" the movie card and reveal deep-dive details like the Director, Starring Cast, IMDB Rating, and a full synopsis.
- **Tie-Breaker Roulette:** If a group of 3+ users cannot find a unanimous "Perfect Match," the app automatically enters a high-stakes animated roulette to choose between the top 3 most popular movies.
- **Quick Rematch:** Finished a round but want more? You can trigger a "Rematch" immediately after any round to start a fresh game.

## Features

- **Interactive UI:** Swipe right (Like) or left (Dislike) on beautiful ASCII posters.
- **Genre Selection:** Filter movies by mood using an easy-to-use checklist menu.
- **Group Mode:** Supports any number of participants.
- **Matching Engine:** Calculates unanimous "Perfect Matches" and majority "Popular Choices".
- **Large Database:** Includes nearly 100 top-rated movies with synopses and genre tags.

![showcase](https://github.com/user-attachments/assets/1b1794ba-818d-498f-88ce-6461c2c54ada)

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/EmanuelMakesThings/cinematch-cli.git
   cd cinematch-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

Start the application:
```bash
npm start
```

Run a poster test:
```bash
npm test
```

### How it Works
1. **Setup:** Enter the number of people participating.
2. **Genre Select:** Pick one or more genres to narrow down the list (or just hit Enter for everything!).
3. **Swipe Phase:** Each person takes turns swiping on a selection of 10 movies.
4. **Results:** After everyone has finished, the app compares the "Likes" and presents the best matches for the group!

### Controls
- **Arrow Keys**: Navigate Menus / Swipe
- **Space**: Toggle Selection (in menus)
- **Enter**: Confirm Selection
- **Ctrl + C**: Exit

## Project Structure

- `src/`: Application source code.
    - `index.js`: Main entry point and state manager.
    - `config.js`: Configuration constants and theme definitions.
    - `logic.js`: Core game logic (shuffling, matching, filtering).
    - `ui.js`: UI rendering, ASCII art, and animations.
    - `ascii-converter.js`: Image-to-ASCII processing utility.
- `data/`: JSON data files (`movies.json`).
- `test/`: Test scripts (`test-poster.js`).
- `package.json`: Project metadata and dependencies.

## License

This project is open-source and available under the ISC License.
