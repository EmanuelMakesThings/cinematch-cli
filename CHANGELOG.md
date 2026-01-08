# Changelog

All notable changes to this project will be documented in this file.

## [1.9.0] - 2026-01-07
### Added
- **Detailed Session Summary:** New feature accessible via `[S]` after a round. Shows individual likes, "Near Matches" (close calls), "Unique Tastes" (outlier picks), and a "Compatibility Score" between users.
- **Adaptive Matching Logic:** The app now learns from the group! If you fail to find matches, it automatically increases movie overlap, reduces variation, and biases the deck toward "crowd-pleaser" titles to help you reach a decision.
- **Expanded Library:** Added 10 new high-quality movies with verified posters, including 2023-2024 hits like *Dune: Part Two*, *Poor Things*, and *Spider-Man: Across the Spider-Verse*.

### Changed
- Replaced 404/broken poster URLs for several classic titles with high-quality alternatives.
- Refined the "Summary" view to prioritize data and compatibility metrics.

## [1.8.3] - 2026-01-07
### Changed
- Introduced per-user movie variation: The second person and onwards now see a slightly different set of movies (2 different titles) than the first person to keep things fresh.
- Increased session pool size to 12 movies to support deck variation while maintaining high match probability.

## [1.8.2] - 2026-01-07
### Changed
- Refactored swiping logic to use a single "session deck" for all users, increasing match probability.
- Optimized poster fetching to happen once per session instead of per user turn.

### Added
- Automatic retry mechanism (up to 2 retries) with backoff for poster fetching to improve network reliability.

## [1.8.1] - 2026-01-07
### Added
- Robust `try/catch` block for `movies.json` loading to prevent crashes on malformed files.
- Fisher-Yates shuffle algorithm for more uniform random movie selection.
- Batched poster fetching (5 at a time) with progressive loading indicator to improve network stability.
- Global constants for layout and configuration (`CARD_WIDTH`, `POSTER_HEIGHT`, etc.).
- Debug logging in `ascii-converter.js` (enabled via `DEBUG` environment variable).

### Fixed
- Potential crash when a movie is missing a `synopsis` field.
- Unused variable `allSelected` in `renderGenreSelect`.
- Inaccurate random shuffling using `Array.sort()`.

## [1.8.0] - 2026-01-07

### Added
- **Info Flip Feature:** Added ability to "flip" the movie card by pressing `[I]`, revealing additional metadata like Director, Starring Cast, Rating, and an expanded synopsis.
- **Enhanced Data:** Updated `movies.json` with detailed metadata for top titles to support the new deep-dive view.

## [1.7.0] - 2026-01-07

### Added
- **Match Celebration Animation:** Implemented a colorful "BOOM!" confetti animation that plays when a group finds a unanimous "Perfect Match."
- **Movie-Themed Loading Messages:** Replaced the generic "Preparing movies" text with a variety of funny, random movie quips (e.g., "Helping Indiana Jones find his hat," "Finding Nemo (again)").

## [1.6.0] - 2026-01-07

### Added
- **Visual Swipe Animations:** Implemented large, color-coded "LIKE" and "PASS" animations that play immediately after a user makes a choice.
- **Quick Rematch Feature:** Added a post-game prompt `[R]` that allows groups to immediately start a new session with 10 random movies, bypassing setup and genre selection for a faster second round.
- **Angry Forced Pick:** Added a "patience" system for 2-user groups. If no match is found after 3 consecutive rounds, the app triggers an angry animation and forces a random movie selection.

## [1.5.0] - 2026-01-07

### Changed
- **Match Logic:** Removed automatic exit when no matches are found, allowing the Rematch prompt to always be visible.

## [1.4.0] - 2026-01-07

### Added
- **Tie-Breaker Roulette:** Implemented a "Roulette" mode for groups of 3 or more. If no unanimous match is found, the app picks the top 3 popular choices and selects one via an animated selection process.
- **Dynamic Animation Easing:** The roulette animation now slows down as it approaches the final winner for added suspense.
- **Roulette UI Enhancements:** Added a footer to the animation showing the number of top choices being rotated through.

## [1.3.0] - 2026-01-07

### Added
- **Boxed Turn Info:** Added a decorative magenta box around the user's turn and movie progress information for better visibility.

### Changed
- **Swipe UI Refinement:** Removed the border outline from movie posters to create a more open, modern look.
- **Enhanced Placeholder:** Updated the "Image Not Found" ASCII art to a full-sized 60x30 blocky frame that occupies the same space as a standard poster.

## [1.2.1] - 2026-01-07

### Added
- **User-Agent Headers:** Added `User-Agent` to axios requests in `ascii-converter.js` to improve compatibility with sites that block generic scrapers (e.g., Wikimedia).

### Fixed
- **Poster Database:** Successfully repaired 53 broken movie poster URLs in `data/movies.json`, ensuring high-quality ASCII art displays for more of the library.

### Changed
- **Folder Organization:** Moved test scripts to a standard `test/` directory and cleaned up the root project folder.

## [1.2.0] - 2026-01-07

### Added
- **Interactive Genre Menu:** Added a multi-select interface for users to filter movies by genre (e.g., Action, Comedy) before the game starts.
- **Smart Backfilling:** Implemented logic to automatically fill the movie deck with random picks from other genres if the selected genre(s) have too few movies, ensuring a full 10-swipe turn.
- **Data Attributes:** Updated `movies.json` to include accurate genre tags for all ~100 movies.

### Changed
- **Project Structure:** Reorganized codebase into `src/`, `data/`, and `scripts/` directories for better maintainability.
- **Controls:** Added Spacebar support for menu toggling.

## [1.1.0] - 2026-01-07

### Added
- **High-Fidelity ASCII Posters:** Replaced standard text titles with vibrant, half-block character ASCII art for movie posters, doubling vertical resolution.
- **Dynamic Loading Screen:** Added an animated loading state that pre-fetches and caches ASCII art before a user's turn begins to ensure smooth swiping.
- **Image Fallback System:** Implemented a robust fallback mechanism that displays a "IMAGE NOT FOUND" placeholder if a poster URL is invalid or the request times out.
- **Screenshots:** Added visual previews to the `README.md` to showcase the new CLI interface.

### Changed
- Updated `movies.json` handling to support asynchronous fetching of poster images.
- Improved UI layout to accommodate the new 60-column wide movie cards.
