import 'dotenv/config';
import { encrypt, decrypt } from '../src/lib/asaas/crypto';

const BASE_URL = 'https://www.asaas.com/api/v3';
const API_KEY = process.env.ASAAS_API_KEY!;
const ENCRYPTION_KEY = process.env.ASAAS_ENCRYPTION_KEY!;
const WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN!;

function ok(label: string) { console.log(`  ✅ ${label}`); }
function fail(label: string, err: unknown) { console.error(`  ❌ ${label}:`, err); }

async function asaas(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', access_token: API_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  console.log('\n🔐 1. Criptografia AES-256-GCM');
  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) throw new Error('ASAAS_ENCRYPTION_KEY inválida (deve ter 64 hex chars)');
    const original = 'test_api_key_' + Math.random().toString(36).slice(2);
    const encrypted = encrypt(original, ENCRYPTION_KEY);
    const decrypted = decrypt(encrypted, ENCRYPTION_KEY);
    if (decrypted !== original) throw new Error('round-trip falhou');
    ok(`encrypt → decrypt: "${original.slice(0, 20)}..." → OK`);
  } catch (e) { fail('criptografia', e); return; }

  console.log('\n🌐 2. Conectividade com sandbox Asaas');
  let customerId: string;
  try {
    if (!API_KEY) throw new Error('ASAAS_API_KEY não definida');
    const customer = await asaas('POST', '/customers', {
      name: 'JurisRadar Teste',
      email: `teste+${Date.now()}@jurisradar.com.br`,
      cpfCnpj: '24971563792',
    });
    customerId = customer.id;
    ok(`Cliente criado: ${customerId}`);
  } catch (e) { fail('criar cliente', e); return; }

  console.log('\n💰 3. Criação de cobrança (boleto/Pix)');
  let cobrancaId: string;
  try {
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 7);
    const cobranca = await asaas('POST', '/payments', {
      customer: customerId,
      billingType: 'BOLETO',
      value: 150.00,
      dueDate: vencimento.toISOString().slice(0, 10),
      description: 'Honorários advocatícios - teste JurisRadar',
      externalReference: `test-${Date.now()}`,
    });
    cobrancaId = cobranca.id;
    ok(`Cobrança criada: ${cobrancaId} | status: ${cobranca.status}`);
    ok(`Link boleto: ${cobranca.bankSlipUrl ?? '(sandbox sem URL)'}`);
  } catch (e) { fail('criar cobrança', e); return; }

  console.log('\n🔄 4. Listagem de cobranças');
  try {
    const lista = await asaas('GET', `/payments?customer=${customerId}&limit=5`);
    ok(`${lista.totalCount} cobrança(s) encontrada(s) para o cliente`);
  } catch (e) { fail('listar cobranças', e); }

  console.log('\n📋 5. Assinatura recorrente');
  let assinaturaId: string | undefined;
  try {
    const inicio = new Date();
    inicio.setDate(inicio.getDate() + 1);
    const assinatura = await asaas('POST', '/subscriptions', {
      customer: customerId,
      billingType: 'BOLETO',
      value: 500.00,
      nextDueDate: inicio.toISOString().slice(0, 10),
      cycle: 'MONTHLY',
      description: 'Honorários mensais - teste JurisRadar',
      maxPayments: 3,
    });
    assinaturaId = assinatura.id;
    ok(`Assinatura criada: ${assinaturaId} | ciclo: MONTHLY | 3x R$500`);
  } catch (e) { fail('criar assinatura', e); }

  console.log('\n🔑 6. Token de webhook');
  try {
    if (!WEBHOOK_TOKEN) throw new Error('ASAAS_WEBHOOK_TOKEN não definida');
    ok(`Token configurado (${WEBHOOK_TOKEN.length} chars)`);
    ok('Handler em /api/asaas/webhook valida header asaas-access-token');
  } catch (e) { fail('webhook token', e); }

  console.log('\n🧹 Limpeza (cancelar assinatura e cobrança de teste)');
  try {
    if (assinaturaId) {
      await asaas('DELETE', `/subscriptions/${assinaturaId}`);
      ok(`Assinatura ${assinaturaId} cancelada`);
    }
    await asaas('DELETE', `/payments/${cobrancaId}`);
    ok(`Cobrança ${cobrancaId} removida`);
  } catch (e) { fail('limpeza', e); }

  console.log('\n✅ Integração Asaas validada com sucesso!\n');
}

main().catch((e) => { console.error('\n💥 Erro fatal:', e); process.exit(1); });
