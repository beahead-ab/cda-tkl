import fs from 'node:fs';
const read = file => JSON.parse(fs.readFileSync(new URL('../'+file,import.meta.url)));
const source=read('public/data/operations-source.json'), profile=read('profiles/charlottendal-network.json');
const notes={
  '0002':['partial','Layoutens detektorer återrapporteras över LocoNet. Återstående virtuella sensorregler är bevarade som källa.'],
  '0003':['pending','Medgivandedvärgarnas särskilda beroenden återstår.'],
  '0004':['pending','Stopplyktornas särskilda beroenden återstår.'],
  '0005':['pending','Vändskivans 11 källfall är importerade; manöver och positionsåterrapport återstår.'],
  '0006':['partial','Panelutseende och huvud-/växeltågvägsläge finns. Beständigt lokal-/fjärrläge ersätter panelens manöverspärr; lägesbyte kräver frigivna lås och aktuella stoppbesked. Rangeröverlämning och externa panelindikeringar återstår.'],
  '0007':['partial','20 knappregler använder lokala fria spårledningar, NX-/resurslås och skyddande signaler. 15 regler spärras av ofullständiga växelkopplingar eller saknad rangeråterrapport. De två automatiska Vx95/Vx96-reglerna återstår.'],
  '0008':['pending','Synkronisering med godsställverk återstår.'],
  '0009':['pending','Särskilda Sh2-regler är importerade; full svensk beskedsmappning återstår.'],
  '0010':['pending','Särskilda Sh3-regler är importerade; full svensk beskedsmappning återstår.'],
  '0011':['pending','Utfartssignalernas särskilda villkor återstår.'],
  '0012':['pending','V1–V4:s indikeringar återstår; fysiska bomkommandon är inte fastställda.'],
  '0013':['partial','210 granskade huvudtågvägar och spärrade knappkombinationer. Spår6/IS266 har en källanknuten katalogknapp för de18 tidigare oanslutna paren; 3 motsägande regler spärrade. Knappminnet ersätts av panelens start/slutval.'],
  '0014':['partial','Manöverfel visas med orsak och journal. Den äldre Fel-sensorn körs inte.'],
  '0015':['external','MQTT-proxyobjekt bevarade. Broker, ämnen och anslutningsuppgifter saknas.'],
  '0016':['partial','Nödåtertagning begär stopp och återtagning av alla befintliga vägar. AIS kvarstår till manuell återställning. Källans minne Tågmöte saknar ännu driftfunktion.'],
  '0017':['replaced','AIS begär stopp i alla 66 signaler, sparas beständigt och behåller lås. Nya stoppåterrapporter krävs före återställning. Fysiska beskedskoder ej verifierade.'],
  '0018':['partial','För anslutna vägar ersätts NX-växlingen av uttrycklig återtagning: fria och kända resurser samt nya stoppbesked krävs före frigivning. Belagda, okända och återställda lås tvångsraderas aldrig. Oanslutna NX-fall kvarstår som källunderlag.'],
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
for(const id of ['IX:AUTO:0006C15','IX:AUTO:0006C16']) byRule[id]={...byRule[id],status:'replaced',behavior:'Serverlagrat lokal-/fjärrläge spärrar nya lokala manövrer. Lägesbyte kräver inga kvarvarande lås, bekräftat stopp och kända växellägen. Fjärrsystem är inte anslutet.'};
byRule['IX:AUTO:0016C1']={...byRule['IX:AUTO:0016C1'],status:'replaced',behavior:'Beständig nödåtertagning med antal kvarvarande lås ersätter den korta indikeringspulsen. AIS kvarstår tills operatören återställer.'};
for(const rule of source.rules.filter(r=>r.id.startsWith('IX:AUTO:0018'))) {
  const ids=rule.variables.filter(v=>v.type==='35').map(v=>v.systemName),routes=profile.routes.filter(r=>r.nxIds.some(id=>ids.includes(id)));
  byRule[rule.id]={...byRule[rule.id],status:routes.length?'replaced':'excluded',behavior:routes.length?'Anslutna reservationer återtas uttryckligen; ingen blind NX-växling eller tvångsradering. Fria resurser och nya stoppbesked krävs.':'NX-fallet är bevarat men inte anslutet till någon körbar väg i profilen.',routes:routes.map(r=>r.id)};
}
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
