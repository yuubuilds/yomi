const sharp = require('sharp');

const svg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <!-- Background -->
  <rect width="512" height="512" rx="108" fill="url(#g)"/>
  <!-- Document body -->
  <rect x="142" y="98" width="228" height="296" rx="14" fill="white"/>
  <!-- Corner fold (cut corner + shadow) -->
  <polygon points="310,98 370,158 310,158" fill="#6d28d9" opacity="0.35"/>
  <line x1="310" y1="98" x2="310" y2="158" stroke="#6d28d9" stroke-width="1.5" opacity="0.2"/>
  <line x1="310" y1="158" x2="370" y2="158" stroke="#6d28d9" stroke-width="1.5" opacity="0.2"/>
  <!-- Text lines -->
  <rect x="170" y="192" width="172" height="11" rx="5.5" fill="#4f46e5" opacity="0.22"/>
  <rect x="170" y="220" width="148" height="11" rx="5.5" fill="#4f46e5" opacity="0.22"/>
  <rect x="170" y="248" width="164" height="11" rx="5.5" fill="#4f46e5" opacity="0.22"/>
  <rect x="170" y="276" width="116" height="11" rx="5.5" fill="#4f46e5" opacity="0.22"/>
  <rect x="170" y="304" width="140" height="11" rx="5.5" fill="#4f46e5" opacity="0.22"/>
  <!-- Subtle "Y" hint at bottom right -->
  <text x="390" y="385" font-family="Georgia, serif" font-size="72" font-weight="bold"
        fill="white" opacity="0.18" text-anchor="middle">y</text>
</svg>
`);

sharp(svg)
  .resize(512, 512)
  .png()
  .toFile('resources/icons/appIcon.png')
  .then(() => {
    console.log('appIcon.png done');
    return sharp(svg).resize(32, 32).png().toFile('resources/icons/trayIcon.png');
  })
  .then(() => console.log('trayIcon.png done'))
  .catch(console.error);
