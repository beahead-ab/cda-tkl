# Två ställverksvyer

Från 0.86.0 finns **Inställningar → Utseende och ljud → Redigera → Ställverkets utseende**.
Välj Originalpanel eller 85-inspirerad skärmvy och tryck Spara. Originalpanelen är standard.
Valet gäller webbläsaren och stationen; Charlottendal och Träkvista har separata val.
Byte mellan olika datorer påverkar inte deras utseende. Flikar i samma webbläsare följer samma sparade val.

Originalpanelen behåller sina bilder. Skärmvyn följer färgtemat (svart som standard) och har trianglar för huvudsignaler,
vinklar för dvärgsignaler och båda delarna för kombinerade signaler. Stopplyktor och okända
symboltyper behåller originalbilden. Befintliga manöverpluppar, menyer, tangentbord och behörigheter
gäller i båda vyerna. Telefonens befintliga läsbegränsningar ändras inte.

Vybyte skickar inga order. Planens objekt, klickytor, zoom och fokus monteras inte om.
Ett ännu oskickat start/målval avbryts. Skickade order, tågvägar, lås, AIS, beläggning och driftläge
bevaras på servern. Ingen stationsprofil, adress eller topologi migreras.

## Symbolunderlag och begränsningar

Referens: [Trafikverkets TDOK 2021:0552 v2.0, 29 oktober 2025](https://trvdokument.trafikverket.se/fileHandler.ashx?typ=showdokument&id=3abe000c-4cb8-4f14-9fa1-dcf1fe6f80a9),
huvudsignal/dvärg/kombination s. 84–89, tåg- och växlingsväg s. 67–69.
Detta är en inspirerad visning, inte en historiskt verifierad MAN900-kopia eller en full M85-emulator.

- Normal stoppsignal är grå. Kör i en huvudsignal är grönt först efter återrapport från aktuell anslutning.
- Från 0.86.5 visas vanligt stopp grått även för motriktade signaler och sidoskydd. Skyddslistan i sig ger inte röd färg.
- Röd kontur visar den verkliga slutpunkten för en låst väg eller en egen signal som är låst i vägen utan körbesked. Slutpunkten måste ha en entydig bindning från vägens slutliga NX-sensor till signalmast; saknad eller tvetydig bindning gissas inte.
- Aktiv AIS är en uttrycklig spärr mot körmedgivanden. Efter stoppåterrapport visas huvudsignalens triangel fylld röd, separat dvärgsymbol gul och kombinationssignalens dvärgdel grå. Enbart en skickad STOP-order räknas aldrig som AIS. Kör fortsätter att visas tills stopp rapporteras. Separata individuella signalspärrar och särskilda låsområdesgränser saknar egna rapporterade tillstånd i nuvarande modell och härleds inte ur skyddslistan.
- Pågående återtagning markeras gult efter stoppåterrapport. Kör fortsätter visas om stopp ännu inte rapporterats.
- Vit symbol med frågetecken betyder okänt eller otillräckligt detaljerat besked. Vid bruten kontakt,
  lagringsfel, saknad bindning eller rapport från föregående anslutning visas inget bekräftat körbesked.
- Den befintliga tvålägesrapporten skiljer inte dvärgens olika tillåtande besked eller kombinationssignalens
  två delar. Dessa tillåtande symboler markeras därför med frågetecken; texten anger att kör är återrapporterat
  men exakt dvärgbesked saknas. En växeltågväg används aldrig som bevis för ett sådant delbesked.
- Grönt band visar låst tågväg, även växeltågväg. Förberedelse, kvarhållet lås och återtagning skiljs med streckning.
  Lokalt styrda spår visas blått och trafikspärrade spår lila. Beläggning går före spärr, lokalstyrning och låst väg.
  Hela ställverkets lokala manöverläge färgar inte alla spår blått. Endast uttryckliga lokalspår och utlagda rangergrupper används.

Riktningsrotationen följer samma importerade bildrotation som originalpanelen. Ingen ny bindning mellan
signal och tågväg införs och närmaste symbol används aldrig som manövermål. Fysisk riktning och
detaljerade besked måste fortfarande verifieras på respektive station. Fortsatt modellinventering i #115
behövs inför en mer exakt förebildstrogen visning; den krävs inte för detta val av presentation.

## Kod och prov

`panel-style.js` hanterar val och stationsbunden lagring. `panel-symbols.js` hanterar symboler och rapportkvalitet.
`panel-style.css` hanterar spårplanens presentation; `app-theme.css` delar färgtemat mellan panel, inställningar och Studio.
Båda symboluppsättningarna är monterade samtidigt; CSS väljer vilken som visas.
`panel-style.test.mjs` provar bland annat stationsisolering, lagringsfel, avbrutet oskickat val,
återrapport före order, kontaktbortfall och ofullständiga dvärgbesked.

## Tema och spårfärger (0.86.1)

Inställningar → Utseende och ljud → Redigera har Färgtema: Mörkt eller Ljust. Mörkt är standard.
Valet delas med Studios befintliga temaknapp och följer med mellan öppna flikar. 85-vyn har inga
egna fasta bakgrunds- eller textfärger. Signalerna använder samma färgvariabler som övriga panelen.
