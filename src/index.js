const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const readline = require('readline');
const figlet = require('figlet');
const { getAsciiPoster } = require('./ascii-converter');

// Config
const { 
    CARD_WIDTH, 
    POSTER_HEIGHT, 
    SWIPES_PER_USER, 
    POSTER_FETCH_BATCH_SIZE 
} = require('./config');

// Logic
const { 
    shuffle,
    getUniqueGenres,
    filterMovies,
    getSessionMovies,
    calculateMatches,
    calculateCompatibility
} = require('./logic');

// UI
const { 
    clearScreen,
    showHeader,
    renderGenreSelect,
    renderLoading,
    renderSwipe,
    playFlipAnimation,
    playSwipeAnimation,
    playCelebration,
    triggerAngryForcedPick,
    playSexyAnimation,
    promptRematch
} = require('./ui');

// App State
const state = {
    users: [],
    currentUserIndex: 0,
    currentMovieIndex: 0,
    userLikes: [],
    userChoices: {},
    sessionMovies: [],
    sessionVariation: 2,
    posterCache: {},
    postersLoading: false,
    isAnimating: false,
    isFlipped: false,
    appState: 'SETUP',
    attemptCount: 0,
    consecutiveFailures: 0,
    activeTheme: 'DEFAULT',
    availableGenres: [],
    selectedGenreIndices: new Set(),
    genreCursor: 0,
    filteredMovies: []
};

// Handle --no-color flag and environment variables
if (process.argv.includes('--no-color') || process.env.NO_COLOR || process.env.TERM === 'dumb') {
    chalk.level = 0;
} else if (process.argv.includes('--color=truecolor')) {
    chalk.level = 3;
} else if (process.argv.includes('--color=256')) {
    chalk.level = 2;
} else if (process.argv.includes('--color=16')) {
    chalk.level = 1;
}

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

// Initialize movies
state.filteredMovies = [...movies];

// Setup keypress handling
readline.emitKeypressEvents(process.stdin);

async function startApp() {
    clearScreen();
    showHeader(state.activeTheme);
    
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
            const userName = `User ${i}`;
            state.users.push(userName);
            state.userChoices[userName] = []; // Pre-initialize
        }
        
        rl.close();
        
        // Initialize Genre Selection
        state.availableGenres = getUniqueGenres(movies);
        state.appState = 'GENRE_SELECT';
        
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        
        renderGenreSelect(state.availableGenres, state.selectedGenreIndices, state.genreCursor, state.activeTheme);
    });
}

function handleGenreInput(key) {
    if (key.name === 'up') {
        state.genreCursor = Math.max(0, state.genreCursor - 1);
        renderGenreSelect(state.availableGenres, state.selectedGenreIndices, state.genreCursor, state.activeTheme);
    } else if (key.name === 'down') {
        state.genreCursor = Math.min(state.availableGenres.length - 1, state.genreCursor + 1);
        renderGenreSelect(state.availableGenres, state.selectedGenreIndices, state.genreCursor, state.activeTheme);
    } else if (key.name === 'space') {
        if (state.selectedGenreIndices.has(state.genreCursor)) {
            state.selectedGenreIndices.delete(state.genreCursor);
        } else {
            state.selectedGenreIndices.add(state.genreCursor);
        }
        renderGenreSelect(state.availableGenres, state.selectedGenreIndices, state.genreCursor, state.activeTheme);
    } else if (key.name === 'return') {
        finalizeGenreSelection();
    }
}

function finalizeGenreSelection() {
    let selectedGenres = Array.from(state.selectedGenreIndices).map(i => state.availableGenres[i]);
    
    // Theme Logic
    const themeGenres = ['Crime', 'Fantasy', 'Horror', 'Sci-Fi', 'Western', 'Romance'];
    const selectedThemeGenre = selectedGenres.find(g => themeGenres.includes(g));
    if (selectedThemeGenre) {
        state.activeTheme = selectedThemeGenre.toUpperCase();
    } else {
        state.activeTheme = 'DEFAULT';
    }

    const requiredPoolSize = SWIPES_PER_USER + 2;
    state.filteredMovies = filterMovies(movies, selectedGenres, requiredPoolSize);
    
    if (selectedGenres.length === 0) {
        console.log(chalk.green('\nNo specific genres selected. Using ALL movies.'));
    } else {
        console.log(chalk.green(`\nSelected Genres: ${selectedGenres.join(', ')} (Pool size: ${state.filteredMovies.length})`));
    }
    
    setTimeout(() => {
        initializeSession();
    }, 1500);
}

