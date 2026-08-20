import React from 'react';

export interface UiButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

/**
 * UiButton — botão premium com efeito glow/ripple.
 * Cores via var(--jr-*) — sem valores hardcoded.
 */
export function UiButton({
  variant = 'primary',
  children,
  className = '',
  ...props
}: UiButtonProps) {
  const base =
    'relative inline-flex items-center justify-center overflow-hidden ' +
    'rounded-[var(--jr-radius)] px-6 py-2.5 text-sm font-semibold ' +
    'transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ' +
    'cursor-pointer select-none';

  const variants = {
    primary:
      'bg-[var(--jr-primary)] text-[var(--jr-primary-foreground)] ' +
      'shadow-[0_0_0_0_var(--jr-accent)] ' +
      'hover:shadow-[0_0_16px_4px_var(--jr-accent)] hover:brightness-110 ' +
      'active:scale-95 focus-visible:ring-[var(--jr-accent)]',
    secondary:
      'border-2 border-[var(--jr-accent)] bg-transparent text-[var(--jr-accent)] ' +
      'shadow-[0_0_0_0_var(--jr-primary)] ' +
      'hover:bg-[var(--jr-accent)] hover:text-[var(--jr-accent-foreground)] ' +
      'hover:shadow-[0_0_16px_4px_var(--jr-primary)] ' +
      'active:scale-95 focus-visible:ring-[var(--jr-primary)]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export default UiButton;
