const chalk = require('chalk');
const figlet = require('figlet');
const { CARD_WIDTH, POSTER_HEIGHT, SWIPES_PER_USER, THEMES } = require('./config');

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function getTheme(activeTheme) {
    return THEMES[activeTheme] || THEMES.DEFAULT;
}

function showHeader(activeTheme) {
    const theme = getTheme(activeTheme);
    let titleText = 'Cinematch';
    let footerText = 'Created by Jonah Cecil';

    if (activeTheme === 'HORROR') {
        titleText = 'SCREAMATCH';
        footerText = 'ENTER IF YOU DARE...';
    } else if (activeTheme === 'SCI-FI') {
        titleText = 'CYBERMATCH';
        footerText = 'AWAITING NEURAL LINK...';
    } else if (activeTheme === 'WESTERN') {
        titleText = '🤠 HIGH NOON 🌵';
        footerText = 'THIS TOWN AIN\'T BIG ENOUGH...';
    } else if (activeTheme === 'ROMANCE') {
        titleText = '💖 LOVEMATCH 💖';
        footerText = 'LOVE IS IN THE AIR...';
    }

    const title = figlet.textSync(titleText, { font: 'Slant' });
    const lines = title.split('\n').filter(l => l.trim().length > 0);
    const width = Math.max(...lines.map(l => l.length));
    
    // Account for potential 2-column emoji corners
    const c1 = theme.corner[0];
    const c2 = theme.corner[1];
    const c3 = theme.corner[2];
    const c4 = theme.corner[3];
    const c1Len = getVisualLength(c1);
    const c2Len = getVisualLength(c2);
    
    // The border needs to span the distance between corners
    // Total middle width is width + 4 (for the 2-space padding)
    const border = theme.border.repeat(width + 4);
    
    console.log(theme.primary(`${c1}${border}${c2}`));
    lines.forEach(l => {
        const side = theme.side || '║';
        const sideLen = getVisualLength(side);
        // If side is 2-cols (emoji), we reduce padding to compensate
        const padding = ' '.repeat(2); 
        console.log(theme.primary(`${side}${padding}${l.padEnd(width)}${padding}${side}`));
    });
    console.log(theme.primary(`${c3}${border}${c4}`));
    
    const versionLine = `     v1.10.0 | ${footerText}       `;
    if (activeTheme === 'HORROR' || activeTheme === 'ROMANCE') {
        console.log(theme.primary.bold.italic(versionLine));
    } else if (activeTheme === 'SCI-FI') {
        console.log(chalk.green.bold(versionLine));
    } else {
        console.log(chalk.bold.white(versionLine));
    }
    console.log('');
}

