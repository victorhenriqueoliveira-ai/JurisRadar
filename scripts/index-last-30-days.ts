/**
 * Indexa os últimos 30 dias úteis disponíveis no DJE/TJSP.
 *
 * O portal disponibiliza PDFs por ~30-90 dias. Este script descobre os dias
 * úteis recentes, pula os já indexados e processa os restantes em sequência.
 *
 * Uso:
 *   node --stack-size=65536 $(which npx) tsx --env-file=.env.local scripts/index-last-30-days.ts
 *
 * Opções:
 *   --days=N     Quantos dias úteis tentar (padrão: 30)
 *   --dry-run    Lista as datas sem indexar
 */

import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../src/db';
import { djeEditions } from '../src/db/schema';
import { processCaderno } from '../src/inngest/dje-indexer';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const daysArg = args.find((a) => a.startsWith('--days='));
const DAYS = daysArg ? parseInt(daysArg.split('=')[1], 10) : 30;

/** Gera os últimos N dias úteis (seg–sex) a partir de hoje, do mais recente ao mais antigo. */
function lastWeekdays(n: number): string[] {
  const result: string[] = [];
  const cursor = new Date();
  // Começa de ontem — o PDF do dia atual só está disponível após as 20h BRT
  cursor.setDate(cursor.getDate() - 1);

  while (result.length < n) {
    const dow = cursor.getDay(); // 0=dom, 6=sáb
    if (dow !== 0 && dow !== 6) {
      result.push(cursor.toISOString().split('T')[0]);
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}

/** Retorna quais datas já têm ambos os cadernos (2 e 3) com status 'completed'. */
async function alreadyIndexedDates(dates: string[]): Promise<Set<string>> {
  const rows = await db
    .select({ editionDate: djeEditions.editionDate, caderno: djeEditions.caderno })
    .from(djeEditions)
    .where(
      and(
        inArray(djeEditions.editionDate, dates),
        eq(djeEditions.status, 'completed'),
      ),
    );

  const countByDate = new Map<string, number>();
  for (const row of rows) {
    countByDate.set(row.editionDate, (countByDate.get(row.editionDate) ?? 0) + 1);
  }

  // Data totalmente indexada = ambos os cadernos (2) completos
  const done = new Set<string>();
  for (const [date, count] of countByDate) {
    if (count >= 2) done.add(date);
  }
  return done;
}

async function main() {
  console.log(`\nIndexador DJE — últimos ${DAYS} dias úteis${dryRun ? ' (dry-run)' : ''}\n`);

  const dates = lastWeekdays(DAYS);
  const alreadyDone = await alreadyIndexedDates(dates);

  const pending = dates.filter((d) => !alreadyDone.has(d));
  const skipped = dates.filter((d) => alreadyDone.has(d));

  console.log(`Total de datas candidatas : ${dates.length}`);
  console.log(`Já indexadas (pulando)    : ${skipped.length}`);
  console.log(`A indexar                 : ${pending.length}`);

  if (pending.length > 0) {
    console.log(`\nDatas a indexar: ${pending.join(', ')}\n`);
  }

  if (dryRun || pending.length === 0) {
    if (pending.length === 0) console.log('\nNada a fazer — todas as datas já estão indexadas.');
    return;
  }

  let success = 0;
  let failed = 0;

  // Processa do mais antigo ao mais recente para histórico consistente
  for (const date of [...pending].reverse()) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📅 ${date}`);
    try {
      await processCaderno(2, date);
      await processCaderno(3, date);
      success++;
    } catch (err) {
      // processCaderno não lança, mas por segurança capturamos
      console.error(`Erro inesperado em ${date}:`, err);
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Concluído: ${success} datas indexadas, ${failed} com erro`);
  if (failed > 0) {
    console.log('Datas com erro ficam com status "failed" em dje_editions.');
    console.log('Rode novamente para retentar (use scripts/clear-failed-editions.ts se necessário).');
  }
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
