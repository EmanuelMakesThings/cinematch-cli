<img width="525" height="191" alt="Screenshot 2026-01-07 083140" src="https://github.com/user-attachments/assets/ca9385d7-56a5-4bfd-833c-49edebd6d83b" />

# Cinematch CLI v1.2.0

Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.

Created by **Jonah Cecil**.

<img width="572" height="1074" alt="Screenshot 2026-01-07 083234" src="https://github.com/user-attachments/assets/4b4d685f-1ab0-4476-8f45-bb2408de6cf1" />
<img width="577" height="365" alt="Screenshot 2026-01-07 083320" src="https://github.com/user-attachments/assets/0dfcaed4-a731-4326-994d-9aa6c85ababb" />



## What's New in v1.2.0
- **Interactive Genre Filtering:** A new multi-select menu allows groups to choose exactly what kind of movie night they want (e.g., Action + Sci-Fi).
- **Smart Backfilling:** If a selected genre has too few movies, the app automatically adds random picks from other genres to ensure a full game, keeping the experience smooth.
- **Refined Project Structure:** Codebase is now cleaner and better organized with `src` and `data` directories.

## Features

- **Interactive UI:** Swipe right (Like) or left (Dislike) on beautiful ASCII posters.
- **Genre Selection:** Filter movies by mood using an easy-to-use checklist menu.
- **Group Mode:** Supports any number of participants.
- **Matching Engine:** Calculates unanimous "Perfect Matches" and majority "Popular Choices".
- **Large Database:** Includes nearly 100 top-rated movies with synopses and genre tags.

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
node src/index.js
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

- `src/`: Application source code (`index.js`, `ascii-converter.js`).
- `data/`: JSON data files (`movies.json`).
- `scripts/`: Utility and test scripts.
- `package.json`: Project metadata and dependencies.

## License

This project is open-source and available under the ISC License.
