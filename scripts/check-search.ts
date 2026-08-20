import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Quantas publicações têm search_vector populado?
  const [{ total, with_vector }] = await sql`
    SELECT COUNT(*) as total, COUNT(search_vector) as with_vector FROM dje_publications
  `;
  console.log(`Total: ${total} | Com search_vector: ${with_vector}`);

  // Amostra de termos do conteúdo real
  const samples = await sql`
    SELECT process_number, LEFT(content, 100) as preview FROM dje_publications LIMIT 3
  `;
  console.log('\nAmostra de conteúdo:');
  samples.forEach((r: { process_number: string; preview: string }) =>
    console.log(`  ${r.process_number}: ${r.preview.replace(/\n/g, ' ')}\n`)
  );

  // Testar busca por "pensão"
  const term1 = await sql`
    SELECT COUNT(*) as total FROM dje_publications
    WHERE search_vector @@ plainto_tsquery('portuguese', 'pensão')
      AND publication_date = '2025-07-22'
  `;
  console.log(`Busca "pensão": ${term1[0].total} resultados`);

  // Testar busca por "alimento"
  const term2 = await sql`
    SELECT COUNT(*) as total FROM dje_publications
    WHERE search_vector @@ plainto_tsquery('portuguese', 'alimento')
      AND publication_date = '2025-07-22'
  `;
  console.log(`Busca "alimento": ${term2[0].total} resultados`);

  // Testar busca por "processo"
  const term3 = await sql`
    SELECT COUNT(*) as total FROM dje_publications
    WHERE search_vector @@ plainto_tsquery('portuguese', 'processo')
      AND publication_date = '2025-07-22'
  `;
  console.log(`Busca "processo": ${term3[0].total} resultados`);
}

main().catch(console.error);
