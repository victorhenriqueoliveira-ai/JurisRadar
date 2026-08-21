'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

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

export function ProcessoFilters({ filters, onFilterChange }: ProcessoFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.q ?? '');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const selectClass = `
    appearance-none h-9 pl-3 pr-7 rounded-lg border text-sm cursor-pointer outline-none transition-colors
    bg-white text-[#374151]
    ${filters.urgencia ? '' : ''}
  `;

  return (
    <div
      data-testid="processo-filters"
      className="flex flex-wrap gap-2 items-center p-3 bg-white rounded-xl border border-[#e5e7eb]"
    >
      {/* Busca textual */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af] pointer-events-none" />
        <input
          type="search"
          data-testid="filter-search"
          value={searchInput}
          onChange={handleSearchChange}
          placeholder="Buscar processo..."
          aria-label="Buscar processo"
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#111827] placeholder-[#9ca3af] outline-none focus:border-[#0f2d5e] focus:bg-white transition-colors"
        />
      </div>

      {/* Status */}
      <div className="relative">
        <select
          data-testid="filter-status"
          value={filters.status ?? ''}
          onChange={handleSelectChange('status')}
          aria-label="Filtrar por status"
          className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#374151] cursor-pointer outline-none focus:border-[#0f2d5e] focus:bg-white transition-colors"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280] pointer-events-none" />
      </div>

      {/* Área */}
      <div className="relative">
        <select
          data-testid="filter-area"
          value={filters.area ?? ''}
          onChange={handleSelectChange('area')}
          aria-label="Filtrar por área"
          className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#374151] cursor-pointer outline-none focus:border-[#0f2d5e] focus:bg-white transition-colors"
        >
          {AREA_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280] pointer-events-none" />
      </div>

      {/* Tribunal */}
      <div className="relative">
        <select
          data-testid="filter-tribunal"
          value={filters.tribunal ?? ''}
          onChange={handleSelectChange('tribunal')}
          aria-label="Filtrar por tribunal"
          className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] text-sm text-[#374151] cursor-pointer outline-none focus:border-[#0f2d5e] focus:bg-white transition-colors"
        >
          {TRIBUNAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280] pointer-events-none" />
      </div>

      {/* Urgência */}
      <button
        type="button"
        data-testid="filter-urgencia"
        onClick={handleUrgenciaToggle}
        aria-pressed={!!filters.urgencia}
        className={`h-9 px-4 rounded-lg border text-sm font-medium transition-colors ${
          filters.urgencia
            ? 'border-[#dc2626] bg-[#dc2626] text-white'
            : 'border-[#e5e7eb] bg-[#f9fafb] text-[#374151] hover:border-[#dc2626] hover:text-[#dc2626]'
        }`}
      >
        Urgentes
      </button>
    </div>
  );
}

export default ProcessoFilters;
