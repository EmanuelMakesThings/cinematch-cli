# Cinematch CLI v1.0.0

Cinematch CLI is a fun, Tinder-style movie selector for groups. It allows multiple users to "swipe" on a curated list of movies to find the perfect film that everyone (or most people) will enjoy.

Created by **Jonah Cecil**.

## Features

- **Interactive UI:** Use arrow keys or `A/D` keys to swipe right (Like) or left (Dislike).
- **Group Mode:** Supports any number of participants.
- **Matching Engine:** Calculates unanimous "Perfect Matches" and majority "Popular Choices".
- **Large Database:** Includes nearly 100 top-rated movies with synopses.
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
