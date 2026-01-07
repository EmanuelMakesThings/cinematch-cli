
<img width="527" height="195" alt="Screenshot 2026-01-07 142357" src="https://github.com/user-attachments/assets/79be9395-e406-47f9-9469-2cbfdcc46cf7" />

# Cinematch CLI v1.3.0

Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.

Created by **Jonah Cecil**.

<img width="580" height="898" alt="Screenshot 2026-01-07 083234" src="https://github.com/user-attachments/assets/f546c239-039b-4e42-926a-11576fa38548" />

<img width="573" height="424" alt="Screenshot 2026-01-07 083320" src="https://github.com/user-attachments/assets/e194ba34-ca3f-44a5-8940-3a5921e4ea1d" />




## What's New in v1.3.0
- **Refined Swipe UI:** Removed poster outlines for a cleaner aesthetic and introduced a boxed "Turn Info" header to better track the current user and progress.
- **Improved Image Fallback:** Enhanced the "Image Not Found" placeholder to perfectly match the 60x30 footprint of successful posters, maintaining a stable layout.

## Major Features
- **Interactive Genre Filtering:** A multi-select menu allows groups to choose exactly what kind of movie night they want (Action, Comedy, etc.), with smart backfilling to ensure a full deck.

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
