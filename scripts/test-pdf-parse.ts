import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

console.log('type:', typeof pdfParse);
console.log('keys:', Object.keys(pdfParse ?? {}));
console.log('default type:', typeof pdfParse?.default);

async function main() {
  const buf = fs.readFileSync('/tmp/dje-test.bin');
  console.log('PDF magic:', buf.slice(0, 4).toString());

  const fn = typeof pdfParse === 'function' ? pdfParse : pdfParse?.default;
  console.log('fn type:', typeof fn);
  if (typeof fn !== 'function') { console.error('pdf-parse não é function!'); return; }
  const result = await fn(buf);
  console.log('pages:', result.numpages, 'text length:', result.text.length);
}

main().catch(console.error);
