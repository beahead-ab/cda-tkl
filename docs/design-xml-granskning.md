# Genomgång mot Claude Design och Cda60.xml

**Historisk jämförelse från 22 september.** Sedan dess har appen utökats till 340 provade tågvägar, versionshanterade visningsinställningar, manuell tåginformation och signalregister. Aktuell funktion och begränsningar finns i [arbetsjournalen](arbetsjournal.md), [provresultaten](provresultat.md) och [signalregistret](signalregister.md). Tabellen nedan beskriver läget vid den ursprungliga granskningen.

Genomförd 22 september 2026. Jämförelsen utgår från den öppna Claude-designens Reläpanel, chatthistorik och Admin Charlottendal samt projektets exporterade HTML/data. Källan är Cda60.xml från den ursprungliga leveransen; kopiorna i referensmappen, JMRI-importen och Claude-exporten har identisk SHA-256.

## Resultat

Appen har nu hela XML-filen i en oförändrad originalkopia och ett komplett strukturerat källregister. Alla 18 huvudavsnitt, 30 432 noder i dokumentträdet och 96 142 attribut har jämförts fält för fält. Elementordning, text och mellanliggande text bevaras. XML-deklaration, den yttre stylesheet-instruktionen, namnrymder och ursprungliga radslut finns i den byteidentiska originalfilen.

- Filstorlek: 2 687 587 byte.
- SHA-256: `c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87`.
- Öppna **Anläggningsregister**; välj kategori eller sök i hela filen. Varje post har alla attribut/underobjekt och en XML-visning. Inställningar och historik ger även tillgång till hela dokumentträdet.
- **Hämta original-XML** ger den oförändrade filen. Panelens kompakta beskärning tar inte bort något ur källregistret.

## Luckor som rättats

| Före granskningen | Nu |
|---|---|
| Fem synliga registertyper; högst 200 visade sökträffar | 25 kategorier, alla träffar med sidindelning; gemensam adressvy |
| Conditionals hade `data: null` i åtgärderna och saknade option/delay/string samt delar av variablerna | Originalets samtliga attribut bevarade; även den äldre admin-sammanfattningen har reparerats |
| 174 minnen, 25 Logix-grupper och 56 signalmastlogiker saknades i appregistret | Alla inkluderade, med 117 destinationer som egna sökbara signalrelationer |
| 153 start-/målpar och 198 layoutblock fanns i gamla datafiler men gick inte att granska i appen | Egna kategorier, inklusive identiteter, NX-typer och källparametrar |
| Vändskivans sammanfattning saknade växeladresser/lägen | Alla 11 anslutningar med turnout och turnoutstate finns i källregistret |
| Den andra panelen, managerinställningar, ljud, klocka och filhistorik ingick inte i appen | Hela innehållet finns med |
| 16 texter hade filtrerats bort ur den kompakta panelkopian | Alla 522 XML-texter finns sökbara med positioner och synlighetsinställningar |
| Detaljer för ej inkopplade signaler/växlar visade bara en allmän text | Länk direkt till det fullständiga källobjektet; signalernas deklarerade besked visas i inspektören |
| Kompakt verktygsläge saknades; minsta SVG-höjd kunde ge tom yta | Dölj/Visa verktyg, proportionell panelhöjd och befintlig zoom |
| Reläpanelens aktiva tågväg färgade även spårlinjen | Etablerad/klar väg visas med varmvita lampor; fel, beläggning och kvarvarande lås behåller egen indikering |

## Inventering

| Källobjekt | Antal |
|---|---:|
| Signaler | 66 |
| Layoutväxlar | 49 |
| Växelobjekt, båda källgrupperna | 727 |
| Sensorer | 604 |
| Block / layoutblock | 404 / 198 |
| Minnen | 174 |
| Signalmastlogiker / signalrelationer | 56 / 117 |
| Logix-grupper / conditionals | 25 / 1 377 |
| Start-/målpar | 153 |
| Spårsegment / anslutningspunkter | 274 / 220 |
| Korsningar / vändskivor | 3 / 1 |
| Texter | 522 |
| Sensorikoner / signalikoner | 268 / 66 |
| Blockinnehållsikoner / minnesikoner / lokmarkörer | 44 / 7 / 2 |
| Andra panelens objekt | 62 (21 växelikoner + 41 etiketter) |
| Ljudobjekt | 3 |

Registerposter överlappar avsiktligt när en underpost också exponeras separat. Antalet registerrader är därför inte antalet unika XML-noder. LT och L2T slås inte ihop; inga fysiska bussadresser gissas. Länkarna mellan poster bygger på exakta källnamn/referenser och kan inkludera flera förekomster av samma namn.

## Kvarvarande skillnader mot prototypen

| Funktion i designen | Status i den riktiga appen |
|---|---|
| Tre skins, kompakthet, små mod59-ikoner, stora träffytor | Finns. Efter direkt samarbete med Claude används samma beskärning och knappplacering, permanenta signalbildlager och återförda relälampor. Fortfarande inte en pixelidentisk kopia; se [portningsgranskningen](claude-portning.md) |
| Val av start/slut, återtagning, växellås, ordnad tändning och klarsättning | Finns för de fyra konfigurerade provtågvägarna; servern inväntar telegramrapporter |
| Fri vägsökning och omledning runt andra tågvägar över hela banan | Inte aktiverat i driftskärnan. De 153 källparen är importerade definitioner, inte 153 verifierade körbara vägar |
| Simulerade tåg från valfri infart | Den separata anläggningssimulatorn har fyra definierade provrörelser |
| Alla conditionals och signalmastregler | Fullständigt importerade, inte automatiskt exekverade eller översatta till ny förreglingslogik |
| Fullständiga svenska signalbesked och MGP-mappning | Källbeskeden finns; den fysiska/protokollmässiga mappningen återstår. hsi_4, hdvsi_8 och sly_2 hade redan osäker mappning i Claude |
| Hjälpindikeringar, andra panelen, klocka och ljud | Källkonfigurationen är med; deras driftfunktioner är inte aktiverade |
| Adminlager för namn, buss, feedback och strykningar | Appen har beständiga anteckningar och export. Strukturerad konfigurationsredigering/aktivering är ännu inte implementerad |
| Avvikelsevy i Claude | Dess härledda bedömningar är inte övertagna som verifierade fel. Originalets saknade/tomma fält och referenser kan granskas direkt |
| TrainMeet / fysisk LocoBuffer | Inte anslutet i denna version |

## Kontroller

- 27 enhetstester och 3 processbaserade helhetstester godkända lokalt efter portningsgranskningen.
- Fältvis kontroll av hela XML-trädet, originalets kontrollsumma, alla kategoriantal och upprepningsbar import.
- Specifik regression: `IX:AUTO:0002C1` har åtgärdsvärdena `2, 4, 4, 2`, med option, delay och string bevarade.
- Beständiga gamla anteckningsnycklar bevarade för 3 425 tidigare registerposter.
- Webbgranskning av sökning, regelns alla fält, anteckningssparning, XML-visning, kompakt panel och tågväg/växellås. Provet körs i separat lokal anläggning utan att ändra serverns driftdata.
- Källfiler omfattas av samma autentisering som panelen. Testerna kontrollerar både lösenordsläget och den alternativa Cloudflare-konfigurationen.

## Underhåll

`npm run import:xml` återskapar registret. `npm run verify:xml` jämför med originalet; `npm test` kontrollerar även att genererade filer är aktuella. Python 3 behövs vid import/test, inte i webbgränssnittet. Ny XML-version behöver granskas som en avsiktlig migration, särskilt om befintliga anteckningar eller tågvägslås berörs.
