const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');

// Load movies
const movies = JSON.parse(fs.readFileSync('movies.json', 'utf8'));

// Setup keypress handling
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

const userChoices = {};
let users = [];
let currentUserIndex = 0;
let currentMovieIndex = 0;
let userLikes = [];
let sessionMovies = [];
let appState = 'SETUP'; // SETUP, SWIPING, TRANSITION, RESULTS

const SWIPES_PER_USER = 10;

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function showHeader() {
    console.log(chalk.bold.cyan('========================================'));
    console.log(chalk.bold.cyan('           CINEMATCH CLI               '));
    console.log(chalk.bold.white('      Created by Jonah Cecil           '));
    console.log(chalk.bold.cyan('========================================\n'));
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
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        appState = 'SWIPING';
        startUserTurn();
    });
}

function getRandomMovies(count) {
    const shuffled = [...movies].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

function startUserTurn() {
    if (currentUserIndex >= users.length) {
        appState = 'RESULTS';
        showResults();
        return;
    }

    currentMovieIndex = 0;
    userLikes = [];
    sessionMovies = getRandomMovies(SWIPES_PER_USER);
    appState = 'SWIPING';
    renderSwipe();
}

function renderSwipe() {
    clearScreen();
    showHeader();
    
    const user = users[currentUserIndex];
    const movie = sessionMovies[currentMovieIndex];
    
    console.log(chalk.magenta.bold(`${user}'s Turn`));
    console.log(chalk.gray(`Movie ${currentMovieIndex + 1} of ${SWIPES_PER_USER}\n`));
    
    console.log(chalk.white.bgBlue.bold(`  ${movie.title}  `));
    console.log(chalk.italic.white(`\n${movie.synopsis}\n`));
    
    console.log(chalk.green('  [→] Swipe Right (LIKE)    ') + chalk.red(' [←] Swipe Left (DISLIKE)'));
    console.log(chalk.gray('\nPress Ctrl+C to exit'));
}

process.stdin.on('keypress', (str, key) => {
    if (key && key.ctrl && key.name === 'c') {
        process.exit();
    }

    if (appState === 'SWIPING') {
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
    showHeader();
    console.log(chalk.bold.yellow('--- FINAL MATCHES ---\n'));

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
        console.log(chalk.green.bold('✨ Perfect Matches (Everyone liked these!):'));
        perfectMatches.forEach(m => console.log(chalk.green(` • ${m}`)));
        console.log('');
    }

    if (commonMatches.length > 0) {
        console.log(chalk.blue.bold('👍 Popular Choices (Majority liked these):'));
        commonMatches.forEach(m => {
            console.log(chalk.blue(` • ${m} (${movieCounts[m]}/${users.length} votes)`));
        });
        console.log('');
    }

    if (perfectMatches.length === 0 && commonMatches.length === 0) {
        console.log(chalk.red('No common matches found. Maybe try another round?'));
    }

    console.log(chalk.cyan('\nThank you for using Cinematch!'));
    console.log(chalk.white('Created by Jonah Cecil\n'));
    process.exit();
}

startApp();
