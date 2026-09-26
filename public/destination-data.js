export const destinationDefaults=[
  {id:'Cu',name:'Lekby',phone:'72',position:'Vänster · övre spåret mot Lekby'},
  {id:'Cn',name:'Lekby',phone:'72',position:'Vänster · nedre spåret mot Lekby'},
  {id:'Au',name:'Kungsfors',phone:'',position:'Vänster · övre spåret mot Kungsfors'},
  {id:'An',name:'Kungsfors',phone:'',position:'Vänster · nedre spåret mot Kungsfors'},
  {id:'Bu',name:'Vagnsta',phone:'71',position:'Höger · övre spåret mot Vagnsta'},
  {id:'Bn',name:'Vagnsta',phone:'71',position:'Höger · nedre spåret mot Vagnsta'},
  {id:'D',name:'D',phone:'',position:'Höger · separat nedre utfart D'}
];
export function destinationDisplay(entry,trainMeet){
  const station=entry.source==='trainmeet'?trainMeet?.context?.stations?.find(s=>s.id===entry.stationId):null;
  return {...entry,name:station?.name||entry.name,phone:entry.phone,sourceLabel:entry.source==='local'?'Lokalt':station?(trainMeet.stale?'TrainMeet · senaste uppgifter':'TrainMeet'):'TrainMeet saknas · lokalt reservnamn'};
}
