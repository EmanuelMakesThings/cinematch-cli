const chalk = require('chalk');
const figlet = require('figlet');
const { CARD_WIDTH, POSTER_HEIGHT, SWIPES_PER_USER, THEMES, BLITZ_LIMIT_MS } = require('./config');

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
    
    const versionLine = `     v1.11.0 | ${footerText}       `;
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
        const isTV = genre === 'TV Shows';
        
        if (isTV) {
            console.log(''); // Separator space
        }
        
        const checkbox = isSelected ? chalk.green('[x]') : chalk.gray('[ ]');
        let label = isSelected ? chalk.green.bold(genre) : chalk.white(genre);
        
        if (isTV) {
            label = isSelected ? chalk.magenta.bold(genre) : chalk.magenta(genre);
        }
        
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

function renderSwipe(activeTheme, user, currentMovieIndex, totalSwipes, movie, asciiPoster, isFlipped, gameMode = 'CLASSIC', timeLeft = null) {
    let output = '';
    
    // Use Home cursor for updates to prevent flicker, Clear screen for fresh renders
    if (timeLeft !== null) {
        output += '\x1B[H'; 
    } else {
        output += '\x1Bc';
    }

    const theme = getTheme(activeTheme);

    // --- HEADER ---
    let titleText = 'Cinematch';
    let footerText = 'Created by Jonah Cecil';
    if (activeTheme === 'HORROR') { titleText = 'SCREAMATCH'; footerText = 'ENTER IF YOU DARE...'; }
    else if (activeTheme === 'SCI-FI') { titleText = 'CYBERMATCH'; footerText = 'AWAITING NEURAL LINK...'; }
    else if (activeTheme === 'WESTERN') { titleText = '🤠 HIGH NOON 🌵'; footerText = 'THIS TOWN AIN\'T BIG ENOUGH...'; }
    else if (activeTheme === 'ROMANCE') { titleText = '💖 LOVEMATCH 💖'; footerText = 'LOVE IS IN THE AIR...'; }

    const title = figlet.textSync(titleText, { font: 'Slant' });
    const lines = title.split('\n').filter(l => l.trim().length > 0);
    const width = Math.max(...lines.map(l => l.length));
    const c1 = theme.corner[0], c2 = theme.corner[1], c3 = theme.corner[2], c4 = theme.corner[3];
    const border = theme.border.repeat(width + 4);
    
    output += theme.primary(`${c1}${border}${c2}`) + '\n';
    lines.forEach(l => {
        const side = theme.side || '║';
        const padding = ' '.repeat(2); 
        output += theme.primary(`${side}${padding}${l.padEnd(width)}${padding}${side}`) + '\n';
    });
    output += theme.primary(`${c3}${border}${c4}`) + '\n';
    
    const versionLine = `     v1.11.0 | ${footerText}       `;
    if (activeTheme === 'HORROR' || activeTheme === 'ROMANCE') output += theme.primary.bold.italic(versionLine) + '\n\n';
    else if (activeTheme === 'SCI-FI') output += chalk.green.bold(versionLine) + '\n\n';
    else output += chalk.bold.white(versionLine) + '\n\n';
    
    let turnText = `👤 ${user}'s Turn | 🎬 Movie ${currentMovieIndex + 1} of ${totalSwipes}`;
    if (gameMode === 'BLITZ') {
        turnText = `⚡ BLITZ! | ${user} | 🎬 ${currentMovieIndex + 1}/${totalSwipes}`;
    }

    // Manual compensation for emoji widths in the header
    let visualLen = turnText.length;
    if (gameMode === 'BLITZ') {
        const stripped = turnText.replace(/⚡|🎬|👤/g, ''); 
        const emojiVisualWidth = 6; 
        visualLen = stripped.length + emojiVisualWidth;
    } else {
        const stripped = turnText.replace(/👤|🎬/g, '');
        visualLen = stripped.length + 4;
    }
    
    const innerWidth = CARD_WIDTH - 2; 
    let paddingNeeded = innerWidth - visualLen;
    if (paddingNeeded < 0) paddingNeeded = 0;

    output += theme.secondary(`┌${'─'.repeat(CARD_WIDTH)}┐`) + '\n';
    output += theme.secondary('│ ') + theme.secondary.bold(turnText) + ' '.repeat(paddingNeeded) + theme.secondary(' │') + '\n';
    output += theme.secondary(`└${'─'.repeat(CARD_WIDTH)}┘`) + '\n\n';

    // --- TIMER (BLITZ ONLY) ---
    if (gameMode === 'BLITZ' && timeLeft !== null) {
        const barWidth = CARD_WIDTH;
        const filled = Math.ceil((timeLeft / BLITZ_LIMIT_MS) * barWidth);
        const bar = '█'.repeat(filled).padEnd(barWidth, '░');
        
        let color = chalk.green;
        if (timeLeft <= 1000) color = chalk.red;
        else if (timeLeft <= 2000) color = chalk.yellow;
        
        output += color(bar) + '\n\n';
    } else {
        output += '\n\n'; // Match height
    }
    
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
                output += theme.primary('│') + chalk.white(line.padEnd(CARD_WIDTH)) + theme.primary('│') + '\n';
                line = '  ' + word + ' ';
                synopsisLines++;
            } else {
                line += word + ' ';
            }
        });
        output += theme.primary('│') + chalk.white(line.padEnd(CARD_WIDTH)) + theme.primary('│') + '\n';
        synopsisLines++;

        // Fill remaining space to match poster height
        const usedLines = 2 + details.length + 1 + 1 + synopsisLines;
        for (let i = 0; i < (POSTER_HEIGHT - usedLines); i++) {
            output += theme.primary('│') + ' '.repeat(CARD_WIDTH) + theme.primary('│') + '\n';
        }
        output += theme.primary(`└${'─'.repeat(CARD_WIDTH)}┘`) + '\n';
    } else {
        // Render the "Front" (Poster)
        output += chalk.blue(`┌${'─'.repeat(CARD_WIDTH)}┐`) + '\n';
        if (asciiPoster) {
            output += asciiPoster.split('\n').map(line => chalk.blue('│') + padAnsi(line, CARD_WIDTH) + chalk.blue('│')).join('\n') + '\n';
        } else {
            for(let i=0; i<POSTER_HEIGHT; i++) output += chalk.blue('│') + ' '.repeat(CARD_WIDTH) + chalk.blue('│') + '\n';
        }
        output += chalk.blue(`└${'─'.repeat(CARD_WIDTH)}┘`) + '\n';
    }

    // Movie Card UI (Bottom)
    output += theme.primary(`┌${'─'.repeat(CARD_WIDTH)}┐`) + '\n';
    const titleLine = `  ${movie.title}`.padEnd(CARD_WIDTH);
    output += theme.primary('│') + chalk.bgBlue.bold.white(titleLine) + theme.primary('│') + '\n';
    output += theme.primary(`├${'─'.repeat(CARD_WIDTH)}┤`) + '\n';

    // Genres Line
    if (movie.genres) {
        const genreText = `  GENRE: ${movie.genres.join(', ')}`.padEnd(CARD_WIDTH);
        output += theme.primary('│') + theme.accent(genreText) + theme.primary('│') + '\n';
        output += theme.primary(`├${'─'.repeat(CARD_WIDTH)}┤`) + '\n';
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
        output += theme.primary('│') + chalk.white(`  ${line.padEnd(CARD_WIDTH - 4)}  `) + theme.primary('│') + '\n';
    });
    
    output += theme.primary(`└${'─'.repeat(CARD_WIDTH)}┘`) + '\n';
    
    output += '\n' + chalk.green('  [→] Swipe Right (LIKE)    ') + chalk.red(' [←] Swipe Left (PASS)') + '\n';
    output += theme.primary('  [I] Flip Card (INFO)      ') + chalk.gray(' Press Ctrl+C to exit');

    // Write everything in one go
    process.stdout.write(output);
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
        console.log(chalk.yellow(`   With a massive ${score}% match, it's basically destiny...\n`));

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
    console.log(chalk.cyan.bold('   🏠 Press [M] for MAIN MENU'));
    console.log(chalk.gray('   Press [Q] or Ctrl+C to quit\n'));
}

