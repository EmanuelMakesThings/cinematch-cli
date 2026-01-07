
<img width="532" height="164" alt="Screenshot 2026-01-07 164341" src="https://github.com/user-attachments/assets/83c68273-ad3f-4279-96e9-539fa1f17e9a" />

# Cinematch CLI v1.5.0



Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.



Created by **Jonah Cecil**.



<img width="568" height="925" alt="Screenshot 2026-01-07 153457" src="https://github.com/user-attachments/assets/cddfed5f-954f-4dab-b47a-e3eee8020206" />



<img width="573" height="424" alt="Screenshot 2026-01-07 083320" src="https://github.com/user-attachments/assets/e194ba34-ca3f-44a5-8940-3a5921e4ea1d" />









## What's New in v1.5.0









- **Quick Rematch:** Finished a round but want more? You can now trigger a "Rematch" immediately. This skips all setup and starts a fresh game with 10 random movies for the same group of users.









- **The "Angry Pick" (for 2 Users):** If a pair fails to find a match after 3 consecutive attempts, the app will play an angry animation and force a random movie choice on them. No more arguing!



## Major Features

- **Tie-Breaker Roulette:** If a group of 3+ users cannot find a unanimous "Perfect Match," the app automatically enters a high-stakes animated roulette to choose between the top 3 most popular movies.

- **Interactive Genre Filtering:** A multi-select menu allows groups to choose exactly what kind of movie night they want (Action, Comedy, etc.), with smart backfilling to ensure a full deck.



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