async function initializeSession() {
    // Adaptive logic: reduce variation if failing
    state.sessionVariation = Math.max(0, 2 - state.consecutiveFailures);
    const poolSize = SWIPES_PER_USER + state.sessionVariation;
    
    state.sessionMovies = getSessionMovies(state.filteredMovies, poolSize, state.consecutiveFailures);
    state.posterCache = {};
    state.postersLoading = true;
    state.appState = 'LOADING';

    const appStateRef = { get current() { return state.appState; } };
    const loadingInterval = renderLoading(state.activeTheme, appStateRef);

    // Fetch posters
    for (let i = 0; i < state.sessionMovies.length; i += POSTER_FETCH_BATCH_SIZE) {
        const batch = state.sessionMovies.slice(i, i + POSTER_FETCH_BATCH_SIZE);
        await Promise.all(batch.map(async (movie, batchIdx) => {
            const movieIdx = i + batchIdx;
            if (movie.posterUrl) {
                const ascii = await getAsciiPoster(movie.posterUrl, CARD_WIDTH, POSTER_HEIGHT);
                if (ascii) {
                    state.posterCache[movieIdx] = ascii;
                }
            }
        }));
    }
    
    state.postersLoading = false;
    state.appState = 'SWIPING';
    clearInterval(loadingInterval);
    
    startUserTurn();
}

function startUserTurn() {
    if (state.currentUserIndex >= state.users.length) {
        state.appState = 'RESULTS';
        showResults();
        return;
    }

    state.currentMovieIndex = 0;
    state.userLikes = [];
    state.appState = 'SWIPING';
    
    drawSwipeScreen();
}

function drawSwipeScreen() {
    const user = state.users[state.currentUserIndex];
    const movieIdx = (state.currentUserIndex === 0) ? state.currentMovieIndex : state.currentMovieIndex + state.sessionVariation;
    const movie = state.sessionMovies[movieIdx];
    const asciiPoster = state.posterCache[movieIdx];
    
    renderSwipe(state.activeTheme, user, state.currentMovieIndex, SWIPES_PER_USER, movie, asciiPoster, state.isFlipped);
}

async function handleSwipe(liked) {
    if (state.isAnimating) return;
    state.isAnimating = true;

    const movieIdx = (state.currentUserIndex === 0) ? state.currentMovieIndex : state.currentMovieIndex + state.sessionVariation;
    const movie = state.sessionMovies[movieIdx];
    if (liked) {
        state.userLikes.push(movie.title);
    }

    await playSwipeAnimation(state.activeTheme, liked);

    state.currentMovieIndex++;
    state.isAnimating = false;
    state.isFlipped = false;

    if (state.currentMovieIndex >= SWIPES_PER_USER) {
        state.userChoices[state.users[state.currentUserIndex]] = state.userLikes;
        state.currentUserIndex++;
        
        clearScreen();
        showHeader(state.activeTheme);
        
        if (state.currentUserIndex < state.users.length) {
            const turnEnd = figlet.textSync('Done!', { font: 'Small' });
            console.log(chalk.green(turnEnd));
            console.log(chalk.green.bold(`\nTurn complete for ${state.users[state.currentUserIndex - 1]}!`));
            console.log(chalk.yellow(`\nNext up: ${state.users[state.currentUserIndex]}`));
            console.log(chalk.gray('\nPass the keyboard to the next person.'));
            console.log(chalk.gray('Press any key to start...'));
            state.appState = 'TRANSITION';
        } else {
            state.appState = 'RESULTS';
            showResults();
        }
    } else {
        drawSwipeScreen();
    }
}

