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
  Check,
  X,
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

export default function LandingPage() {
  return (
    <div style={{ background: '#f9fafb', color: '#111827', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Nav ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(249,250,251,.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex', alignItems: 'center', gap: 28, padding: '16px 140px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 'auto' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: '#0f2d5e', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 14,
          }}>JR</div>
          <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, color: '#0f2d5e' }}>JurisRadar</span>
        </div>
        <a href="#como-funciona" style={{ fontSize: 14, color: '#374151', fontWeight: 500, textDecoration: 'none' }}>Como funciona</a>
        <a href="#funcionalidades" style={{ fontSize: 14, color: '#374151', fontWeight: 500, textDecoration: 'none' }}>Funcionalidades</a>
        <a href="#planos" style={{ fontSize: 14, color: '#374151', fontWeight: 500, textDecoration: 'none' }}>Planos</a>
        <a href="#faq" style={{ fontSize: 14, color: '#374151', fontWeight: 500, textDecoration: 'none' }}>FAQ</a>
        <Link href="/login" style={{
          fontSize: 14, color: '#0f2d5e', fontWeight: 600,
          padding: '9px 18px', borderRadius: 999, border: '1px solid #e5e7eb',
          textDecoration: 'none', background: '#fff',
        }}>Entrar</Link>
        <Link href="#planos" style={{
          fontSize: 14, color: '#fff', fontWeight: 600,
          padding: '10px 20px', borderRadius: 999, background: '#0f2d5e',
          textDecoration: 'none',
        }}>Ver planos</Link>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: '88px 40px 72px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 56, alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fbf3e1', color: '#9a7c2c',
              fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 999,
              marginBottom: 20,
            }}>
              <Radar style={{ width: 14, height: 14 }} />
              Radar jurídico em tempo real
            </div>
            <h1 style={{
              fontFamily: 'Manrope, sans-serif', fontWeight: 800,
              fontSize: 48, lineHeight: 1.12, letterSpacing: '-0.01em',
              color: '#0f2d5e', maxWidth: 600, margin: '0 0 20px',
            }}>
              Encontre o próximo caso antes do seu concorrente.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: '#6b7280', maxWidth: 540, margin: '0 0 32px' }}>
              JurisRadar varre DJEN Nacional, DataJud/CNJ, PJe Nacional e DJe TJSP em tempo real e organiza seus processos ativos em um único CRM — com alertas automáticos de prazo e intimação.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <Link href="#planos" style={{
                fontSize: 16, fontWeight: 700, color: '#fff',
                background: '#0f2d5e', padding: '15px 30px',
                borderRadius: 14, textDecoration: 'none',
              }}>Ver planos</Link>
              <Link href="#como-funciona" style={{
                fontSize: 16, fontWeight: 600, color: '#0f2d5e',
                padding: '15px 30px', borderRadius: 14,
                border: '1px solid #e5e7eb', background: '#fff',
                textDecoration: 'none',
              }}>Como funciona</Link>
            </div>
          </div>
          <div style={{
            borderRadius: 24,
            background: 'repeating-linear-gradient(135deg,#eef2f7 0px,#eef2f7 1px,#f6f8fb 1px,#f6f8fb 16px)',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(15,23,42,.04),0 24px 48px -12px rgba(15,45,94,.14)',
            height: 380,
            display: 'flex', alignItems: 'flex-end', padding: 18,
          }}>
            <span style={{
              fontFamily: 'monospace', fontSize: 12,
              background: '#fff', color: '#6b7280',
              padding: '6px 12px', borderRadius: 999, border: '1px solid #e5e7eb',
            }}>[ Dashboard JurisRadar ]</span>
          </div>
        </div>
      </section>

      {/* ── Como funciona ── */}
      <section id="como-funciona" style={{ padding: '64px 40px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: 8 }}>Como funciona</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 32, color: '#0f2d5e', margin: '0 0 40px' }}>
            Dois problemas, um único lugar
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 32, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#eaf0f8', color: '#0f2d5e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Radar style={{ width: 24, height: 24 }} />
              </div>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 20, margin: '0 0 10px' }}>1. Prospecção de casos novos</h3>
              <p style={{ color: '#6b7280', margin: 0, lineHeight: 1.6 }}>Busque publicações por termo, bairro, nome de parte ou número CNJ nos principais diários eletrônicos do país. Encontrou um caso de interesse? Adicione ao CRM com um clique.</p>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 32, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fbf3e1', color: '#9a7c2c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                <Kanban style={{ width: 24, height: 24 }} />
              </div>
              <h3 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 20, margin: '0 0 10px' }}>2. Gestão dos processos ativos</h3>
              <p style={{ color: '#6b7280', margin: 0, lineHeight: 1.6 }}>Acompanhe em tempo real tudo que você já representa. Alertas automáticos por e-mail e no sistema a cada nova intimação, prazo crítico ou movimentação.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" style={{ padding: '64px 40px', background: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: 8 }}>Funcionalidades</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 32, color: '#0f2d5e', margin: '0 0 40px' }}>
            Tudo que o seu escritório precisa, integrado
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: '#f9fafb', border: '1px solid #e5e7eb',
                borderRadius: 18, padding: 24,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: '#eaf0f8', color: '#0f2d5e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon style={{ width: 19, height: 19 }} />
                </div>
                <div style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{title}</div>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparação ── */}
      <section style={{ padding: '64px 40px', background: '#fff', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: 8 }}>Comparação</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 32, color: '#0f2d5e', margin: '0 0 40px' }}>
            Por que trocar a planilha pelo radar
          </h2>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#eaf0f8' }}>
                  <th style={{ textAlign: 'left', padding: '16px 20px', color: '#0f2d5e', fontWeight: 700 }}>Critério</th>
                  <th style={{ textAlign: 'left', padding: '16px 20px', color: '#0f2d5e', fontWeight: 700 }}>Planilhas / e-mail</th>
                  <th style={{ textAlign: 'left', padding: '16px 20px', color: '#0f2d5e', fontWeight: 700 }}>Sistema genérico</th>
                  <th style={{ textAlign: 'left', padding: '16px 20px', color: '#0f2d5e', fontWeight: 700 }}>JurisRadar</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>{row.label}</td>
                    <td style={{ padding: '14px 20px', color: '#6b7280' }}>{row.manual}</td>
                    <td style={{ padding: '14px 20px', color: '#6b7280' }}>{row.generic}</td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#9a7c2c' }}>{row.jr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" style={{ padding: '64px 40px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: 8 }}>Planos</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 32, color: '#0f2d5e', margin: '0 0 40px' }}>
            Comece a captar casos hoje
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 760 }}>
            {/* Mensal */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 22, padding: 32, boxShadow: '0 1px 2px rgba(15,23,42,.04)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b7280', marginBottom: 14 }}>Mensal</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 38, color: '#0f2d5e' }}>R$ 157</span>
                <span style={{ color: '#6b7280' }}>/mês</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>Sem contrato de fidelidade. Cancele quando quiser.</p>
              <Link href="/register" style={{
                display: 'block', textAlign: 'center', fontWeight: 700,
                color: '#0f2d5e', border: '1px solid #e5e7eb',
                padding: 13, borderRadius: 14, textDecoration: 'none',
                background: '#fff',
              }}>Assinar mensal</Link>
            </div>

            {/* Anual */}
            <div style={{ background: '#fff', border: '2px solid #c9a84c', borderRadius: 22, padding: 32, boxShadow: '0 12px 32px -8px rgba(201,168,76,.28)', position: 'relative' }}>
              <div style={{
                position: 'absolute', top: -13, left: 32,
                background: '#c9a84c', color: '#0f2d5e',
                fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 999,
              }}>Recomendado — economize 19%</div>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b7280', marginBottom: 14 }}>Anual</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 38, color: '#0f2d5e' }}>R$ 127</span>
                <span style={{ color: '#6b7280' }}>/mês, cobrança anual</span>
              </div>
              <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px' }}>O mesmo radar, o ano todo, pelo menor custo mensal.</p>
              <Link href="/register" style={{
                display: 'block', textAlign: 'center', fontWeight: 700,
                color: '#fff', background: '#0f2d5e',
                padding: 13, borderRadius: 14, textDecoration: 'none',
              }}>Assinar anual</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: '64px 40px', background: '#fff', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: 8 }}>FAQ</div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 32, color: '#0f2d5e', margin: '0 0 32px' }}>
            Perguntas frequentes
          </h2>
          {FAQS.map(({ q, a }) => (
            <details key={q} style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>
              <summary style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 700, fontSize: 16, color: '#0f2d5e', cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
              <p style={{ color: '#6b7280', margin: '10px 0 0' }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '72px 40px', background: 'linear-gradient(120deg,#0f2d5e,#173e79)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 30, color: '#fff', margin: 0, maxWidth: 560 }}>
            Cada dia sem radar é um caso que o outro escritório já achou.
          </h2>
          <Link href="#planos" style={{ fontWeight: 700, color: '#0f2d5e', background: '#c9a84c', padding: '15px 32px', borderRadius: 14, textDecoration: 'none' }}>
            Ver planos
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '48px 40px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0f2d5e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12 }}>JR</div>
              <span style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: '#0f2d5e' }}>JurisRadar</span>
            </div>
            <p style={{ color: '#6b7280', maxWidth: 320, fontSize: 14, lineHeight: 1.6 }}>
              Radar de publicações e gestão de processos para advogados autônomos e pequenos escritórios.
            </p>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: '#111827', marginBottom: 12 }}>Produto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <a href="#funcionalidades" style={{ color: '#0f2d5e', textDecoration: 'none' }}>Funcionalidades</a>
              <a href="#planos" style={{ color: '#0f2d5e', textDecoration: 'none' }}>Planos</a>
              <a href="#faq" style={{ color: '#0f2d5e', textDecoration: 'none' }}>FAQ</a>
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '.04em', color: '#111827', marginBottom: 12 }}>Conta</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
              <Link href="/login" style={{ color: '#0f2d5e', textDecoration: 'none' }}>Entrar</Link>
              <Link href="/register" style={{ color: '#0f2d5e', textDecoration: 'none' }}>Criar conta</Link>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1180, margin: '32px auto 0', borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
          <p style={{ color: '#9ca3af', fontSize: 12, margin: 0 }}>© 2026 JurisRadar. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
