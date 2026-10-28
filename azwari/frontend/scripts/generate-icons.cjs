const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="accent1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
    <linearGradient id="accent2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="accent3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#10b981" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  
  <!-- Subtle inner border -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#1e293b" stroke-width="4"/>

  <!-- Glowing Emblem -->
  <g filter="url(#glow)">
    <!-- Bottom Layer (Base / Merchants) -->
    <path d="M 256 376 L 128 304 L 256 232 L 384 304 Z" fill="url(#accent2)" opacity="0.9"/>
    
    <!-- Middle Layer (Escrow / Network) -->
    <path d="M 256 304 L 128 232 L 256 160 L 384 232 Z" fill="url(#accent3)" opacity="0.95"/>
    
    <!-- Top Layer (Sales Agents / Peak) -->
    <path d="M 256 232 L 128 160 L 256 88 L 384 160 Z" fill="url(#accent1)"/>
  </g>

  <!-- Inner Sparkle / Node -->
  <circle cx="256" cy="160" r="14" fill="#ffffff" opacity="0.9"/>
</svg>`;

async function generate() {
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgPath = path.join(publicDir, 'icon.svg');
  fs.writeFileSync(svgPath, svgIcon);
  console.log('Saved SVG icon:', svgPath);

  const svgBuffer = Buffer.from(svgIcon);

  // 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192x192.png'));
  console.log('Generated icon-192x192.png');

  // 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512x512.png'));
  console.log('Generated icon-512x512.png');

  // apple-touch-icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // favicon-32x32
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon-32x32.png'));
  console.log('Generated favicon-32x32.png');
}

generate().catch(console.error);
