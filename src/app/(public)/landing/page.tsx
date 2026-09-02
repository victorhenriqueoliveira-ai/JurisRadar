import Link from 'next/link';
import {
  Radar,
  Database,
  Search,
  Newspaper,
  Kanban,
  LayoutDashboard,
  CalendarClock,
  Wallet,
} from 'lucide-react';

const FEATURES = [
  { icon: Radar, title: 'DJEN Nacional', desc: 'Publicações do Diário de Justiça Eletrônico Nacional em tempo real, via API do CNJ.' },
  { icon: Database, title: 'DataJud / CNJ', desc: 'Consulta direta à base pública de processos do Conselho Nacional de Justiça.' },
  { icon: Search, title: 'PJe Nacional', desc: 'Busca por termo e nome de parte nas publicações do sistema PJe.' },
  { icon: Newspaper, title: 'DJe TJSP', desc: 'Diário da Justiça Eletrônico do Tribunal de Justiça de São Paulo, por período.' },
  { icon: Kanban, title: 'CRM de processos', desc: 'Todos os seus casos com filtros, histórico de movimentações e notas.' },
  { icon: LayoutDashboard, title: 'Dashboard', desc: 'Visão geral de prazos, urgências e evolução mensal do escritório.' },
  { icon: CalendarClock, title: 'Calendário processual', desc: 'Prazos e audiências organizados por mês, com cor por tipo de evento.' },
  { icon: Wallet, title: 'Financeiro', desc: 'Controle de honorários a receber, recebidos e em atraso.' },
];

const COMPARISON = [
  { label: 'Busca em tempo real nos diários', manual: 'Manual, diária', generic: 'Parcial', jr: 'Automática' },
  { label: 'Alertas de prazo e intimação', manual: 'Não', generic: 'Às vezes', jr: 'Sim' },
  { label: 'CRM integrado à busca de casos', manual: 'Não', generic: 'Não', jr: 'Sim' },
  { label: 'Tempo de implantação', manual: '—', generic: 'Semanas', jr: 'Minutos' },
  { label: 'Custo mensal', manual: 'Seu tempo', generic: 'R$ 300+', jr: 'R$ 127' },
];

const FAQS = [
  { q: 'Preciso instalar algo?', a: 'Não. O JurisRadar é 100% web, acessado pelo navegador.' },
  { q: 'Funciona para qualquer área do direito?', a: 'Sim — cível, trabalhista, família, criminal e demais áreas, em qualquer tribunal coberto pelas fontes integradas.' },
  { q: 'As buscas são realmente em tempo real?', a: 'Sim, via integração direta com o DJEN/CNJ e os demais diários oficiais.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, nos planos mensal e anual, sem multa de cancelamento.' },
  { q: 'Como funciona o plano anual?', a: 'Cobrança única anual equivalente a R$ 127/mês, 19% mais barato que o plano mensal.' },
];

