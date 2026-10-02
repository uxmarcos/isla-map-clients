// Builds the map templates in public/ from the original artwork in scripts/:
// - template-white.png: baked-in text (title, subtitle, URL) removed so the app can draw it.
// - template-dark.png: negative of the white one, on the landing's dark grey with a light grid.
// (template-color.jpg has its own script: scripts/make-color-template.mjs.)
// Background elements (islands off the route, ships, the whale, loose rocks) are faded a
// little so the eye goes to the route, the dangers, the compass and the QR.
// Text removal: pixels that read as ink (or the embossed glow around it) inside each region
// are masked, dilated, then filled with the average of the surrounding paper.
// Usage: npm run clean-template          (all)
//        npm run clean-template -- dark  (only rebuild the dark one from template-white.png)
import sharp from 'sharp'

const JOBS = [
  {
    src: 'scripts/template-original.png', // 4344 x 2896
    out: 'public/template-white.png',
    dark: 212, // luminance below this counts as ink
    light: 236, // above this counts as the embossed glow around letters
    dilate: 7,
    radius: 28,
    // Artwork removed by copying clean sea; offsets are whole grid cells (173px) so the grid lines up.
    erase: [
      { at: [1450, 1070, 285, 190], from: [[0, 346], [0, 519], [346, 0], [-346, 173], [346, 346], [0, 173]] }, // mountain island where the whirlpool goes
      { at: [847, 228, 115, 105], from: [[346, 0], [-346, 0]] }, // star above the title: the Isla | client logos go there
    ],
    fade: { amount: 0.32, toward: 'paper', paper: [230, 229, 224] },
    // Ellipses around background elements: [cx, cy, rx, ry]
    extras: [
      [2411, 434, 434, 250], // top mountain island
      [1977, 847, 304, 174], // mountain island, upper middle
      [982, 1190, 130, 130], // ship, left
      [2520, 967, 76, 76], // small ship, centre
      [521, 1434, 347, 185], // island cluster, left
      [445, 1205, 109, 65], // rocks, left
      [3736, 1455, 206, 130], // island, right
      [4051, 1368, 98, 65], // rocks, far right
      [2682, 1911, 434, 206], // islands, bottom centre
      [3540, 1944, 120, 130], // ship, right
      [1633, 2320, 120, 109], // whale
      [3834, 1129, 76, 43], // rocks by the treasure island
      [1846, 554, 60, 40], // rock
      [2085, 662, 50, 35], // rock
      [2998, 695, 100, 40], // rocks, top right
    ],
    regions: [
      { x: 270, y: 325, w: 1235, h: 280 }, // "THE COMPANY / TREASURE MAP"
      { x: 330, y: 700, w: 1135, h: 92 }, // "THE PATH TO $10M ARR"
      { x: 1700, y: 2612, w: 975, h: 86 }, // "VISIT APP.ISLA.TO/COMPANY"
    ],
  }
]

// Negative of the white map: paper -> dark grey, ink -> porcelain.
const NEG = { paperLum: 229, inkLum: 20, bg: [20, 20, 20], fg: [245, 245, 242], deep: [6, 6, 6] }

/** Blends background elements toward the paper (or the blurred surroundings) inside soft ellipses. */
/**
 * Clone-stamps clean sea over an ellipse, feathered at the edge. Each pixel copies from
 * the first offset whose source has no drawing nearby, so stray artwork never comes along.
 */
function eraseArt(job, data, W) {
  const lum = (i) => 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]
  for (const { at: [cx, cy, rx, ry], from, ink = 200, margin = 8, match = false } of job.erase ?? []) {
    const src = Buffer.from(data)
    // Tone match: sample the difference between the surroundings and the copied water around
    // the rim, then spread it inward (inverse-distance), so the patch takes the local shade.
    const mean = (x, y, c) => {
      let t = 0
      for (let yy = -6; yy <= 6; yy += 2) for (let xx = -6; xx <= 6; xx += 2) t += src[((y + yy) * W + (x + xx)) * 3 + c]
      return t / 49
    }
    const rim = []
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2
      const x = Math.round(cx + Math.cos(a) * rx * 1.04), y = Math.round(cy + Math.sin(a) * ry * 1.04)
      const off = from[0]
      rim.push({ x, y, d: [0, 1, 2].map((c) => mean(x, y, c) - mean(x + off[0], y + off[1], c)) })
    }
    const correction = (x, y, c) => {
      let num = 0, den = 0
      for (const p of rim) {
        const w = 1 / ((p.x - x) ** 2 + (p.y - y) ** 2 + 1)
        num += w * p.d[c]
        den += w
      }
      return num / den
    }
    const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1.1
    const clean = (x, y) => {
      if (inside(x, y)) return false
      for (let yy = y - margin; yy <= y + margin; yy += 2)
        for (let xx = x - margin; xx <= x + margin; xx += 2) if (lum(yy * W + xx) < ink) return false
      return true
    }
    for (let y = cy - ry; y < cy + ry; y++)
      for (let x = cx - rx; x < cx + rx; x++) {
        const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
        if (d >= 1) continue
        const off = from.find(([dx, dy]) => clean(x + dx, y + dy))
        if (!off) continue
        const k = d < 0.8 ? 1 : 1 - (d - 0.8) / 0.2
        const p = (y * W + x) * 3, q = ((y + off[1]) * W + (x + off[0])) * 3
        for (let c = 0; c < 3; c++) {
          const fill = match ? src[q + c] + correction(x, y, c) : src[q + c]
          data[p + c] = Math.max(0, Math.min(255, Math.round(src[p + c] + (fill - src[p + c]) * k)))
        }
      }
  }
}

