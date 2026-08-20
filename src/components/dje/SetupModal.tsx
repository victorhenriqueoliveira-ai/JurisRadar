'use client';

import { useState } from 'react';

export default function SetupModal() {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Como indexar publicações do DJE</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 text-sm text-gray-700">

          {/* Situação atual */}
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="font-medium text-amber-800">Situação atual</p>
            <p className="mt-1 text-amber-700">
              O TJSP está em <strong>recesso forense</strong> até aproximadamente 18/08/2025.
              Durante o recesso, o DJE não publica novas edições.
              A última edição disponível é <strong>22/07/2025</strong>.
            </p>
          </div>

          {/* Janela de download */}
          <div>
            <p className="font-semibold text-gray-800">Quando o download está disponível</p>
            <p className="mt-1">
              O portal DJE/TJSP libera o download dos cadernos apenas das{' '}
              <strong>20h às 8h (horário de Brasília)</strong>, de segunda a sexta.
              Fora desse horário, o servidor retorna uma página de erro.
            </p>
          </div>

          {/* Como indexar */}
          <div>
            <p className="font-semibold text-gray-800">Como indexar uma data</p>
            <p className="mt-1 mb-2">
              Rode o script abaixo no terminal, substituindo a data no formato{' '}
              <code className="bg-gray-100 px-1 rounded">YYYY-MM-DD</code>:
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-md px-4 py-3 overflow-x-auto whitespace-pre-wrap">
{`node --stack-size=65536 $(which npx) tsx \\
  --env-file=.env.local \\
  scripts/index-dje.ts 2025-07-22`}
            </pre>
            <p className="mt-2 text-xs text-gray-500">
              O <code className="bg-gray-100 px-1 rounded">--stack-size=65536</code> é necessário porque os PDFs do caderno 2 são grandes (~7MB) e excedem o limite padrão de memória de pilha do Node.js.
            </p>
          </div>

          {/* Múltiplas datas */}
          <div>
            <p className="font-semibold text-gray-800">Indexar várias datas de uma vez</p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-md px-4 py-3 overflow-x-auto whitespace-pre-wrap">
{`for date in 2025-07-18 2025-07-21 2025-07-22; do
  node --stack-size=65536 $(which npx) tsx \\
    --env-file=.env.local \\
    scripts/index-dje.ts $date
done`}
            </pre>
          </div>

          {/* Inngest automático */}
          <div>
            <p className="font-semibold text-gray-800">Indexação automática (produção)</p>
            <p className="mt-1">
              Em produção, o Inngest roda o job automaticamente às <strong>20h (BRT)</strong> de segunda a sexta.
              Para ativar, configure as variáveis de ambiente:
            </p>
            <pre className="bg-gray-900 text-green-400 text-xs rounded-md px-4 py-3 overflow-x-auto mt-2">
{`INNGEST_EVENT_KEY=<sua-chave>
INNGEST_SIGNING_KEY=<sua-chave>
NODE_OPTIONS=--stack-size=65536`}
            </pre>
          </div>

          {/* Dados atuais */}
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-blue-800">
            <p>
              Atualmente o banco possui publicações de <strong>22/07/2025</strong> — cadernos 2 e 3 (Capital).
              Após o recesso (a partir de 18/08), novas datas poderão ser indexadas normalmente.
            </p>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
