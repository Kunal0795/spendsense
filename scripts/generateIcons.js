import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PWA_SIZES = [192, 512];
const ANDROID_SIZES = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192
};

function drawIcon(size, isRound = false) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background color
  ctx.fillStyle = '#1e1b4b';

  if (isRound) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rounded corners for non-circular (e.g. 20% of size)
    const radius = size * 0.2;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fill();
  }

  // Draw rupee symbol
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Font size ~ 60% of canvas size
  const fontSize = Math.floor(size * 0.6);
  ctx.font = `bold ${fontSize}px sans-serif`;
  
  // Nudge Y down slightly because '₹' sometimes sits high in the bounding box
  ctx.fillText('₹', size / 2, size / 2 + size * 0.05);

  return canvas.toBuffer('image/png');
}

// 1. Generate PWA Icons
console.log('Generating PWA icons...');
const publicDir = path.resolve(__dirname, '../public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

for (const size of PWA_SIZES) {
  const buffer = drawIcon(size, false);
  fs.writeFileSync(path.join(publicDir, `icon-${size}.png`), buffer);
  console.log(`Created public/icon-${size}.png`);
}

// 2. Generate Android App Icons
console.log('\nGenerating Android icons...');
const resDir = path.resolve(__dirname, '../android/app/src/main/res');

if (fs.existsSync(resDir)) {
  for (const [density, size] of Object.entries(ANDROID_SIZES)) {
    const dir = path.join(resDir, `mipmap-${density}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Square/Rounded icon
    const squareBuffer = drawIcon(size, false);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), squareBuffer);

    // Circular icon
    const roundBuffer = drawIcon(size, true);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundBuffer);

    // Foreground icon for adaptive icons (optional, but good to overwrite if it exists)
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), drawIcon(size, false));

    console.log(`Created icons for mipmap-${density} (${size}x${size})`);
  }
} else {
  console.log('Android res directory not found. Did you run capacitor sync?');
}

console.log('\nAll icons generated successfully!');