function renderMainMenu(activeTheme, menuCursor) {
    clearScreen();
    showHeader(activeTheme);
    
    console.log(chalk.yellow.bold('   MAIN MENU\n'));
    
    const options = ['PLAY CLASSIC', 'PLAY BLITZ ⚡', 'DATABASE BROWSER', 'SETTINGS', 'ROADMAP', 'MORE PROJECTS'];
    const descriptions = [
        "Relaxed mode. Swipe through 10 movies at your own pace.",
        "High pressure! 3 seconds per movie. Trust your gut.",
        "Browse the full Cinematch movie library.",
        "Adjust colors and preferences.",
        "See the future features planned for Cinematch.",
        "Check out my other stuff."
    ];
    
    options.forEach((opt, index) => {
        const isHovered = index === menuCursor;
        const cursor = isHovered ? chalk.cyan(' > ') : '   ';
        const label = isHovered ? chalk.cyan.bold(opt) : chalk.white(opt);
        console.log(`${cursor}${label}`);
    });
    
    // Render Description Box
    const theme = getTheme(activeTheme);
    console.log('\n' + theme.secondary('─'.repeat(CARD_WIDTH)));
    console.log(chalk.gray.italic(`   ${descriptions[menuCursor]}`));
    console.log(theme.secondary('─'.repeat(CARD_WIDTH)));
    
    console.log(chalk.gray('\n   (Use Arrow Keys to navigate, Enter to select)'));
}

