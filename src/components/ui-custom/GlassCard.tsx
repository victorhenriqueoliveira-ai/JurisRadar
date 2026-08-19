import React from 'react';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * GlassCard — card com efeito glassmorphism.
 * Usa var(--jr-glass-bg) e var(--jr-glass-border) — sem cores hardcoded.
 */
export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        background: 'var(--jr-glass-bg)',
        border: '1px solid var(--jr-glass-border)',
        boxShadow: 'var(--jr-glass-shadow)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 'var(--jr-radius-lg)',
        padding: '1.5rem',
      }}
    >
      {children}
    </div>
  );
}

export default GlassCard;
