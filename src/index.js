const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const figlet = require('figlet');
const { getAsciiPoster } = require('./ascii-converter');

// Constants
const CARD_WIDTH = 60;
const POSTER_HEIGHT = 30;
const SWIPES_PER_USER = 10;
const POSTER_FETCH_BATCH_SIZE = 5;

// Load movies
const moviesPath = path.join(__dirname, '../data/movies.json');
let movies = [];
try {
    const data = fs.readFileSync(moviesPath, 'utf8');
    movies = JSON.parse(data);
} catch (error) {
    console.error(chalk.red(`Fatal Error: Could not load movies from ${moviesPath}.`));
    console.error(chalk.red(error.message));
    process.exit(1);
}
let filteredMovies = [...movies];

// Fisher-Yates Shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Setup keypress handling
readline.emitKeypressEvents(process.stdin);

const userChoices = {};
let users = [];
let currentUserIndex = 0;
let currentMovieIndex = 0;
let userLikes = [];
let sessionMovies = [];
let sessionVariation = 2;
let posterCache = {}; // Cache ASCII art
let postersLoading = false;
let isAnimating = false; // Prevent input during animations
let isFlipped = false; // Toggle between poster and info
let appState = 'SETUP'; // SETUP, GENRE_SELECT, SWIPING, TRANSITION, RESULTS
let attemptCount = 0; // Track consecutive fails for 2 users

// Genre Selection State
let availableGenres = [];
let selectedGenreIndices = new Set();
let genreCursor = 0;

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function showHeader() {
    const title = figlet.textSync('Cinematch', { font: 'Slant' });
    const lines = title.split('\n').filter(l => l.trim().length > 0);
    const width = Math.max(...lines.map(l => l.length));
    const border = '═'.repeat(width + 4);
    
    console.log(chalk.cyan(`╔${border}╗`));
    lines.forEach(l => {
        console.log(chalk.cyan(`║  ${l.padEnd(width)}  ║`));
    });
    console.log(chalk.cyan(`╚${border}╝`));
    console.log(chalk.bold.white(`     v1.9.0 | Created by Jonah Cecil       `));
    console.log('');
}

let consecutiveFailures = 0; // Track failures across sessions for adaptive logic

function getUniqueGenres() {
    const genres = new Set();
    movies.forEach(m => {
        if (m.genres) {
            m.genres.forEach(g => genres.add(g));
        }
    });
    return Array.from(genres).sort();
}

async function startApp() {
    clearScreen();
    showHeader();
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question(chalk.yellow('How many people are making decisions? '), (num) => {
        const count = parseInt(num);
        if (isNaN(count) || count <= 0) {
            console.log(chalk.red('Please enter a valid number!'));
            process.exit();
        }

        for (let i = 1; i <= count; i++) {
            users.push(`User ${i}`);
        }
        
        rl.close();
        
        // Initialize Genre Selection
        availableGenres = getUniqueGenres();
        appState = 'GENRE_SELECT';
        
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        
        renderGenreSelect();
    });
}

function renderGenreSelect() {
    clearScreen();
    showHeader();
    
    console.log(chalk.yellow.bold('Select Genres (Space to toggle, Enter to confirm):\n'));
    
    availableGenres.forEach((genre, index) => {
        const isSelected = selectedGenreIndices.has(index);
        const isHovered = index === genreCursor;
        
        const checkbox = isSelected ? chalk.green('[x]') : chalk.gray('[ ]');
        const label = isSelected ? chalk.green.bold(genre) : chalk.white(genre);
        const cursor = isHovered ? chalk.cyan('>') : ' ';
        
        console.log(`${cursor} ${checkbox} ${label}`);
    });
    
    console.log(chalk.gray('\n(If no genres are selected, ALL movies will be included)'));
}

function handleGenreInput(key) {
    if (key.name === 'up') {
        genreCursor = Math.max(0, genreCursor - 1);
        renderGenreSelect();
    } else if (key.name === 'down') {
        genreCursor = Math.min(availableGenres.length - 1, genreCursor + 1);
        renderGenreSelect();
    } else if (key.name === 'space') {
        if (selectedGenreIndices.has(genreCursor)) {
            selectedGenreIndices.delete(genreCursor);
        } else {
            selectedGenreIndices.add(genreCursor);
        }
        renderGenreSelect();
    } else if (key.name === 'return') {
        finalizeGenreSelection();
    }
}