function renderRoadmap(activeTheme, roadmapContent) {
    clearScreen();
    showHeader(activeTheme);
    
    console.log(chalk.yellow.bold('   🗺️  PROJECT ROADMAP 🗺️\n'));
    
    const lines = roadmapContent.split('\n');
    lines.forEach(line => {
        if (line.startsWith('# ')) {
            // Main title - already shown in header, skip or style subtly
        } else if (line.startsWith('### ')) {
            console.log(chalk.cyan.bold(`   ${line.replace('### ', '').toUpperCase()}`));
        } else if (line.startsWith('*')) {
            console.log(chalk.white(`     • ${line.replace('*', '').trim()}`));
        } else if (line.trim().length > 0 && !line.startsWith('---')) {
            console.log(chalk.gray(`     ${line}`));
        } else {
            console.log('');
        }
    });
    
    console.log(chalk.gray('\n   Press any key to return to Main Menu...'));
}

function renderSettingsMenu(activeTheme, menuCursor, subState = 'MAIN', currentPoolSize = 10) {
    clearScreen();
    showHeader(activeTheme);
    
    if (subState === 'MAIN') {
        console.log(chalk.yellow.bold('   SETTINGS\n'));
        const options = ['CHANGE THEME', 'SET POOL SIZE', 'ADD MOVIE (EXPERIMENTAL)', 'CUSTOM MOVIES (EXPERIMENTAL)', 'BACK'];
        
        options.forEach((opt, index) => {
            const isHovered = index === menuCursor;
            const prefix = isHovered ? chalk.cyan(' > ') : '   ';
            const label = isHovered ? chalk.cyan.bold(opt) : chalk.white(opt);
            console.log(`${prefix}${label}`);
        });
        
        console.log(chalk.gray('\n   Current Theme: ' + activeTheme));
        console.log(chalk.gray('   Current Pool Size: ' + currentPoolSize));
        
    } else if (subState === 'THEME') {
        console.log(chalk.yellow.bold('   SETTINGS: Select a Theme\n'));
        const themes = ['DEFAULT', 'CRIME', 'FANTASY', 'HORROR', 'SCI-FI', 'WESTERN', 'ROMANCE'];
        
        themes.forEach((themeName, index) => {
            const isHovered = index === menuCursor;
            const isActive = activeTheme === themeName;
            
            let prefix = '   ';
            if (isHovered) prefix = chalk.cyan(' > ');
            
            let label = chalk.white(themeName);
            if (isActive) label = chalk.green.bold(`${themeName} (Active)`);
            else if (isHovered) label = chalk.cyan.bold(themeName);
            
            console.log(`${prefix}${label}`);
        });
        
    } else if (subState === 'POOL') {
        console.log(chalk.yellow.bold('   SETTINGS: Force Pool Size\n'));
        const sizes = [5, 10, 15, 25, 50];
        
        sizes.forEach((size, index) => {
            const isHovered = index === menuCursor;
            const isActive = size === currentPoolSize;
            
            let prefix = '   ';
            if (isHovered) prefix = chalk.cyan(' > ');
            
            let label = `${size}`;
            if (size >= 25) label += chalk.gray(' (EXPERIMENTAL)');
            
            let styledLabel = chalk.white(label);
            if (isActive) styledLabel = chalk.green.bold(`${label} (Active)`);
            else if (isHovered) styledLabel = chalk.cyan.bold(label);
            
            console.log(`${prefix}${styledLabel}`);
        });
        
        console.log(chalk.gray('\n   (Larger pools take longer to load posters)'));
    }
    
    console.log(chalk.gray('\n   (Press Enter to select, Q or Escape to back)'));
}

