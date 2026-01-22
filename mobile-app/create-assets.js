const fs = require('fs');
const path = require('path');

// Valid 1x1 Red Pixel PNG (Checked)
const validPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

// Generate all required icons with valid PNG data
['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'].forEach(file => {
    fs.writeFileSync(path.join(assetsDir, file), validPng);
    console.log(`Re-created valid ${file}`);
});
