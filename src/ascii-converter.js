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

async function getAsciiPoster(url, width = 60, height = 30, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.get(url, { 
                responseType: 'arraybuffer',
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (movieApp-CLI/1.8.2)'
                }
            });
            const image = await Jimp.read(response.data);
            
            // We use the 'Half Block' technique: one character represents TWO vertical pixels.
            // This doubles the vertical resolution.
            const targetPixelHeight = height * 2;
            
            // Use 'contain' to see the whole poster, with black background
            image.contain(width, targetPixelHeight, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
            
            let ascii = '';
            // Use colored half-blocks if any color is supported.
            // Chalk will automatically downsample colors for 256-color or 16-color terminals.
            const useColor = chalk.level > 0;
            
            // Grayscale characters for no-color mode
            const chars = '@%#*+=-:. ';

            for (let y = 0; y < image.bitmap.height; y += (useColor ? 2 : 1)) {
                for (let x = 0; x < image.bitmap.width; x++) {
                    if (useColor) {
                        const upperColor = Jimp.intToRGBA(image.getPixelColor(x, y));
                        const lowerY = Math.min(y + 1, image.bitmap.height - 1);
                        const lowerColor = Jimp.intToRGBA(image.getPixelColor(x, lowerY));
                        ascii += chalk.rgb(upperColor.r, upperColor.g, upperColor.b)
                                     .bgRgb(lowerColor.r, lowerColor.g, lowerColor.b)('▀');
                    } else {
                        const color = Jimp.intToRGBA(image.getPixelColor(x, y));
                        // Standard luminance formula
                        const brightness = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
                        const charIdx = Math.floor(brightness * (chars.length - 1));
                        ascii += chars[chars.length - 1 - charIdx];
                    }
                }
                if (y + (useColor ? 2 : 1) < image.bitmap.height) ascii += '\n';
            }
            return ascii;
        } catch (error) {
            if (attempt < retries) {
                // Exponential-ish backoff: 500ms, 1000ms...
                await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 500));
                continue;
            }
            
            if (process.env.DEBUG) {
                console.error(`Error fetching/processing poster at ${url} after ${retries + 1} attempts: ${error.message}`);
            }
            return chalk.red(BROKEN_IMAGE_ASCII); // Return placeholder on final error
        }
    }
}

module.exports = { getAsciiPoster };
