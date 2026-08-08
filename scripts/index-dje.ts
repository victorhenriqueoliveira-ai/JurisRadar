import { processCaderno } from '../src/inngest/dje-indexer';

const date = process.argv[2] ?? new Date().toISOString().split('T')[0];

async function main() {
  console.log(`Indexando DJE para ${date} (cadernos 2 e 3)...`);
  await processCaderno(2, date);
  await processCaderno(3, date);
  console.log('Concluído.');
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