async function fadeExtras(job, data, W, H) {
  const { amount, toward, paper } = job.fade
  const target = toward === 'surroundings'
    ? await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 3 } }).blur(60).raw().toBuffer()
    : null
  for (const [cx, cy, rx, ry] of job.extras) {
    for (let y = Math.max(0, cy - ry); y < Math.min(H, cy + ry); y++)
      for (let x = Math.max(0, cx - rx); x < Math.min(W, cx + rx); x++) {
        const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
        if (d >= 1) continue
        // Full strength in the middle, feathered over the outer 45% so no edge shows.
        const t = d < 0.55 ? 1 : 1 - (d - 0.55) / 0.45
        const k = amount * t * t * (3 - 2 * t)
        const p = (y * W + x) * 3
        for (let c = 0; c < 3; c++) {
          const to = target ? target[p + c] : paper[c]
          data[p + c] = Math.round(data[p + c] + (to - data[p + c]) * k)
        }
      }
  }
}

async function clean(job) {
  const { data, info } = await sharp(job.src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: W, height: H } = info
  const lum = (i) => 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2]
  const { dilate: D, radius: R } = job

  for (const r of job.regions) {
    // Work on the region plus a margin so the blur has paper to sample from.
    const m = R + D
    const x0 = Math.max(0, r.x - m), y0 = Math.max(0, r.y - m)
    const x1 = Math.min(W, r.x + r.w + m), y1 = Math.min(H, r.y + r.h + m)
    const rw = x1 - x0, rh = y1 - y0

    const ink = new Uint8Array(rw * rh)
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const v = lum(y * W + x)
        if (v < job.dark || v > job.light) ink[(y - y0) * rw + (x - x0)] = 1
      }

    const mask = new Uint8Array(rw * rh)
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        if (!ink[y * rw + x]) continue
        for (let dy = -D; dy <= D; dy++)
          for (let dx = -D; dx <= D; dx++) {
            const yy = y + dy, xx = x + dx
            if (yy >= 0 && yy < rh && xx >= 0 && xx < rw && dx * dx + dy * dy <= D * D) mask[yy * rw + xx] = 1
          }
      }

    // Integral images of (color * valid) and valid.
    const S = (rw + 1) * (rh + 1)
    const ic = [new Float64Array(S), new Float64Array(S), new Float64Array(S)]
    const iv = new Float64Array(S)
    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        const valid = mask[y * rw + x] ? 0 : 1
        const p = ((y + y0) * W + (x + x0)) * 3
        const k = (y + 1) * (rw + 1) + (x + 1)
        const up = y * (rw + 1) + (x + 1), left = (y + 1) * (rw + 1) + x, diag = y * (rw + 1) + x
        iv[k] = valid + iv[up] + iv[left] - iv[diag]
        for (let c = 0; c < 3; c++) ic[c][k] = valid * data[p + c] + ic[c][up] + ic[c][left] - ic[c][diag]
      }
    const box = (a, xa, ya, xb, yb) => a[yb * (rw + 1) + xb] - a[ya * (rw + 1) + xb] - a[yb * (rw + 1) + xa] + a[ya * (rw + 1) + xa]

    for (let y = 0; y < rh; y++)
      for (let x = 0; x < rw; x++) {
        if (!mask[y * rw + x]) continue
        const xa = Math.max(0, x - R), ya = Math.max(0, y - R)
        const xb = Math.min(rw, x + R + 1), yb = Math.min(rh, y + R + 1)
        const n = box(iv, xa, ya, xb, yb)
        if (n < 1) continue
        const p = ((y + y0) * W + (x + x0)) * 3
        for (let c = 0; c < 3; c++) data[p + c] = Math.round(box(ic[c], xa, ya, xb, yb) / n)
      }
  }

  eraseArt(job, data, W)
  await fadeExtras(job, data, W, H)
  await sharp(data, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile(job.out)
  console.log('wrote', job.out)
  return { data, W, H }
}

function darkVersion({ data, W, H }) {
  const out = Buffer.alloc(data.length)
  const mix = (a, b, t) => a + (b - a) * t
  for (let i = 0; i < W * H; i++) {
    const p = i * 3
    const v = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    const t = (NEG.paperLum - v) / (NEG.paperLum - NEG.inkLum)
    for (let c = 0; c < 3; c++) {
      // Lighter than paper (glows around islands) goes a little deeper than the background.
      const val = t >= 0 ? mix(NEG.bg[c], NEG.fg[c], Math.min(1, t)) : mix(NEG.bg[c], NEG.deep[c], Math.min(1, -t * 4))
      out[p + c] = Math.round(val)
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toFile('public/template-dark.png')
}

if (process.argv[2] === 'dark') {
  const { data, info } = await sharp('public/template-white.png').removeAlpha().raw().toBuffer({ resolveWithObject: true })
  await darkVersion({ data, W: info.width, H: info.height })
  console.log('wrote public/template-dark.png')
  process.exit(0)
}

const white = await clean(JOBS[0])
await darkVersion(white)
console.log('wrote public/template-dark.png')