function DashboardMockup() {
  const bar = [45, 62, 38, 80, 55, 70];
  const meses = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
  const processos = [
    { cnj: '0012345-67.2024.8.26.0100', tribunal: 'TJSP', mov: 'Intimação', urgente: true },
    { cnj: '0001234-89.2023.5.15.0001', tribunal: 'TRT15', mov: 'Edital', urgente: false },
    { cnj: '0098765-43.2025.8.26.0050', tribunal: 'TJSP', mov: 'Citação', urgente: true },
  ];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden select-none"
      style={{
        boxShadow: '0 1px 2px rgba(15,23,42,.04),0 24px 48px -12px rgba(15,45,94,.18)',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Barra de título estilo browser */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-[#f3f4f6] border-b border-[#e5e7eb]">
        <span className="w-2.5 h-2.5 rounded-full bg-[#fc5353]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#fdbc40]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#34c84a]" />
        <span className="ml-2 text-[10px] text-[#9ca3af] bg-white border border-[#e5e7eb] rounded px-2 py-0.5 flex-1 max-w-[180px]">
          jurisradaroficial.com.br/dashboard
        </span>
      </div>

      {/* Conteúdo do dashboard */}
      <div className="bg-[#f4f6fb] p-3 space-y-2.5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>Dashboard</p>
            <p className="text-[8px] text-[#9ca3af]">Visão geral dos seus processos e prazos</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-5 h-5 rounded-full bg-[#0f2d5e] flex items-center justify-center text-white text-[7px] font-bold">JR</span>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Processos Ativos', value: '892', color: '#0f2d5e' },
            { label: 'Urgência Alta', value: '7', color: '#dc2626' },
            { label: 'Atividade 7d', value: '43', color: '#d97706' },
            { label: 'Não lidas', value: '12', color: '#0f2d5e' },
          ].map((k) => (
            <div key={k.label} className="bg-white rounded-xl p-2 border border-[#e5e7eb]">
              <p className="text-[7px] text-[#9ca3af] leading-tight mb-0.5">{k.label}</p>
              <p className="text-base font-extrabold leading-none" style={{ color: k.color, fontFamily: 'Manrope, sans-serif' }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Bar chart */}
          <div className="bg-white rounded-xl p-2.5 border border-[#e5e7eb]">
            <p className="text-[7px] font-bold text-[#9ca3af] uppercase tracking-wide mb-2">Evolução mensal</p>
            <div className="flex items-end gap-1 h-12">
              {bar.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-full rounded-sm"
                    style={{ height: `${h}%`, background: i === bar.length - 1 ? '#0f2d5e' : '#c7d5ea' }}
                  />
                  <span className="text-[6px] text-[#9ca3af]">{meses[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Donut fake */}
          <div className="bg-white rounded-xl p-2.5 border border-[#e5e7eb] flex flex-col items-center justify-center">
            <p className="text-[7px] font-bold text-[#9ca3af] uppercase tracking-wide mb-1.5">Por status</p>
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#0f2d5e" strokeWidth="5"
                  strokeDasharray="72 88" strokeLinecap="round" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#c9a84c" strokeWidth="5"
                  strokeDasharray="18 88" strokeDashoffset="-72" strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-[#0f2d5e]">892</span>
            </div>
            <div className="flex gap-2 mt-1.5">
              <span className="flex items-center gap-0.5 text-[6px] text-[#6b7280]"><span className="w-1.5 h-1.5 rounded-full bg-[#0f2d5e]" />Ativo</span>
              <span className="flex items-center gap-0.5 text-[6px] text-[#6b7280]"><span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />Suspenso</span>
            </div>
          </div>
        </div>

        {/* Processo list */}
        <div className="bg-white rounded-xl border border-[#e5e7eb] overflow-hidden">
          <div className="px-2.5 py-1.5 border-b border-[#f3f4f6] flex items-center justify-between">
            <p className="text-[7px] font-bold text-[#9ca3af] uppercase tracking-wide">Movimentações recentes</p>
            <span className="text-[7px] text-[#0f2d5e] font-semibold">Ver todos →</span>
          </div>
          {processos.map((p) => (
            <div key={p.cnj} className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[#f9fafb] last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-semibold text-[#0f2d5e] truncate">{p.cnj}</p>
                <p className="text-[7px] text-[#9ca3af]">{p.tribunal}</p>
              </div>
              <span className={`text-[6.5px] font-bold px-1.5 py-0.5 rounded-full ${p.urgente ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                {p.mov}
              </span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#111827]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <header className="sticky top-0 z-10 flex items-center gap-5 px-5 md:px-14 xl:px-[140px] py-4 bg-white/95 backdrop-blur border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2.5 mr-auto">
          <div className="w-[34px] h-[34px] rounded-[10px] bg-[#0f2d5e] text-white flex items-center justify-center text-[14px] font-extrabold shrink-0" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</div>
          <span className="font-extrabold text-[18px] text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          <a href="#como-funciona" className="text-sm text-[#374151] font-medium no-underline hover:text-[#0f2d5e]">Como funciona</a>
          <a href="#funcionalidades" className="text-sm text-[#374151] font-medium no-underline hover:text-[#0f2d5e]">Funcionalidades</a>
          <a href="#planos" className="text-sm text-[#374151] font-medium no-underline hover:text-[#0f2d5e]">Planos</a>
          <a href="#faq" className="text-sm text-[#374151] font-medium no-underline hover:text-[#0f2d5e]">FAQ</a>
        </nav>
        <Link href="/login" className="text-sm font-semibold text-[#0f2d5e] px-4 py-2 rounded-full border border-[#e5e7eb] bg-white no-underline hover:bg-[#f9fafb]">Entrar</Link>
        <Link href="#planos" className="text-sm font-semibold text-white px-4 py-2 rounded-full bg-[#0f2d5e] no-underline hover:opacity-90">Ver planos</Link>
      </header>

      {/* ── Hero ── */}
      <section className="px-5 md:px-10 py-16 md:py-[88px]">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#fbf3e1] text-[#9a7c2c] text-[13px] font-semibold px-3.5 py-1.5 rounded-full mb-5">
              <Radar className="w-3.5 h-3.5" />
              Radar jurídico em tempo real
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl leading-[1.12] tracking-[-0.01em] text-[#0f2d5e] max-w-[600px] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Encontre o próximo caso antes do seu concorrente.
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-[#6b7280] max-w-[540px] mb-8">
              JurisRadar varre DJEN Nacional, DataJud/CNJ, PJe Nacional e DJe TJSP em tempo real e organiza seus processos ativos em um único CRM — com alertas automáticos de prazo e intimação.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="#planos" className="text-base font-bold text-white bg-[#0f2d5e] px-7 py-4 rounded-[14px] no-underline text-center hover:opacity-90">Ver planos</Link>
              <Link href="#como-funciona" className="text-base font-semibold text-[#0f2d5e] px-7 py-4 rounded-[14px] border border-[#e5e7eb] bg-white no-underline text-center hover:bg-[#f9fafb]">Como funciona</Link>
            </div>
          </div>
          <DashboardMockup />
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" className="px-5 md:px-10 py-16">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#c9a84c] mb-2">Como funciona</div>
          <h2 className="font-extrabold text-3xl text-[#0f2d5e] mb-10" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Dois problemas, um único lugar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-8 shadow-sm">
              <div className="w-12 h-12 rounded-[14px] bg-[#eaf0f8] text-[#0f2d5e] flex items-center justify-center mb-4">
                <Radar className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2.5" style={{ fontFamily: 'Manrope, sans-serif' }}>1. Prospecção de casos novos</h3>
              <p className="text-[#6b7280] leading-relaxed m-0">Busque publicações por termo, bairro, nome de parte ou número CNJ nos principais diários eletrônicos do país. Encontrou um caso de interesse? Adicione ao CRM com um clique.</p>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-[20px] p-8 shadow-sm">
              <div className="w-12 h-12 rounded-[14px] bg-[#fbf3e1] text-[#9a7c2c] flex items-center justify-center mb-4">
                <Kanban className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2.5" style={{ fontFamily: 'Manrope, sans-serif' }}>2. Gestão dos processos ativos</h3>
              <p className="text-[#6b7280] leading-relaxed m-0">Acompanhe em tempo real tudo que você já representa. Alertas automáticos por e-mail e no sistema a cada nova intimação, prazo crítico ou movimentação.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="px-5 md:px-10 py-16 bg-white border-t border-b border-[#e5e7eb]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#c9a84c] mb-2">Funcionalidades</div>
          <h2 className="font-extrabold text-3xl text-[#0f2d5e] mb-10" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tudo que o seu escritório precisa, integrado
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-[18px] p-6">
                <div className="w-[38px] h-[38px] rounded-[11px] bg-[#eaf0f8] text-[#0f2d5e] flex items-center justify-center mb-3.5">
                  <Icon className="w-[19px] h-[19px]" />
                </div>
                <div className="font-bold text-[15px] mb-1.5" style={{ fontFamily: 'Manrope, sans-serif' }}>{title}</div>
                <p className="text-[13px] text-[#6b7280] leading-relaxed m-0">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparação ── */}
      <section className="px-5 md:px-10 py-16 bg-white border-t border-b border-[#e5e7eb]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#c9a84c] mb-2">Comparação</div>
          <h2 className="font-extrabold text-3xl text-[#0f2d5e] mb-10" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Por que trocar a planilha pelo radar
          </h2>
          <div className="overflow-x-auto rounded-[20px] border border-[#e5e7eb] shadow-sm">
            <table className="w-full border-collapse text-sm min-w-[500px]">
              <thead>
                <tr className="bg-[#eaf0f8]">
                  <th className="text-left px-5 py-4 text-[#0f2d5e] font-bold">Critério</th>
                  <th className="text-left px-5 py-4 text-[#0f2d5e] font-bold">Planilhas / e-mail</th>
                  <th className="text-left px-5 py-4 text-[#0f2d5e] font-bold">Sistema genérico</th>
                  <th className="text-left px-5 py-4 text-[#0f2d5e] font-bold">JurisRadar</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-[#e5e7eb]">
                    <td className="px-5 py-3.5 font-semibold">{row.label}</td>
                    <td className="px-5 py-3.5 text-[#6b7280]">{row.manual}</td>
                    <td className="px-5 py-3.5 text-[#6b7280]">{row.generic}</td>
                    <td className="px-5 py-3.5 font-bold text-[#9a7c2c]">{row.jr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="px-5 md:px-10 py-16">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#c9a84c] mb-2">Planos</div>
          <h2 className="font-extrabold text-3xl text-[#0f2d5e] mb-10" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Comece a captar casos hoje
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[760px]">
            {/* Mensal */}
            <div className="bg-white border border-[#e5e7eb] rounded-[22px] p-8 shadow-sm">
              <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#6b7280] mb-3.5">Mensal</div>
              <div className="flex items-baseline gap-1.5 mb-2.5">
                <span className="font-extrabold text-[38px] text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>R$ 157</span>
                <span className="text-[#6b7280]">/mês</span>
              </div>
              <p className="text-[#6b7280] text-sm mb-6">Sem contrato de fidelidade. Cancele quando quiser.</p>
              <Link href="/register" className="block text-center font-bold text-[#0f2d5e] border border-[#e5e7eb] px-4 py-3 rounded-[14px] no-underline bg-white hover:bg-[#f9fafb]">Assinar mensal</Link>
            </div>
            {/* Anual */}
            <div className="relative bg-white border-2 border-[#c9a84c] rounded-[22px] p-8" style={{ boxShadow: '0 12px 32px -8px rgba(201,168,76,.28)' }}>
              <div className="absolute -top-3.5 left-8 bg-[#c9a84c] text-[#0f2d5e] text-xs font-bold px-3.5 py-1.5 rounded-full">Recomendado — economize 19%</div>
              <div className="text-[13px] font-bold uppercase tracking-[.04em] text-[#6b7280] mb-3.5">Anual</div>
              <div className="flex items-baseline gap-1.5 mb-2.5">
                <span className="font-extrabold text-[38px] text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>R$ 127</span>
                <span className="text-[#6b7280]">/mês, cobrança anual</span>
              </div>
              <p className="text-[#6b7280] text-sm mb-6">O mesmo radar, o ano todo, pelo menor custo mensal.</p>
              <Link href="/register" className="block text-center font-bold text-white bg-[#0f2d5e] px-4 py-3 rounded-[14px] no-underline hover:opacity-90">Assinar anual</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-5 md:px-10 py-16 bg-white border-t border-[#e5e7eb]">
        <div className="max-w-[760px] mx-auto">
          <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#c9a84c] mb-2">FAQ</div>
          <h2 className="font-extrabold text-3xl text-[#0f2d5e] mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Perguntas frequentes
          </h2>
          {FAQS.map(({ q, a }) => (
            <details key={q} className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl px-5 py-4.5 mb-3">
              <summary className="font-bold text-base text-[#0f2d5e] cursor-pointer list-none" style={{ fontFamily: 'Manrope, sans-serif' }}>{q}</summary>
              <p className="text-[#6b7280] mt-2.5 mb-0">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-5 md:px-10 py-16" style={{ background: 'linear-gradient(120deg,#0f2d5e,#173e79)' }}>
        <div className="max-w-[1180px] mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <h2 className="font-extrabold text-2xl md:text-3xl text-white m-0 max-w-[560px] text-center md:text-left" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Cada dia sem radar é um caso que o outro escritório já achou.
          </h2>
          <Link href="#planos" className="font-bold text-[#0f2d5e] bg-[#c9a84c] px-8 py-4 rounded-[14px] no-underline whitespace-nowrap hover:opacity-90">
            Ver planos
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 md:px-10 pt-12 pb-8 bg-white">
        <div className="max-w-[1180px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-[8px] bg-[#0f2d5e] text-white flex items-center justify-center text-xs font-extrabold" style={{ fontFamily: 'Manrope, sans-serif' }}>JR</div>
              <span className="font-extrabold text-base text-[#0f2d5e]" style={{ fontFamily: 'Manrope, sans-serif' }}>JurisRadar</span>
            </div>
            <p className="text-[#6b7280] max-w-[320px] text-sm leading-relaxed m-0">
              Radar de publicações e gestão de processos para advogados autônomos e pequenos escritórios.
            </p>
          </div>
          <div>
            <div className="font-bold text-[13px] uppercase tracking-[.04em] text-[#111827] mb-3">Produto</div>
            <div className="flex flex-col gap-2 text-sm">
              <a href="#funcionalidades" className="text-[#0f2d5e] no-underline hover:underline">Funcionalidades</a>
              <a href="#planos" className="text-[#0f2d5e] no-underline hover:underline">Planos</a>
              <a href="#faq" className="text-[#0f2d5e] no-underline hover:underline">FAQ</a>
            </div>
          </div>
          <div>
            <div className="font-bold text-[13px] uppercase tracking-[.04em] text-[#111827] mb-3">Conta</div>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/login" className="text-[#0f2d5e] no-underline hover:underline">Entrar</Link>
              <Link href="/register" className="text-[#0f2d5e] no-underline hover:underline">Criar conta</Link>
            </div>
          </div>
        </div>
        <div className="max-w-[1180px] mx-auto mt-8 pt-5 border-t border-[#e5e7eb]">
          <p className="text-[#9ca3af] text-xs m-0">© 2026 JurisRadar. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
