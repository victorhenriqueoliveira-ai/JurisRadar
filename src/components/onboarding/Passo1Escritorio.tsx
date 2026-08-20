'use client';

/**
 * Passo 1 do onboarding: dados do escritório.
 * Campos: nome (obrigatório), CNPJ (opcional), área de atuação (select).
 * Salva via PATCH /api/organizacoes/me antes de avançar.
 */

import { useState } from 'react';

const AREAS_ATUACAO = [
  'Cível',
  'Criminal/Penal',
  'Trabalhista',
  'Tributário/Fiscal',
  'Empresarial/Corporativo',
  'Família e Sucessões',
  'Previdenciário',
  'Administrativo',
  'Ambiental',
  'Consumidor',
  'Imobiliário',
  'Outro',
];

interface Passo1Props {
  onProximo: () => void;
}

export function Passo1Escritorio({ onProximo }: Passo1Props) {
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [area, setArea] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) {
      setErro('O nome do escritório é obrigatório.');
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/organizacoes/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nome.trim(),
          cnpj: cnpj.trim() || undefined,
          areaAtuacao: area || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? 'Erro ao salvar dados. Tente novamente.');
        return;
      }

      onProximo();
    } catch {
      setErro('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Bem-vindo ao JurisRadar!</h1>
        <p className="text-muted-foreground">
          Vamos configurar seu escritório em poucos minutos.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          {/* Nome do escritório */}
          <div>
            <label htmlFor="nome" className="block text-sm font-medium mb-1">
              Nome do escritório <span className="text-destructive">*</span>
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Almeida & Associados"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              required
              aria-required="true"
              autoFocus
            />
          </div>

          {/* CNPJ (opcional) */}
          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium mb-1">
              CNPJ <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <input
              id="cnpj"
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Área de atuação */}
          <div>
            <label htmlFor="area" className="block text-sm font-medium mb-1">
              Área de atuação principal <span className="text-muted-foreground text-xs">(opcional)</span>
            </label>
            <select
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecione uma área</option>
              {AREAS_ATUACAO.map((a) => (
                <option key={a} value={a}>
                  {a}
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

          {/* Botão de avançar */}
          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
          >
            {salvando ? 'Salvando...' : 'Próximo'}
          </button>
        </div>
      </form>
    </div>
  );
}
