// Tek dosyalık sayfa üretir: dist/index.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const r = await build({ entryPoints: ['src/sahne.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const kod = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const sablon = readFileSync('sablon.html', 'utf8');
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', sablon.replace('/*__KOD__*/', () => kod));
console.log('dist/index.html', (kod.length / 1024).toFixed(0), 'KB kod');
