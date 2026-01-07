# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-07

### Added
- **High-Fidelity ASCII Posters:** Replaced standard text titles with vibrant, half-block character ASCII art for movie posters, doubling vertical resolution.
- **Dynamic Loading Screen:** Added an animated loading state that pre-fetches and caches ASCII art before a user's turn begins to ensure smooth swiping.
- **Image Fallback System:** Implemented a robust fallback mechanism that displays a "IMAGE NOT FOUND" placeholder if a poster URL is invalid or the request times out.
- **Screenshots:** Added visual previews to the `README.md` to showcase the new CLI interface.

### Changed
- Updated `movies.json` handling to support asynchronous fetching of poster images.
- Improved UI layout to accommodate the new 60-column wide movie cards.
