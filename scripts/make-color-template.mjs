// Builds public/template-color.jpg from the clean soft-watercolour artwork
// (scripts/template-color-clean.png, A4 landscape, no text, no plaques, no QR).
// Everything on top (plaques, notes, title, QR frame, URL) is drawn by the app.
// Resized to the white template's width so both share one scale.
// Usage: npm run color-template
import sharp from 'sharp'

await sharp('scripts/template-color-clean.png')
  .removeAlpha()
  .resize(4344, 3072, { kernel: 'lanczos3', fit: 'fill' })
  .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
  .toFile('public/template-color.jpg')
console.log('wrote public/template-color.jpg')
