import fs from 'node:fs';
const read = file => JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url)));
const source=read('public/data/operations-source.json'), profile=read('profiles/charlottendal-network.json');
const notes={
  '0002':['partial','Layoutens detektorer återrapporteras över LocoNet. Återstående virtuella sensorregler är bevarade som källa.'],
  '0003':['pending','Medgivandedvärgarnas särskilda beroenden återstår.'],
  '0004':['pending','Stopplyktornas särskilda beroenden återstår.'],
  '0005':['pending','Vändskivans 11 källfall är importerade; manöver och positionsåterrapport återstår.'],
  '0006':['partial','Panelutseende och val av huvud-/växeltågväg finns. Lokal/fjärr och rangeröverlämning återstår; externa skript saknas.'],
  '0007':['partial','20 knappregler använder lokala fria spårledningar, NX-/resurslås och skyddande signaler. 15 regler spärras av ofullständiga växelkopplingar eller saknad rangeråterrapport. De två automatiska Vx95/Vx96-reglerna återstår.'],
  '0008':['pending','Synkronisering med godsställverk återstår.'],
  '0009':['pending','Särskilda Sh2-regler är importerade; full svensk beskedsmappning återstår.'],
  '0010':['pending','Särskilda Sh3-regler är importerade; full svensk beskedsmappning återstår.'],
  '0011':['pending','Utfartssignalernas särskilda villkor återstår.'],
  '0012':['pending','V1–V4:s indikeringar återstår; fysiska bomkommandon är inte fastställda.'],
  '0013':['partial','192 granskade huvudtågvägar och spärrade knappkombinationer. 18 dolda par undantagna; 3 motsägande regler spärrade. Knappminnet ersätts av panelens start/slutval.'],
  '0014':['partial','Manöverfel visas med orsak och journal. Den äldre Fel-sensorn körs inte.'],
  '0015':['external','MQTT-proxyobjekt bevarade. Broker, ämnen och anslutningsuppgifter saknas.'],
  '0016':['pending','Nödåtertagningens särskilda källbeteende återstår; vanlig återtagning kan aldrig tvångsradera lås.'],
  '0017':['replaced','AIS begär stopp i alla 66 signaler, sparas beständigt och behåller lås. Nya stoppåterrapporter krävs före återställning. Fysiska beskedskoder ej verifierade.'],
  '0018':['pending','137 nödutlösningsregler bevarade. Ingen ospecificerad tvångsfrigivning aktiveras.'],
  '0019':['partial','60 växeltågvägar med synliga knappar har etablerings- och passagetest. Dolda och motsägande källfall redovisas separat.'],
  '0020':['partial','Återtagning och ordnad passage ersätter frigivningen för anslutna vägar; lås släpps först efter stoppåterrapport.'],
  '0021':['disabled','Avstängd i original-XML. Har inte aktiverats.'],
  '0022':['external','MQTT-orderobjekt bevarade. Ingen brokeranslutning är aktiverad.'],
  '0023':['partial','Beständiga administrativa spårspärrar skiljs från verklig beläggning. Särskilda linje-/knappspärrar genom saknade skript återstår.'],
  '0024':['pending','Återställning av knappval finns. Saknade externa skript får inte användas för att radera driftlås.'],
  '0025':['pending','Programmeringsspårets omkoppling och bekräftelse återstår.'],
  'initializer':['replaced','Alla fälttillstånd startar okända och signaler begärs i stopp. Källans initieringskommandon behandlas inte som fysiska återrapporter.']
};
const groups=source.groups.map(group=>{const [status,behavior]=notes[group.id.startsWith('IX:AUTO:')?group.id.slice(-4):'initializer'];return {id:group.id,name:group.name,enabled:group.enabled,status,behavior,rules:group.rules};});
const byRule={};
for(const group of groups) for(const id of group.rules) byRule[id]={group:group.id,status:group.status,behavior:group.behavior};
for(const rule of profile.manualPolicies?.rules||[]) byRule[rule.rule]={...byRule[rule.rule],status:rule.status==='ready'?'tested':'unresolved',behavior:rule.status==='ready'?'Direktmanöver prövas mot lokala fria spårledningar, administrativa spärrar, berörda tågvägslås och stopp i skyddande signaler.':rule.reason,button:rule.button,turnouts:rule.names};
for(const id of ['IX:AUTO:0007C33','IX:AUTO:0007C34']) byRule[id]={...byRule[id],status:'pending',behavior:'Automatisk följdmanöver mellan Vx95 och Vx96 är ännu inte införd; den behandlas inte som en fast växelkoppling.'};
for(const rule of [...source.mainRoutePolicies,...source.shuntRoutePolicies]) {
  const routes=profile.routes.filter(r=>r.source.rules.includes(rule.rule));
  const excluded=profile.excluded.find(r=>r.rules?.includes(rule.rule));
  byRule[rule.rule]={...byRule[rule.rule],status:routes.length?'tested':rule.status==='denied'?'denied':rule.status==='unresolved'?'unresolved':'excluded',behavior:routes.length?'Tågvägens etablering och ordnade passage är provade i den separata anläggningsmodellen.':excluded?.reason || rule.problems.join(' ') || 'Knappkombinationen avvisas enligt källregeln.',routes:routes.map(r=>r.id)};
}
if(Object.keys(byRule).length!==source.rules.length)throw Error('Every source rule must have a migration status');
const content=JSON.stringify({sourceHash:source.sourceHash,groups,byRule,limitations:['Fysisk MGP/LocoBuffer ej verifierad.','12 externa Jython-skript saknas.','Spårvis delutlösning återstår; hela vägen låses genom passagen.','TrainMeet är ännu inte anslutet.']},null,2)+'\n';
const target=new URL('../public/data/migration.json',import.meta.url);
if(process.argv.includes('--check')) {if(fs.readFileSync(target,'utf8')!==content)throw Error('Migration matrix is stale');}
else fs.writeFileSync(target,content);
console.log(`${groups.length} groups and ${Object.keys(byRule).length} rules have explicit migration status.`);
