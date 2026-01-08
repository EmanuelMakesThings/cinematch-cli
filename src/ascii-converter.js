const Jimp = require('jimp');
const axios = require('axios');
const chalk = require('chalk');

// Placeholder ASCII art for broken/missing image
const BROKEN_IMAGE_ASCII = `████████████████████████████████████████████████████████████
████████████████████████████████████████████████████████████
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██             IMAGE NOT FOUND OR UNAVAILABLE             ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
██                                                        ██
████████████████████████████████████████████████████████████
████████████████████████████████████████████████████████████`;

async function getAsciiPoster(url, width = 60, height = 30) {
    try {
        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (movieApp-CLI/1.8.1)'
            }
        });
        const image = await Jimp.read(response.data);
        
        // We use the 'Half Block' technique: one character represents TWO vertical pixels.
        // This doubles the vertical resolution.
        const targetPixelHeight = height * 2;
        
        // Use 'contain' to see the whole poster, with black background
        image.contain(width, targetPixelHeight, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
        
        let ascii = '';
        
        for (let y = 0; y < image.bitmap.height; y += 2) {
            for (let x = 0; x < image.bitmap.width; x++) {
                const upperColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                // Safely clamp the lower pixel Y to the last row if image height is odd
                const lowerY = Math.min(y + 1, image.bitmap.height - 1);
                const lowerColor = Jimp.intToRGBA(image.getPixelColor(x, lowerY));

                // Top pixel is foreground, bottom pixel is background
                // Character '▀' (Upper Half Block)
                ascii += chalk.rgb(upperColor.r, upperColor.g, upperColor.b)
                             .bgRgb(lowerColor.r, lowerColor.g, lowerColor.b)('▀');
            }
            if (y + 2 < image.bitmap.height) ascii += '\n';
        }
        return ascii;
    } catch (error) {
        if (process.env.DEBUG) {
            console.error(`Error fetching/processing poster at ${url}: ${error.message}`);
        }
        return chalk.red(BROKEN_IMAGE_ASCII); // Return placeholder on error
    }
}

module.exports = { getAsciiPoster };