function finalizeGenreSelection() {
    let selectedGenres = Array.from(selectedGenreIndices).map(i => availableGenres[i]);
    
    if (selectedGenres.length === 0) {
        // All movies if none selected
        filteredMovies = [...movies];
        console.log(chalk.green('\nNo specific genres selected. Using ALL movies.'));
    } else {
        // Filter movies that match ANY of the selected genres
        const genreMovies = movies.filter(m => 
            m.genres && m.genres.some(g => selectedGenres.includes(g))
        );
        
        const requiredPoolSize = SWIPES_PER_USER + 2;
        if (genreMovies.length < requiredPoolSize) {
            console.log(chalk.yellow(`\n⚠️  Only ${genreMovies.length} movies found for selected genres.`));
            console.log(chalk.yellow(`   Adding random movies from other genres to reach a full deck...`));
            
            // Get unique movies that are NOT in the current selection
            const existingTitles = new Set(genreMovies.map(m => m.title));
            const otherMovies = movies.filter(m => !existingTitles.has(m.title));
            const shuffledOthers = shuffle([...otherMovies]);
            const needed = requiredPoolSize - genreMovies.length;
            
            filteredMovies = [...genreMovies, ...shuffledOthers.slice(0, needed)];
        } else {
            filteredMovies = genreMovies;
        }
        console.log(chalk.green(`\nSelected Genres: ${selectedGenres.join(', ')} (Pool size: ${filteredMovies.length})`));
    }
    
    // Slight delay to read the message
    setTimeout(() => {
        initializeSession();
    }, 1500);
}

function getRandomMovies(count) {
    let pool = [...filteredMovies];
    
    // Bias toward crowd-pleasers if failing to match
    if (consecutiveFailures > 0) {
        const crowdPleasers = pool.filter(m => m.isCrowdPleaser);
        const others = pool.filter(m => !m.isCrowdPleaser);
        // Mix them, but put crowd pleasers first
        pool = [...shuffle(crowdPleasers), ...shuffle(others)];
    } else {
        pool = shuffle(pool);
    }
    
    return pool.slice(0, count);
}

async function initializeSession() {
    // Adaptive logic: reduce variation if failing
    sessionVariation = Math.max(0, 2 - consecutiveFailures);
    const poolSize = SWIPES_PER_USER + sessionVariation;
    
    sessionMovies = getRandomMovies(poolSize);
    posterCache = {};
    postersLoading = true;
    appState = 'LOADING';

    renderLoading();

    // Fetch posters in batches for the entire session
    for (let i = 0; i < sessionMovies.length; i += POSTER_FETCH_BATCH_SIZE) {
        const batch = sessionMovies.slice(i, i + POSTER_FETCH_BATCH_SIZE);
        await Promise.all(batch.map(async (movie) => {
            const movieIdx = sessionMovies.indexOf(movie);
            if (movie.posterUrl) {
                const ascii = await getAsciiPoster(movie.posterUrl, CARD_WIDTH, POSTER_HEIGHT);
                if (ascii) {
                    posterCache[movieIdx] = ascii;
                }
            }
        }));
    }
    
    postersLoading = false;
    startUserTurn();
}

async function startUserTurn() {
    if (currentUserIndex >= users.length) {
        appState = 'RESULTS';
        showResults();
        return;
    }

    currentMovieIndex = 0;
    userLikes = [];
    appState = 'SWIPING';
    
    renderSwipe();
}

