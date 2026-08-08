import { searchPublications } from '../src/db/dje';

async function main() {
  const result = await searchPublications(
    { term: 'pensão', dateFrom: '2025-07-22', dateTo: '2025-07-22' },
    1,
    10,
    'test-user',
  );
  console.log('Total:', result.total);
  console.log('Results:', result.results.length);
  if (result.results[0]) {
    console.log('Primeiro resultado:', JSON.stringify(result.results[0], null, 2));
  }
}

main().catch(console.error);
