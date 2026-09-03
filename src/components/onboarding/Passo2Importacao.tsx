'use client';

/**
 * Passo 2 do onboarding: importação de processos via OAB.
 * - Campos: OAB número, OAB estado
 * - Botão "Importar meus processos" → POST /api/processos/sync
 * - Exibe ImportLoader durante importação
 * - Polling GET /api/processos?limit=1 a cada 3s por no máximo 30s
 * - Exibe "Encontramos N processos" ao concluir
 * - Botão "Pular" para ir direto ao Passo 3
 */

import { useState } from 'react';
import { ImportLoader } from '@/components/ui-custom/ImportLoader';

const ESTADOS_BRASIL = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
];

interface Passo2Props {
  onProximo: (processosImportados: number) => void;
  onPular: () => void;
}

type ImportStatus = 'idle' | 'loading' | 'done' | 'error';

export function Passo2Importacao({ onProximo, onPular }: Passo2Props) {
  const [oabNumero, setOabNumero] = useState('');
  const [oabEstado, setOabEstado] = useState('SP');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [processosEncontrados, setProcessosEncontrados] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function fetchDjenBrowser(oab: string, estado: string) {
    const PAGE_SIZE = 100;
    const MAX_PAGES = 10;
    const all = [];
    let totalApi = 0;

    for (let page = 1; page <= MAX_PAGES; page++) {
      const params = new URLSearchParams({
        numeroOAB: oab,
        siglaOAB: estado.toUpperCase(),
        pagina: String(page),
        qtd: String(PAGE_SIZE),
      });
      const res = await fetch(
        `https://comunicaapi.pje.jus.br/api/v1/comunicacao?${params}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`DJEN retornou ${res.status}`);
      const data = await res.json() as { count: number; items: unknown[] };
      totalApi = data.count;
      all.push(...data.items);
      if (all.length >= totalApi || data.items.length < PAGE_SIZE) break;
    }
    return all;
  }

  async function handleImportar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setStatus('loading');

    try {
      const oab = oabNumero.trim();

      // Busca direto do browser — evita bloqueio de IP da Vercel
      const items = await fetchDjenBrowser(oab, oabEstado);

      // Envia os dados ao servidor para persistência
      const res = await fetch('/api/processos/import-djen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, oabNumero: oab, oabEstado }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setErro(data.error ?? 'Erro ao salvar processos. Tente novamente.');
        setStatus('error');
        return;
      }

      const data = await res.json() as { total?: number };
      setProcessosEncontrados(data.total ?? 0);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão.';
      setErro(msg.includes('DJEN') ? `${msg}. Tente novamente em instantes.` : 'Erro de conexão. Verifique sua internet.');
      setStatus('error');
    }
  }

  function handlePular() {
    onPular();
  }

  if (status === 'loading') {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-8 text-center">
        <div className="mb-4">
          <ImportLoader label="Importando seus processos..." />
        </div>
        <p className="text-muted-foreground text-sm mb-6">
          Buscando processos associados ao OAB {oabNumero}/{oabEstado}...
        </p>
        <button
          type="button"
          onClick={handlePular}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Pular e explorar por conta própria
        </button>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="bg-card rounded-xl shadow-sm border p-8 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold mb-2">Importação concluída!</h2>
        <p className="text-muted-foreground mb-6">
          {processosEncontrados && processosEncontrados > 0
            ? `Encontramos ${processosEncontrados} processo${processosEncontrados !== 1 ? 's' : ''} vinculado${processosEncontrados !== 1 ? 's' : ''} ao seu OAB.`
            : 'Nenhum processo encontrado ainda. Eles podem aparecer em breve.'}
        </p>
        <button
          type="button"
          onClick={() => onProximo(processosEncontrados ?? 0)}
          className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Próximo
        </button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Importe seus processos</h2>
        <p className="text-muted-foreground">
          Informe seu OAB para buscarmos seus processos automaticamente.
        </p>
      </div>

      <form onSubmit={handleImportar} noValidate>
        <div className="space-y-4">
          {/* OAB número */}
          <div>
            <label htmlFor="oab-numero" className="block text-sm font-medium mb-1">
              Número da OAB
            </label>
            <input
              id="oab-numero"
              type="text"
              value={oabNumero}
              onChange={(e) => setOabNumero(e.target.value)}
              placeholder="Ex: 123456"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* OAB estado */}
          <div>
            <label htmlFor="oab-estado" className="block text-sm font-medium mb-1">
              Estado da OAB
            </label>
            <select
              id="oab-estado"
              value={oabEstado}
              onChange={(e) => setOabEstado(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {ESTADOS_BRASIL.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </div>

          {/* Mensagem de erro */}
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}

          {/* Botão importar */}
          <button
            type="submit"
            className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Importar meus processos
          </button>

          {/* Botão pular */}
          <button
            type="button"
            onClick={handlePular}
            className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
          >
            Pular e explorar por conta própria
          </button>
        </div>
      </form>
    </div>
  );
}
