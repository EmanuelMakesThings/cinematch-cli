const { getAsciiPoster } = require('./ascii-converter');
const chalk = require('chalk');

async function test() {
    console.log('Testing poster download for The Shawshank Redemption...');
    const url = 'https://www.impawards.com/1994/posters/shawshank_redemption_ver1.jpg';
    
    const ascii = await getAsciiPoster(url, 40);
    
    if (ascii) {
        console.log(chalk.green('Poster successfully converted!'));
        console.log(ascii);
    } else {
        console.log(chalk.red('Failed to convert poster. Check your internet connection or URL.'));
    }
}

test();
