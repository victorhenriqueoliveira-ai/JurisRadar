'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface FilterValues {
  status?: string;
  area?: string;
  tribunal?: string;
  responsavel_id?: string;
  urgencia?: boolean;
  q?: string;
}

interface ProcessoFiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'encerrado', label: 'Encerrado' },
  { value: 'arquivado', label: 'Arquivado' },
];

const AREA_OPTIONS = [
  { value: '', label: 'Todas as áreas' },
  { value: 'civil', label: 'Cível' },
  { value: 'criminal', label: 'Criminal' },
  { value: 'trabalhista', label: 'Trabalhista' },
  { value: 'tributario', label: 'Tributário' },
  { value: 'previdenciario', label: 'Previdenciário' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'familia', label: 'Família' },
];

const TRIBUNAL_OPTIONS = [
  { value: '', label: 'Todos os tribunais' },
  { value: 'TJSP', label: 'TJSP' },
  { value: 'TJRJ', label: 'TJRJ' },
  { value: 'TJMG', label: 'TJMG' },
  { value: 'TRF1', label: 'TRF1' },
  { value: 'TRF3', label: 'TRF3' },
  { value: 'STJ', label: 'STJ' },
  { value: 'STF', label: 'STF' },
];

const selectStyle: React.CSSProperties = {
  height: '2rem',
  paddingLeft: '0.5rem',
  paddingRight: '0.5rem',
  borderRadius: '0.375rem',
  border: '1px solid var(--jr-glass-border)',
  background: 'var(--jr-glass-bg)',
  color: 'var(--jr-primary)',
  fontSize: '0.875rem',
  outline: 'none',
  cursor: 'pointer',
};

export function ProcessoFilters({ filters, onFilterChange }: ProcessoFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.q ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local search input in sync when filters.q resets externally
  useEffect(() => {
    setSearchInput(filters.q ?? '');
  }, [filters.q]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ ...filters, q: value || undefined });
    }, 300);
  };

  const handleSelectChange = (key: keyof FilterValues) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, [key]: e.target.value || undefined });
  };

  const handleUrgenciaToggle = () => {
    onFilterChange({ ...filters, urgencia: !filters.urgencia });
  };

  return (
    <div
      data-testid="processo-filters"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
        padding: '0.75rem 1rem',
        background: 'var(--jr-glass-bg)',
        border: '1px solid var(--jr-glass-border)',
        borderRadius: '0.5rem',
      }}
    >
      {/* Busca textual */}
      <input
        type="search"
        data-testid="filter-search"
        value={searchInput}
        onChange={handleSearchChange}
        placeholder="Buscar processo..."
        aria-label="Buscar processo"
        style={{
          ...selectStyle,
          minWidth: '12rem',
          flex: '1 1 12rem',
          paddingRight: '0.5rem',
        }}
      />

      {/* Status */}
      <select
        data-testid="filter-status"
        value={filters.status ?? ''}
        onChange={handleSelectChange('status')}
        aria-label="Filtrar por status"
        style={selectStyle}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Área */}
      <select
        data-testid="filter-area"
        value={filters.area ?? ''}
        onChange={handleSelectChange('area')}
        aria-label="Filtrar por área"
        style={selectStyle}
      >
        {AREA_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Tribunal */}
      <select
        data-testid="filter-tribunal"
        value={filters.tribunal ?? ''}
        onChange={handleSelectChange('tribunal')}
        aria-label="Filtrar por tribunal"
        style={selectStyle}
      >
        {TRIBUNAL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Urgência toggle */}
      <button
        type="button"
        data-testid="filter-urgencia"
        onClick={handleUrgenciaToggle}
        aria-pressed={!!filters.urgencia}
        style={{
          height: '2rem',
          padding: '0 0.75rem',
          borderRadius: '0.375rem',
          border: `1px solid ${filters.urgencia ? 'var(--jr-danger)' : 'var(--jr-glass-border)'}`,
          background: filters.urgencia ? 'var(--jr-danger)' : 'var(--jr-glass-bg)',
          color: filters.urgencia ? 'var(--jr-danger-foreground)' : 'var(--jr-primary)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontWeight: filters.urgencia ? 600 : 400,
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        Urgentes
      </button>
    </div>
  );
}

export default ProcessoFilters;
