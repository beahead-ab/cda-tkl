# Tågspårning

Sedan 0.73.0 räknar TKL ut vilket tåg som står var, ur spåravkänningarna, växellägena och tågvägarna, och visar
det på ställverket. Spårningen är **bara presentation**: låsning, signaler och tågvägar läser den aldrig. Den
provas först i **simulering** (`CHARLOTTENDAL_CONNECTION_MODE=simulator`, som i webbdriften); mot riktig bana är
den avstängd tills den är provad där.

**Publicerad: 0.75.0** (cda-tkl main `45ec00a`, #46; `beahead-ab/cda-tkl-install` main `ba895b6`, 8 oktober). Webbdriften
på Render tar den när Render bygger om main, eller med Uppdatera nu när Deploy Hook är inlagd; datorer som installerats
med installationsraden kör den igen eller väljer Uppdatering. Tågspårningen kom i 0.73.0, simulerade tåg och upplösning
vid ankomst i 0.74.0, automaten och de tre rollerna i 0.75.0. På ställverket ligger *Simulerad trafik* och *Automat*
bland driftknapparna under Drift, listan *Spårade tåg* under Drift → Tågnummer, och simulatorns egen sida nås från
Studio → Driftsättning → *Simulatorn ↗*.

## Vad som syns

- **En skylt vid tågets front** med numret och en pil åt det håll tåget kör, till exempel `421 →`. En skylt med
  streckad gul ram och `?` är osäker: numret är okänt (`?1`, `?2` …) eller spårningen har gissat. Ett klick på
  skylten öppnar rutan där numret anges eller bekräftas, eller där tåget tas bort ur spårningen.
- **Tåg på linjen vid kanterna:** ett tåg på väg in enligt TrainMeet visas vid linjens infartsspår (`← 319` på
  höger sida, `319 →` på vänster) innan det syns på stationen; ett tåg som lämnat visas vid spåret det lämnade på,
  tills grannstationen inte längre har det på linjen, högst fem minuter.
- **Ett tåg som inte syns längre** inne på stationen (spår utan avkänning, eller ett simulerat tåg som tagits bort
  vid målet) står kvar dämpat som "senast sedd vid …" i 30 minuter. Dyker beläggning upp intill blir det samma tåg
  igen, men osäkert.
- **Drift → Tågnummer** har listan *Spårade tåg* med plats, tågväg och var numret kommer ifrån.
- Händelser (filtret Tåg) får en rad när ett tåg kommer in, lämnar, delas, inte syns längre eller bekräftas.

## Hur det räknas (src/train-tracking.mjs)

**Spårgrafen** byggs ur panelens geometri: två spårledningar hänger ihop om ett spår går mellan dem, genom en
växel bara i det läge som leder dit, genom en korsning rakt över. Ett växelläge som inte är känt stänger ingen väg.

**Ett tåg** är ett nummer och de spårledningar det belägger, från svansen till fronten.

1. **Fronten växer** till en angränsande belagd spårledning som inget annat tåg har, genom växlarna som de ligger.
   Är flera möjliga väger en lagd tågväg tyngst; annars blir tåget osäkert.
2. **Broar:** en spårledning utan ingång (bänkadress) och en spårledning på en detektor som tåget redan håller säger
   inget om rörelse. Tåget passerar dem, högst åtta i rad, tills en annan detektor visar var det är. Det är så de
   delade detektorerna löses: LS72 belägger nio block vid vänstra änden av spår 11–13, men tåget tar bara de block
   växlarna 112, 113 och 116 leder till. LS199 (SN1B, S170, S166a) och LS14 (SU4B, SLII) likaså.
3. **Svansen släpps** när en spårledning varit fri längre än 1,5 sekunder (ett kort glapp räknas inte). En brygga
   släpps när inget detekterat block bakom den är belagt. Håller ett annat tåg samma detektor släpps svansen när
   tåget stått i nästa block i fyra sekunder (LS72 vid 3/10 och 4/10).
4. **Bakåt:** går det inte framåt men bakåt, och tåget stått still i tre sekunder, har det vänt.
5. **Ett hål mitt i tåget** är en delning: fronten behåller numret, den kvarstående delen blir ett osäkert tåg med
   samma nummer.
6. **Ny beläggning** som inget tåg förklarar blir ett nytt tåg. Ett block på en detektor som ett tåg redan håller är
   förklarat. Vid en linjekant får tåget numret från TrainMeet (tåg på väg in från grannstationen enligt Orter och
   telefon) eller från det inkommande fältet; ett nummer som operatören skrivit på blocket gäller före båda. Annars
   får tåget ett okänt nummer.
7. **Lämnar** tåget vid en kant visas det på linjen; försvinner det inne på stationen står det kvar som senast sett.

## Prov

- `test/train-tracking.test.mjs`: spårgrafen, ett tåg från Kungsfors med nummer ur TrainMeet längs tågvägen förbi
  LS60:s andra block, LS72 vid spår 11–13, ett tåg som lämnar mot Vagnsta och ett okänt nummer som rättas, glapp
  och senast sett, en brygga utan ingång, operatörens nummer och avstängt läge.
- `test/tracking-integration.mjs`: TKL och simulatorn i egna processer; Au → Spår 1c läggs, simulatorn kör tåget och
  spårningen följer det över LocoNet.
- Svep över alla 340 tågvägar som simulatorn kör dem: spårningen följer tåget utan spöktåg i 330. De tio andra
  börjar eller slutar på spårledningar helt utan avkänning (S164, S164b, S112b, S155b); där syns tåget inte förrän
  ingången är bunden (se [genomgången](genomgang-mgp-2026-10-06.md)).

## Tre roller (0.75.0)

Banan, trafiken och tågklareraren är tre roller som var och en kan vara verklig eller simulerad:

| Roll | I verkligheten | I simulering |
|---|---|---|
| **Banan**: växlar, signaler, spåravkänning och tågen som rullar | MGP-modulerna och riktiga tåg | Simulatorn |
| **Trafiken**: vilka tåg som kommer, när och varifrån | TrainMeet och grannstationerna | Knappen *Simulerad trafik* |
| **Tågklareraren**: lägger tågvägarna | Operatören | Knappen *Automat* |

Simulatorn är banan och syns inte för operatören. Dess egen sida (klicka i block, lägg in fel) nås för felsökning från
Studio → Driftsättning → *Simulatorn ↗*; Inställningar har ingen länk dit längre, och knappen *Starta* för enskilda
färder är borta. Simulerad trafik och Automat ligger bland driftknapparna under Drift och finns bara offline ([live och offline](live-och-offline.md), sedan 0.78.0).
Med båda påslagna kör stationen av sig själv; med bara Simulerad trafik klarerar operatören.

## Automaten (0.75.0)

Automaten (`src/train-automation.mjs`) är tågklarerare. Den lägger tågvägarna med samma begäran och samma förregling
som operatören, aldrig förbi dem. Statusraden visar *Automat · datorn lägger tågvägarna* och senaste åtgärd så länge den
är på, och varje tågväg den lägger står i Händelser.

- **Genomgående tåg:** ett tåg från Kungsfors eller Lekby går mot Vagnsta, ett från Vagnsta växelvis mot Kungsfors och
  Lekby.
- **Infart:** när ett tåg stått två sekunder vid infartssignalen (linjens infartsspår) läggs infarten till ett ledigt spår
  som har en utfart åt rätt håll. Med vänstertrafik österut spår 1, helst 1b vid stationshuset, västerut spår 2, helst
  2b; därefter 1c/1a respektive 2a/2c och sist övriga spår. Spår där tågvägen inte kan lösas upp vid ankomst (spår 6
  och 10) väljs inte.
- **Utfart:** när tåget stått 30 sekunder på spåret läggs utfarten mot tågets linje, helst på linjens normala
  utfartsspår, när blocket vid kanten är fritt.
- **Begäran avböjs** (konflikt, spärr, belagt): nästa alternativ prövas, annars väntar automaten.
- **Lämnar över** och stänger av sig vid allt oväntat: ingen kontakt med banan, AIS, nödåtertagning, fjärrläge eller en
  tågväg som hålls. Operatören kan när som helst lägga och återta tågvägar själv; automaten rör inte ett tåg vars
  tågväg redan ligger.
- Vilket tåg som står var vet automaten ur tågspårningen.

Prov: `test/train-automation.test.mjs` (kärnan, simulatorn, spårningen och automaten i samma klocka: ett tåg in, uppehåll,
ut mot Vagnsta; aldrig spår 6 eller 10; överlämning vid AIS) och `test/tracking-integration.mjs` (med simulerad trafik
och automat som riktiga processer kör stationen ett tåg in och ut). Femton simulerade minuter med trafik från alla tre
linjerna: omkring fjorton tåg in och ut per körning, utan överlämning, spöktåg eller osäkra nummer.

## Simulerad trafik (0.74.0, namnet sedan 0.75.0)

Knappen **Simulerad trafik** (före 0.75.0 *Simulera tåg*) bland driftknapparna under Drift (bara offline) låter simulerade grannstationer släppa
in tåg på linjerna, ungefär ett var 45:e–90:e sekund och högst sex på stationen åt gången.

1. TKL väljer en linje vars infartsspår (det som inte är normal utfart enligt Orter och telefon) är fritt och ger tåget
   ett nummer: Kungsfors 4xx, Vagnsta 3xx, Lekby 2xx.
2. Tåget **anmäls** i linjens inkommande fält, som en grannstation gör, och syns vid kanten.
3. TKL ber simulatorn ställa tåget **på linjen utanför infartssignalen** (`SIM`-kommandot över den lokala förbindelsen
   till simulatorn; en riktig LocoBuffer får aldrig sådana rader). Spårningen ser tåget och tar numret ur fältet.
4. **Operatören lägger tågvägen.** Tåget kör när signalerna visar kör, stannar på målspåret och står kvar där.
   Simulatorn vet inget om TKL:s tågvägar: den läser växlarna och signalerna.
5. **Kärnan löser upp tågvägen vid ankomst** (se nedan). Lägger operatören en tågväg från spåret kör tåget vidare; ut på
   en linje lämnar det anläggningen och visas på linjen.

Det inkommande fältet töms när tåget passerat infartssignalen. Simulatorns knapp *Starta* för en enskild färd finns kvar
och fungerar som förut (det tåget försvinner vid målet).

### Upplösning vid ankomst

Tidigare löstes en tågväg bara upp när alla dess block var fria, så ett tåg som stannade på målspåret höll hela vägen
låst. Sedan 0.74.0 (Caspers beslut 8 oktober) löses tågvägen upp när tåget lämnat alla avsnitt före målspåret och
står helt på det, utan någon av tågvägens växlar under sig, efter tre sekunder. Låsen släpps först efter stoppbesked som
vid all återtagning, och målspåret förblir belagt, så ingen ny tågväg kan läggas in på det. En tågväg från spåret kan
läggas. Det gäller både simulering och riktig bana.

På **spår 6** och **spår 10** delar målspårets detektor med en växel i tågvägen (S144b och Vx144 på LS158, S132b och
Vx132 på LS145, S160c och Vx160 på LS190). Kärnan kan då inte se att tåget lämnat växeln, och tågvägen ligger kvar
tills spåret är fritt eller panelen återställs. Det löses först med en egen detektor för spåret.

Prov: `test/simulated-trains.test.mjs` (kärnan och simulatorn tillsammans: in, uppställning, upplösning, vidare ut;
väntan före upplösningen; spår 6) och `test/tracking-integration.mjs` (knappen via API:t, anmälan, spårningen tar numret,
upplösning vid ankomst). Ett svep över alla 78 infarter från linjerna till spåren: 70 går hela vägen in, löses upp och
ut igen; de åtta andra går till spår 6 och spår 10 enligt ovan.

## Begränsningar

- Spårningen ser bara det detektorerna ser. Två tåg tätt efter varandra på samma detektor, eller ett tåg som rör sig
  på spår utan avkänning, kan inte skiljas åt; då blir det osäkert och operatören bekräftar.
- Spårningen sparas inte: efter en omstart börjar den om.
- API: `POST /api/tracking/name {id, number}` och `POST /api/tracking/remove {id}`; läget står i `state.trainTracking`.
