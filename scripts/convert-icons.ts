import sharp from "sharp";
import fs from "fs";
import path from "path";

const publicDir = path.join(process.cwd(), "public");
const svgFiles = [
  { name: "icon-72.svg", size: 72 },
  { name: "icon-96.svg", size: 96 },
  { name: "icon-128.svg", size: 128 },
  { name: "icon-144.svg", size: 144 },
  { name: "icon-152.svg", size: 152 },
  { name: "icon-192.svg", size: 192 },
  { name: "icon-384.svg", size: 384 },
  { name: "icon-512.svg", size: 512 },
];

async function convertIcons() {
  for (const { name, size } of svgFiles) {
    const svgPath = path.join(publicDir, name);
    const pngPath = path.join(publicDir, name.replace(".svg", ".png"));

    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  ${name} not found, skipping`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`✅ Converted ${name} → ${name.replace(".svg", ".png")} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to convert ${name}:`, error);
    }
  }

  // Also create favicon.ico from 192 icon
  try {
    await sharp(path.join(publicDir, "icon-192.png"))
      .resize(32, 32)
      .toFile(path.join(publicDir, "favicon.ico"));
    console.log("✅ Created favicon.ico");
  } catch (error) {
    console.error("❌ Failed to create favicon.ico:", error);
  }

  // Create og-image.png (1200x630)
  try {
    const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="building" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#e94560;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ff6b6b;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="window" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#fff;stop-opacity:0.9" />
      <stop offset="100%" style="stop-color:#e0e0e0;stop-opacity:0.7" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="180" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" font-weight="700" fill="#fff">My AI Agency Office</text>
  <text x="600" y="240" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="#aaa">3D Live Office Isometric Diorama</text>
  <!-- Building illustration -->
  <g transform="translate(600, 450)">
    <path d="M-200,0 L-200,-200 L200,-200 L200,0 Z" fill="url(#building)" stroke="#fff" stroke-width="2" opacity="0.2"/>
    <path d="M-230,-200 L0,-280 L230,-200 L-230,-200 Z" fill="#0f3460" stroke="#fff" stroke-width="2" opacity="0.1"/>
    <g fill="url(#window)">
      <rect x="-170" y="-175" width="40" height="45" rx="6"/>
      <rect x="-170" y="-120" width="40" height="45" rx="6"/>
      <rect x="-170" y="-65" width="40" height="45" rx="6"/>
      <rect x="-170" y="-10" width="40" height="45" rx="6"/>
      <rect x="-85" y="-175" width="40" height="45" rx="6"/>
      <rect x="-85" y="-120" width="40" height="45" rx="6"/>
      <rect x="-85" y="-65" width="40" height="45" rx="6"/>
      <rect x="-85" y="-10" width="40" height="45" rx="6"/>
      <rect x="45" y="-175" width="40" height="45" rx="6"/>
      <rect x="45" y="-120" width="40" height="45" rx="6"/>
      <rect x="45" y="-65" width="40" height="45" rx="6"/>
      <rect x="45" y="-10" width="40" height="45" rx="6"/>
      <rect x="130" y="-175" width="40" height="45" rx="6"/>
      <rect x="130" y="-120" width="40" height="45" rx="6"/>
      <rect x="130" y="-65" width="40" height="45" rx="6"/>
      <rect x="130" y="-10" width="40" height="45" rx="6"/>
    </g>
    <path d="M-30,0 L-30,-80 L30,-80 L30,0 Z" fill="#0f3460"/>
    <rect x="-15" y="-30" width="30" height="30" fill="#e94560" rx="4"/>
  </g>
  <g transform="translate(600, 420)" fill="#2ecc71">
    <circle cx="-250" cy="15" r="20"/>
    <circle cx="250" cy="15" r="20"/>
  </g>
</svg>
    `;
    await sharp(Buffer.from(ogSvg.trim()))
      .resize(1200, 630)
      .png()
      .toFile(path.join(publicDir, "og-image.png"));
    console.log("✅ Created og-image.png (1200x630)");
  } catch (error) {
    console.error("❌ Failed to create og-image.png:", error);
  }
}

convertIcons();