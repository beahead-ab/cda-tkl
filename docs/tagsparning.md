# Tågspårning

Sedan 0.73.0 räknar TKL ut vilket tåg som står var, ur spåravkänningarna, växellägena och tågvägarna, och visar
det på ställverket. Spårningen är **bara presentation**: låsning, signaler och tågvägar läser den aldrig. Den är på
när **LocoNet inte är ansluten** och TKL själv kör trafikspelets tåg (sedan 0.79.0, [LocoNet ansluten eller ej
ansluten](loconet-anslutning.md); före det i simuleringsläget, som i webbdriften). Med LocoNet ansluten är den
avstängd tills den är provad mot riktig bana.

**Publicerad: 0.81.1** (cda-tkl main `8a404ba`, #67; `beahead-ab/cda-tkl-install` main `ab46183`, 17 oktober). Webbdriften
på Render tar den när Render bygger om main, eller med Uppdatera nu när Deploy Hook är inlagd; datorer som installerats
med installationsraden kör den igen eller väljer Uppdatering. Tågspårningen kom i 0.73.0, simulerade tåg och upplösning
vid ankomst i 0.74.0, automaten och de tre rollerna i 0.75.0 (cda-tkl `45ec00a`, #46). I 0.77.0 rapporterar den egna
återrapporten som MGP-korten, och i 0.79.0 kommer tågen från trafikspelet på TrainMeet-servern (se nedan) och
*Simulerad trafik* är borta. I 0.80.0 kan tidtabellen visa tågen på linjen och tågen som står inne som en linjebild
eller med tecken (se nedan). I 0.81.0 visar eller döljer ett tryck på träffklockan sekunderna, och 0.81.1 visar
inte längre ett gammalt försök under Uppdatering; spårningen är oförändrad sedan 0.79.0. På ställverket ligger
*Automat* bland driftknapparna under Drift, listan *Spårade tåg* under Drift → Tågnummer, och den egna
återrapportens sida nås från Studio → Driftsättning → *Egen återrapport ↗*.

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
- `test/tracking-integration.mjs`: TKL och den egna återrapporten i egna processer; Au → Spår 1c läggs, den kör tåget och
  spårningen följer det över LocoNet.
- Svep över alla 340 tågvägar som den egna återrapporten kör dem (0.73.0): spårningen följer tåget utan spöktåg i 330. De tio andra
  börjar eller slutar på spårledningar helt utan avkänning (S164, S164b, S112b, S155b); där syns tåget inte förrän
  ingången är bunden (se [genomgången](genomgang-mgp-2026-10-06.md)).

## Tre roller (0.75.0)

Banan, trafiken och tågklareraren är tre roller (sedan 0.79.0 utan simuleringsläge):

| Roll | Med LocoNet ansluten | Med LocoNet ej ansluten |
|---|---|---|
| **Banan**: växlar, signaler, spåravkänning och tågen som rullar | MGP-modulerna och riktiga tåg | TKL svarar själv och kör tågen |
| **Trafiken**: vilka tåg som kommer, när och varifrån | Trafikspelet på TrainMeet-servern | Trafikspelet på TrainMeet-servern |
| **Tågklareraren**: lägger tågvägarna | Operatören | Operatören eller knappen *Automat* |

Den egna återrapporten syns inte för operatören. Dess sida (klicka i block, lägg in fel) nås för felsökning från
Studio → Driftsättning → *Egen återrapport ↗*. Automaten ligger bland driftknapparna under Drift och finns bara när
LocoNet inte är ansluten ([LocoNet ansluten eller ej ansluten](loconet-anslutning.md)). Med automaten på kör stationen
trafikspelets tåg av sig själv.

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

Prov: `test/train-automation.test.mjs` (kärnan, den egna återrapporten, spårningen och automaten i samma klocka: ett tåg in, uppehåll,
ut mot Vagnsta; aldrig spår 6 eller 10; överlämning vid AIS) och `test/tracking-integration.mjs` (med trafikspelets tåg
från en TrainMeet-server och automaten som riktiga processer kör stationen tåg 421 in och ut). I 0.75.0 gav femton
simulerade minuter med trafik från alla tre linjerna omkring fjorton tåg in och ut per körning, utan överlämning,
spöktåg eller osäkra nummer.

## Trafikspelets tåg (0.79.0; före det Simulerad trafik)

TKL har ingen egen simulerad trafik längre: trafiken kommer från trafikspelet på TrainMeet-servern. När LocoNet inte är
ansluten ställer TKL ut trafikspelets tåg och kör dem (`src/traffic-trains.mjs`):

1. Ett tåg **på väg hit på linjen** (sträckan belagd mot stationen, med tågnummer) ställs **utanför infartssignalen** på
   linjens infartsspår, det spår som enligt Orter och telefon hör till grannstationen. Spårningen tar numret från
   TrainMeet.
2. Ett tåg **anmält uppställt** (eller förare på plats) på ett spår här ställs **på spåret** (tidtabellens 1a = Spår 1a)
   och får sitt nummer.
3. **Operatören lägger tågvägen** (eller automaten). Tåget kör när signalerna visar kör, stannar på målspåret och står
   kvar där. Den egna återrapporten vet inget om TKL:s tågvägar: den läser växlarna och signalerna.
4. **Kärnan löser upp tågvägen vid ankomst** (se nedan). Lägger operatören en tågväg från spåret kör tåget vidare; ut på
   en linje lämnar det stationen och visas på linjen.

Ett tåg som redan syns ställs inte ut igen, och ett belagt spår väntar. Klarering, avgång och ankomst anmäls i TrainMeet
som vanligt. Före 0.79.0 släppte knappen *Simulerad trafik* in tåg med påhittade nummer (Kungsfors 4xx, Vagnsta 3xx,
Lekby 2xx) och anmälde dem i det inkommande fältet; den är borta.

### Upplösning vid ankomst

Tidigare löstes en tågväg bara upp när alla dess block var fria, så ett tåg som stannade på målspåret höll hela vägen
låst. Sedan 0.74.0 (Caspers beslut 8 oktober) löses tågvägen upp när tåget lämnat alla avsnitt före målspåret och
står helt på det, utan någon av tågvägens växlar under sig, efter tre sekunder. Låsen släpps först efter stoppbesked som
vid all återtagning, och målspåret förblir belagt, så ingen ny tågväg kan läggas in på det. En tågväg från spåret kan
läggas. Det gäller både med och utan LocoNet.

På **spår 6** och **spår 10** delar målspårets detektor med en växel i tågvägen (S144b och Vx144 på LS158, S132b och
Vx132 på LS145, S160c och Vx160 på LS190). Kärnan kan då inte se att tåget lämnat växeln, och tågvägen ligger kvar
tills spåret är fritt eller panelen återställs. Det löses först med en egen detektor för spåret.

Prov: `test/simulated-trains.test.mjs` (kärnan och den egna återrapporten tillsammans: in, uppställning, upplösning, vidare ut;
väntan före upplösningen; spår 6; trafikspelets tåg på linjen och uppställda) och `test/tracking-integration.mjs`
(TrainMeet-servern sänder tåg 421 från Kungsfors, spårningen tar numret, upplösning vid ankomst). Ett svep över alla 78 infarter från linjerna till spåren: 70 går hela vägen in, löses upp och
ut igen; de åtta andra går till spår 6 och spår 10 enligt ovan.

## Tidtabellen och tågen på linjen (0.80.0)

Under Inställningar → Utseende och ljud väljs tidtabellens stil: Ord, Symboler, Linjebild eller Linjebild + symboler
([panel och verktyg](panel-och-verktyg.md)). Linjebilden visar för varje tåg linjen in och linjen ut som det
TrainMeet säger om dem för tågets nummer: begärd (streckad gul), klar (grön), belagd (blå med tåget, ute på linjen)
eller avklarad (mörkgrå), med grannen på samma sida som linjen på panelen. Tåget som står inne (ankommet, uppställt
eller förare på plats enligt TrainMeet) får en gul prick i linjebilden och en ram runt spåret, i alla stilar.

Tidtabellen läser bara TrainMeet, inte tågspårningen. Ett tåg kan alltså vara blått på linjen i tidtabellen och
samtidigt stå som `← 319` vid linjens infartsspår på planen, eftersom båda kommer från samma förbindelseläge; men ramen
runt spåret betyder att tåget är anmält inne i TrainMeet, inte att spårningen har sett det där. Med LocoNet ej
ansluten följer de två varandra, eftersom TKL ställer ut trafikspelets tåg efter samma uppgifter.

Sedan 0.81.0 visar eller döljer ett tryck på träffklockan sekunderna, i tidtabellens rubrik, telefonraden och
miniraden i liggande läge ([panel och verktyg](panel-och-verktyg.md)). Valet gäller webbläsaren; tidtabellen och
spårningen räknar som förut.

## Begränsningar

- Spårningen ser bara det detektorerna ser. Två tåg tätt efter varandra på samma detektor, eller ett tåg som rör sig
  på spår utan avkänning, kan inte skiljas åt; då blir det osäkert och operatören bekräftar.
- Spårningen sparas inte: efter en omstart börjar den om.
- API: `POST /api/tracking/name {id, number}` och `POST /api/tracking/remove {id}`; läget står i `state.trainTracking`.
