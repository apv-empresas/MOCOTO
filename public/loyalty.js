/* Cartão de visitas — demo local ou API real; sem alterar planilhas anteriores. */
(function(root){
'use strict';
const cfg=root.APP_CONFIG.loyalty;
const prefix='mocoto-e2-'+root.APP_CONFIG.business.id+'-';
const key=name=>prefix+name;
const read=(name,fallback)=>{try{return JSON.parse(localStorage.getItem(key(name)))??fallback}catch{return fallback}};
const save=(name,value)=>localStorage.setItem(key(name),JSON.stringify(value));
const normalize=phone=>String(phone||'').replace(/\D/g,'');
function validatePhone(value){const phone=normalize(value);if(phone.length!==10&&phone.length!==11)throw Error('Informe um telefone brasileiro com DDD.');return phone;}
const isServer=()=>cfg.mode==='server';
async function api(action,payload={},apiUrl=cfg.apiUrl){
 // A URL opcional permite conectar SOMENTE avaliações a uma API, sem mudar a fidelidade.
 const endpoint=String(apiUrl||'').trim();
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec(?:\?.*)?$/.test(endpoint)
    && !/^https:\/\/[a-z0-9.-]+(?::\d{2,5})?\/(?:api|feedback)(?:\/|$|\?)/i.test(endpoint)
    && !/^\/(?:api|feedback)(?:\/|$|\?)/.test(endpoint))throw Error('Configure uma URL válida da API de avaliações (HTTPS e endpoint publicado).');
 // A chamada deve SEMPRE terminar: o Google Apps Script pode demorar ou ficar indisponível.
 // Não deixar o botão preso para sempre quando a conexão não responde.
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),55000);
 let response,raw;
 try{
  response=await fetch(endpoint,{method:'POST',redirect:'follow',signal:controller.signal,
    body:new URLSearchParams({action,payload:JSON.stringify(payload)})});
  raw=await response.text();
 }catch(error){
  if(controller.signal.aborted)throw Error('A consulta demorou demais. Confira se o servidor está aberto e tente novamente. O cadastro não será duplicado.');
  throw Error('Não foi possível acessar a API. Confira servidor e implantação do Apps Script. '+(error?.message||''));
 }finally{clearTimeout(timeout);}
 let data;
 try{data=JSON.parse(raw)}catch{throw Error('Resposta inválida da API; confira a implantação do Apps Script.');}
 if(!response.ok||!data.ok)throw Error(data.error||'Não foi possível concluir a operação.');
 return data;
}
const id=()=>{const a=new Uint8Array(8);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,'0')).join('').toUpperCase()};
const publicStatus=(count,phone,discount)=>({visits:count,phone,token:isServer()?read('token',''):null,discount:discount||null});
function demoIssue(phone,pin){phone=validatePhone(phone);throw Error('Gerenciamento disponível somente com servidor autenticado.');const codes=read('codes',{});let code;do{code='VIS-'+id().slice(0,10)}while(codes[code]);const expiresAt=Date.now()+2*60*60*1000;codes[code]={phone,used:false,expiresAt};save('codes',codes);return {code,phone,expiresAt};}
function demoRedeem(phone,code){phone=validatePhone(phone);code=String(code||'').trim().toUpperCase();const codes=read('codes',{}),c=codes[code];if(!c||c.used||c.expiresAt<Date.now()||c.phone!==phone)throw Error('Código inválido, vencido ou já utilizado.');
 c.used=true;save('codes',codes);
 const customers=read('customers',{});const previous=customers[phone]||{visits:Math.max(0,Number(root.APP_CONFIG.demo.initialVisits)||0),coupons:[]};previous.visits++;
 const d=cfg.discount||{};let discount=null;if(d.enabled){const expiresAt=Date.now()+(Number(d.validityDays)||14)*86400000;discount={code:'OFF-'+id().slice(0,9),percent:Number(d.percent)||10,expiresAt,status:'ATIVO'};previous.coupons.push(discount)}
 customers[phone]=previous;save('customers',customers);save('phone',phone);
 const target=Number(cfg.visitsToReward)||10;
 return {...publicStatus(previous.visits,phone,discount),milestone:previous.visits>0&&previous.visits%target===0};
}
async function issue(phone,pin){if(isServer())return (await api('issueCode',{phone:validatePhone(phone),pin})).result;return demoIssue(phone,pin)}
async function redeem(phone,code){const p=validatePhone(phone);if(isServer()){
 const source=new URLSearchParams(location.search).get('source')||'';
 const result=(await api('redeemVisit',{phone:p,code:String(code||'').trim().toUpperCase(),source:source.slice(0,60)})).result;
 save('phone',p);if(result.token)save('token',result.token);save('lastStatus',result);return result;
 }return demoRedeem(p,code)}
