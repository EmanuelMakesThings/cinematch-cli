const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const figlet = require('figlet');
const { getAsciiPoster } = require('./ascii-converter');

// Load movies
const moviesPath = path.join(__dirname, '../data/movies.json');
const movies = JSON.parse(fs.readFileSync(moviesPath, 'utf8'));
let filteredMovies = [...movies];

// Setup keypress handling
readline.emitKeypressEvents(process.stdin);

const userChoices = {};
let users = [];
let currentUserIndex = 0;
let currentMovieIndex = 0;
let userLikes = [];
let sessionMovies = [];
let posterCache = {}; // Cache ASCII art
let postersLoading = false;
let appState = 'SETUP'; // SETUP, GENRE_SELECT, SWIPING, TRANSITION, RESULTS

// Genre Selection State
let availableGenres = [];
let selectedGenreIndices = new Set();
let genreCursor = 0;

const SWIPES_PER_USER = 10;

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
    console.log(chalk.bold.white(`     v1.4.0 | Created by Jonah Cecil       `));
    console.log('');
}

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
    
    const allSelected = selectedGenreIndices.size === 0;
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
        
        if (genreMovies.length < SWIPES_PER_USER) {
            console.log(chalk.yellow(`\n⚠️  Only ${genreMovies.length} movies found for selected genres.`));
            console.log(chalk.yellow(`   Adding random movies from other genres to reach a full deck...`));
            
            // Get unique movies that are NOT in the current selection
            const existingTitles = new Set(genreMovies.map(m => m.title));
            const otherMovies = movies.filter(m => !existingTitles.has(m.title));
            const shuffledOthers = [...otherMovies].sort(() => 0.5 - Math.random());
            const needed = SWIPES_PER_USER - genreMovies.length;
            
            filteredMovies = [...genreMovies, ...shuffledOthers.slice(0, needed)];
        } else {
            filteredMovies = genreMovies;
        }
        console.log(chalk.green(`\nSelected Genres: ${selectedGenres.join(', ')} (Pool size: ${filteredMovies.length})`));
    }
    
    // Slight delay to read the message
    setTimeout(() => {
        appState = 'SWIPING';
        startUserTurn();
    }, 1500);
}

function getRandomMovies(count) {
    const shuffled = [...filteredMovies].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

async function startUserTurn() {
    if (currentUserIndex >= users.length) {
        appState = 'RESULTS';
        showResults();
        return;
    }

    currentMovieIndex = 0;
    userLikes = [];
    sessionMovies = getRandomMovies(SWIPES_PER_USER);
    posterCache = {}; 
    postersLoading = true;
    appState = 'LOADING';

    renderLoading();

    // Fetch all posters for this turn
    const fetchPromises = sessionMovies.map(async (movie, index) => {
        if (movie.posterUrl) {
            const ascii = await getAsciiPoster(movie.posterUrl, 60);
            if (ascii) {
                posterCache[index] = ascii;
            }
        }
    });

    await Promise.all(fetchPromises);
    
    postersLoading = false;
    appState = 'SWIPING';
    renderSwipe();
}

function renderLoading() {
    clearScreen();
    showHeader();
    console.log(chalk.yellow.bold('\n   📥 Preparing your movie reels...'));
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
    const movie = sessionMovies[currentMovieIndex];
    const asciiPoster = posterCache[currentMovieIndex];
    
    const cardWidth = 60;
    
    const turnText = `👤 ${user}'s Turn | 🎬 Movie ${currentMovieIndex + 1} of ${SWIPES_PER_USER}`;
    console.log(chalk.magenta(`┌${'─'.repeat(cardWidth)}┐`));
    console.log(chalk.magenta('│ ') + chalk.magenta.bold(turnText.padEnd(cardWidth - 2)) + chalk.magenta(' │'));
    console.log(chalk.magenta(`└${'─'.repeat(cardWidth)}┘\n`));
    
    if (asciiPoster) {
        console.log(asciiPoster + '\n');
    } else {
        for(let i=0; i<30; i++) console.log(' '.repeat(cardWidth));
        console.log('');
    }

    // Movie Card UI
    console.log(chalk.white(`┌${'─'.repeat(cardWidth)}┐`));
    const titleLine = `  ${movie.title}`.padEnd(cardWidth);
    console.log(chalk.white('│') + chalk.bgBlue.bold.white(titleLine) + chalk.white('│'));
    console.log(chalk.white(`├${'─'.repeat(cardWidth)}┤`));

    // Genres Line
    if (movie.genres) {
        const genreText = `  GENRE: ${movie.genres.join(', ')}`.padEnd(cardWidth);
        console.log(chalk.white('│') + chalk.yellow(genreText) + chalk.white('│'));
        console.log(chalk.white(`├${'─'.repeat(cardWidth)}┤`));
    }
    
    // Wrap synopsis text
    const words = movie.synopsis.split(' ');
    let line = '  ';
    words.forEach(word => {
        if ((line + word).length > (cardWidth - 4)) {
            console.log(chalk.white('│') + chalk.white(line.padEnd(cardWidth)) + chalk.white('│'));
            line = '  ' + word + ' ';
        } else {
            line += word + ' ';
        }
    });
    console.log(chalk.white('│') + chalk.white(line.padEnd(cardWidth)) + chalk.white('│'));
    console.log(chalk.white(`└${'─'.repeat(cardWidth)}┘`));
    
    console.log('\n' + chalk.green('  [→] Swipe Right (LIKE)    ') + chalk.red(' [←] Swipe Left (DISLIKE)'));
    console.log(chalk.gray('\nPress Ctrl+C to exit'));
}

process.stdin.on('keypress', (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
        process.exit();
    }

    if (appState === 'GENRE_SELECT') {
        handleGenreInput(key);
    } else if (appState === 'SWIPING') {
        const isRight = key && (key.name === 'right' || key.name === 'd');
        const isLeft = key && (key.name === 'left' || key.name === 'a');

        if (isRight) {
            handleSwipe(true);
        } else if (isLeft) {
            handleSwipe(false);
        }
    } else if (appState === 'TRANSITION') {
        startUserTurn();
    }
});

function handleSwipe(liked) {
    const movie = sessionMovies[currentMovieIndex];
    if (liked) {
        userLikes.push(movie.title);
    }

    currentMovieIndex++;

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

function showResults() {
    clearScreen();
    
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
    
    const outerWidth = Math.max(maxAsciiWidth + 4, 60);

    // Header Box
    console.log(chalk.yellow(`╔${'═'.repeat(outerWidth)}╗`));
    resLines.forEach(l => {
        console.log(chalk.yellow(`║ `) + chalk.yellow(l.padEnd(outerWidth - 2)) + chalk.yellow(` ║`));
    });
    console.log(chalk.yellow(`╚${'═'.repeat(outerWidth)}╝\n`));

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
        process.exit();
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

    process.exit();
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
        process.exit();
    }, 2000);
}

startApp();