async function showResults() {
    clearScreen();
    
    const { 
        movieCounts, 
        movieLikers, 
        perfectMatches, 
        commonMatches, 
        nearMatches, 
        outliers 
    } = calculateMatches(state.userChoices, state.users);

    // Handle Perfect Matches
    if (perfectMatches.length > 0) {
        await playCelebration(state.activeTheme);
        
        if (perfectMatches.length > 1) {
            clearScreen();
            showHeader(state.activeTheme);
            console.log(chalk.yellow.bold('\n   🔥 SO MANY PERFECT MATCHES!'));
            console.log(chalk.gray(`   You all agreed on ${perfectMatches.length} movies. Let's spin for the winner...\n`));
            console.log(chalk.gray('   Press any key to start the Perfect Match Roulette!'));
            
            state.appState = 'ROULETTE_PROMPT';
            process.stdin.once('data', () => {
                startTieBreaker(perfectMatches, true); 
            });
            return;
        }
    }

    if (perfectMatches.length > 0 || commonMatches.length > 0) {
        state.attemptCount = 0; 
        state.consecutiveFailures = 0;
    } else {
        state.attemptCount++;
        state.consecutiveFailures++;
    }

    if (state.users.length === 2 && state.attemptCount >= 3 && perfectMatches.length === 0 && commonMatches.length === 0) {
        const randomMovie = movies[Math.floor(Math.random() * movies.length)];
        triggerAngryForcedPick(state.activeTheme, randomMovie).then(() => {
            promptRematch();
            state.appState = 'REMATCH_PROMPT';
        });
        return;
    }

    // Results Display
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
    console.log(chalk.yellow(`╚${'═'.repeat(outerWidth)}╝
`));

    if (perfectMatches.length > 0) {
        console.log(chalk.green(`┌─ PERFECT MATCHES ${'─'.repeat(Math.max(0, outerWidth - 18))}┐`));
        perfectMatches.forEach(m => {
            console.log(chalk.green('│ ') + chalk.bold.white('✨ ' + m.padEnd(outerWidth - 5)) + chalk.green(' │'));
        });
        console.log(chalk.green(`└${'─'.repeat(outerWidth)}┘
`));
    }

    if (commonMatches.length > 0) {
        console.log(chalk.blue(`┌─ POPULAR CHOICES ${'─'.repeat(Math.max(0, outerWidth - 18))}┐`));
        commonMatches.forEach(m => {
            const voteText = `[${movieCounts[m]}/${state.users.length} votes]`;
            const content = `${m} ${voteText}`.padEnd(outerWidth - 2);
            console.log(chalk.blue('│ ') + chalk.white(content) + chalk.blue(' │'));
        });
        console.log(chalk.blue(`└${'─'.repeat(outerWidth)}┘
`));
    }

    if (perfectMatches.length === 0 && commonMatches.length === 0) {
        console.log(chalk.red(`┌${'─'.repeat(outerWidth)}┐`));
        console.log(chalk.red('│ ') + chalk.white('No common matches found. Maybe try another round?'.padEnd(outerWidth - 2)) + chalk.red(' │'));
        console.log(chalk.red(`└${'─'.repeat(outerWidth)}┘
`));
    }

    if (perfectMatches.length === 0 && state.users.length >= 3 && commonMatches.length > 0) {
        console.log(chalk.yellow.bold('\n   ⚠️  NO PERFECT MATCH FOUND!'));
        console.log(chalk.gray('   Since there are 3+ people, let\'s settle this with a TIE-BREAKER...\n'));
        console.log(chalk.gray('   Press any key to start the roulette!'));
        
        state.appState = 'ROULETTE_PROMPT';
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
    console.log(chalk.magenta(`╚${'═'.repeat(outerWidth)}╝
`));

    promptRematch();
    state.appState = 'REMATCH_PROMPT';
}

async function startTieBreaker(candidates, isPerfect = false) {
    state.appState = 'TIE_BREAKER';
    let elapsed = 0;
    let index = 0;
    let currentInterval = 80; // Start fast
    const maxElapsed = 4000;  // Total spin time
    
    const winner = candidates[Math.floor(Math.random() * candidates.length)];
    
    const spin = async () => {
        clearScreen();
        showHeader(state.activeTheme);
        
        const emoji = isPerfect ? '✨' : '🎰';
        const titleText = isPerfect ? 'PERFECT MATCH ROULETTE' : 'TIE-BREAKER ROULETTE';
        console.log(chalk.yellow.bold(`   ${emoji} ${titleText} ${emoji}\n`));
        
        const currentTitle = candidates[index];
        const displayTitle = figlet.textSync(currentTitle.length > 15 ? 'CHOOSING...' : currentTitle, { font: 'Small' });
        
        const color = isPerfect ? chalk.green : chalk.cyan;
        console.log(color(displayTitle));
        console.log('\n' + chalk.gray('   ' + '▓'.repeat(index + 1).padEnd(candidates.length, '░')));
        
        const msg = isPerfect ? `Selecting from ${candidates.length} unanimous picks...` : `Rotating through ${candidates.length} top choices...`;
        console.log(chalk.gray(`\n   ${msg}`));
        
        index = (index + 1) % candidates.length;
        elapsed += currentInterval;
        
        // Gradually slow down the interval
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
    showHeader(state.activeTheme);
    
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
        state.appState = 'REMATCH_PROMPT';
    }, 2000);
}