async function status(){if(isServer()){
 const token=read('token','');if(!token)return {visits:0,phone:read('phone',''),notLinked:true};
 const result=(await api('visitStatus',{token})).result;
 if(result.phone)save('phone',validatePhone(result.phone));
 save('lastStatus',result);return result;
 }
 const phone=read('phone','');if(!phone)return {visits:Math.max(0,Number(root.APP_CONFIG.demo.initialVisits)||0),phone:'',discount:null};
 const customer=read('customers',{})[phone];return publicStatus(customer?.visits||0,phone,(customer?.coupons||[]).filter(c=>c.expiresAt>Date.now()&&c.status==='ATIVO').slice(-1)[0]);
}
async function redeemDiscount(code,pin){if(isServer())return (await api('redeemDiscount',{code,pin})).result;
 throw Error('Gerenciamento disponível somente com servidor autenticado.');
 const customers=read('customers',{});for(const [phone,c] of Object.entries(customers)){const coupon=(c.coupons||[]).find(x=>x.code===code);if(coupon){if(coupon.status!=='ATIVO'||coupon.expiresAt<Date.now())throw Error('Cupom vencido ou utilizado.');coupon.status='USADO';save('customers',customers);return {code,phone,status:'USADO'}}}
 throw Error('Cupom não encontrado.');}
async function managerOverview(pin){if(!isServer())throw Error('Painel compartilhado exige servidor.');return (await api('getManagerOverview',{pin})).result}
async function managerCustomer(phone,pin){if(!isServer())throw Error('Painel compartilhado exige servidor.');return (await api('getManagerCustomer',{phone:validatePhone(phone),pin})).result}
// Prova de cadastro criada ANTES da primeira requisição: se o Google gravar o
// cliente mas a rede perder a resposta, uma nova tentativa recupera a mesma
// sessão, sem dar uma visita adicional e sem revelar outra conta pelo telefone.
function newRegistrationToken(){
 const bytes=new Uint8Array(32);
 crypto.getRandomValues(bytes);
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
async function registerCustomer(phone,pin=''){
 if(!isServer())throw Error('Cadastro de cliente exige servidor.');
 const p=validatePhone(phone);
 // Sessões antigas continuam funcionando; não substitua um token válido.
 let remembered=read('phone','');
 if(!remembered){try{remembered=normalize(localStorage.getItem('mocoto-last-phone'))}catch{}}
 const ownedToken=remembered===p?read('token',''):'';
 const pending=read('pendingRegistration',null);
 const pendingToken=pending?.phone===p && /^[a-f0-9]{64}$/.test(String(pending.token||''))?pending.token:'';
 const token=ownedToken||pendingToken||newRegistrationToken();
 // Gravar antes de enviar para permitir repetir a mesma tentativa com segurança.
 if(!ownedToken && !pendingToken)save('pendingRegistration',{phone:p,token});
 const result=(await api('registerCustomer',{phone:p,pin:String(pin||''),token})).result;
 if(result.token){
  save('phone',p);save('token',result.token);save('lastStatus',result);
  save('pendingRegistration',null);
  try{localStorage.setItem('mocoto-last-phone',p)}catch{}
 }else if(result.alreadyRegistered){
  // Se já pertencia a outra sessão, não guardamos um token não confirmado.
  if(!ownedToken)save('pendingRegistration',null);
 }
 return result;
}
async function scanCustomerQr(clientCode,pin){if(!isServer())throw Error('Leitura de QR exige servidor.');return (await api('scanCustomerQr',{clientCode:String(clientCode||'').trim().toUpperCase(),pin})).result}
async function redeemReward(code,pin,managerReference=''){if(!isServer())throw Error('Resgate compartilhado exige servidor.');return (await api('redeemReward',{code,pin,managerReference})).result}
root.MOCOTO_LOYALTY={isServer,issue,redeem,status,redeemDiscount,managerOverview,managerCustomer,registerCustomer,scanCustomerQr,redeemReward,validatePhone,api};
})(window);
