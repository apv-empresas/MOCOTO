/* Avaliação interna: cálculo determinístico, sem IA e sem filtragem de avaliações públicas.
   Cada nota 1–5 se converte para 20–100: nota / 5 * 100.
   A nota da categoria representa 70%; detalhes respondidos, juntos, 30%.
   Comida 40%, atendimento 35%, ambiente 25%.
   Temperatura, cordialidade ou limpeza <=2 continuam ativando alerta e teto de 69.
   A classificação de satisfação exige >=4 estrelas em todas as três categorias principais.
*/
(function(root){
  'use strict';
  const groups={food:['taste','temperature'],service:['courtesy','speed'],ambience:['cleanliness','comfort']};
  const num=v=>{const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=5?n:0};
  const points=n=>n*20;
  function calculate(ratings, details={}, config={}){
    const w=config.weights||{food:40,service:35,ambience:25};
    const rawWeights=['food','service','ambience'].map(k=>Math.max(0,Number(w[k])||0));
    const sumWeights=rawWeights.reduce((a,b)=>a+b,0);
    if(sumWeights<=0)throw Error('Pesos inválidos');
    const detailedShare=Math.max(0,Math.min(1,Number(config.detailShare??0.3)));
    const output={};
    let score=0;
    ['food','service','ambience'].forEach((k,i)=>{
      const n=num(ratings[k]);if(!n)throw Error('Preencha comida, atendimento e ambiente.');
      const valid=groups[k].map(name=>num(details[name])).filter(Boolean);
      const dimension=valid.length?((1-detailedShare)*points(n)+detailedShare*(valid.reduce((acc,v)=>acc+points(v),0)/valid.length)):points(n);
      output[k]=Math.round(dimension*100)/100;
      score+=dimension*rawWeights[i]/sumWeights;
    });
    const criticalKeys=config.criticalKeys||['temperature','courtesy','cleanliness'];
    const critical=criticalKeys.filter(k=>num(details[k])>0&&num(details[k])<=Number(config.criticalRating??2));
    const cap=Math.min(100,Math.max(0,Number(config.criticalCap??69)));
    const raw=Math.round(score*100)/100;
    score=Math.round(Math.max(0,Math.min(100,critical.length?Math.min(raw,cap):raw))*100)/100;
    const threshold=Number(config.threshold??80);
    const minStars=Number(config.minCategoryStars??4);
    const passes=['food','service','ambience'].every(k=>num(ratings[k])>=minStars);
    return {score,raw,dimensions:output,critical,passes,needsAttention:!passes||critical.length>0,threshold,weights:{food:rawWeights[0],service:rawWeights[1],ambience:rawWeights[2]},detailShare:detailedShare};
  }
  root.MOCOTO_SCORE={calculate,groups};
})(typeof window!=='undefined'?window:globalThis);
