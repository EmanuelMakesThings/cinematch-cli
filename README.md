<img width="530" height="166" alt="Screenshot 2026-01-07 164341" src="https://github.com/user-attachments/assets/40b8419a-07af-4df0-8380-a546aea66e62" />


# Cinematch CLI v1.8.3

Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.

Created by **Jonah Cecil**.

<img width="568" height="925" alt="Screenshot 2026-01-07 153457" src="https://github.com/user-attachments/assets/cddfed5f-954f-4dab-b47a-e3eee8020206" />

<img width="573" height="424" alt="Screenshot 2026-01-07 083320" src="https://github.com/user-attachments/assets/e194ba34-ca3f-44a5-8940-3a5921e4ea1d" />




## What's New in v1.8.3
- **Dynamic User Decks:** To keep the experience fresh, the second person and onwards now see two movies that are different from the first person's deck.
- **Balanced Matching:** Even with deck variation, users still share 80% of the same movies, ensuring "Perfect Matches" remain frequent and rewarding.

## What's New in v1.8.2
- **Shared Movie Decks:** Users now swipe on the same set of movies during a session, making it much easier to find a "Perfect Match."
- **One-Time Poster Loading:** Posters are now fetched and cached once per session, significantly speeding up transitions between user turns.
- **Network Robustness:** Added an automatic retry mechanism with exponential backoff for poster fetching, reducing "Image Not Found" errors on unstable connections.

## What's New in v1.8.1
- **Enhanced Stability:** Added robust error handling for data loading and synopsis processing to prevent crashes.
- **Improved Performance:** Implemented batched poster fetching and a more uniform random shuffle algorithm for a smoother user experience.
- **Clean Architecture:** Refactored magic numbers into configurable constants and improved overall code maintainability.

## What's New in v1.8.0
- **Info Flip (Deep Dive):** Press `[I]` while swiping to "flip" the movie card and reveal deep-dive details like the Director, Starring Cast, IMDB Rating, and a full synopsis.
- **Match Celebration:** Finding a "Perfect Match" now triggers a vibrant, full-screen ASCII confetti animation. Celebrate your group's unanimous decision in style!

## Major Features
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

- `src/`: Application source code (`index.js`, `ascii-converter.js`).
- `data/`: JSON data files (`movies.json`).
- `test/`: Test scripts (`test-poster.js`).
- `package.json`: Project metadata and dependencies.

## License

This project is open-source and available under the ISC License.