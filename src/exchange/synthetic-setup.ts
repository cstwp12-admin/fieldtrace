// Invented example only. Never replace this with a live project's setup.
export const syntheticSetup={
  kind:'siteboard-training-setup',version:1,projectCode:'TRAINING-01',projectTitle:'Shared setup demonstration',contractNo:'SYNTHETIC-CONTRACT',demonstration:true,
  chFrom:10000,chTo:13000,
  cats:[{id:'BR',en:'Training structures',bm:'Struktur contoh'},{id:'DR',en:'Training drainage',bm:'Saliran contoh'}],
  zones:[{name:'North',from:10000,to:11500},{name:'South',from:11500,to:13000}],
  sections:{QA:{list:[{name:'QA-1',from:10000,to:11500},{name:'QA-2',from:11500,to:13000}],struct:'QA structures'}},
  centreline:[[112,4,10000],[112.008,4.008,11000],[112.014,4.014,12000],[112.02,4.02,13000]],
  structures:[{id:'B-EXAMPLE',grp:'Bridge',name:'Training bridge',ch:11200},{id:'C-EXAMPLE',grp:'Culvert',name:'Training culvert',ch:12400,side:'RHS'}],
  activities:[{id:'ACT-EXAMPLE-1',cat:'BR',en:'Training reinforcement inspection',bm:'Pemeriksaan contoh',bq:'TRAINING ONLY'},{id:'ACT-EXAMPLE-2',cat:'DR',en:'Training drain inspection',bm:'Pemeriksaan saliran contoh',bq:'TRAINING ONLY'}],teams:['QA']
};