function renderLoading() {
    clearScreen();
    showHeader();
    
    const messages = [
        "Helping Indiana Jones find his hat...",
        "Getting James Bond out of the shower...",
        "Feeding the dinosaurs in Jurassic Park...",
        "Wait, did we leave the oven on at the Overlook Hotel?",
        "Convincing the Avengers to assemble...",
        "Finding Nemo (again)...",
        "Untangling the VHS tapes...",
        "Microwaving the popcorn...",
        "Cleaning up slime at the Ghostbusters firehouse...",
        "Recharging the Flux Capacitor...",
        "Looking for the key to the Matrix...",
        "Trying to remember the first rule of Fight Club..."
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    console.log(chalk.yellow.bold(`\n   📥 ${randomMessage}`));
    console.log(chalk.gray('   This will only take a moment.\n'));
    
    // Simple animated loader
    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const interval = setInterval(() => {
        if (appState !== 'LOADING') {
            clearInterval(interval);
            return;
        }
        process.stdout.write(`\r   ${chalk.cyan(spinner[i])} Loading posters...`);
        i = (i + 1) % spinner.length;
    }, 100);
}

function renderSwipe() {
    clearScreen();
    showHeader();
    
    const user = users[currentUserIndex];
    // Person 1 sees movies 0-9, Person 2+ sees offset deck
    const movieIdx = (currentUserIndex === 0) ? currentMovieIndex : currentMovieIndex + sessionVariation;
    const movie = sessionMovies[movieIdx];
    const asciiPoster = posterCache[movieIdx];
    const synopsis = movie.synopsis || '';
    
    const turnText = `👤 ${user}'s Turn | 🎬 Movie ${currentMovieIndex + 1} of ${SWIPES_PER_USER}`;
    console.log(chalk.magenta(`┌${'─'.repeat(CARD_WIDTH)}┐`));
    console.log(chalk.magenta('│ ') + chalk.magenta.bold(turnText.padEnd(CARD_WIDTH - 2)) + chalk.magenta(' │'));
    console.log(chalk.magenta(`└${'─'.repeat(CARD_WIDTH)}┘\n`));
    
    if (isFlipped) {
        // Render the "Back" of the card
        console.log(chalk.cyan(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        console.log(chalk.cyan('│') + chalk.bold.white('   MOVIE DETAILS'.padEnd(CARD_WIDTH)) + chalk.cyan('│'));
        console.log(chalk.cyan(`├${'─'.repeat(CARD_WIDTH)}┤`));
        
        const details = [
            { label: 'TITLE', value: movie.title },
            { label: 'GENRES', value: movie.genres ? movie.genres.join(', ') : 'N/A' },
            { label: 'RATING', value: movie.rating || 'No rating available' },
            { label: 'DIRECTOR', value: movie.director || 'Unknown' },
            { label: 'STARRING', value: movie.stars || 'N/A' }
        ];

        details.forEach(detail => {
            const labelStr = `  ${detail.label}: `;
            const valueStr = detail.value.toString();
            const availableWidth = CARD_WIDTH - labelStr.length;
            const truncatedValue = valueStr.length > availableWidth ? valueStr.slice(0, availableWidth - 3) + '...' : valueStr;
            const fullLine = (labelStr + truncatedValue).padEnd(CARD_WIDTH);
            console.log(chalk.cyan('│') + chalk.yellow(labelStr) + chalk.white(truncatedValue.padEnd(availableWidth)) + chalk.cyan('│'));
        });

        console.log(chalk.cyan('│') + ' '.repeat(CARD_WIDTH) + chalk.cyan('│'));
        console.log(chalk.cyan('│') + chalk.yellow('  SYNOPSIS:'.padEnd(CARD_WIDTH)) + chalk.cyan('│'));
        
        let synopsisLines = 0;
        const words = synopsis.split(' ');
        let line = '  ';
        words.forEach(word => {
            if ((line + word).length > (CARD_WIDTH - 4)) {
                console.log(chalk.cyan('│') + chalk.white(line.padEnd(CARD_WIDTH)) + chalk.cyan('│'));
                line = '  ' + word + ' ';
                synopsisLines++;
            } else {
                line += word + ' ';
            }
        });
        console.log(chalk.cyan('│') + chalk.white(line.padEnd(CARD_WIDTH)) + chalk.cyan('│'));
        synopsisLines++;

        // Fill remaining space to match poster height (30 lines)
        // Header(2) + Details(5) + Spacer(1) + SynopsisHeader(1) + SynopsisLines
        const usedLines = 2 + details.length + 1 + 1 + synopsisLines;
        for (let i = 0; i < (POSTER_HEIGHT - usedLines); i++) {
            console.log(chalk.cyan('│') + ' '.repeat(CARD_WIDTH) + chalk.cyan('│'));
        }
        console.log(chalk.cyan(`└${'─'.repeat(CARD_WIDTH)}┘\n`));
    } else {
        // Render the "Front" (Poster)
        console.log(chalk.blue(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        if (asciiPoster) {
            console.log(asciiPoster.split('\n').map(line => chalk.blue('│') + line + chalk.blue('│')).join('\n'));
        } else {
            for(let i=0; i<POSTER_HEIGHT; i++) console.log(chalk.blue('│') + ' '.repeat(CARD_WIDTH) + chalk.blue('│'));
        }
        console.log(chalk.blue(`└${'─'.repeat(CARD_WIDTH)}┘\n`));
    }

    // Movie Card UI (Bottom)
    console.log(chalk.white(`┌${'─'.repeat(CARD_WIDTH)}┐`));
    const titleLine = `  ${movie.title}`.padEnd(CARD_WIDTH);
    console.log(chalk.white('│') + chalk.bgBlue.bold.white(titleLine) + chalk.white('│'));
    console.log(chalk.white(`├${'─'.repeat(CARD_WIDTH)}┤`));

    // Genres Line
    if (movie.genres) {
        const genreText = `  GENRE: ${movie.genres.join(', ')}`.padEnd(CARD_WIDTH);
        console.log(chalk.white('│') + chalk.yellow(genreText) + chalk.white('│'));
        console.log(chalk.white(`├${'─'.repeat(CARD_WIDTH)}┤`));
    }
    
    // Synopsis snippet (always shown at bottom)
    const synopsisSnippet = (synopsis.slice(0, CARD_WIDTH - 5) + (synopsis.length > CARD_WIDTH - 5 ? '...' : '')).padEnd(CARD_WIDTH - 2);
    console.log(chalk.white('│') + chalk.white(`  ${synopsisSnippet}`) + chalk.white('│'));
    console.log(chalk.white(`└${'─'.repeat(CARD_WIDTH)}┘`));
    
    console.log('\n' + chalk.green('  [→] Swipe Right (LIKE)    ') + chalk.red(' [←] Swipe Left (PASS)'));
    console.log(chalk.cyan('  [I] Flip Card (INFO)      ') + chalk.gray(' Press Ctrl+C to exit'));
}

process.stdin.on('keypress', (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
        process.exit();
    }

    if (isAnimating) return;

    if (appState === 'GENRE_SELECT') {
        handleGenreInput(key);
    } else if (appState === 'SWIPING') {
        const isRight = key && (key.name === 'right' || key.name === 'd');
        const isLeft = key && (key.name === 'left' || key.name === 'a');
        const isInfo = key && (key.name === 'i');

        if (isRight) {
            handleSwipe(true);
        } else if (isLeft) {
            handleSwipe(false);
        } else if (isInfo) {
            playFlipAnimation();
        }
    } else if (appState === 'TRANSITION') {
        startUserTurn();
    } else if (appState === 'REMATCH_PROMPT') {
        handleRematchInput(key);
    }
});

async function playFlipAnimation() {
    if (isAnimating) return;
    isAnimating = true;

    const widths = [CARD_WIDTH, Math.floor(CARD_WIDTH * 0.75), Math.floor(CARD_WIDTH * 0.5), Math.floor(CARD_WIDTH * 0.25), 2, Math.floor(CARD_WIDTH * 0.25), Math.floor(CARD_WIDTH * 0.5), Math.floor(CARD_WIDTH * 0.75), CARD_WIDTH];
    const midPoint = 4; // Index where it's thinnest
    
    for (let i = 0; i < widths.length; i++) {
        clearScreen();
        showHeader();
        
        // Maintain vertical position of the Turn Info header
        const user = users[currentUserIndex];
        const movieIdx = (currentUserIndex === 0) ? currentMovieIndex : currentMovieIndex + sessionVariation;
        const turnText = `👤 ${user}'s Turn | 🎬 Movie ${currentMovieIndex + 1} of ${SWIPES_PER_USER}`;
        console.log(chalk.magenta(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        console.log(chalk.magenta('│ ') + chalk.magenta.bold(turnText.padEnd(CARD_WIDTH - 2)) + chalk.magenta(' │'));
        console.log(chalk.magenta(`└${'─'.repeat(CARD_WIDTH)}┘\n`));

        const w = widths[i];
        const padding = Math.floor((CARD_WIDTH - w) / 2);
        const padStr = ' '.repeat(padding);
        const color = isFlipped ? chalk.cyan : chalk.white; // Color based on current state

        // Draw the shrinking/expanding "card" frame
        console.log(padStr + color(`┌${'─'.repeat(w)}┐`));
        for (let j = 0; j < POSTER_HEIGHT; j++) {
            console.log(padStr + color('│') + ' '.repeat(w) + color('│'));
        }
        console.log(padStr + color(`└${'─'.repeat(w)}┘`));

        // Flip the state exactly when the card is at its thinnest
        if (i === midPoint) {
            isFlipped = !isFlipped;
        }
        
        await new Promise(r => setTimeout(r, 40));
    }
    
    isAnimating = false;
    renderSwipe();
}

async function playSwipeAnimation(liked) {
    clearScreen();
    showHeader();
    
    // Header padding (to match magenta box)
    console.log('\n'.repeat(4));
    
    // Poster padding (reduced from 25 to move text up)
    for(let i=0; i<15; i++) console.log('');
    console.log('');

    const text = liked ? 'LIKE' : 'PASS';
    const color = liked ? chalk.green.bold : chalk.red.bold;
    const ascii = figlet.textSync(text, { font: 'Small' });
    
    console.log(color(ascii));
    console.log('\n'.repeat(10));
    
    await new Promise(r => setTimeout(r, 400));
}

async function handleSwipe(liked) {
    if (isAnimating) return;
    isAnimating = true;

    const movieIdx = (currentUserIndex === 0) ? currentMovieIndex : currentMovieIndex + sessionVariation;
    const movie = sessionMovies[movieIdx];
    if (liked) {
        userLikes.push(movie.title);
    }

    await playSwipeAnimation(liked);

    currentMovieIndex++;
    isAnimating = false;
    isFlipped = false;

    if (currentMovieIndex >= SWIPES_PER_USER) {
        userChoices[users[currentUserIndex]] = userLikes;
        currentUserIndex++;
        
        clearScreen();
        showHeader();
        
        if (currentUserIndex < users.length) {
            const turnEnd = figlet.textSync('Done!', { font: 'Small' });
            console.log(chalk.green(turnEnd));
            console.log(chalk.green.bold(`\nTurn complete for ${users[currentUserIndex - 1]}!`));
            console.log(chalk.yellow(`\nNext up: ${users[currentUserIndex]}`));
            console.log(chalk.gray('\nPass the keyboard to the next person.'));
            console.log(chalk.gray('Press any key to start...'));
            appState = 'TRANSITION';
        } else {
            appState = 'RESULTS';
            showResults();
        }
    } else {
        renderSwipe();
    }
}

async function showResults() {
    clearScreen();
    
    const allLikes = Object.values(userChoices);
    const movieCounts = {};

    allLikes.forEach(likes => {
        likes.forEach(title => {
            movieCounts[title] = (movieCounts[title] || 0) + 1;
        });
    });

    const perfectMatches = Object.keys(movieCounts).filter(title => movieCounts[title] === users.length);
    const commonMatches = Object.keys(movieCounts)
        .filter(title => movieCounts[title] > 1 && movieCounts[title] < users.length)
        .sort((a, b) => movieCounts[b] - movieCounts[a]);

    if (perfectMatches.length > 0) {
        await playCelebration();
    }

    if (perfectMatches.length > 0 || commonMatches.length > 0) {
        attemptCount = 0; // Reset on any success
        consecutiveFailures = 0;
    } else {
        attemptCount++;
        consecutiveFailures++;
    }

    if (users.length === 2 && attemptCount >= 3 && perfectMatches.length === 0 && commonMatches.length === 0) {
        triggerAngryForcedPick();
        return;
    }

    // Calculate widths for all ASCII art to ensure boxes match
    const resText = figlet.textSync('MATCHES', { font: 'Slant' });
    const enjoyText = figlet.textSync('ENJOY!', { font: 'Small' });
    
    const resLines = resText.split('\n').filter(l => l.trim().length > 0);
    const enjoyLines = enjoyText.split('\n').filter(l => l.trim().length > 0);
    
    const maxAsciiWidth = Math.max(
        ...resLines.map(l => l.length),
        ...enjoyLines.map(l => l.length),
        'Created by Jonah Cecil'.length
    );
    
    const outerWidth = Math.max(maxAsciiWidth + 4, CARD_WIDTH);

    // Header Box
    console.log(chalk.yellow(`╔${'═'.repeat(outerWidth)}╗`));
    resLines.forEach(l => {
        console.log(chalk.yellow(`║ `) + chalk.yellow(l.padEnd(outerWidth - 2)) + chalk.yellow(` ║`));
    });
    console.log(chalk.yellow(`╚${'═'.repeat(outerWidth)}╝\n`));

    if (perfectMatches.length > 0) {
        console.log(chalk.green(`┌─ PERFECT MATCHES ${'─'.repeat(Math.max(0, outerWidth - 18))}┐`));
        perfectMatches.forEach(m => {
            console.log(chalk.green('│ ') + chalk.bold.white('✨ ' + m.padEnd(outerWidth - 5)) + chalk.green(' │'));
        });
        console.log(chalk.green(`└${'─'.repeat(outerWidth)}┘\n`));
    }

    if (commonMatches.length > 0) {
        console.log(chalk.blue(`┌─ POPULAR CHOICES ${'─'.repeat(Math.max(0, outerWidth - 18))}┐`));
        commonMatches.forEach(m => {
            const voteText = `[${movieCounts[m]}/${users.length} votes]`;
            const content = `${m} ${voteText}`.padEnd(outerWidth - 2);
            console.log(chalk.blue('│ ') + chalk.white(content) + chalk.blue(' │'));
        });
        console.log(chalk.blue(`└${'─'.repeat(outerWidth)}┘\n`));
    }

    if (perfectMatches.length === 0 && commonMatches.length === 0) {
        console.log(chalk.red(`┌${'─'.repeat(outerWidth)}┐`));
        console.log(chalk.red('│ ') + chalk.white('No common matches found. Maybe try another round?'.padEnd(outerWidth - 2)) + chalk.red(' │'));
        console.log(chalk.red(`└${'─'.repeat(outerWidth)}┘\n`));
    }

    if (perfectMatches.length === 0 && users.length >= 3 && commonMatches.length > 0) {
        console.log(chalk.yellow.bold('\n   ⚠️  NO PERFECT MATCH FOUND!'));
        console.log(chalk.gray('   Since there are 3+ people, let\'s settle this with a TIE-BREAKER...\n'));
        console.log(chalk.gray('   Press any key to start the roulette!'));
        
        appState = 'TRANSITION';
        process.stdin.once('data', () => {
            startTieBreaker(commonMatches.slice(0, 3));
        });
        return;
    }

    // Footer Box
    console.log(chalk.magenta(`╔${'═'.repeat(outerWidth)}╗`));
    enjoyLines.forEach(l => {
        console.log(chalk.magenta(`║ `) + chalk.magenta(l.padEnd(outerWidth - 2)) + chalk.magenta(` ║`));
    });
    const creditText = 'Created by Jonah Cecil';
    console.log(chalk.magenta(`║ `) + chalk.italic.white(creditText.padStart(outerWidth - 2)) + chalk.magenta(` ║`));
    console.log(chalk.magenta(`╚${'═'.repeat(outerWidth)}╝\n`));

    console.log(chalk.cyan.bold('   📊 Press [S] for a DETAILED SESSION SUMMARY'));
    promptRematch();
}

async function playCelebration() {
    for (let frame = 0; frame < 20; frame++) {
        clearScreen();
        showHeader();
        
        const title = figlet.textSync('BOOM!', { font: 'Slant' });
        console.log(chalk.green.bold(title));
        console.log(chalk.yellow.bold('   WE HAVE A PERFECT MATCH!!!\n'));

        // Random confetti characters and colors
        const chars = ['*', '•', '+', '.', 'o'];
        for (let i = 0; i < 10; i++) {
            let line = '   ';
            for (let j = 0; j < CARD_WIDTH; j++) {
                if (Math.random() > 0.92) {
                    const color = chalk.hsv(Math.random() * 360, 80, 100);
                    line += color(chars[Math.floor(Math.random() * chars.length)]);
                } else {
                    line += ' ';
                }
            }
            console.log(line);
        }
        
        await new Promise(r => setTimeout(r, 100));
    }
}

async function startTieBreaker(candidates) {
    appState = 'TIE_BREAKER';
    let elapsed = 0;
    let index = 0;
    let currentInterval = 80; // Start fast
    const maxElapsed = 4000;  // Total spin time
    
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    
    const spin = async () => {
        clearScreen();
        showHeader();
        
        console.log(chalk.yellow.bold('   🎰 TIE-BREAKER ROULETTE 🎰\n'));
        
        const currentTitle = candidates[index];
        const displayTitle = figlet.textSync(currentTitle.length > 15 ? 'CHOOSING...' : currentTitle, { font: 'Small' });
        
        console.log(chalk.cyan(displayTitle));
        console.log('\n' + chalk.gray('   ' + '▓'.repeat(index + 1).padEnd(candidates.length, '░')));
        console.log(chalk.gray(`\n   Rotating through ${candidates.length} top choices...`));
        
        index = (index + 1) % candidates.length;
        elapsed += currentInterval;
        
        // Gradually slow down the interval (linear easing)
        if (elapsed < maxElapsed) {
            currentInterval += 15; 
            setTimeout(spin, currentInterval);
        } else {
            renderWinner(winner);
        }
    };

    setTimeout(spin, currentInterval);
}

function renderWinner(winner) {
    clearScreen();
    showHeader();
    
    const winText = figlet.textSync('WINNER', { font: 'Slant' });
    console.log(chalk.green.bold(winText));
    
    const boxWidth = Math.max(winner.length + 10, 40);
    console.log(chalk.green(`╔${'═'.repeat(boxWidth)}╗`));
    console.log(chalk.green('║') + chalk.white.bold(`   ✨ ${winner} ✨   `.padStart(boxWidth / 2 + winner.length / 2).padEnd(boxWidth)) + chalk.green('║'));
    console.log(chalk.green(`╚${'═'.repeat(boxWidth)}╝`));
    
    console.log(chalk.yellow('\n   The fates have spoken. Enjoy your movie! 🍿'));
    
    setTimeout(() => {
        const enjoyText = figlet.textSync('ENJOY!', { font: 'Small' });
        console.log('\n' + chalk.magenta(enjoyText));
        console.log('');
        promptRematch();
    }, 2000);
}

async function triggerAngryForcedPick() {
    appState = 'ANGRY_PICK';
    attemptCount = 0; // Reset for next time
    
    const frames = [
        chalk.red('😠 NOPE.'),
        chalk.red.bold('😤 STILL NOTHING?!'),
        chalk.bgRed.white.bold('💢 OKAY, THAT\'S IT.'),
        chalk.red.strikethrough('❌ YOU TWO ARE IMPOSSIBLE.')
    ];

    for (const frame of frames) {
        clearScreen();
        showHeader();
        console.log('\n\n\n   ' + frame);
        await new Promise(r => setTimeout(resolve => r(), 800));
    }

    clearScreen();
    showHeader();
    
    const angryTitle = figlet.textSync('ENOUGH!', { font: 'Slant' });
    console.log(chalk.red.bold(angryTitle));
    console.log(chalk.yellow.bold('\n   Okay, you asked for it...'));
    console.log(chalk.yellow('   Since you can\'t agree on ANYTHING, you have to watch:'));
    
    const randomMovie = movies[Math.floor(Math.random() * movies.length)];
    
    setTimeout(() => {
        console.log('\n' + chalk.bgRed.white.bold(`   ✨ ${randomMovie.title.toUpperCase()} ✨   `));
        console.log(chalk.gray('\n   No more swiping. Sit down and watch it. 🍿'));
        console.log('');
        promptRematch();
    }, 1500);
}

async function playSexyAnimation(u1, u2, score) {
    appState = 'SEXY_ANIMATION';
    const frames = 30;
    
    for (let f = 0; f < frames; f++) {
        clearScreen();
        showHeader();
        
        console.log(chalk.magenta.bold(figlet.textSync('FREAKY!', { font: 'Slant' })));
        console.log(chalk.red.bold(`\n   ${u1} and ${u2} are getting freaky tonight baby!`));
        console.log(chalk.yellow(`   With a massive ${score}% match, it's basically destiny...\n`));

        // Shower/Steam animation
        const steamChars = ['~', '░', ' ', '.', '`'];
        const waterChars = ['|', ':', ' ', 'i'];
        
        for (let i = 0; i < 12; i++) {
            let line = '   ';
            for (let j = 0; j < 40; j++) {
                if (Math.random() > 0.8) {
                    const char = (i < 4) ? steamChars[Math.floor(Math.random() * steamChars.length)] : waterChars[Math.floor(Math.random() * waterChars.length)];
                    const color = (i < 4) ? chalk.white : chalk.blue;
                    line += color(char);
                } else {
                    line += ' ';
                }
            }
            console.log(line);
        }
        
        if (f % 2 === 0) console.log(chalk.red('      🍆   🍑   🍆   🍑   🍆'));
        else console.log(chalk.red('      🍑   🍆   🍑   🍆   🍑'));

        await new Promise(r => setTimeout(r, 100));
    }
    
    console.log(chalk.gray('\n   Press any key to return to the summary...'));
    process.stdin.once('data', () => {
        // Return to summary but mark that we've played the animation
        showSummary(true); 
    });
}

function showSummary(animationPlayed = false) {
    clearScreen();
    showHeader();
    appState = 'SUMMARY';

    console.log(chalk.gray(`─`.repeat(CARD_WIDTH) + '\n'));

    // 1. Who liked what
    console.log(chalk.yellow.bold('👤 INDIVIDUAL LIKES:'));
    Object.entries(userChoices).forEach(([user, likes]) => {
        const likedStr = likes.length > 0 ? likes.join(', ') : chalk.gray('None');
        console.log(`${chalk.magenta(user)}: ${chalk.white(likedStr)}`);
    });
    console.log('');

    const allLikes = Object.values(userChoices);
    const movieCounts = {};
    const movieLikers = {};

    allLikes.forEach((likes, idx) => {
        const userName = users[idx];
        likes.forEach(title => {
            movieCounts[title] = (movieCounts[title] || 0) + 1;
            if (!movieLikers[title]) movieLikers[title] = [];
            movieLikers[title].push(userName);
        });
    });

    // 2. Top 3 near-matches (1-2 votes less than perfect)
    const nearMatches = Object.keys(movieCounts)
        .filter(title => movieCounts[title] >= Math.max(2, users.length - 2) && movieCounts[title] < users.length)
        .sort((a, b) => movieCounts[b] - movieCounts[a])
        .slice(0, 3);

    console.log(chalk.yellow.bold('🤏 NEAR MATCHES:'));
    if (nearMatches.length > 0) {
        nearMatches.forEach(m => {
            console.log(`${chalk.cyan('• ' + m)} ${chalk.gray(`(${movieCounts[m]}/${users.length} votes)`)}`);
            console.log(chalk.gray(`  Liked by: ${movieLikers[m].join(', ')}`));
        });
    } else {
        console.log(chalk.gray('  No close calls this time.'));
    }
    console.log('');

    // 3. Funniest outlier picks (liked by only 1 person)
    const outliers = Object.keys(movieCounts)
        .filter(title => movieCounts[title] === 1);
    
    console.log(chalk.yellow.bold('🦄 UNIQUE TASTES (Outliers):'));
    if (outliers.length > 0) {
        // Randomly pick up to 3 for brevity
        shuffle(outliers).slice(0, 3).forEach(m => {
            console.log(`${chalk.cyan('• ' + m)} ${chalk.gray(`(Only ${movieLikers[m][0]} liked this)`)}`);
        });
    } else {
        console.log(chalk.gray('  Everyone agreed on everything? Rare!'));
    }
    console.log('');

    // 4. Compatibility Score (Jaccard Similarity between pairs if possible)
    console.log(chalk.yellow.bold('🤝 COMPATIBILITY SCORE:'));
    let freakyPair = null;
    let freakyScore = 0;

    if (users.length >= 2) {
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const setA = new Set(userChoices[users[i]]);
                const setB = new Set(userChoices[users[j]]);
                const intersection = new Set([...setA].filter(x => setB.has(x)));
                const union = new Set([...setA, ...setB]);
                
                let score = 0;
                if (union.size > 0) {
                    score = Math.round((intersection.size / union.size) * 100);
                }
                
                let verdict = 'Neutral';
                if (score > 95) {
                    verdict = 'GETTING FREAKY';
                    freakyPair = [users[i], users[j]];
                    freakyScore = score;
                }
                else if (score > 70) verdict = 'Perfect Harmony';
                else if (score > 40) verdict = 'Good Vibes';
                else if (score < 15) verdict = 'Total Opposites';

                console.log(`${chalk.magenta(users[i])} + ${chalk.magenta(users[j])}: ${chalk.green.bold(score + '%')} ${chalk.gray(`(${verdict})`)}`);
            }
        }
    } else {
        console.log(chalk.gray('  Need at least 2 people for a compatibility score!'));
    }

    console.log('\n' + chalk.gray('─'.repeat(CARD_WIDTH)));

    if (freakyPair && !animationPlayed) {
        setTimeout(() => {
            playSexyAnimation(freakyPair[0], freakyPair[1], freakyScore);
        }, 1500);
    } else {
        promptRematch();
    }
}

function promptRematch() {
    appState = 'REMATCH_PROMPT';
    console.log(chalk.cyan.bold('   🔄 Press [R] for a REMATCH (Same users, random movies)'));
    console.log(chalk.gray('   Press [Q] or Ctrl+C to quit\n'));
}

function handleRematchInput(key) {
    if (key.name === 'r') {
        // Reset state for a quick rematch
        currentUserIndex = 0;
        currentMovieIndex = 0;
        for (const user of users) {
            userChoices[user] = [];
        }
        
        // Use all movies if we were in genre selection, otherwise keep filter
        initializeSession();
    } else if (key.name === 's') {
        showSummary();
    } else if (key.name === 'q') {
        process.exit();
    }
}

startApp();
