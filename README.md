# Charlottendal TKL · version 0.41.1

En första körbar lokal applikation med egen TKL-kärna och en separat anläggningssimulator. Den använder Charlottendals exporterade geometri och JMRI mod59-signalbilder. Claude Design behövs inte för att köra den.

Webbversionen finns på [cda-tkl.trainmeet.app](https://cda-tkl.trainmeet.app/), med [separat anläggningssimulator](https://cda-tkl.trainmeet.app/anlaggning/). Logga in med lösenord. Vid första inloggningen väljer du ett eget; därefter finns **Byt lösenord** i panelen. Serverversionen har egna driftdata och är oberoende av den lokala installationen.

Privat källkod finns i [beahead-ab/cda-tkl](https://github.com/beahead-ab/cda-tkl). Se [serveruppgifter och aktuell driftstatus](docs/drift.md).

Anläggningsöversikt och diagnostik: [anläggningsöversikt, utvecklingsläge och kommunikationsdiagnostik](docs/anlaggningsoversikt-kommunikation.md).

## Starta och prova

Dubbelklicka **Starta Charlottendal.command** i den här mappen. Låt terminalfönstret vara öppet medan appen körs. Node.js 22 eller senare behövs. Första starten installerar det låsta beroendet `jose`, som verifierar Cloudflare-inloggning vid webbdrift. Lokal körning behöver inget Cloudflare-konto.

- [TKL-panelen](http://127.0.0.1:8910)
- [Den separata anläggningen](http://127.0.0.1:8911)

Om appen redan är igång öppnar du länkarna direkt. Avsluta med Ctrl+C i dess terminal. Tågvägslåsen sparas mellan starter; simulatorns anläggningstillstånd börjar däremot om. Återstående lås måste återtas efter att nya rapporter har kommit.

1. Välj **Spår 2b → Spår 2c** i TKL, eller klicka motsvarande två pluppar. Följ växellägena, tändningen och det rapporterade körbeskedet.
2. Klicka växel **121**. Manöverknapparna är spärrade medan tågvägen låser den.
3. Öppna anläggningen och välj samma färd under **Kör ett tåg**. Detektorerna rapporterar belagt och fritt. TKL visar händelserna och behåller låsen.
4. Klicka **Återta** eller samma start- och slutpluppar igen. Låsen frigörs först när alla frigivningsvillkor är uppfyllda.
5. Prova **Cu → Spår 2b** för tre signaler: 2/7 klarsätts först, därefter 1/5 och sist 1/3. Du kan också välja **Spår 12 → Spår 5b** för en avvikande växel.
6. Prova uteblivet växelsvar, signal som hålls i stopp, tyst detektor eller bruten LocoNet i anläggningsfönstret. Åtgärda felet, återta vägen och lägg den på nytt.

**Original**, **Reläpanel** och **Trafikskärm** delar samma funktioner. Utseendena är kodade tolkningar av designen; den kompletta Claude-exporten finns separat i designarkivet. Zoom underlättar manövrering på mindre skärmar. Ikoner laddas och avkodas före första visningen och bildnoderna ligger kvar vid tillståndsbyte.

## Det som fungerar

- Lågt tidtabellsfält direkt under spårplanen, med flera kolumner, bläddring och fullständiga tåguppgifter vid klick eller högerklick. Utseendet följer valt panelskin.
- Manuell tidtabell med egna tågrörelser, redigerbara utkast och godkännande före användning. Visas i samma panelkolumner som filimport och TrainMeet, utan krav på AI-nyckel.
- Separat [tidtabellsimport från bilder/PDF med OpenAI](docs/tidtabellsimport.md), redigerbart granskningsutkast och uttryckligt källval mellan import och TrainMeet. Kräver API-nyckel på servern; verklig AI-tolkning återstår att verifiera.
- Tågklarering mot grannstationerna genom TrainMeet som TKL-terminal, med samma flöde som en TMBox: trafikpass, begär, godkänn, neka, återta, avgått och mottaget per sträcka samt uppställt, förare på plats, närmar sig och ankommit per tåg. Stationen är i tjänst hos TrainMeet så länge den är parkopplad, utan något trafikpass att starta. Fungerar både över internet och mot en Raspberry Pi på träffens nät, med en sparad parkoppling per server. Klarering är skild från tågvägar och signaler. Parkopplad mot server.trainmeet.app från den lokala installationen; klareringsprov i skarp träff återstår.
- Stream Deck som manöverenhet via WebHID i panelsidan (Chrome, Edge eller Chromium, egen sida i menyn): driftknappar, en avgångs- och en ankomstknapp per sträcka som går igenom TMBox-stegen med kort och långt tryck, och alla pluppar över flera sidor med tågvägsfärg. Layouten redigeras i TKL under Stream Deck → Layout, sparas med utkast och aktivering och kan exporteras till Pi:n.
- Lokal kärna som ensam avgör tågvägar, lås, växelorder och signalmedgivanden.
- 210 huvudtågvägar och 130 växeltågvägar, 49 växlar, 197 körbara layoutblock och 66 signaler. Spår 6 väljs i tågvägslistan; källan saknar en panelikon för dess huvudtågvägsknapp.
- Reserverade block och korsningar; kopplade växlar kan delas i samma läge. Manuell omläggning av låsta växlar vägras. Profilerna innehåller ännu inga godkända automatiska alternativa tågvägar.
- Okända eller gamla återrapporter behandlas som okända. Eko och transportkvittens räknas aldrig som bekräftat växelläge eller signalbesked.
- Körbegäran i omvänd signalordning efter bekräftade växellägen. Kör visas först efter signalrapport. Oväntat kör från en motriktad signal stoppar den berörda provtågvägen.
- Lokala villkor för 20 manuella växelknappar, AIS, nödåtertagning och beständiga spårspärrar. Lokal-/fjärrläge finns; fjärrsystem är ännu inte anslutet.
- Sju beständiga linjespärrar och programmeringsspår med lås över avbrott/omstart, separat relä- och sensorrapport samt felprov i simulatorn. [Handhavande och fysisk begränsning](docs/linjer-programmering-klocka.md).
- Gemensam modellklocka med trafikdygn, hastighet och paus/start; valbar kort felsignal och synlig felindikering.
- Serverlagrade visningsinställningar med utkast, jämförelse och versionshistorik. Manuell tåginformation för alla 197 block samt sju inkommande fält; ändrad beläggning och omstart kräver kontroll.
- Beständiga lås och händelsejournal. Omstart eller återanslutning återupptar aldrig körmedgivanden automatiskt.
- Komplett sökbart XML-register med 25 kategorier, bland annat 66 signaler, 727 växelobjekt, 604 sensorer, 404 block, 174 minnen, 1 377 conditionals, signalmastlogik och 153 start-/målpar. Samtliga fält och referenser kan granskas, med paginering och nedladdning av oförändrad originalfil. Anteckningar sparas separat och kan exporteras.
- Signalöversikt med alla 329 källbindningar, 117 relationer och exakt verifierade referensbilder. Fysiskt rapporterat läge visas separat från källans bild.
- Beräknade panelindikeringar V1–V4 med klickbart underlag. Saknade villkor visas som okända; ingen fysisk bomstyrning eller bomkvittens.
- Inspelning och nedladdning av telegram i båda riktningarna, med separat markering av order, eko, transportkvittens och återrapport. Se [telegraminspelning](docs/telegraminspelning.md).
- Oberoende simulator som skickar bytekorrekta meddelanden genom LocoNet-over-TCP och tar emot order samma väg.

Spårbeteckningarna i gränssnittet följer **den tryckta spårplanen**. Exempelvis heter knappen vid tryckt **2c** internt `htvSpIIA`. Dessa två beteckningar får inte blandas ihop.

Aktuell [lägesbild med vad som fungerar och vad som återstår](docs/status.md) sammanfattar hela projektet.

## Det som återstår före fysisk användning

Detta är en utvecklingsprofil för modelljärnvägen. Simulatorn är en uttrycklig provmodell av delar av MGP-beteendet; den är ännu inte verifierad mot din utrustning eller en inspelad trafiklogg.

- Identifiera LocoBuffer-modell, serialinställningar och MGP-moduler/firmware. Den här leveransen använder en simulerad TCP-buffert; den innehåller ännu ingen USB/seriell hårdvaruanslutning.
- Ersätt provadresserna för detektorer (från 3001) och signaler (från 1501) med uppmätta bindningar. Växeladresserna kommer från LT-objekten i JMRI, inklusive inverteringen av Vx131. Elektriskt beteende och återrapport måste ändå kontrolleras.
- Verifiera svenska Signal10-besked. Kod 0, 8 och 18 kommer från ett dokumenterat CZ-exempel och används endast som preliminär stopp/kör-mappning. Gränssnittet återger inte ännu fullständiga svenska huvud- och försignalbesked eller skillnaden mellan 8 och 18.
- Fastställ alla signalriktningar, tågvägsregler, flankskydd, skyddsavstånd, tidsvillkor, automatisk upplåsning och lokala växlingsregler. De importerade 1 377 JMRI-conditionals finns i appens register med samtliga variabler, åtgärdsvärden, tidsparametrar och införandestatus per regel. Utvalda huvud-/växeltågvägsregler och manuella villkor har översatts till kärnan; den kör inte JMRI eller de saknade externa Jython-skripten.
- Granska de 15 undantagna växeltågvägarna, rangerområdets överlämning och återstående funktioner. Okonfigurerade eller motsägande fall manövreras inte.
- Prova klareringsflödet i skarp träff mot server.trainmeet.app (1.16.5) och parkoppla webbdriften med serverns anslutningskod. Trafikpass, klarering och tågrörelser via TKL-kontraktet är byggda; linjen klar återstår. TMBox v2 över MQTT är inte nåbart utifrån.

Vid avbrott kan kärnan begära stopp endast när förbindelsen fungerar. Den kan inte garantera ett fysiskt stoppbesked över en bruten förbindelse. Provmodellens återrapport av växelläge är heller inte en verifiering av mekaniska ändlägen.

## För utveckling

```sh
npm ci --ignore-scripts    # installera låsta beroenden första gången
npm start                 # startar TKL och simulator som två processer
npm run backend           # endast TKL
npm run simulator         # endast anläggningen
npm test                  # protokoll-, kärn- och inloggningstester
npm run test:integration  # helhetstest med separata processer och tillfälliga portar
npm run check             # syntaxkontroll
npm run verify:xml        # jämför varje källfält med original-XML
npm run import:xml        # återskapa källregistret (Python 3 behövs)
```

Allt lyssnar på datorns loopback-adress. Portar: 8910 TKL, 8911 simulatorns egen manöverpanel, 8912 LocoNet-over-TCP. Ingen molntjänst eller databasinstallation krävs. Lagring finns i `var/`: `routes.json`, `controls.json`, `configuration.json`, `train-information.json`, `notes.json` och roterande `events.ndjson`. Ta kopia av hela mappen för att säkerhetskopiera lokalt arbete; radera inte låsfilen för att kringgå kvarstående lås.

Profilerna ligger i `profiles/`. Byt inte profil medan sparade tågvägslås finns. Standardprofilen är `network`; den genereras av `npm run import:operations` och verifieras av `npm run verify:operations`. Den äldre fyrvägsprofilen finns endast som separat regressionsunderlag (`CHARLOTTENDAL_PROFILE=legacy`).

Se [arkitektur och gränser](docs/arkitektur.md), [provresultat](docs/provresultat.md) och [protokollunderlag](docs/protokollunderlag.md).

Se även [genomgång mot Claude Design och XML](docs/design-xml-granskning.md).

## Underlag och rättigheter

Geometri och register kommer från den exporterade Charlottendal-designen och dess JMRI-underlag. Signalbilderna ligger i `public/assets/mod59`; originalets licenstext och proveniens har bevarats där. Ikonerna omfattas av angivna JMRI/GPL-villkor. Den nya källkoden levereras i denna projektmapp för fortsatt arbete. Runtime-data, lokala anteckningar och hemligheter ska inte läggas i Git.

[Visningsinställningar, utkast och versionshistorik](docs/admin.md).

[Spår 6](docs/spar6.md) · [Manövrer](docs/manoverlage-och-nodatertagning.md) · [Tåginformation](docs/taginformation.md)

[Utökade växeltågvägar och återstående gränsfall](docs/vaxeltagvagar.md)

[Signalbesked och källbilder](docs/signalregister.md) · [Beräknade V1–V4-indikeringar](docs/vagindikeringar.md)

[Seriell LocoBuffer-gateway](docs/locobuffer-gateway.md) · [Läsande TrainMeet-anslutning](docs/trainmeet-adapter.md)

[Driftbindningar, manöverbegränsningar och granskade profilbyten](docs/driftbindningar.md)

Senaste leveransavstämning: [samtliga användningsfall](docs/acceptans-2026-09-23.md), [aktuell status](docs/status.md) och [testresultat](docs/provresultat.md).
