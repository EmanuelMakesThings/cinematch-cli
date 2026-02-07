const { renderSettingsMenu } = require('../src/ui');

// Mock params
const activeTheme = 'DEFAULT';
const menuCursor = 0;
const subState = 'MAIN';
const currentPoolSize = 10;

console.log("--- START RENDER ---");
renderSettingsMenu(activeTheme, menuCursor, subState, currentPoolSize);
console.log("--- END RENDER ---");
