/**
 * SVG → PNG変換スクリプト
 *
 * Usage: node scripts/convert-svg-to-png.mjs
 *
 * Required: npm install --save-dev sharp
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

const conversions = [
  { input: 'icon.svg', output: 'icon.png', width: 1024, height: 1024 },
  { input: 'splash.svg', output: 'splash.png', width: 1284, height: 2778 },
  { input: 'adaptive-icon.svg', output: 'adaptive-icon.png', width: 1024, height: 1024 },
  { input: 'notification-icon.svg', output: 'notification-icon.png', width: 96, height: 96 },
  { input: 'favicon.svg', output: 'favicon.png', width: 48, height: 48 },
];

async function convert() {
  console.log('SVG → PNG conversion starting...\n');

  for (const { input, output, width, height } of conversions) {
    const inputPath = join(assetsDir, input);
    const outputPath = join(assetsDir, output);

    try {
      const svgBuffer = readFileSync(inputPath);

      await sharp(svgBuffer, { density: 150 })
        .resize(width, height)
        .png()
        .toFile(outputPath);

      console.log(`✅ ${input} → ${output} (${width}×${height})`);
    } catch (err) {
      console.error(`❌ ${input} → ${output}: ${err.message}`);
    }
  }

  console.log('\nConversion complete!');
}

convert();
