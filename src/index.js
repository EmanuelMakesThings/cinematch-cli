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
    POSTER_FETCH_BATCH_SIZE,
    BLITZ_LIMIT_MS
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
    promptRematch,
    renderMainMenu,
    renderRoadmap,
    renderSettingsMenu,
    renderMoreProjects,
    renderCustomMoviesList,
    renderDatabaseBrowser,
    renderMovieDetail
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
    mainMenuCursor: 0,
    settingsMenuCursor: 0,
    settingsSubState: 'MAIN', // MAIN, THEME, POOL
    customMoviesCursor: 0,
    dbBrowserCursor: 0,
    dbBrowserOffset: 0,
    swipesPerUser: SWIPES_PER_USER,
    gameMode: 'CLASSIC', // CLASSIC or BLITZ
    blitzTimer: null,
    blitzStartTime: 0,
    blitzInterval: null,
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

function startApp() {
    state.appState = 'MAIN_MENU';
    renderMainMenu(state.activeTheme, state.mainMenuCursor);
    
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }
    process.stdin.resume();
}

function handleMainMenuInput(key) {
    const options = ['PLAY CLASSIC', 'PLAY BLITZ ⚡', 'DATABASE BROWSER', 'SETTINGS', 'ROADMAP', 'MORE PROJECTS'];
    
    if (key.name === 'up') {
        state.mainMenuCursor = Math.max(0, state.mainMenuCursor - 1);
        renderMainMenu(state.activeTheme, state.mainMenuCursor);
    } else if (key.name === 'down') {
        state.mainMenuCursor = Math.min(options.length - 1, state.mainMenuCursor + 1);
        renderMainMenu(state.activeTheme, state.mainMenuCursor);
    } else if (key.name === 'return') {
        if (state.mainMenuCursor === 0) { // PLAY CLASSIC
            state.gameMode = 'CLASSIC';
            setupGame();
        } else if (state.mainMenuCursor === 1) { // PLAY BLITZ
            state.gameMode = 'BLITZ';
            setupGame();
        } else if (state.mainMenuCursor === 2) { // DATABASE BROWSER
            state.appState = 'DB_BROWSER';
            state.dbBrowserCursor = 0;
            state.dbBrowserOffset = 0;
            renderDatabaseBrowser(state.activeTheme, movies, state.dbBrowserCursor, state.dbBrowserOffset);
        } else if (state.mainMenuCursor === 3) { // SETTINGS
            state.appState = 'SETTINGS';
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (state.mainMenuCursor === 4) { // ROADMAP
            try {
                const roadmapPath = path.join(__dirname, '../ROADMAP.md');
                const content = fs.readFileSync(roadmapPath, 'utf8');
                state.appState = 'ROADMAP_VIEW';
                renderRoadmap(state.activeTheme, content);
            } catch (e) {
                console.log(chalk.red('\n   Could not load Roadmap!'));
                setTimeout(() => {
                    renderMainMenu(state.activeTheme, state.mainMenuCursor);
                }, 1000);
            }
        } else if (state.mainMenuCursor === 5) { // MORE PROJECTS
            state.appState = 'MORE_PROJECTS';
            renderMoreProjects(state.activeTheme);
        }
    }
}

function handleSettingsInput(key) {
    if (state.settingsSubState === 'THEME') {
        const themes = ['DEFAULT', 'CRIME', 'FANTASY', 'HORROR', 'SCI-FI', 'WESTERN', 'ROMANCE'];
        if (key.name === 'up') {
            state.settingsMenuCursor = Math.max(0, state.settingsMenuCursor - 1);
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (key.name === 'down') {
            state.settingsMenuCursor = Math.min(themes.length - 1, state.settingsMenuCursor + 1);
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (key.name === 'return') {
            state.activeTheme = themes[state.settingsMenuCursor];
            state.settingsSubState = 'MAIN';
            state.settingsMenuCursor = 0;
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (key.name === 'escape' || key.name === 'q') {
            state.settingsSubState = 'MAIN';
            state.settingsMenuCursor = 0;
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        }
        return;
    }

    if (state.settingsSubState === 'POOL') {
        const poolOptions = [5, 10, 15, 25, 50];
        if (key.name === 'up') {
            state.settingsMenuCursor = Math.max(0, state.settingsMenuCursor - 1);
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (key.name === 'down') {
            state.settingsMenuCursor = Math.min(poolOptions.length - 1, state.settingsMenuCursor + 1);
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (key.name === 'return') {
            state.swipesPerUser = poolOptions[state.settingsMenuCursor];
            state.settingsSubState = 'MAIN';
            state.settingsMenuCursor = 1;
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (key.name === 'escape' || key.name === 'q') {
            state.settingsSubState = 'MAIN';
            state.settingsMenuCursor = 1;
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        }
        return;
    }

    const mainOptions = ['CHANGE THEME', 'SET POOL SIZE', 'ADD MOVIE (EXPERIMENTAL)', 'CUSTOM MOVIES (EXPERIMENTAL)', 'BACK'];
    
    if (key.name === 'up') {
        state.settingsMenuCursor = Math.max(0, state.settingsMenuCursor - 1);
        renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
    } else if (key.name === 'down') {
        state.settingsMenuCursor = Math.min(mainOptions.length - 1, state.settingsMenuCursor + 1);
        renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
    } else if (key.name === 'return') {
        if (state.settingsMenuCursor === 0) { // THEME
            state.settingsSubState = 'THEME';
            state.settingsMenuCursor = 0;
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (state.settingsMenuCursor === 1) { // POOL
            state.settingsSubState = 'POOL';
            const poolOptions = [5, 10, 15, 25, 50];
            const currentIdx = poolOptions.indexOf(state.swipesPerUser);
            state.settingsMenuCursor = currentIdx !== -1 ? currentIdx : 1;
            renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, state.settingsSubState, state.swipesPerUser);
        } else if (state.settingsMenuCursor === 2) { // ADD MOVIE
            startAddMovieFlow();
        } else if (state.settingsMenuCursor === 3) { // CUSTOM MOVIES
            state.appState = 'CUSTOM_MOVIES_LIST';
            state.customMoviesCursor = 0;
            renderCustomMoviesList(state.activeTheme, getCustomMovies(), state.customMoviesCursor);
        } else { // BACK
            state.appState = 'MAIN_MENU';
            renderMainMenu(state.activeTheme, state.mainMenuCursor);
        }
    } else if (key.name === 'escape' || key.name === 'q') {
        state.appState = 'MAIN_MENU';
        renderMainMenu(state.activeTheme, state.mainMenuCursor);
    }
}

function getCustomMovies() {
    return movies.filter(m => m.isCustom);
}

function handleCustomMoviesInput(key) {
    const customMovies = getCustomMovies();
    if (key.name === 'up') {
        state.customMoviesCursor = Math.max(0, state.customMoviesCursor - 1);
        renderCustomMoviesList(state.activeTheme, customMovies, state.customMoviesCursor);
    } else if (key.name === 'down') {
        state.customMoviesCursor = Math.min(customMovies.length - 1, state.customMoviesCursor + 1);
        renderCustomMoviesList(state.activeTheme, customMovies, state.customMoviesCursor);
    } else if (key.name === 'backspace' || key.name === 'delete') {
        if (customMovies.length > 0) {
            const movieToDelete = customMovies[state.customMoviesCursor];
            const idx = movies.indexOf(movieToDelete);
            if (idx !== -1) {
                movies.splice(idx, 1);
                fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
                state.customMoviesCursor = Math.min(state.customMoviesCursor, getCustomMovies().length - 1);
                renderCustomMoviesList(state.activeTheme, getCustomMovies(), state.customMoviesCursor);
            }
        }
    } else if (key.name === 'escape' || key.name === 'q') {
        state.appState = 'SETTINGS';
        renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, 'MAIN', state.swipesPerUser);
    }
}

async function handleDbBrowserInput(key) {
    const PAGE_SIZE = 15;
    if (key.name === 'up') {
        state.dbBrowserCursor = Math.max(0, state.dbBrowserCursor - 1);
        if (state.dbBrowserCursor < state.dbBrowserOffset) {
            state.dbBrowserOffset = state.dbBrowserCursor;
        }
        renderDatabaseBrowser(state.activeTheme, movies, state.dbBrowserCursor, state.dbBrowserOffset);
    } else if (key.name === 'down') {
        state.dbBrowserCursor = Math.min(movies.length - 1, state.dbBrowserCursor + 1);
        if (state.dbBrowserCursor >= state.dbBrowserOffset + PAGE_SIZE) {
            state.dbBrowserOffset = state.dbBrowserCursor - PAGE_SIZE + 1;
        }
        renderDatabaseBrowser(state.activeTheme, movies, state.dbBrowserCursor, state.dbBrowserOffset);
    } else if (key.name === 'return') {
        const movie = movies[state.dbBrowserCursor];
        state.appState = 'DB_DETAIL';
        clearScreen();
        showHeader(state.activeTheme);
        console.log(chalk.cyan('\n   Loading details...'));
        let ascii = null;
        if (movie.posterUrl) {
            ascii = await getAsciiPoster(movie.posterUrl, CARD_WIDTH, POSTER_HEIGHT);
        }
        renderMovieDetail(state.activeTheme, movie, ascii);
    } else if (key.name === 'escape' || key.name === 'q') {
        state.appState = 'MAIN_MENU';
        renderMainMenu(state.activeTheme, state.mainMenuCursor);
    }
}

async function startAddMovieFlow() {
    clearScreen();
    showHeader(state.activeTheme);
    console.log(chalk.yellow.bold('   ADD A MOVIE (EXPERIMENTAL)\n'));
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q) => new Promise(resolve => rl.question(chalk.white('   ' + q + ': '), resolve));
    try {
        const title = await ask('Movie Title');
        if (!title.trim()) throw new Error('Title is required');
        const director = await ask('Director');
        const rating = await ask('Rating');
        const genresStr = await ask('Genres (comma separated)');
        const starsStr = await ask('Stars (comma separated)');
        const synopsis = await ask('Synopsis');
        const posterUrl = await ask('Poster URL');
        console.log(chalk.yellow('\n   Validating poster URL...'));
        const ascii = await getAsciiPoster(posterUrl, CARD_WIDTH, POSTER_HEIGHT);
        if (ascii.includes('IMAGE NOT FOUND')) {
            console.log(chalk.red('\n   ❌ Error: The poster link is broken or cannot be converted.'));
        } else {
            const newMovie = {
                title: title.trim(),
                synopsis: synopsis.trim(),
                posterUrl: posterUrl.trim(),
                genres: genresStr.split(',').map(s => s.trim()).filter(Boolean),
                rating: rating.trim(),
                director: director.trim(),
                stars: starsStr.split(',').map(s => s.trim()).filter(Boolean).join(', '),
                isCustom: true
            };
            movies.push(newMovie);
            fs.writeFileSync(moviesPath, JSON.stringify(movies, null, 2));
            console.log(chalk.green('\n   ✅ Success! Movie added.'));
        }
    } catch (e) {
        console.log(chalk.red(`\n   Error: ${e.message}`));
    } finally {
        rl.close();
        console.log(chalk.gray('\n   Press any key to return to Settings...'));
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        process.stdin.resume();
        state.appState = 'WAIT_FOR_SETTINGS';
    }
}

async function setupGame() {
    clearScreen();
    showHeader(state.activeTheme);
    state.appState = 'SETUP';
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(chalk.yellow('How many people are making decisions? '), (num) => {
        const count = parseInt(num);
        if (isNaN(count) || count <= 0) {
            console.log(chalk.red('Please enter a valid number!'));
            process.exit();
        }
        state.users = [];
        state.userChoices = {};
        for (let i = 1; i <= count; i++) {
            const userName = `User ${i}`;
            state.users.push(userName);
            state.userChoices[userName] = [];
        }
        rl.close();
        state.availableGenres = getUniqueGenres(movies);
        state.appState = 'GENRE_SELECT';
        if (process.stdin.isTTY) process.stdin.setRawMode(true);
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
        if (state.selectedGenreIndices.has(state.genreCursor)) state.selectedGenreIndices.delete(state.genreCursor);
        else state.selectedGenreIndices.add(state.genreCursor);
        renderGenreSelect(state.availableGenres, state.selectedGenreIndices, state.genreCursor, state.activeTheme);
    } else if (key.name === 'return') {
        finalizeGenreSelection();
    }
}

function finalizeGenreSelection() {
    let selectedGenres = Array.from(state.selectedGenreIndices).map(i => state.availableGenres[i]);
    const requiredPoolSize = state.swipesPerUser + 2;
    state.filteredMovies = filterMovies(movies, selectedGenres, requiredPoolSize);
    console.log(chalk.green('\n   Genre selection finalized!'));
    setTimeout(() => initializeSession(), 1000);
}

async function initializeSession() {
    state.sessionVariation = Math.max(0, 2 - state.consecutiveFailures);
    const poolSize = state.swipesPerUser + state.sessionVariation;
    state.sessionMovies = getSessionMovies(state.filteredMovies, poolSize, state.consecutiveFailures);
    state.posterCache = {};
    state.postersLoading = true;
    state.appState = 'LOADING';
    const appStateRef = { get current() { return state.appState; } };
    const loadingInterval = renderLoading(state.activeTheme, appStateRef);
    for (let i = 0; i < state.sessionMovies.length; i += POSTER_FETCH_BATCH_SIZE) {
        const batch = state.sessionMovies.slice(i, i + POSTER_FETCH_BATCH_SIZE);
        await Promise.all(batch.map(async (movie, batchIdx) => {
            const movieIdx = i + batchIdx;
            if (movie.posterUrl) {
                const ascii = await getAsciiPoster(movie.posterUrl, CARD_WIDTH, POSTER_HEIGHT);
                if (ascii) state.posterCache[movieIdx] = ascii;
            }
        }));
    }
    state.postersLoading = false;
    clearInterval(loadingInterval);
    state.currentUserIndex = 0;
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
    if (state.blitzTimer) clearTimeout(state.blitzTimer);
    if (state.blitzInterval) clearInterval(state.blitzInterval);
    let timeLeft = null;
    if (state.gameMode === 'BLITZ') {
        state.blitzStartTime = Date.now();
        timeLeft = BLITZ_LIMIT_MS;
        state.blitzTimer = setTimeout(() => handleSwipe(false), BLITZ_LIMIT_MS);
        state.blitzInterval = setInterval(() => {
            if (state.appState !== 'SWIPING' || state.isAnimating) return;
            const remaining = Math.max(0, BLITZ_LIMIT_MS - (Date.now() - state.blitzStartTime));
            renderSwipe(state.activeTheme, user, state.currentMovieIndex, state.swipesPerUser, movie, asciiPoster, state.isFlipped, state.gameMode, remaining);
        }, 250);
    }
    renderSwipe(state.activeTheme, user, state.currentMovieIndex, state.swipesPerUser, movie, asciiPoster, state.isFlipped, state.gameMode, timeLeft);
}

async function handleSwipe(liked) {
    if (state.isAnimating) return;
    if (state.blitzTimer) clearTimeout(state.blitzTimer);
    if (state.blitzInterval) clearInterval(state.blitzInterval);
    state.isAnimating = true;
    const movieIdx = (state.currentUserIndex === 0) ? state.currentMovieIndex : state.currentMovieIndex + state.sessionVariation;
    const movie = state.sessionMovies[movieIdx];
    if (liked) state.userLikes.push(movie.title);
    await playSwipeAnimation(state.activeTheme, liked);
    state.currentMovieIndex++;
    state.isAnimating = false;
    state.isFlipped = false;
    if (state.currentMovieIndex >= state.swipesPerUser) {
        state.userChoices[state.users[state.currentUserIndex]] = state.userLikes;
        state.currentUserIndex++;
        if (state.currentUserIndex < state.users.length) {
            clearScreen();
            showHeader(state.activeTheme);
            console.log(chalk.green.bold(`\n   Turn complete for ${state.users[state.currentUserIndex - 1]}!`));
            console.log(chalk.yellow(`   Next up: ${state.users[state.currentUserIndex]}`));
            console.log(chalk.gray('\n   Press any key to start next turn...'));
            state.appState = 'TRANSITION';
        } else {
            showResults();
        }
    } else {
        drawSwipeScreen();
    }
}

async function showResults() {
    state.appState = 'RESULTS';
    clearScreen();
    const results = calculateMatches(state.userChoices, state.users);
    if (results.perfectMatches.length > 0) {
        await playCelebration(state.activeTheme);
    }
    // Simplistic results display for brevity
    showHeader(state.activeTheme);
    console.log(chalk.yellow.bold('   MATCHES FOUND:\n'));
    if (results.perfectMatches.length > 0) {
        results.perfectMatches.forEach(m => console.log(chalk.green(`   ✨ ${m}`)));
    } else if (results.commonMatches.length > 0) {
        results.commonMatches.forEach(m => console.log(chalk.blue(`   • ${m}`)));
    } else {
        console.log(chalk.red('   No common matches found.'));
    }
    console.log('');
    promptRematch();
    state.appState = 'REMATCH_PROMPT';
}

function handleRematchInput(key) {
    if (key.name === 'r') {
        state.currentUserIndex = 0;
        state.currentMovieIndex = 0;
        initializeSession();
    } else if (key.name === 'm') {
        state.users = [];
        state.appState = 'MAIN_MENU';
        renderMainMenu(state.activeTheme, state.mainMenuCursor);
    } else if (key.name === 'q') {
        process.exit();
    }
}

process.stdin.on('keypress', async (str, key) => {
    if (key && key.ctrl && key.name === 'c') process.exit();
    if (state.isAnimating) return;
    if (state.appState === 'MAIN_MENU') handleMainMenuInput(key);
    else if (state.appState === 'SETTINGS') handleSettingsInput(key);
    else if (state.appState === 'GENRE_SELECT') handleGenreInput(key);
    else if (state.appState === 'SWIPING') {
        if (key.name === 'right') handleSwipe(true);
        else if (key.name === 'left') handleSwipe(false);
        else if (key.name === 'i') {
            state.isAnimating = true;
            state.isFlipped = await playFlipAnimation(state.activeTheme, state.users[state.currentUserIndex], state.currentMovieIndex, state.swipesPerUser, state.isFlipped);
            state.isAnimating = false;
            drawSwipeScreen();
        }
    } else if (state.appState === 'TRANSITION') startUserTurn();
    else if (state.appState === 'REMATCH_PROMPT') handleRematchInput(key);
    else if (state.appState === 'ROADMAP_VIEW') { state.appState = 'MAIN_MENU'; renderMainMenu(state.activeTheme, state.mainMenuCursor); }
    else if (state.appState === 'MORE_PROJECTS') { state.appState = 'MAIN_MENU'; renderMainMenu(state.activeTheme, state.mainMenuCursor); }
    else if (state.appState === 'CUSTOM_MOVIES_LIST') handleCustomMoviesInput(key);
    else if (state.appState === 'DB_BROWSER') handleDbBrowserInput(key);
    else if (state.appState === 'DB_DETAIL') { state.appState = 'DB_BROWSER'; renderDatabaseBrowser(state.activeTheme, movies, state.dbBrowserCursor, state.dbBrowserOffset); }
    else if (state.appState === 'WAIT_FOR_SETTINGS') { state.appState = 'SETTINGS'; renderSettingsMenu(state.activeTheme, state.settingsMenuCursor, 'MAIN', state.swipesPerUser); }
});

startApp();