function showSummary(animationPlayed = false) {
    clearScreen();
    showHeader(state.activeTheme);
    state.appState = 'SUMMARY';

    console.log(chalk.gray(`─`.repeat(CARD_WIDTH) + '\n'));

    // 1. Who liked what
    console.log(chalk.yellow.bold('👤 INDIVIDUAL LIKES:'));
    Object.entries(state.userChoices).forEach(([user, likes]) => {
        const likedStr = likes.length > 0 ? likes.join(', ') : chalk.gray('None');
        const prefix = `${chalk.magenta(user)}: `;
        const prefixPlain = `${user}: `;
        const availableWidth = CARD_WIDTH - prefixPlain.length;
        
        const words = likedStr.split(' ');
        let currentLine = '';
        let firstLine = true;

        words.forEach(word => {
            if ((currentLine + word).length > availableWidth) {
                if (firstLine) {
                    console.log(prefix + chalk.white(currentLine.trim()));
                    firstLine = false;
                } else {
                    console.log(' '.repeat(prefixPlain.length) + chalk.white(currentLine.trim()));
                }
                currentLine = word + ' ';
            } else {
                currentLine += word + ' ';
            }
        });

        if (currentLine.trim().length > 0) {
            if (firstLine) {
                console.log(prefix + chalk.white(currentLine.trim()));
            } else {
                console.log(' '.repeat(prefixPlain.length) + chalk.white(currentLine.trim()));
            }
        }
    });
    console.log('');

    const { 
        movieCounts, 
        movieLikers, 
        nearMatches, 
        outliers 
    } = calculateMatches(state.userChoices, state.users);

    // 2. Top 3 near-matches
    console.log(chalk.yellow.bold('🤏 NEAR MATCHES:'));
    if (nearMatches.length > 0) {
        nearMatches.forEach(m => {
            console.log(`${chalk.cyan('• ' + m)} ${chalk.gray(`(${movieCounts[m]}/${state.users.length} votes)`)}`);
            console.log(chalk.gray(`  Liked by: ${movieLikers[m].join(', ')}`));
        });
    } else {
        console.log(chalk.gray('  No close calls this time.'));
    }
    console.log('');

    // 3. Funniest outlier picks
    console.log(chalk.yellow.bold('🦄 UNIQUE TASTES (Outliers):'));
    if (outliers.length > 0) {
        shuffle(outliers).slice(0, 3).forEach(m => {
            console.log(`${chalk.cyan('• ' + m)} ${chalk.gray(`(Only ${movieLikers[m][0]} liked this)`)}`);
        });
    } else {
        console.log(chalk.gray('  Everyone agreed on everything? Rare!'));
    }
    console.log('');

    // 4. Compatibility Score
    console.log(chalk.yellow.bold('🤝 COMPATIBILITY SCORE:'));
    const { pairs, freakyPair, freakyScore } = calculateCompatibility(state.users, state.userChoices);
    
    if (state.users.length >= 2) {
        pairs.forEach(p => {
            console.log(`${chalk.magenta(p.user1)} + ${chalk.magenta(p.user2)}: ${chalk.green.bold(p.score + '%')} ${chalk.gray(`(${p.verdict})`)}`);
        });
    } else {
        console.log(chalk.gray('  Need at least 2 people for a compatibility score!'));
    }

    console.log('\n' + chalk.gray('─'.repeat(CARD_WIDTH)));

    if (freakyPair && !animationPlayed) {
        setTimeout(() => {
            playSexyAnimation(state.activeTheme, freakyPair[0], freakyPair[1], freakyScore).then(() => {
                 console.log(chalk.gray('\n   Press any key to return to the summary...'));
                 process.stdin.once('data', () => {
                     showSummary(true); 
                 });
            });
        }, 1500);
    } else {
        promptRematch(false);
        state.appState = 'REMATCH_PROMPT';
    }
}

function handleRematchInput(key) {
    if (key.name === 'r') {
        state.currentUserIndex = 0;
        state.currentMovieIndex = 0;
        for (const user of state.users) {
            state.userChoices[user] = [];
        }
        initializeSession();
    } else if (key.name === 's') {
        showSummary();
    } else if (key.name === 'q') {
        process.exit();
    }
}

// Input Handling
process.stdin.on('keypress', async (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
        process.exit();
    }

    if (state.isAnimating) return;

    if (state.appState === 'GENRE_SELECT') {
        handleGenreInput(key);
    } else if (state.appState === 'SWIPING') {
        const isRight = key && (key.name === 'right' || key.name === 'd');
        const isLeft = key && (key.name === 'left' || key.name === 'a');
        const isInfo = key && (key.name === 'i');

        if (isRight) {
            handleSwipe(true);
        } else if (isLeft) {
            handleSwipe(false);
        } else if (isInfo) {
            if (state.isAnimating) return;
            state.isAnimating = true;
            state.isFlipped = await playFlipAnimation(state.activeTheme, state.users[state.currentUserIndex], state.currentMovieIndex, SWIPES_PER_USER, state.isFlipped);
            state.isAnimating = false;
            drawSwipeScreen();
        }
    } else if (state.appState === 'TRANSITION') {
        startUserTurn();
    } else if (state.appState === 'REMATCH_PROMPT') {
        handleRematchInput(key);
    }
});

startApp();
