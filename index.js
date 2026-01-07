const fs = require('fs');
const chalk = require('chalk');
const readline = require('readline');
const figlet = require('figlet');

// Load movies
const movies = JSON.parse(fs.readFileSync('movies.json', 'utf8'));

// Setup keypress handling
readline.emitKeypressEvents(process.stdin);

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
    const title = figlet.textSync('Cinematch', { font: 'Slant' });
    const lines = title.split('\n').filter(l => l.trim().length > 0);
    const width = Math.max(...lines.map(l => l.length));
    const border = '═'.repeat(width + 4);
    
    console.log(chalk.cyan(`╔${border}╗`));
    lines.forEach(l => {
        console.log(chalk.cyan(`║  ${l.padEnd(width)}  ║`));
    });
    console.log(chalk.cyan(`╚${border}╝`));
    console.log(chalk.bold.white(`     v1.0.1 | Created by Jonah Cecil       `));
    console.log('');
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
    
    const cardWidth = 60;
    
    console.log(chalk.magenta.bold(`👤 ${user}'s Turn`));
    console.log(chalk.gray(`🎬 Movie ${currentMovieIndex + 1} of ${SWIPES_PER_USER}\n`));
    
    // Movie Card UI
    console.log(chalk.white(`┌${'─'.repeat(cardWidth)}┐`));
    const titleLine = `  ${movie.title}`.padEnd(cardWidth);
    console.log(chalk.white('│') + chalk.bgBlue.bold.white(titleLine) + chalk.white('│'));
    console.log(chalk.white(`├${'─'.repeat(cardWidth)}┤`));
    
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
    }

    // Footer Box
    console.log(chalk.magenta(`╔${'═'.repeat(outerWidth)}╗`));
    enjoyLines.forEach(l => {
        console.log(chalk.magenta(`║ `) + chalk.magenta(l.padEnd(outerWidth - 2)) + chalk.magenta(` ║`));
    });
    // Fix: padding calculation to match the rest of the box
    const creditText = 'Created by Jonah Cecil';
    console.log(chalk.magenta(`║ `) + chalk.italic.white(creditText.padStart(outerWidth - 2)) + chalk.magenta(` ║`));
    console.log(chalk.magenta(`╚${'═'.repeat(outerWidth)}╝\n`));

    process.exit();
}

startApp();
