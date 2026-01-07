# Cinematch CLI v1.1.0

Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.

Created by **Jonah Cecil**.
<img width="525" height="191" alt="Screenshot 2026-01-07 083140" src="https://github.com/user-attachments/assets/ca9385d7-56a5-4bfd-833c-49edebd6d83b" />
<img width="572" height="1074" alt="Screenshot 2026-01-07 083234" src="https://github.com/user-attachments/assets/4b4d685f-1ab0-4476-8f45-bb2408de6cf1" />
<img width="577" height="365" alt="Screenshot 2026-01-07 083320" src="https://github.com/user-attachments/assets/0dfcaed4-a731-4326-994d-9aa6c85ababb" />



## What's New in v1.1.0
- **High-Fidelity Half-Block ASCII Posters:** Experience movie posters rendered with near-photographic clarity directly in your terminal, using advanced half-block characters for double the vertical resolution and full-color support.
- **Dynamic Loading Screen:** A smooth, animated loading screen now prepares your movie reels, preventing swiping until all posters for a turn are ready.
- **Robust Image Fallback:** Bad or unavailable poster URLs now gracefully display a "IMAGE NOT FOUND" placeholder, ensuring a consistent UI.

## Features

- **Interactive UI:** Use arrow keys or `A/D` keys to swipe right (Like) or left (Dislike).
- **Group Mode:** Supports any number of participants.
- **Matching Engine:** Calculates unanimous "Perfect Matches" and majority "Popular Choices".
- **Large Database:** Includes nearly 100 top-rated movies with synopses and now, vibrant ASCII posters.
- **Clean Interface:** Beautiful terminal colors powered by `chalk`.

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
node index.js
```

### How it Works
1. **Setup:** Enter the number of people participating.
2. **Swipe Phase:** Each person takes turns swiping on a random selection of 10 movies.
3. **Results:** After everyone has finished, the app compares the "Likes" and presents the best matches for the group!

### Controls
- **Right Arrow** or **D**: Like / Swipe Right
- **Left Arrow** or **A**: Dislike / Swipe Left
- **Ctrl + C**: Exit

## Project Structure

- `index.js`: The main application logic and terminal interface.
- `movies.json`: The database of movies and synopses.
- `package.json`: Project metadata and dependencies.

## License

This project is open-source and available under the ISC License.
