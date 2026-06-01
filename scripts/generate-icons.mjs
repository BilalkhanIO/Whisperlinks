/**
 * Generates PNG app icons from an SVG source using sharp.
 * Run: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

// WhisperLink icon SVG — neon-green chat bubble on void-black
const buildSvg = (size) => {
  const r = size * 0.16;  // corner radius
  const pad = size * 0.12;
  const inner = size - pad * 2;
  const tailH = size * 0.12;
  const tailW = size * 0.1;
  const tailX = size * 0.22;
  const dotR = size * 0.055;
  const dotY = size * 0.52;
  const dotSpacing = inner / 3.2;
  const dot1X = size * 0.34;
  const dot2X = size * 0.5;
  const dot3X = size * 0.66;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#09090b"/>

  <!-- Subtle glow ring -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.43}" fill="none" stroke="#22c55e" stroke-width="${size * 0.02}" opacity="0.15"/>

  <!-- Chat bubble body -->
  <path d="
    M ${pad + r} ${pad}
    H ${pad + inner - r}
    Q ${pad + inner} ${pad} ${pad + inner} ${pad + r}
    V ${pad + inner - r - tailH}
    Q ${pad + inner} ${pad + inner - tailH} ${pad + inner - r} ${pad + inner - tailH}
    H ${tailX + tailW}
    L ${tailX} ${pad + inner}
    V ${pad + inner - tailH}
    H ${pad + r}
    Q ${pad} ${pad + inner - tailH} ${pad} ${pad + inner - tailH - r}
    V ${pad + r}
    Q ${pad} ${pad} ${pad + r} ${pad}
    Z
  " fill="#22c55e" opacity="0.12"/>

  <!-- Chat bubble outline -->
  <path d="
    M ${pad + r} ${pad}
    H ${pad + inner - r}
    Q ${pad + inner} ${pad} ${pad + inner} ${pad + r}
    V ${pad + inner - r - tailH}
    Q ${pad + inner} ${pad + inner - tailH} ${pad + inner - r} ${pad + inner - tailH}
    H ${tailX + tailW}
    L ${tailX} ${pad + inner}
    V ${pad + inner - tailH}
    H ${pad + r}
    Q ${pad} ${pad + inner - tailH} ${pad} ${pad + inner - tailH - r}
    V ${pad + r}
    Q ${pad} ${pad} ${pad + r} ${pad}
    Z
  " fill="none" stroke="#22c55e" stroke-width="${size * 0.028}" stroke-linejoin="round"/>

  <!-- Three dots -->
  <circle cx="${dot1X}" cy="${dotY}" r="${dotR}" fill="#22c55e"/>
  <circle cx="${dot2X}" cy="${dotY}" r="${dotR}" fill="#22c55e"/>
  <circle cx="${dot3X}" cy="${dotY}" r="${dotR}" fill="#22c55e"/>
</svg>`;
};

// Maskable icon: simpler design filling edge-to-edge for safe zone compliance
const buildMaskableSvg = (size) => {
  const dotR = size * 0.05;
  const dotY = size * 0.52;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#09090b"/>
  <rect x="${size*0.08}" y="${size*0.22}" width="${size*0.84}" height="${size*0.52}" rx="${size*0.1}" fill="#22c55e" opacity="0.12"/>
  <rect x="${size*0.08}" y="${size*0.22}" width="${size*0.84}" height="${size*0.52}" rx="${size*0.1}" fill="none" stroke="#22c55e" stroke-width="${size*0.025}"/>
  <polygon points="${size*0.2},${size*0.74} ${size*0.32},${size*0.74} ${size*0.22},${size*0.86}" fill="#22c55e" stroke="#22c55e" stroke-linejoin="round" stroke-width="${size*0.01}"/>
  <circle cx="${size*0.34}" cy="${dotY}" r="${dotR}" fill="#22c55e"/>
  <circle cx="${size*0.5}" cy="${dotY}" r="${dotR}" fill="#22c55e"/>
  <circle cx="${size*0.66}" cy="${dotY}" r="${dotR}" fill="#22c55e"/>
</svg>`;
};

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  console.log('Generating WhisperLink PWA icons...');
  for (const size of SIZES) {
    const svg = Buffer.from(buildSvg(size));
    const out = join(outDir, `icon-${size}.png`);
    await sharp(svg).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Maskable icon (512x512 only)
  const maskableSvg = Buffer.from(buildMaskableSvg(512));
  const maskableOut = join(outDir, 'icon-maskable-512.png');
  await sharp(maskableSvg).resize(512, 512).png({ compressionLevel: 9 }).toFile(maskableOut);
  console.log('  ✓ icon-maskable-512.png');

  // Apple touch icon (180x180)
  const appleSvg = Buffer.from(buildSvg(180));
  const appleOut = join(outDir, 'apple-touch-icon.png');
  await sharp(appleSvg).resize(180, 180).png({ compressionLevel: 9 }).toFile(appleOut);
  console.log('  ✓ apple-touch-icon.png');

  console.log(`\nAll icons written to public/icons/`);
}

generate().catch(err => { console.error(err); process.exit(1); });
