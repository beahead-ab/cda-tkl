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

## Stationsinventering (#115, andra etappen)

`node scripts/panel-view-inventory.mjs` skriver en fellista för varje station i paketet (`trakvista` för en station,
`--json` för maskinläsbar lista). Skriptet läser panelen, driftprofilen, signaländpunkterna och källregistret.
Det ändrar inga filer, skickar inga order och lägger inga nya bindningar. Klassningen av symboler och slutpunkter
görs med samma funktioner som 85-vyn (`panel-symbols.js`, `signal-route-controls.js`).
`test/panel-view-inventory.test.mjs` kör inventeringen för paketets stationer och stoppar vid en signal utan symbol,
fel riktning, en slutpunkt utan entydig mast eller en korsningsväxel som saknar en bunden del.

Resultat på cda-tkl main `9f40de4` (0.86.6), med cda-tkl:s egna stationsfiler:

| | Charlottendal | Träkvista |
|---|---|---|
| Signaler i panelen | 66: 24 huvud, 18 dvärg, 21 kombinerade, 3 stopplyktor | 25: 6 huvud, 9 dvärg, 6 kombinerade, 4 stopplyktor |
| Riktning mot tågvägarna | 61 signaler i 821 passager, inga fel | 21 signaler i 99 passager, inga fel |
| Ingen tågväg att prova riktningen mot | 4/2 och L1 (virtuella), stopplyktorna Xv, IIIdo, IIIev | stopplyktorna S3v, S3ö, S4s, S4v |
| Slutpunkt med röd kontur | 114 av 210 huvudtågvägar, 94 utfarter, 2 mot stopplyktan Xv | 9 av 27, 13 utfarter, 5 mot stopplyktorna S3v och S3ö |
| Exakt dvärg-/kombinationsbesked saknas | 28 signaler med egen återrapport | 15 |
| Virtuella signaler utan egen återrapport | 13 | inga |
| Entydig startmast för huvudtågväg | alla 210 (33 signaler) | alla 27 (9 signaler) |
| Växeltågväg genom signalklick | 101 av 130; 29 börjar vid en ren huvudsignal | 6 av 30; typerna `hdvsi_5` och `ssi_2` saknar klickstöd |
| Växlar | 49 enkelväxlar | 11 enkelväxlar och korsningsväxeln Vx22a/Vx23 med två bundna delar; Vx10–Vx13 manövreras lokalt |

En utfart slutar vid sin egen utfartssignal, som vägen ställer i kör; slutpunkten ligger då utanför stationen och
saknas inte. Riktningen provas mot närmaste del av varje tågväg som signalen begränsar. Det är en kontroll av
underlaget, inte en fysisk verifiering av signalerna.

**Vad inventeringen visar att det behövs:**

1. **Ingen ommodellering för riktningen.** Alla signalbilder som begränsar en tågväg pekar i färdriktningen, i båda
   stationerna. Den fysiska riktningen ska fortfarande verifieras på banan.
2. **Dvärg- och kombinationsbesked** kräver rikare återrapport från signalkorten (beskedskoder per delbesked),
   inte en ny vy: 28 signaler i Charlottendal och 15 i Träkvista. Till dess visas frågetecknet.
3. **Stopplyktor** har ingen 85-symbol och behåller originalbilden. Sju huvudtågvägar slutar vid en stopplykta och
   får därför ingen röd slutpunkt. Symbol och förebild behöver beslutas.
4. **Träkvistas växeltågvägar:** `signal-route-controls.js` känner bara Charlottendals typer. Kombinationstypen
   `hdvsi_5` och stopplyktan `ssi_2` saknas, så 24 av 30 växeltågvägar läggs bara med de synliga manöverplupparna.
   En utökning är en manöverändring och kräver prov på Träkvistas bana.
5. **Träkvistas rättade underlag** i tk-tkl #5 finns ännu inte i cda-tkl. Där har signal 1/2 typen `hsi_3`, som
   saknar 85-symbol. När underlaget tas in måste `hsi_3` läggas till som huvudsignal i `panel-symbols.js` och i
   bildtabellen i `app.js`; både `panel-style.test.mjs` och inventeringsprovet stoppar annars.
6. **Huvudtågvägsstart på triangeln:** startmasten är entydig för alla huvudtågvägar i underlaget, men bindningen
   är inte manuellt verifierad och används inte för manöver.

Kvar i #115 utan ändring här: historiskt exakt MAN900-återgivning (kräver versionsbestämd primärkälla), en separat
schematisk layout med samma objekt-id:n, och snabbväxling av vyn i panelens meny.
