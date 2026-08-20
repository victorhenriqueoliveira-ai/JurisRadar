async function main() {
  const date = process.argv[2] ?? '2026-08-06';
  const [year, month, day] = date.split('-');
  const dtDiario = `${day}%2F${month}%2F${year}`;

  for (let cd = 1; cd <= 20; cd++) {
    const url = `https://dje.tjsp.jus.br/cdje/downloadCaderno.do?dtDiario=${dtDiario}&cdCaderno=${cd}&tpDownload=D`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: '*/*',
        Referer: 'https://dje.tjsp.jus.br/cdje/index.do',
      },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const isPdf = buf.slice(0, 4).toString() === '%PDF';
    console.log(`cdCaderno=${cd} → ${res.status} ${res.headers.get('content-type')} ${buf.byteLength}b ${isPdf ? '✅ PDF' : '❌'}`);
    if (isPdf) break;
  }
}

main().catch(console.error);
