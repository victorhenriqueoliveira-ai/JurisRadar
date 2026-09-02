'use client';

/**
 * Toggle "Sou o contato de backup do escritório" nas configurações de membro.
 *
 * Regra de negócio: apenas 1 membro por escritório pode ser backup.
 * O backend (PATCH /api/perfil/backup) reseta outros membros antes de setar o novo.
 *
 * Endpoint: PATCH /api/perfil/backup → body: { isBackup: boolean }
 */

import { useState } from 'react';

interface BackupContatoToggleProps {
  /** Valor atual do campo is_backup_contato do membro */
  isBackupAtual: boolean;
}

export function BackupContatoToggle({ isBackupAtual }: BackupContatoToggleProps) {
  const [isBackup, setIsBackup] = useState(isBackupAtual);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novoValor = e.target.checked;
    setIsBackup(novoValor);
    setErro(null);
    setSucesso(false);
    setSalvando(true);

    try {
      const res = await fetch('/api/perfil/backup', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBackup: novoValor }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Reverter em caso de erro
        setIsBackup(!novoValor);
        setErro(data.error ?? 'Erro ao salvar. Tente novamente.');
        return;
      }

      setSucesso(true);
    } catch {
      setIsBackup(!novoValor);
      setErro('Erro de conexão. Verifique sua internet e tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isBackup}
          onChange={handleChange}
          disabled={salvando}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          aria-describedby="backup-descricao"
        />
        <div>
          <span className="text-sm font-medium">Sou o contato de backup do escritório</span>
          <p id="backup-descricao" className="text-xs text-muted-foreground mt-0.5">
            Você será notificado via WhatsApp/SMS quando o responsável principal não confirmar
            ciência de uma intimação crítica dentro do prazo.
          </p>
        </div>
      </label>

      {salvando && (
        <p className="text-xs text-muted-foreground" role="status">
          Salvando...
        </p>
      )}

      {erro && (
        <p role="alert" className="text-xs text-destructive">
          {erro}
        </p>
      )}

      {sucesso && !salvando && (
        <p role="status" className="text-xs text-green-700">
          Configuração de backup salva.
        </p>
      )}
    </div>
  );
}
