/**
 * Cloudflare Pages Function para API do Mocotó.
 * Rotas públicas: POST /api/mocoto e POST /api/feedback.
 * A variável MOCOTO_APPS_SCRIPT_URL fica no painel do Cloudflare,
 * nunca em public/config.js.
 * Este proxy não substitui autenticação, limites por usuário e validação no Apps Script.
 */
const ACTIONS = new Set([
  'submitFeedback', 'getManagerDashboard', 'testWhatsAppAlert',
  'retryPendingFeedbackAlerts', 'registerCustomer', 'scanCustomerQr',
  'managerLogin', 'managerLogout', 'issueCode', 'redeemVisit',
  'visitStatus', 'redeemDiscount', 'redeemReward',
  'getManagerOverview', 'getManagerCustomer', 'trackAccess'
]);
const FEEDBACK_ACTIONS = new Set([
  'submitFeedback', 'getManagerDashboard',
  'testWhatsAppAlert', 'retryPendingFeedbackAlerts'
]);
const RESPONSE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const SCRIPT_URL_PATTERN = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/;
const reply = (status, payload) => new Response(JSON.stringify(payload), {
  status,
  headers: RESPONSE_HEADERS
});

export async function proxyMocoto({request, env}, feedbackOnly = false) {
  if (request.method !== 'POST') {
    return reply(405, {ok:false, error:'Método não permitido'});
  }
  const deployment = String(env.MOCOTO_APPS_SCRIPT_URL || '').trim();
  if (!SCRIPT_URL_PATTERN.test(deployment)) {
    return reply(503, {ok:false, error:'Configure MOCOTO_APPS_SCRIPT_URL na Cloudflare com a URL /exec publicada.'});
  }
  const type = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (!type.startsWith('application/x-www-form-urlencoded')) {
    return reply(415, {ok:false, error:'Formato inválido'});
  }
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return reply(403, {ok:false, error:'Origem não permitida'});
  }
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > 16000) {
    return reply(413, {ok:false, error:'Requisição muito grande'});
  }
  const values = new URLSearchParams(new TextDecoder().decode(bytes));
  const action = values.get('action') || '';
  if (!(feedbackOnly ? FEEDBACK_ACTIONS : ACTIONS).has(action)) {
    return reply(400, {ok:false, error:'Operação não permitida'});
  }
  let parsed;
  try {
    parsed = JSON.parse(values.get('payload') || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Formato inválido');
  } catch {
    return reply(400, {ok:false, error:'Dados inválidos'});
  }
  try {
    const response = await fetch(deployment, {
      method: 'POST',
      redirect: 'follow',
      headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
      body: new URLSearchParams({action, payload:JSON.stringify(parsed)})
    });
    if (!response.ok) {
      return reply(502, {ok:false, error:'Apps Script indisponível (HTTP ' + response.status + ').'});
    }
    let data;
    try { data = await response.json(); }
    catch { return reply(502, {ok:false, error:'Apps Script retornou resposta inválida; confira a implantação.'}); }
    if (!data || typeof data.ok !== 'boolean') {
      return reply(502, {ok:false, error:'Resposta inesperada do Apps Script.'});
    }
    return reply(200, data);
  } catch (e) {
    console.error('Falha na API Mocotó:', e?.message || String(e));
    return reply(502, {ok:false, error:'Falha na comunicação com a API. Confira a implantação do Apps Script.'});
  }
}

export const onRequest = (context) => proxyMocoto(context);
