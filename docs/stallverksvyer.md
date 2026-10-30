# Två ställverksvyer

Från 0.86.0 finns **Inställningar → Utseende och ljud → Redigera → Ställverkets utseende**.
Välj Originalpanel eller 85-inspirerad skärmvy och tryck Spara. Originalpanelen är standard.
Valet gäller webbläsaren och stationen; Charlottendal och Träkvista har separata val.
Byte mellan olika datorer påverkar inte deras utseende. Flikar i samma webbläsare följer samma sparade val.

Originalpanelen behåller sina bilder. Skärmvyn har grå spårplansyta, trianglar för huvudsignaler,
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
- Stoppsignal som enligt serverns tågvägstabell skyddar en låst väg markeras röd.
- Pågående återtagning markeras magenta efter stoppåterrapport. Kör fortsätter visas om stopp ännu inte rapporterats.
- Vit symbol med frågetecken betyder okänt eller otillräckligt detaljerat besked. Vid bruten kontakt,
  lagringsfel, saknad bindning eller rapport från föregående anslutning visas inget bekräftat körbesked.
- Den befintliga tvålägesrapporten skiljer inte dvärgens olika tillåtande besked eller kombinationssignalens
  två delar. Dessa tillåtande symboler markeras därför med frågetecken; texten anger att kör är återrapporterat
  men exakt dvärgbesked saknas. En växeltågväg används aldrig som bevis för ett sådant delbesked.
- Grönt band visar tågväg, gult växlingsväg. Förberedelse/kvarhållet lås skiljs med streckning;
  magenta visar återtagning. Belagda avsnitt är röda och skrivs inte över av en tågvägsmarkering.

Riktningsrotationen följer samma importerade bildrotation som originalpanelen. Ingen ny bindning mellan
signal och tågväg införs och närmaste symbol används aldrig som manövermål. Fysisk riktning och
detaljerade besked måste fortfarande verifieras på respektive station. Fortsatt modellinventering i #115
behövs inför en mer exakt förebildstrogen visning; den krävs inte för detta val av presentation.

## Kod och prov

`panel-style.js` hanterar val och stationsbunden lagring. `panel-symbols.js` hanterar symboler och rapportkvalitet.
`panel-style.css` ändrar bara spårplanens presentation; inställningar och den nedre driftpanelen behåller sitt tema.
Båda symboluppsättningarna är monterade samtidigt; CSS väljer vilken som visas.
`panel-style.test.mjs` provar bland annat stationsisolering, lagringsfel, avbrutet oskickat val,
återrapport före order, kontaktbortfall och ofullständiga dvärgbesked.
