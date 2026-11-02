(function(){
'use strict';
const L=window.MOCOTO_LOYALTY;
const el=id=>document.getElementById(id);
const loginPanel=el('login-panel');
const issuePanel=el('issue-panel');
const loginForm=el('login-form');
const issueForm=el('issue-form');
let managerSession='';
let issuedCode='';
function message(id,text){el(id).textContent=text;}
function showLogin(text=''){
  managerSession='';issuedCode='';issuePanel.hidden=true;loginPanel.hidden=false;
  el('issue-result').hidden=true;el('issued-code').textContent='';
  message('issue-feedback','');message('login-feedback',text);
  el('login-pin').value='';el('login-pin').focus();
}
function showIssuer(){
  loginPanel.hidden=true;issuePanel.hidden=false;
  message('login-feedback','');message('issue-feedback','');
  el('manager-phone').focus();
}
if(!L||!L.isServer())message('login-feedback','Conecte o servidor Mocotó para entrar.');

loginForm.addEventListener('submit',async event=>{
  event.preventDefault();
  const pin=el('login-pin').value.trim();
  if(!/^\d{4}$/.test(pin)){message('login-feedback','Digite exatamente 4 números.');return;}
  const button=el('login-button');button.disabled=true;button.textContent='Verificando…';
  message('login-feedback','');
  try{
    const reply=await L.api('managerLogin',{pin});
    if(!/^[a-f0-9]{64}$/i.test(String(reply.result?.managerSession||'')))throw Error('Resposta de autenticação inválida.');
    managerSession=reply.result.managerSession;
    el('login-pin').value='';
    showIssuer();
  }catch(err){message('login-feedback',err.message||'Não foi possível entrar.');}
  finally{button.disabled=false;button.textContent='Entrar';}
});

issueForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!managerSession){showLogin('Entre novamente para gerar códigos.');return;}
  const button=el('issue-button');
  let phone;
  try{phone=L.validatePhone(el('manager-phone').value);}catch(err){message('issue-feedback',err.message);return;}
  button.disabled=true;button.textContent='Gerando…';
  message('issue-feedback','');el('issue-result').hidden=true;
  try{
    const reply=await L.api('issueCode',{phone,managerSession});
    const result=reply.result;
    if(!result||!result.code)throw Error('O servidor não retornou um código.');
    issuedCode=String(result.code);
    el('issued-code').textContent=issuedCode;
    el('issued-expiry').textContent='Uso único · válido até '+new Date(result.expiresAt).toLocaleString('pt-BR');
    el('issue-result').hidden=false;
    el('manager-phone').value='';
  }catch(err){
    const msg=String(err.message||'Não foi possível gerar o código.');
    if(/Sessão da gerente expirada/i.test(msg))showLogin('Sua sessão expirou. Digite a senha novamente.');
    else message('issue-feedback',msg);
  }finally{button.disabled=false;button.textContent='Gerar código';}
});

el('copy-button').addEventListener('click',async()=>{
  if(!issuedCode)return;
  try{
    if(!navigator.clipboard?.writeText)throw Error('clipboard indisponível');
    await navigator.clipboard.writeText(issuedCode);
    message('issue-feedback','Código copiado.');
  }catch{message('issue-feedback','Copie o código grande acima para informar ao cliente.');}
});

el('logout-button').addEventListener('click',()=>{
  const token=managerSession;
  showLogin('Você saiu da área da gerente.');
  if(token)L.api('managerLogout',{managerSession:token}).catch(()=>{});
});
})();
