'use client';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <span className="text-red-500 text-xl">!</span>
      </div>
      <h2 className="text-lg font-semibold text-[#0f2d5e]">Algo deu errado</h2>
      <p className="text-sm text-[#6b7280] max-w-sm">
        Não foi possível carregar esta página. Tente novamente ou entre em contato com o suporte.
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-5 py-2 rounded-xl bg-[#0f2d5e] text-white text-sm font-medium hover:bg-[#0f2d5e]/90 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