function renderGenreSelect(availableGenres, selectedGenreIndices, genreCursor, activeTheme) {
    clearScreen();
    showHeader(activeTheme);
    
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

function renderLoading(activeTheme, appStateRef) {
    clearScreen();
    showHeader(activeTheme);
    
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
    
    // We return the interval ID so it can be cleared by the caller
    // Or we rely on the caller to not block.
    // In the original code, it checked `appState`.
    // Here we can accept a callback or object reference to check status.
    // For simplicity, we'll just run it and let the caller clear screen which hides it, 
    // but we need to stop the interval.
    
    return setInterval(() => {
        if (appStateRef.current !== 'LOADING') {
            return; // Caller will clear interval
        }
        process.stdout.write(`\r   ${chalk.cyan(spinner[i])} Loading posters...`);
        i = (i + 1) % spinner.length;
    }, 100);
}

// Helper to get visual length of string (ignoring ANSI codes)
function getVisualLength(str) {
    return str.replace(/\u001b\[[0-9;]*m/g, '').length;
}

// Helper to pad/truncate string to exact width accounting for ANSI
function padAnsi(str, width) {
    const length = getVisualLength(str);
    if (length >= width) return str;
    return str + ' '.repeat(width - length);
}

function renderSwipe(activeTheme, user, currentMovieIndex, totalSwipes, movie, asciiPoster, isFlipped) {
    clearScreen();
    showHeader(activeTheme);
    
    const turnText = `👤 ${user}'s Turn | 🎬 Movie ${currentMovieIndex + 1} of ${totalSwipes}`;
    const theme = getTheme(activeTheme);
    console.log(theme.secondary(`┌${'─'.repeat(CARD_WIDTH)}┐`));
    console.log(theme.secondary('│ ') + theme.secondary.bold(turnText.padEnd(CARD_WIDTH - 2)) + theme.secondary(' │'));
    console.log(theme.secondary(`└${'─'.repeat(CARD_WIDTH)}┘
`));
    
    if (isFlipped) {
        // Render the "Back" of the card
        console.log(theme.primary(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        console.log(theme.primary('│') + chalk.bold.white('   MOVIE DETAILS'.padEnd(CARD_WIDTH)) + theme.primary('│'));
        console.log(theme.primary(`├${'─'.repeat(CARD_WIDTH)}┤`));
        
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
            console.log(theme.primary('│') + theme.accent(labelStr) + chalk.white(truncatedValue.padEnd(availableWidth)) + theme.primary('│'));
        });

        console.log(theme.primary('│') + ' '.repeat(CARD_WIDTH) + theme.primary('│'));
        console.log(theme.primary('│') + theme.accent('  SYNOPSIS:'.padEnd(CARD_WIDTH)) + theme.primary('│'));
        
        const synopsis = movie.synopsis || '';
        let synopsisLines = 0;
        const words = synopsis.split(' ');
        let line = '  ';
        words.forEach(word => {
            if ((line + word).length > (CARD_WIDTH - 4)) {
                console.log(theme.primary('│') + chalk.white(line.padEnd(CARD_WIDTH)) + theme.primary('│'));
                line = '  ' + word + ' ';
                synopsisLines++;
            } else {
                line += word + ' ';
            }
        });
        console.log(theme.primary('│') + chalk.white(line.padEnd(CARD_WIDTH)) + theme.primary('│'));
        synopsisLines++;

        // Fill remaining space to match poster height
        const usedLines = 2 + details.length + 1 + 1 + synopsisLines;
        for (let i = 0; i < (POSTER_HEIGHT - usedLines); i++) {
            console.log(theme.primary('│') + ' '.repeat(CARD_WIDTH) + theme.primary('│'));
        }
        console.log(theme.primary(`└${'─'.repeat(CARD_WIDTH)}┘
`));
    } else {
        // Render the "Front" (Poster)
        console.log(chalk.blue(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        if (asciiPoster) {
            console.log(asciiPoster.split('\n').map(line => chalk.blue('│') + padAnsi(line, CARD_WIDTH) + chalk.blue('│')).join('\n'));
        } else {
            for(let i=0; i<POSTER_HEIGHT; i++) console.log(chalk.blue('│') + ' '.repeat(CARD_WIDTH) + chalk.blue('│'));
        }
        console.log(chalk.blue(`└${'─'.repeat(CARD_WIDTH)}┘
`));
    }

    // Movie Card UI (Bottom)
    console.log(theme.primary(`┌${'─'.repeat(CARD_WIDTH)}┐`));
    const titleLine = `  ${movie.title}`.padEnd(CARD_WIDTH);
    console.log(theme.primary('│') + chalk.bgBlue.bold.white(titleLine) + theme.primary('│'));
    console.log(theme.primary(`├${'─'.repeat(CARD_WIDTH)}┤`));

    // Genres Line
    if (movie.genres) {
        const genreText = `  GENRE: ${movie.genres.join(', ')}`.padEnd(CARD_WIDTH);
        console.log(theme.primary('│') + theme.accent(genreText) + theme.primary('│'));
        console.log(theme.primary(`├${'─'.repeat(CARD_WIDTH)}┤`));
    }
    
    // Synopsis snippet
    const wrap = (text, width) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        words.forEach(word => {
            if ((currentLine + word).length < width) {
                currentLine += (currentLine === '' ? '' : ' ') + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        });
        lines.push(currentLine);
        return lines;
    };

    const synopsis = movie.synopsis || '';
    const firstSentence = synopsis.split(/(?<=[.!?])\s/)[0];
    const wrappedSnippet = wrap(firstSentence, CARD_WIDTH - 4);
    
    wrappedSnippet.forEach((line) => {
        console.log(theme.primary('│') + chalk.white(`  ${line.padEnd(CARD_WIDTH - 4)}  `) + theme.primary('│'));
    });
    
    console.log(theme.primary(`└${'─'.repeat(CARD_WIDTH)}┘`));
    
    console.log('\n' + chalk.green('  [→] Swipe Right (LIKE)    ') + chalk.red(' [←] Swipe Left (PASS)'));
    console.log(theme.primary('  [I] Flip Card (INFO)      ') + chalk.gray(' Press Ctrl+C to exit'));
}

async function playFlipAnimation(activeTheme, user, currentMovieIndex, totalSwipes, isFlipped) {
    const widths = [CARD_WIDTH, Math.floor(CARD_WIDTH * 0.75), Math.floor(CARD_WIDTH * 0.5), Math.floor(CARD_WIDTH * 0.25), 2, Math.floor(CARD_WIDTH * 0.25), Math.floor(CARD_WIDTH * 0.5), Math.floor(CARD_WIDTH * 0.75), CARD_WIDTH];
    const midPoint = 4;
    
    let newFlippedState = isFlipped;

    for (let i = 0; i < widths.length; i++) {
        clearScreen();
        showHeader(activeTheme);
        
        const turnText = `👤 ${user}'s Turn | 🎬 Movie ${currentMovieIndex + 1} of ${totalSwipes}`;
        console.log(chalk.magenta(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        console.log(chalk.magenta('│ ') + chalk.magenta.bold(turnText.padEnd(CARD_WIDTH - 2)) + chalk.magenta(' │'));
        console.log(chalk.magenta(`└${'─'.repeat(CARD_WIDTH)}┘
`));

        const w = widths[i];
        const padding = Math.floor((CARD_WIDTH - w) / 2);
        const padStr = ' '.repeat(padding);
        const color = newFlippedState ? chalk.cyan : chalk.white; 

        // Draw the shrinking/expanding "card" frame
        console.log(padStr + color(`┌${'─'.repeat(w)}┐`));
        for (let j = 0; j < POSTER_HEIGHT; j++) {
            console.log(padStr + color('│') + ' '.repeat(w) + color('│'));
        }
        console.log(padStr + color(`└${'─'.repeat(w)}┘`));

        if (i === midPoint) {
            newFlippedState = !newFlippedState;
        }
        
        await new Promise(r => setTimeout(r, 40));
    }
    return newFlippedState;
}

async function playSwipeAnimation(activeTheme, liked) {
    clearScreen();
    showHeader(activeTheme);
    
    console.log('\n'.repeat(4));
    for(let i=0; i<15; i++) console.log('');
    console.log('');

    const text = liked ? 'LIKE' : 'PASS';
    const color = liked ? chalk.green.bold : chalk.red.bold;
    const ascii = figlet.textSync(text, { font: 'Small' });
    
    console.log(color(ascii));
    console.log('\n'.repeat(10));
    
    await new Promise(r => setTimeout(r, 400));
}

async function playCelebration(activeTheme) {
    for (let frame = 0; frame < 20; frame++) {
        clearScreen();
        showHeader(activeTheme);
        
        const title = figlet.textSync('BOOM!', { font: 'Slant' });
        console.log(chalk.green.bold(title));
        console.log(chalk.yellow.bold('   WE HAVE A PERFECT MATCH!!!\n'));

        const chars = ['*', '•', '+', '.', 'o'];
        for (let i = 0; i < 10; i++) {
            let line = '   ';
            for (let j = 0; j < CARD_WIDTH; j++) {
                if (Math.random() > 0.92) {
                    const r = Math.floor(Math.random() * 255);
                    const g = Math.floor(Math.random() * 255);
                    const b = Math.floor(Math.random() * 255);
                    const color = chalk.rgb(r, g, b);
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

async function triggerAngryForcedPick(activeTheme, randomMovie) {
    const frames = [
        chalk.red('😠 NOPE.'),
        chalk.red.bold('😤 STILL NOTHING?!'),
        chalk.bgRed.white.bold('💢 OKAY, THAT\'S IT.'),
        chalk.red.strikethrough('❌ YOU TWO ARE IMPOSSIBLE.')
    ];

    for (const frame of frames) {
        clearScreen();
        showHeader(activeTheme);
        console.log('\n\n\n   ' + frame);
        await new Promise(r => setTimeout(resolve => r(), 800));
    }

    clearScreen();
    showHeader(activeTheme);
    
    const angryTitle = figlet.textSync('ENOUGH!', { font: 'Slant' });
    console.log(chalk.red.bold(angryTitle));
    console.log(chalk.yellow.bold('\n   Okay, you asked for it...'));
    console.log(chalk.yellow('   Since you can\'t agree on ANYTHING, you have to watch:'));
    
    setTimeout(() => {
        console.log('\n' + chalk.bgRed.white.bold(`   ✨ ${randomMovie.title.toUpperCase()} ✨   `));
        console.log(chalk.gray('\n   No more swiping. Sit down and watch it. 🍿'));
        console.log('');
    }, 1500);
}

async function playSexyAnimation(activeTheme, u1, u2, score) {
    const frames = 30;
    
    for (let f = 0; f < frames; f++) {
        clearScreen();
        showHeader(activeTheme);
        
        console.log(chalk.magenta.bold(figlet.textSync('FREAKY!', { font: 'Slant' })));
        console.log(chalk.red.bold(`\n   ${u1} and ${u2} are getting freaky tonight baby!`));
        console.log(chalk.yellow(`   With a massive ${score}% match, it\'s basically destiny...\n`));

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
}

function promptRematch(showSummaryOption = true) {
    console.log(chalk.cyan.bold('   🔄 Press [R] for a REMATCH (Same users, random movies)'));
    if (showSummaryOption) {
        console.log(chalk.cyan.bold('   📊 Press [S] for a DETAILED SESSION SUMMARY'));
    }
    console.log(chalk.gray('   Press [Q] or Ctrl+C to quit\n'));
}

module.exports = {
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
};
