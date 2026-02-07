const chalk = require('chalk');

const CARD_WIDTH = 60;
const POSTER_HEIGHT = 30;
const SWIPES_PER_USER = 10;
const POSTER_FETCH_BATCH_SIZE = 5;
const BLITZ_LIMIT_MS = 3000;

const THEMES = {
    DEFAULT: { primary: chalk.cyan, secondary: chalk.magenta, accent: chalk.yellow, border: '═', side: '║', corner: ['╔', '╗', '╚', '╝'] },
    CRIME: { primary: chalk.red.dim, secondary: chalk.white.dim, accent: chalk.yellow.dim, border: '─', side: '│', corner: ['┌', '┐', '└', '┘'] },
    FANTASY: { primary: chalk.magenta, secondary: chalk.blue, accent: chalk.yellow, border: '✧', side: '✧', corner: ['✧', '✧', '✧', '✧'] },
    HORROR: { primary: chalk.red.bold, secondary: chalk.red, accent: chalk.gray, border: '━', side: '┃', corner: ['┏', '┓', '┗', '┛'] },
    'SCI-FI': { primary: chalk.cyan.bold, secondary: chalk.green, accent: chalk.magenta, border: '═', side: '╬', corner: ['╬', '╬', '╬', '╬'] },
    WESTERN: { primary: chalk.yellow, secondary: chalk.red, accent: chalk.gray, border: '─', side: '│', corner: ['┌', '┐', '└', '┘'] },
    ROMANCE: { primary: chalk.red, secondary: chalk.magenta, accent: chalk.white, border: '─', side: '│', corner: ['╭', '╮', '╰', '╯'] }
};

module.exports = {
    CARD_WIDTH,
    POSTER_HEIGHT,
    SWIPES_PER_USER,
    POSTER_FETCH_BATCH_SIZE,
    BLITZ_LIMIT_MS,
    THEMES
};