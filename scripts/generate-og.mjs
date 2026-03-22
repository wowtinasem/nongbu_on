import sharp from 'sharp'
import { writeFileSync } from 'fs'

// Create a 1200x630 OG image with embedded text using SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#16a34a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="100" cy="530" r="120" fill="rgba(255,255,255,0.08)"/>
  <circle cx="1100" cy="100" r="150" fill="rgba(255,255,255,0.06)"/>
  <circle cx="900" cy="500" r="80" fill="rgba(255,255,255,0.05)"/>
  <circle cx="300" cy="80" r="60" fill="rgba(255,255,255,0.04)"/>

  <!-- Film strip -->
  <rect x="80" y="180" width="60" height="260" rx="8" fill="rgba(255,255,255,0.15)"/>
  <rect x="90" y="195" width="40" height="28" rx="4" fill="rgba(255,255,255,0.25)"/>
  <rect x="90" y="235" width="40" height="28" rx="4" fill="rgba(255,255,255,0.25)"/>
  <rect x="90" y="275" width="40" height="28" rx="4" fill="rgba(255,255,255,0.25)"/>
  <rect x="90" y="315" width="40" height="28" rx="4" fill="rgba(255,255,255,0.25)"/>
  <rect x="90" y="355" width="40" height="28" rx="4" fill="rgba(255,255,255,0.25)"/>
  <rect x="90" y="395" width="40" height="28" rx="4" fill="rgba(255,255,255,0.25)"/>

  <!-- Leaf icon -->
  <text x="210" y="220" font-size="60" fill="rgba(255,255,255,0.9)">🌾</text>

  <!-- Title -->
  <text x="290" y="220" font-family="Arial, sans-serif" font-size="88" font-weight="800" fill="white" letter-spacing="-2">농부ON</text>

  <!-- Subtitle -->
  <text x="210" y="300" font-family="Arial, sans-serif" font-size="38" font-weight="600" fill="rgba(255,255,255,0.92)">농부를 위한 AI 숏폼 영상 제작</text>

  <!-- Feature pills -->
  <rect x="210" y="340" width="155" height="42" rx="21" fill="rgba(255,255,255,0.2)"/>
  <text x="287" y="368" font-family="Arial, sans-serif" font-size="19" font-weight="600" fill="white" text-anchor="middle">AI 나레이션</text>

  <rect x="385" y="340" width="155" height="42" rx="21" fill="rgba(255,255,255,0.2)"/>
  <text x="462" y="368" font-family="Arial, sans-serif" font-size="19" font-weight="600" fill="white" text-anchor="middle">AI 음성합성</text>

  <rect x="560" y="340" width="135" height="42" rx="21" fill="rgba(255,255,255,0.2)"/>
  <text x="627" y="368" font-family="Arial, sans-serif" font-size="19" font-weight="600" fill="white" text-anchor="middle">자동 자막</text>

  <rect x="715" y="340" width="135" height="42" rx="21" fill="rgba(255,255,255,0.2)"/>
  <text x="782" y="368" font-family="Arial, sans-serif" font-size="19" font-weight="600" fill="white" text-anchor="middle">사진 효과</text>

  <!-- Phone mockup -->
  <rect x="930" y="100" width="190" height="380" rx="22" fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
  <rect x="944" y="118" width="162" height="344" rx="12" fill="rgba(255,255,255,0.08)"/>
  <!-- Play button -->
  <circle cx="1025" cy="280" r="32" fill="rgba(255,255,255,0.25)"/>
  <polygon points="1015,260 1015,300 1043,280" fill="white"/>
  <!-- Shorts label -->
  <rect x="975" y="420" width="100" height="26" rx="13" fill="rgba(255,0,0,0.6)"/>
  <text x="1025" y="439" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="white" text-anchor="middle">Shorts</text>

  <!-- Tagline -->
  <text x="210" y="440" font-family="Arial, sans-serif" font-size="24" font-weight="400" fill="rgba(255,255,255,0.7)">사진만 올리면 AI가 영상을 만들어 드려요</text>

  <!-- Bottom bar -->
  <rect x="0" y="560" width="1200" height="70" fill="rgba(0,0,0,0.15)"/>
  <text x="600" y="603" font-family="Arial, sans-serif" font-size="20" font-weight="500" fill="rgba(255,255,255,0.7)" text-anchor="middle">괴산군 정보화 농부님들을 위해 제작되었습니다</text>
</svg>`

await sharp(Buffer.from(svg))
  .png()
  .toFile('public/og-image.png')

console.log('og-image.png generated successfully!')