function renderMoreProjects(activeTheme) {
    clearScreen();
    showHeader(activeTheme);
    
    console.log(chalk.yellow.bold('   🚀 MORE PROJECTS\n'));
    console.log(chalk.white('   Check out my other stuff here:'));
    console.log(chalk.cyan.bold('\n   🔗 https://github.com/EmanuelMakesThings'));
    console.log(chalk.gray('\n\n   (Press any key to return to Main Menu)'));
}

function renderCustomMoviesList(activeTheme, customMovies, cursor) {
    clearScreen();
    showHeader(activeTheme);
    
    console.log(chalk.yellow.bold('   CUSTOM MOVIES (EXPERIMENTAL)\n'));
    
    if (customMovies.length === 0) {
        console.log(chalk.gray('   No custom movies added yet.'));
        console.log(chalk.gray('\n   (Press Q or ESC to back)'));
    } else {
        customMovies.forEach((movie, index) => {
            const isHovered = index === cursor;
            const prefix = isHovered ? chalk.cyan(' > ') : '   ';
            const label = isHovered ? chalk.cyan.bold(movie.title) : chalk.white(movie.title);
            console.log(`${prefix}${label}`);
        });
        console.log(chalk.gray('\n   (Press DEL or BACKSPACE to delete, Q or ESC to back)'));
    }
}

function renderDatabaseBrowser(activeTheme, movies, cursor, offset = 0) {
    clearScreen();
    showHeader(activeTheme);
    
    console.log(chalk.yellow.bold('   DATABASE BROWSER\n'));
    
    const PAGE_SIZE = 15;
    const displayedMovies = movies.slice(offset, offset + PAGE_SIZE);
    
    displayedMovies.forEach((movie, index) => {
        const actualIndex = index + offset;
        const isHovered = actualIndex === cursor;
        const prefix = isHovered ? chalk.cyan(' > ') : '   ';
        const label = isHovered ? chalk.cyan.bold(movie.title) : chalk.white(movie.title);
        console.log(`${prefix}${label}`);
    });

    if (movies.length > PAGE_SIZE) {
        console.log(chalk.gray(`\n   Showing ${offset + 1}-${Math.min(offset + PAGE_SIZE, movies.length)} of ${movies.length}`));
    }
    
    console.log(chalk.gray('\n   (Use Arrows to scroll, Enter for Details, ESC for Menu)'));
}

function renderMovieDetail(activeTheme, movie, asciiPoster) {
    clearScreen();
    showHeader(activeTheme);
    
    const theme = getTheme(activeTheme);

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
        console.log(theme.primary('│') + theme.accent(labelStr) + chalk.white(truncatedValue.padEnd(availableWidth)) + theme.primary('│'));
    });

    console.log(theme.primary('│') + ' '.repeat(CARD_WIDTH) + theme.primary('│'));
    console.log(theme.primary('│') + theme.accent('  SYNOPSIS:'.padEnd(CARD_WIDTH)) + theme.primary('│'));
    
    const synopsis = movie.synopsis || '';
    const words = synopsis.split(' ');
    let line = '  ';
    words.forEach(word => {
        if ((line + word).length > (CARD_WIDTH - 4)) {
            console.log(theme.primary('│') + chalk.white(line.padEnd(CARD_WIDTH)) + theme.primary('│'));
            line = '  ' + word + ' ';
        } else {
            line += word + ' ';
        }
    });
    console.log(theme.primary('│') + chalk.white(line.padEnd(CARD_WIDTH)) + theme.primary('│'));

    console.log(theme.primary(`└${'─'.repeat(CARD_WIDTH)}┘`));
    
    if (asciiPoster) {
        console.log('\n' + chalk.blue(`┌${'─'.repeat(CARD_WIDTH)}┐`));
        console.log(asciiPoster.split('\n').map(line => chalk.blue('│') + padAnsi(line, CARD_WIDTH) + chalk.blue('│')).join('\n'));
        console.log(chalk.blue(`└${'─'.repeat(CARD_WIDTH)}┘`));
    }

    console.log(chalk.gray('\n   (Press any key to return to Browser)'));
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
    promptRematch,
    renderMainMenu,
    renderRoadmap,
    renderSettingsMenu,
    renderMoreProjects,
    renderCustomMoviesList,
    renderDatabaseBrowser,
    renderMovieDetail
};