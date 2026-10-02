// Generates the letter paper (A4 portrait at 300 dpi) in the three map styles:
// public/letter-white.jpg, letter-dark.jpg, letter-color.jpg.
// Paper = multi-scale noise for the fibre texture, faint stray fibres, two compass
// roses as watermarks (top-left and bottom-right, partly off the page, like the
// reference in scripts/letter-reference.png) and, on the colour paper, a soft vignette.
// Usage: node scripts/make-letter-paper.mjs
import sharp from 'sharp'

const W = 2480
const H = 3508

const STYLES = {
  color: { base: [221, 189, 140], noise: 10, fibre: '#7a5320', fibreOpacity: 0.07, rose: '#8a5a22', roseOpacity: 0.17, vignette: 0.32 },
  white: { base: [230, 229, 224], noise: 6, fibre: '#55544f', fibreOpacity: 0.04, rose: '#5a5a55', roseOpacity: 0.07, vignette: 0.06 },
  dark: { base: [20, 20, 20], noise: 5, fibre: '#f5f5f2', fibreOpacity: 0.035, rose: '#f5f5f2', roseOpacity: 0.05, vignette: 0 },
}

// Seeded random so every build gives the same paper.
let seed = 7
const rand = () => {
  // mulberry32: an LCG here left visible horizontal stripes in the grain.
  seed = (seed + 0x6d2b79f5) | 0
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296
}

async function noiseLayer(w, h) {
  const buf = Buffer.alloc(w * h)
  for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(rand() * 256)
  // Blur after upscaling by about half a cell so the coarse layers have no visible block seams.
  const sigma = Math.max(0.3, (W / w) * 0.5)
  return sharp(buf, { raw: { width: w, height: h, channels: 1 } }).resize(W, H, { kernel: 'cubic' }).blur(sigma).extractChannel(0).raw().toBuffer()
}

function compassRose(cx, cy, r, color, opacity) {
  const parts = []
  for (const k of [1, 0.93, 0.62, 0.56]) parts.push(`<circle cx="${cx}" cy="${cy}" r="${r * k}" fill="none" stroke="${color}" stroke-width="${k > 0.9 ? 5 : 3}"/>`)
  // 32 rhumb lines, then a 16-point star.
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * r}" y2="${cy + Math.sin(a) * r}" stroke="${color}" stroke-width="2"/>`)
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    const len = i % 4 === 0 ? r * 0.92 : i % 2 === 0 ? r * 0.66 : r * 0.45
    const w = i % 4 === 0 ? r * 0.09 : r * 0.06
    const tip = [cx + Math.cos(a) * len, cy + Math.sin(a) * len]
    const l = [cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w]
    const rr = [cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w]
    parts.push(`<polygon points="${l.join(',')} ${tip.join(',')} ${rr.join(',')}" fill="${color}" fill-opacity="0.35" stroke="${color}" stroke-width="3"/>`)
  }
  return `<g opacity="${opacity}">${parts.join('')}</g>`
}

function fibres(color, opacity) {
  const paths = []
  for (let i = 0; i < 2600; i++) {
    const x = rand() * W, y = rand() * H
    const len = 20 + rand() * 90
    const a = rand() * Math.PI * 2
    const bend = (rand() - 0.5) * len * 0.8
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len
    const mx = (x + x2) / 2 + Math.cos(a + Math.PI / 2) * bend, my = (y + y2) / 2 + Math.sin(a + Math.PI / 2) * bend
    paths.push(`<path d="M${x.toFixed(0)} ${y.toFixed(0)} Q${mx.toFixed(0)} ${my.toFixed(0)} ${x2.toFixed(0)} ${y2.toFixed(0)}" stroke-width="${(1 + rand() * 1.6).toFixed(1)}"/>`)
  }
  return `<g fill="none" stroke="${color}" opacity="${opacity}">${paths.join('')}</g>`
}

const layers = await Promise.all([noiseLayer(31, 44), noiseLayer(124, 175), noiseLayer(620, 877), noiseLayer(W, H)])
const weights = [0.45, 0.25, 0.18, 0.12]

for (const [name, s] of Object.entries(STYLES)) {
  const img = Buffer.alloc(W * H * 3)
  for (let i = 0; i < W * H; i++) {
    let n = 0
    for (let k = 0; k < 4; k++) n += (layers[k][i] / 255 - 0.5) * weights[k]
    const d = n * s.noise * 2.4
    img[i * 3] = Math.max(0, Math.min(255, s.base[0] + d))
    img[i * 3 + 1] = Math.max(0, Math.min(255, s.base[1] + d * 1.05))
    img[i * 3 + 2] = Math.max(0, Math.min(255, s.base[2] + d * 1.15))
  }
  const vignette = s.vignette
    ? `<defs><radialGradient id="v" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#5a3510" stop-opacity="0"/><stop offset="100%" stop-color="#5a3510" stop-opacity="${s.vignette}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#v)"/>`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${fibres(s.fibre, s.fibreOpacity)}${compassRose(260, 230, 760, s.rose, s.roseOpacity)}${compassRose(2380, 3330, 1150, s.rose, s.roseOpacity)}${vignette}</svg>`
  await sharp(img, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(`public/letter-${name}.jpg`)
  console.log('wrote', `public/letter-${name}.jpg`)
}
