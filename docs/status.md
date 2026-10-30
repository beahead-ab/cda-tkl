# Charlottendal TKL – lägesbild 30 oktober 2026
## Förberett: 0.86.5 – korrekta stoppsymboler i 85-vyn

Vanligt stopp, motriktade signaler och sidoskydd visas grått. Röd kontur kräver exakt bunden slutpunkt eller låst egen signal utan körbesked. AIS har separat symbolvisning efter återrapport. Inga stationsprofiler, förreglingsvillkor eller manöverorder ändras.


## 0.86.4 – ladda aktuella gränssnittsfiler

Efterkontrollen av 0.86.3 visade gamla gränssnittsfiler trots nytt versionsnummer. Startskriptet, utseendedialogen och ställverkets temafiler använder nu versionsmärkta URL:er så uppdateringen laddas direkt.

## 0.86.3 – tänd och släck växelnummer

85-vyn visar inga växelnummer som standard. Inställningar → Utseende och ljud → Växelnummer tänder och släcker numren separat per station, vy och webbläsare. Originalpanelens standard är fortsatt tända nummer. Studio behåller sitt separata lagerval.


## 0.86.2 – svar på klarering efter träffbyte

**Publicerad: 0.86.2 (30 oktober 2026; cda-tkl main `b9bbd89`, #120; samtliga fem CI-kontroller godkända i `41132891318` på `5fd9601`).**

TrainMeets `meet_generation` bevaras från stationskontexten och skickas med klarerings- och rörelsekommandon. Detta löser serverns avvisning ”Träffen eller configen har ändrats” på Godkänn/Neka. Köade kommandon avvisas vid ändrad generation, publikation eller trafikdag. Äldre servrar stöds fortfarande.

Webbdriften är verifierad på 0.86.2 med hälsostatus `running`. Liveprov 22:54: Godkänn för tåg 8785 från Vagnsta och Neka för tåg 312 från Gässlösa bekräftades i händelseloggen. CI: 661 enhetsprov godkända (tre plattformsberoende överhoppade), 19 integrationer, två separata uppdateringsprov, 387 paketenhetsprov samt container-/Windows-kontroller utan fel.


## 0.86.1 – tema och spårfärger

**Publicerad: 0.86.1 (30 oktober 2026; cda-tkl main `99bf795`, #118; alla fem kontroller godkända i CI `41126251719` på `167d558`).**

85-vyn följer svart/ljust tema, gemensamt med Studio. Belagt visas rött, låst tågväg grönt, lokalt styrt blått och trafikspärrat lila. Beläggning har högst färgprioritet. Stationsmodell och driftlogik är oförändrade.


## 0.86.0 – två ställverksvyer

**Publicerad: 0.86.0 (30 oktober 2026; cda-tkl main `92284ef`, #116; alla fem kontroller godkända i CI `41122549455`).**

Inställningar → Utseende och ljud väljer Originalpanel eller 85-inspirerad skärmvy. Valet sparas per webbläsare och station. Samma monterade spårplan, driftstatus och manövrering används. Inga stationsprofiler eller förreglingsregler ändras; ofullständiga dvärgbesked visas uttryckligen som ofullständiga. Se [ställverksvyer](stallverksvyer.md) och #115. Fysisk acceptans återstår.

## 0.85.2 – automatisk omstart efter Pi-installation

**Publicerad: 0.85.2 (28 oktober 2026; cda-tkl main `111948f`, #113; samtliga kontroller godkända i CI `40675022627`).**

En fysisk Raspberry Pi med systemd startar om automatiskt en minut efter godkänd förstagångsinstallation. Startkontrollen måste lyckas först. Befintliga installationer, uppdateringstjänsten, andra datorer och miljöer utan systemd beställer ingen omstart. `CDA_TKL_REBOOT=0` väljer bort omstarten. README och Pi-guiden beskriver SSH-avbrottet och nästa start. Inget ändras på en fysisk Pi eller i Render under detta arbete.


## 0.85.1 – installation från det publika huvudförrådet

README är nu installationsguiden för Raspberry Pi, Mac och Windows, inklusive SSH och byte från tidigare installation. Installerare, uppdaterare och versionskontroll använder `beahead-ab/cda-tkl`. Sparade standardadresser migreras; egna stationsförråd och driftdata bevaras. Den separata publiceringen till cda-tkl-install tas bort. Äldre installationer måste köra den nya installationsraden manuellt en gång. Ingen fysisk installation eller Render-tjänst uppdateras av detta arbete.

## Förberett i PR: 0.85.0 – BTLocoBridge på Windows

Windows kan välja kortets utgående COM-port. Gatewayen kör i Node med låst SerialPort 13.0.0; Pi/Mac använder befintliga hjälpare. Automatiska prov använder syntetiska portar, inklusive fel, fragmenterat eko och återanslutning. Fysisk acceptans återstår enligt [Bennys provguide](benny-windows-bluetooth-prov.md). PR-förberedelsen ändrar ingen main eller körande installation.

## Installationsförråden publicerade som 0.84.0

**Publicerad: 0.84.0 (21 oktober 2026; cda-tkl program `7c2834b`, #101; publiceringsskript i main `eadc0c0`, #102; cda-tkl-install `61bef06`, återställd som `efb1084`; tk-tkl `e2240af`; tagg `v0.84.0`).**

0.84.0 ger Uppdatera nu på Mac och Windows efter att installationen fått sitt eget uppdateringsskript. Versionerna 0.82.14 och 0.83.0 ingår, med Träkvistas Mac-/PC-anvisningar, sparad installationstoken och val av BT LocoBridge.

Installationsförrådet fick 18 ändrade filer, varav tre nya, och inga borttagningar. Publiceringsskriptet rättades först i #102: den nya Bluetooth-hjälparen måste följa med även i detta paket. Paketets båda Python-hjälpare är kontrollerade mot källan. Träkvista hade redan 0.84.0 från `7c2834b`; dess hela träd är exakt lika det nybyggda paketet och behövde ingen ny push.

Programmets CI `39503108001` är grön: 626 godkända enhetsprov av 629 (tre överhoppningar), 19 integrationer, två separata återställningsprov, 353 paketprov, båda containerproven och Windows-parsern. Träkvistas egen CI `39546158939` är också grön. Den avgränsade publiceringsrättelsen verifierades genom verkligt paketbygge, bash-syntax och kontroll av hjälparnas filrätt, innehåll och Python-syntax.

**Render verifierat 21 oktober 2026 kl. 23.56 (Europe/Stockholm, 21.56 UTC):** Codex läste versionen direkt ur `/app/package.json` i båda körande containrarna via Renders Web Shell. Båda svarade `0.84.0`. Render markerade båda driftsättningarna som **Live**, och båda tjänsternas publika `/healthz` svarade `{"status":"running"}`.

| Station | Körande version | Commit | Aktiv Render-deploy |
|---|---|---|---|
| [Charlottendal](https://cda-tkl.trainmeet.app/) | 0.84.0 | `7c2834b` | [`dep-dbc3v8g473hc73a0a060`](https://dashboard.render.com/web/srv-db2m51ei0phs7393n0g0/deploys/dep-dbc3v8g473hc73a0a060) |
| [Träkvista](https://tk-tkl.onrender.com/) | 0.84.0 | `e2240af` | [`dep-dbc48pbncjis73elq7ig`](https://dashboard.render.com/web/srv-dbaj7oajnfac73fu81vg/deploys/dep-dbc48pbncjis73elq7ig) |

Kontrollen var enbart avläsning: ingen omstart, driftsättning eller ändring av inställningar eller driftdata gjordes. Rena dokumentationsändringar använder `[skip render]`. Fysisk Bluetooth-anslutning och en verklig Mac-/Windows-uppdatering återstår att prova.

Kl. 22.14 publicerades cda-tkl-install en gång till med den äldre fillistan ur AGENTS.md (`77618f7`), och
`scripts/bluetooth-port.py` försvann ur paketet. Publiceringsskriptet återställde det som `efb1084`, med samma träd som
taggade `61bef06` (`1cc04f75`). AGENTS.md hänvisar nu till skripten i stället för en egen lista.


## Komplett inbjudningstext, 0.82.13

Användardialogens **Kopiera hela inbjudan** tar med installationens inloggningslänk, stationens namn, e-post,
engångskod, roll, giltighetstid och instruktioner för eget lösenord. Samma dialog används för Ny kod. Texten
visas i ett skrivskyddat fält och markeras för manuell kopiering om webbläsaren spärrar urklipp. Inga koder
läggs i länkar och ingen e-post skickas.

**Publicerad: 0.82.13 (20 oktober 2026; cda-tkl main `8150903`, #98; cda-tkl-install `7bc488f`; tk-tkl `aea08a6`; tagg `v0.82.13`).**

Hela CI `39457531166` är grön: 619 enhetsprov (tre avsiktliga överhoppningar), 19 integrationer, två separata återställningsprov, 346 paketprov, båda containerproven och Windows-parsern. Webbläsarprovet verifierar hela texten i urklipp, Ny kod, manuell kopiering och återgång till 0.82.12.

Träkvista kör Render-deploy `dep-dbbpm8tg1s2s73b5dj50` från `aea08a6`. Faktisk driftkontroll visar 0.82.13, ansluten intern återrapport, noll tågvägslås, ingen lagringsspärr och automaten av. Samma ägarsession fungerar. `auth/users.json`, `state/routes.json` och `.restored` är byteoförändrade mot säkerhetskopian före bytet. Charlottendals webbdrift lämnas på 0.82.11 med `[skip render]`.

## Rättelse av Träkvistas blinkande knappar, 0.82.12

Casper kunde logga in efter kontoåterställningen och rapporterade blinkande spårplan. I faktisk drift växlade
39 knappar mellan låst och olåst markering trots stillastående stationsläge. Träkvista saknar programmeringsspår,
så uttrycket till `classList.toggle` blev `undefined` och växlade klassen i stället för att sätta ett bestämt läge.
Rättelsen tvingar hela låsvillkoret till ett booleskt värde. Containerprovet följer nu knapparnas låsmarkering
över flera återrapporter i den riktiga webbläsarpanelen.

**Publicerad: 0.82.12 (20 oktober 2026; cda-tkl main `5cd6e64`, #96; cda-tkl-install `8760f3e`; tk-tkl `3d0fbf8`; tagg `v0.82.12`).**

Hela CI `39427935970` är grön: 619 enhetsprov (tre avsiktligt överhoppade), 19 integrationer, två separata återställningsprov, 346 paketprov, båda containerproven och Windows-parsern. Träkvistas 56 knappar var stabila över 133 bildrutor i containerprovet. Containerjobben använder nu samma Ubuntu 24.04-bas som förra godkända releasen.

Träkvista kör nu Render-deploy `dep-dbbmpuei0phs738n3io0` med 0.82.12. Efter omladdning var alla 56 knappmarkeringar identiska i 24 täta avläsningar; inget felaktigt låsblinkande fanns kvar. Samma ägarsession, profil/källhash och tre stabila drift-/autentiseringsfiler är bevarade. Inga tågvägslås, ingen lagringsspärr, automaten fortsatt av och TrainMeet ännu inte parkopplad. Färsk privat backup togs före bytet. Charlottendals webbdrift är kvar på 0.82.11 genom `[skip render]`; båda installationsförråden har 0.82.12. Verkliga grannar och fysisk bana återstår.

## 0.82.11 i drift och publicerad

**Publicerad: 0.82.11 (18 oktober 2026; cda-tkl main `24da68c`, #93; cda-tkl-install `4ffd4c8`; tk-tkl `33312ac`; tagg `v0.82.11`).**

Sidfoten visar stationens eget namn. #91 och #92 ingår i #93 och är avslutade. Hela CI-kedjan `39162680842` är grön: 619 godkända enhetsprov, 19 integrationer, två separata återställningsprov, 346 paketprov, båda Docker-/Chromium-proven och Windows-parsern. Träkvistas återgång till 0.82.10 på samma disk är verifierad.

Charlottendal kör Render-deploy `dep-dbaisa942hec73dm7qp0`. Efterkontrollen bekräftar rätt profil/källhash, befintlig ägarsession, samma TrainMeet-parkoppling/publikation/dag/grannar och tio byteoförändrade stabila filer. Det redan hållna tågvägslåset bevarades, och automaten är fortsatt avstängd som före bytet. Inget lagringsfel. Installationspaketen fick fem respektive sju ändrade filer och inga borttagningar; publicerade träd är exakt lika skriptens resultat.

Träkvista är nu live på [tk-tkl.onrender.com](https://tk-tkl.onrender.com), från tk-tkl `33312ac` med deploy `dep-dbaj7oqjnfac73fu8510`. Tjänsten har egen beständig disk 1 GB på `/data` och skapad ägare. Serverkontrollen bekräftar 0.82.11, station `trakvista`, profil `trakvista-network-v1` och hälsokontroll `running`. API:t kräver inloggning och öppen ägarregistrering är spärrad. Första inloggningen med obligatoriskt lösenordsbyte återstår hos Casper. Den inbyggda webbläsaren blockerade inloggningsskriptet; panelen har därför ännu inte accepterats i faktisk drift. Verkliga grannar och fysisk bana återstår. Se [driftprotokollet](render-release-2026-10-18.md).

Även slutrapportens hela CI-kedja `39164669517` är grön. Dokumentationsmergen `4e0c6b0` hoppades över av Render med `[skip render]`; Charlottendal startades inte om av rapporteringen.


## Installationsförråden publicerade som 0.82.10

**Publicerad: 0.82.10 (18 oktober 2026; cda-tkl main `88942ef`, #90; programrelease #89; `beahead-ab/cda-tkl-install` main `e5b89e6`; `beahead-ab/tk-tkl` main `4dac44b`).**

Publiceringen gjordes ur den granskade källcommiten med det rättade installationsskriptet från #91. Installationsförrådet fick 35 ändrade filer och Träkvista 57; inga filer togs bort. `scripts/create-owner.mjs`, `scripts/recover-user.mjs`, `docs/anvandare.md` och `docs/loconet-anslutning.md` finns kvar. [Versionstaggen v0.82.10](https://github.com/beahead-ab/cda-tkl-install/releases/tag/v0.82.10) pekar på installationscommiten.

Stationernas trafik, Träkvistas offlineautomat och lokalt stationsval genom `npm start` finns nu även i installationspaketen. Befintliga native tjänster och Render kör fasta stationer. Träkvistas egen Render-tjänst och prov vid fysisk bana återstår.

## Tidigare driftbyte till 0.82.10

18 oktober: Casper godkände driftbytet. [PR #89](https://github.com/beahead-ab/cda-tkl/pull/89) squash-mergades som main `5560c2a`; Render-deploy `dep-dbaeca0ae00c739lu7u0` är live med 0.82.10. Del-PR #80–88 ingår och är stängda utan egna main-merger. Panel, Studio, Uppdatering, skyddad anläggningsvy, befintlig session och TrainMeet har kontrollerats i faktisk drift. Automaten är åter på som före bytet. [Driftprotokoll och nästa steg](render-release-2026-10-18.md).

Slutlig CI `39139292652`, releasehuvud `1ac7ff4`: 619 godkända enhetsprov, 19/19 integrationer, 2/2 separata återställningsprov, 346 godkända paketenhetsprov, obligatoriska käll-/syntaxkontroller, Windows-parser och Docker-/Chromium-prov. Den sista kontrollen rättade ett intermittent överlämnande i Träkvistas automat efter verifierad passage. Charlottendals profil, sourceHash, stationsunderlag och driftkatalog är bevarade; privat filjämförelse efter uppstart bekräftar 13 oförändrade statiska filer och samma två användare.

En färsk verifierad backup togs i lugnt läge före merge, och föregående fungerande Render-deploy finns kvar för återgång. Vid själva driftbytet var installationsförråden kvar på 0.82.2; de publicerades senare som 0.82.10 enligt avsnittet ovan. TrainMeet Server ändrades inte. Befintliga native tjänster och Render kör fortsatt fasta stationer; lokalt stationsval stöds genom npm start. Träkvistas faktiska Render-tjänst och fysisk bana återstår.

Grunden är körbar med LocoNet ansluten eller ej ansluten; trafiken kommer från trafikspelet på en TrainMeet-server, och TKL har inget simuleringsläge (0.79.0, [LocoNet ansluten eller ej ansluten](loconet-anslutning.md)). Den ersätter ännu inte den fysiska JMRI-installationen fullt ut: LocoNet är provat mot en virtuell LocoBuffer, inte vid banan. Att information finns importerad betyder inte att motsvarande funktion är implementerad eller verifierad mot banan.

## Färdigt i den körbara grunden

- Ren ställverkssida med fullskärm, manöverknappar och en nederrad med klockförankrad tidtabell och händelsekolumn under spårplanen, som skalas till bredden (0.43.0). Planen är harmoniserad med nederradens färger och typografi och har en statusrad över det övre bandet (0.44.0). En [meny](panel-och-verktyg.md) samlar TrainMeet, import, utseende, anslutningar och händelser. Signal- och kompisinformation visas vid behov; aktiva stopp och fel är fortsatt synliga.
- Tidtabellens stil väljs per webbläsare under Utseende och ljud, som i TrainMeet-appen för iPhone: Ord, Symboler, Linjebild eller Linjebild + symboler, med förhandsvisning och teckenförklaring. Spåret står i en ram när tåget står inne, och linjebilden visar klareringen på linjen in och ut med grannarna på sin sida av panelen (0.80.0, [panel och verktyg](panel-och-verktyg.md)).
- Ett tryck på träffklockan visar eller döljer sekunderna, i tidtabellens rubrik, telefonraden och miniraden, som i TrainMeet Server och iPhone-appen; valet gäller webbläsaren (0.81.0, [panel och verktyg](panel-och-verktyg.md)).
- 0.82.2 publicerar ändringarna från #75 och #76 till installationsförrådet. Uppdatering säger vilket förråd Render bygger ur, och en annan station kan köras som ny webbdrift på Render; för Charlottendal är inget ändrat.
- TrainMeet ansluts med serverns adress och anslutningskoden, inget mer (adressen och koden finns i TrainMeet Server under Drift → Anslut en box, 0.82.1); TKL väljer stationen själv, och en ny installation på Pi, Mac eller PC får ett eget TKL-id. Med LocoNet ej ansluten tas tåg som trafikspelet inte har här bort från banan, så att planen och tidtabellen visar samma tåg (0.82.0, [TrainMeet-anslutningen](trainmeet-adapter.md#anslut-med-adress-och-kod--0820), [tågspårning](tagsparning.md#tåg-som-trafikspelet-inte-har-tas-bort-0820)).
- LocoNet nås på två sätt: en LocoBuffer på USB eller en BTLocoBridge över Bluetooth (Möllehems smartphoninterface, som JMRI kallar BT LocoBridge). Valet görs per installation under Inställningar → Banan (LocoNet) och gäller båda stationerna; kortet paras i datorn först och TKL ansluter till dess serieprofil (0.83.0, [LocoNet ansluten eller ej ansluten](loconet-anslutning.md#två-anslutningar-locobuffer-och-btlocobridge)). Provat mot en virtuell förbindelse, inte mot kortet vid banan.
- Uppdatera nu i ställverket uppdaterar också en Mac eller PC: installationens eget update-skript hämtar versionen, installerar den bredvid den nuvarande och startar om TKL, med återgång till föregående version om den nya inte svarar. Inställningar → Uppdatering visar hur det gick (0.84.0, [installation](installation.md)).
- En station installeras på alla tre plattformarna: Raspberry Pi, Mac och PC med samma rad som Charlottendal, med stationens egna namn, mappar och genvägar. Installationen sparar sin GitHub-token också på Mac och PC, så att Uppdatering ser nya versioner medan stationens förråd är privat (0.83.0, [Träkvista TKL](../stations/trakvista/README.md)).
- Flera stationer: samma program kör Charlottendal eller Träkvista (`CHARLOTTENDAL_STATION`, `stations/<id>`), med stationens egen spårplan, tågvägar, Studio och installation; Träkvista har sitt eget förråd beahead-ab/Tk-TKL, som publiceras härifrån. På en Pi visar Uppdatering Hämta senaste versionen när versionen inte gick att läsa (0.82.0, [Flera stationer](stationer.md)).
- Inställningar → Uppdatering visar inte ett gammalt försök mellan två äldre versioner som senaste uppdatering; på Render stod den gamla serverns misslyckade försök från 6 oktober (0.59.1 → 0.68.0) kvar (0.81.1).

- Originalpanelen med förladdade originalikoner, större träffytor och tågväg som tänds i färdriktningen. Samma start och mål återtar vägen.
- 210 huvudtågvägar och 130 växeltågvägar med etablerings- och passageprov. 49 växlar, 197 körbara layoutblock och 66 signaler, sedan 0.67.0 med adresserna ur Cda60.xml (växlarnas LT, signalernas huvudutgång, spårledningarnas LS-ingångar; 13 panelsignaler utan utgång och 35 spårledningar utan ingång i källan, sedan S100a fick LS60 i 0.72.2). Låsta växlar kan inte läggas om manuellt. Kompisväxlar följer med; omläggning kontrollerar även kompisens spår utanför färdvägen.
- Med LocoNet ej ansluten svarar TKL själv, genom en egen återrapport i en separat process över telegramgränsen, och kör trafikspelets tåg längs tågvägarna: tåg på väg hit på linjen och tåg som anmälts uppställda (0.79.0). Den egna återrapporten rapporterar som MGP-korten, bara vid ändring, order och avfrågning (0.77.0), och klarar flera samtidiga tåg, beläggning, avbrott och uteblivna återrapporter. TKL läser inte dess interna tillstånd.
- Med LocoNet ansluten går order och återrapporter över en LocoBuffer på USB, vars gateway TKL startar själv (0.78.0). Växel- och signalrapporter gäller tills förbindelsen bryts; spårledningarnas ingångar frågas av vid anslutning och var 15:e sekund, och en ingång som inte svarat på 40 sekunder blir okänd (0.77.0). Valet består över omstart.
- Beständiga lås, spårspärrar, AIS, nödåtertagning, sju linjespärrar, programmeringsspår samt lokal-/fjärrläge. Läget fjärr innebär ännu ingen anslutning till ett fjärrsystem.
- Tåginformation för 197 block och sju inkommande fält. Valbar nummerföljning kopplas uttryckligen till en klar tågväg och följer ordnade återrapporter; vid osäkerhet pausas den för kontroll.
- Hela original-XML bevarad och sökbar; 1 377 regeldefinitioner har spårbar införandestatus. Signalregistret innehåller alla 329 aspektrader och 117 relationer. V1–V4 visas som beräknade panelindikeringar, med okänt underlag där villkor saknas.
- Gemensam modellklocka med paus/start, trafikdygn och hastighet samt valbar lokal felsignal. Programmeringsspåret har beständigt lås och separat återrapport; reläet får normalläge vid varje anslutning (0.77.0). Fysisk funktion återstår att verifiera.
- Inloggning, befintlig webbdrift och kontrollerade versionsbyten med backup. Visningsnamn och beskrivningar kan ändras med utkast och versionshistorik.

## Installationsförrådens senaste publicering och tidigare webbdrift

Webbdriften är nu 0.82.11 enligt avsnittet ovan. Följande publiceringsrad avser installationsförråden och tidigare etapper.

**Publicerad: 0.82.11 (18 oktober; cda-tkl main `24da68c`, #93; `beahead-ab/cda-tkl-install` main `4ffd4c8`; tk-tkl `33312ac`). Webbdriften kör på Render sedan 6 oktober: Render bygger om när main ändras om automatisk driftsättning är på, och med tjänstens Deploy Hook i miljövariabeln `RENDER_DEPLOY_HOOK_URL` startar Uppdatera nu ett nytt bygge.** Sedan 0.82.2: ändringarna från #75 och #76 (Uppdatering säger vilket förråd Render bygger ur, och en annan station kan köras som ny webbdrift på Render) finns i installationerna. Sedan 0.82.1: TKL säger att adressen och koden finns i TrainMeet Server under Drift → Anslut en box. Sedan 0.82.0: TrainMeet ansluts med serverns adress och anslutningskoden, och TKL väljer stationen själv; med LocoNet ej ansluten tas tåg som trafikspelet inte har här bort från banan. Sedan 0.81.1: Uppdatering visar inte ett gammalt försök mellan två äldre versioner som senaste uppdatering. Sedan 0.81.0: ett tryck på träffklockan visar eller döljer sekunderna. Sedan 0.80.0: tidtabellens stil väljs under Utseende och ljud, som i TrainMeet-appen för iPhone (Ord, Symboler, Linjebild, Linjebild + symboler), med förhandsvisning, teckenförklaring och spåret i en ram när tåget står inne. Sedan 0.79.0: inget simuleringsläge; trafiken kommer från trafikspelet på en TrainMeet-server, och [LocoNet är ansluten eller ej ansluten](loconet-anslutning.md). Ej ansluten svarar TKL själv och kör trafikspelets tåg längs tågvägarna; *Anslut till LocoNet* i lägesknappen ger återrapporterna från banan, och valet gäller efter omstart. Simulerad trafik är borta. Sedan 0.78.0: lägesknappen i statusraden och LocoBuffern under Inställningar → Banan (LocoNet), med gatewayen som TKL startar själv. Sedan 0.77.0: återrapporterna följer MGP-korten, som inte upprepar något: växel- och signalrapporter gäller tills förbindelsen bryts, TKL frågar av spårledningarnas ingångar vid anslutning och var 15:e sekund, en ingång som inte svarat på 40 sekunder blir okänd, och en växel är okänd tills den får en order ([arkitekturen](arkitektur.md)); simulatorn rapporterar som korten. Sedan 0.76.1: JMRI:s avfrågning visas som avfrågning, Studio och simulatorn känner MGP-korten på deras riktiga identitet (Signal10 SE = produkt 6), och [genomgången](genomgang-mgp-2026-10-06.md#bennys-andra-trace-10-oktober-0761) är rättad efter Bennys andra trace; den visar också att korten inte upprepar sina rapporter, så sju-sekundersregeln måste ändras före drift mot riktig bana. Sedan 0.76.0: avkodaren läser B1 i ingångsformatet, som MGP-korten sänder enligt Bennys monitorering den 9 oktober (förut *unsupported*: ingen växel- eller signalrapport hade lästs mot riktig bana), signalrapporten är B1 som standard, och växelorder pulsar ON/OFF. Sedan 0.75.0: [automaten](tagsparning.md#automaten-0750) under Drift lägger tågvägarna i simulering (genomgående tåg in och ut), Simulera tåg heter Simulerad trafik och simulatorns sida nås från Studio. Sedan 0.74.0: simulerade tåg (knappen Simulera tåg under Drift) kommer in från linjerna med nummer och står kvar på spåret, och kärnan löser upp tågvägen när tåget står helt på målspåret (utom på spår 6 och 10, där målspårets detektor också täcker en växel). Sedan 0.73.0: [tågspårning](tagsparning.md) i simulering, med tågens nummer och riktning på ställverket och tåg på linjen vid kanterna; mot riktig bana är den avstängd. Sedan 0.72.2: S100a läser LS60 (regeln går via den interna sensorn slS100), och genomgången har AI-analysen av XML:en. Sedan 0.72.1: Klarering är en egen flik först i nederraden (Klarering, Spårbeläggning, Drift, Händelser), med antalet väntande förfrågningar. Sedan 0.72.0: grannstationens klareringsförfrågan står i statusraden med Godkänn och Neka, skylten vid linjens kant blinkar och det ringer med Ljud på; Uppdatering känner Render; Studios flyttade sidor är kompakta. Tidigare publicerat: 0.71.1 (cda-tkl main `96461c9`, `beahead-ab/cda-tkl-install` main `018de42`, 7 oktober). Sedan 0.71.1: användarnamnet är e-postadressen när ett konto skapas (Skapa ägaren, inbjudan); äldre konton med vanligt namn loggar in som förut, lösenordet är fortfarande 6–128 tecken. Sedan 0.71.0: allt om anläggningen bor i Studio (Källa, Visning, Orter och telefon, Driftbindningar, Införandestatus); Inställningar → Anläggningen är en länk till Studio och gamla adresser leder dit. Sedan 0.70.0: hjälp i Studio (?-knappen, en text per flik). Sedan 0.69.0: Studio på bärbar dator, stationsplanen fyller höjden med panel till höger. Sedan 0.68.0: signalernas rapportform (SE-telegram E4 eller växelrapport B1) väljs per profil och per signal under Driftbindningar → Signalrapport. Sedan 0.67.0–0.67.1: signalerna beställs på sin huvudutgång och spårledningarna läser LS-ingångarna ur Cda60.xml, tretton panelsignaler bekräftas av kärnan själv, och [genomgången](genomgang-mgp-2026-10-06.md) bedömer varje konstighet i källan. Sedan 0.62.0–0.66.2: [rangerarläget](rangerlage.md) med begäran, växelgator, rangerarens station och Stream Deck. Tidigare webbdrift: 0.59.1, release `v0.59.1-406e5f8`, installerad 5 oktober med `charlottendal-update` på servern (från 0.53.0 `4f0ebcc`; den tidigare noteringen om 0.57.1 stämde inte). Sedan 0.57.0: Inställningar har i varje avsnitt en räckviddsrad, rader med etikett · värde · konsekvens, status som text och form och en fotnot; Händelser visar hela serverns journal med sök. 0.57.1 skriver LocoNet frånkopplad en gång i journalen i stället för varje sekund. Sedan 0.56.0: den lokala tidtabellen är borttagen, TrainMeet är enda källan. Sedan 0.55.0: adminfönstret heter Inställningar, i tre grupper. Sedan 0.54.0: nederraden har fliken Drift med klareringen och driftknapparna; ställverkets övre högra hörn är tomt. Sedan 0.53.0: varje sträckruta visar vem som svarar i andra änden, och ett tåg som inte syns komma kan flyttas hit; kräver TrainMeet Server med #115. Sedan 0.52.0: en parkopplad station är i tjänst utan trafikpass. Sedan 0.51.2: en upprepad tågvägsbegäran kan inte längre återta tågvägen, och bara ett fönster per webbläsare styr Stream Deck. Sedan 0.51.1: sidfoten visar rätt version. Sedan 0.51.0: Stream Deck-layout per deck, känd på serienumret, flera deck samtidigt och en ny redigerare med dra och släpp, egen text och bild på knapparna och tåg på tur. Sedan 0.50.1 (bara installationen): Mac-installationen sparar driftdata i state och registrerar om launchd vid uppdatering. Sedan 0.50.0: CHARLOTTENDAL i en egen rad över planen, ingen zoom. Sedan 0.49.0: Installation på Raspberry Pi, Mac och PC med en rad, notis om ny version att installera. Sedan 0.47.0: Installation på Raspberry Pi med en rad, glidande NU-streck, Stream Deck utan klick. Sedan 0.46.0: dragbar gräns mellan ställverket och nederraden. Sedan 0.45.3: Träffklockan följer TrainMeet (daterad avläsning och ändringsflödet), försenade tåg ovanför NU-strecket. Sedan 0.45.2: chip för ny version, fokusring bara efter Tab; webbdriften parkopplad med Charlottendal på server.trainmeet.app. Sedan 0.45.1: kortare statusrad (SIMULERING, Återställ, Styra RBG, Zoom). Sedan 0.45.0: spårbeläggning som flik bredvid Händelser, Återställ panel och Lämna över rangerbangården som chips i statusraden, inget toast på ställverket. Innehåller också sex menyingångar, TrainMeet-klarering som TMBox, träffnätsstöd, Stream Deck samt parkopplingsdialog med klartextkod och läsbara avslag genom Cloudflare; se arbetsjournalen. Tidigare: Webbdriften kör uttryckligen i simuleringsläge. Anläggningsöversikt och kommunikationsdiagnostik är införda; fysisk MGP tas senare enligt användarens beslut. Se [handhavande](anlaggningsoversikt-kommunikation.md); driftjournalen för webbdriften hålls utanför förrådet. Följande avsnitt beskriver tidigare etapper.

Version **0.33.0**, release `8bef196`, publicerades 26 september kl. 02:51 på [cda-tkl.trainmeet.app](https://cda-tkl.trainmeet.app/) utan omstart. [Linje och adminprinciperna](admin-linje.md) är införda, med gemensam vänstermeny för samtliga adminvyer, separata redigeringsflöden och en renare panel. Meny → Zoom behåller reglage 50–300 %, Visa hela och lokalt sparat val. Original är enda panelutseendet. Backend är oförändrad från 0.30.0 och driftdata bevarades. Se driftjournalen för rollback av gränssnittsöverlägget.

- Start- och slutplupp blinkar lugnt växelvis under förberedelsen av en accepterad tågväg. Klart läge ger fast sken; återtagning, hållna lås, AIS och kontaktbortfall ger ingen förberedelseblinkning.
- Fast ställverksyta: spårplan, tidtabell och knappar har fasta fält. Driftmeddelanden ligger som toast ovanpå; inget tomt meddelandefält reserveras. Detaljer öppnas ovanpå, hover flyttar inga symboler och ljusflödet följer bildrutorna med monoton tidsmätning.
- V1–V3 har släckta vilolampor och som standard lugn, dämpad röd växelblinkning (3 s per lampa och mjuka kanter). Meny → Utseende och ljud erbjuder även fast rött sken. Det ursprungliga snabba läget är borttaget. Aktiveringsvillkoren är oförändrade.
- Stödfunktioner ligger i menyn. Objektinformation öppnas med högerklick nära objektet. Endast Återställ panel finns direkt under spårplanen; övriga manövrer ligger under Driftverktyg. Återställningen nollställer tågvägar efter nya stoppbesked och bevarar spårledningarnas beläggningar. Spårtexterna har normalvikt.
- TrainMeet har en egen anslutningssida och en läsande tidtabellsadapter. Serveradress `https://server.trainmeet.app` och TKL-id `cda-tkl` är sparade. Serverns version 1.11.0 har identifierats; stationsval, anslutningskod och verklig parkoppling återstår.
- Adminfönstret heter Inställningar och har grupperna Träffen, Den här datorn och Anläggningen; driftverktygen ligger i nederradens Drift-flik. [Plan](installningar-plan.md).
- Tidtabellsfältet visar TrainMeets tidtabell. Den lokala tidtabellen (manuell inmatning, Excel/CSV- och AI-import) är borttagen 4 oktober 2026; TrainMeet är enda källan.

Version 0.30.0 klarade 188 enhetsprov och åtta processhelhetsprov både lokalt och på servern. Återställning med beläggning, väntande stoppbesked, omstart och lagringsfel samt bevarad övergångsvarning har verifierats.

Version 0.28.0 klarade 183 lokala enhetsprov, sju processhelhetsprov och ett utökat kalkylbladsprov över HTTP. På servern passerade 37 riktade prov, sju processhelhetsprov, låsomstartsprov och syntaxkontroll. Befintligt tidtabellsutkast, TrainMeet-inställningar, adminfiler, inloggning och tre tågvägslås bevarades. Inloggad webbläsare visar 0.28.0 och den nya kalkylbladssidan utan konsolfel. I 0.28.1 har Casper godkänt att den separata anslutningssidan tas bort och profilinformationen flyttas till registret. XML-granskning, införandestatus och protokollinspelning ligger nu under Avancerat. Navigationsprov, syntax och serverns låsomstartsprov passerade; backend och källdata är oförändrade.

Version 0.27.0 klarade 178 lokala enhetsprov samt riktat HTTP-processprov. På servern passerade 20 TrainMeet-prov, HTTP-processprov, omstartsprov och syntaxkontroll. Id:t sparades via det vanliga gränssnittet och verifierades efter omladdning.

Version 0.25.0 klarade serverns XML-/operations- och syntaxkontroller, 171 enhetstester och sju processhelhetstester. Version 0.26.0 klarade **174 lokala enhetstester**, webbläsarprov och serverns tre nya renderingsprov/syntaxkontroll; jämförelsen bekräftar oförändrad backend och driftdata. Därefter verifierades tjänster, anslutning, skyddade API:er, inloggning och meny/import i webbläsaren. Backup och föregående kodversion är bevarade; se [driftuppgifterna](drift.md). Inga provtidtabeller lades in i webbdriften.

## Kvar för en fullständig ersättning

| Del | Vad som återstår | Underlag som behövs |
|---|---|---|
| Verklig MGP/LocoBuffer | Sedan 0.67.0 bär profilen signalernas utgångar och spårledningarnas ingångar ur Cda60.xml ([genomgången](genomgang-mgp-2026-10-06.md)). Efter Bennys monitorering läser TKL B1 i ingångsformatet (0.76.0), avkodar avfrågningen och MGP-kortens identitet (0.76.1) och följer kortens rapportsätt med avfrågning (0.77.0). *Anslut till LocoNet* startar gatewayen mot en LocoBuffer (0.78.0), provat mot en virtuell LocoBuffer. Kvar: anslutning vid banan, mätning av varje adress, att varje ingångskort svarar på avfrågningen, och uppstarten när korten får ström. | Buffertmodell, inställningar, moduler/firmware och inspelad fysisk trafik. |
| Svenska signalbesked | Fulla huvud-/försignalbesked, signalberoenden och fysisk beskedsmappning. Nuvarande kör/stopp använder en uttryckligt preliminär CZ-profil. | Verifierade svenska beskedskoder och de saknade exakta ikondefinitionerna där originalunderlaget inte räcker. |
| Återstående driftfunktioner | Vändskiva, återstående automatik och frigivning i delar av en tågväg. | Källbundna regler och specificerade ersättningar för saknade skript. |
| Oklara tågvägar | Tre motsägande huvudtågvägsregler, 15 undantagna växelpar och 20 NX-definitioner utan körbar koppling behöver avgöras. Dessa antal överlappar och ska inte summeras. | Rättelse eller beslutat undantag för de konkreta källoklarheterna. |
| TrainMeet | TKL-terminalkontraktet är byggt för klarering och tågrörelser utan trafikpass (kräver TrainMeet Server 2.5.0) och provat mot fejkad server med träffens verkliga data. Sedan 0.79.0 kör TKL trafikspelets tåg när LocoNet inte är ansluten (provat mot en TrainMeet-server i provet). Riktig parkoppling mot server.trainmeet.app 1.16.5 är verifierad från den lokala installationen. Prov i skarp träff med klarering samt webbdriftens egen parkoppling återstår; linjen klar är inte infört. | Serverns anslutningskod via administratörsinloggning; stations-id är `station-charlottendal`. |
| Admin och panel | Driftbindningar, adresser och administrativa begränsningar har en färdig versionseditor. Godtycklig regeländring återstår; första visuella avstämningen och trafikprovkörningen är genomförda, därefter återstår Caspers eget acceptansprov. | Den befintliga designen och provfallens förväntade beteenden. |

Tolv externa Jython-skript saknas fortfarande. Vissa beteenden har fått dokumenterade och provade ersättningar, men full överensstämmelse med den gamla installationen är inte fastställd. Nummerföljningen använder manuellt tilldelad tågidentitet; den identifierar inte lok och ändrar ingen TrainMeet-klarering.

**Kontrollera vid driftsättningen** (beslut 6 oktober 2026, se [rangerarläget](rangerlage.md)):

- **Vx171** (M11-165-2, märkt "Ej använd" i JMRI) ingår rakt i alla 203 tågvägar mot och från Bn
  och i växeltågvägarna mot N1, men grenen mot L1/D används aldrig. Under Mät objekt: svarar
  adress 171 med växelläge? Om inte, och växeln sitter fast i rakt läge på banan, märks den som
  fast i profilen så att tågvägarna mot Bn inte väntar på den. Annars stannar de i "Lägger växlar".
- **Vx172** (M11-165-3, "Ej använd") och 173–174 ingår inte i någon tågväg. 3d slutar vid
  slutsignalen IIIdo (stoppbock i JMRI); 172 är inte kopplad till 3d i ritningen. Bekräfta på
  banan innan någon begäran eller växelgata byggs genom 172.
- **Signalernas rapport** (0.76.0): Bennys LocoNet-monitorering den 9 oktober visar att korten rapporterar
  signalerna som växlar, B1 på signalens egen adress i ingångsformatet, ingen E4. Profilen står nu på B1
  (SE kvar som val per signal), och avkodaren läser ingångsformatet, som den inte gjorde förut. Vid Mät
  objekt: bekräfta per signal. De fyra utgångarna utan rapport på Bennys bana satt i en sektion som inte var
  ansluten (rättat 10 oktober), och hans omvända polaritet är bänkkortets standardvärden.
- **Avfrågningen** (0.77.0): korten upprepar inga rapporter, så TKL frågar av ingångarna var 15:e sekund. Bennys
  kort 6 svarade inte på avfrågningen med sina ingångar. Kontrollera efter *Anslut till LocoNet* att alla
  spårledningar blir kända inom några sekunder; ett kort som inte svarar gör sina spårledningar okända efter
  40 sekunder utan ändring.
- **Tretton panelsignaler**: elva virtuella (3/1, 6/5–9/5, 6/6, 6/7, 6/10–9/10) utan utgång i JMRI
  samt 4/2 och L1 vars utgångar LT307/LT308 är märkta "Ej använd" på linje D utan drift. Kärnan
  bekräftar dem själv. Bedömning: panelbesked som förr; prova LT214 (3/1) och LT307/308 vid mätningen.
- **Växelblock utan detektering**: S155, S164, S171, S172, S112b (och delar) har sensor men ingen
  regel i källan och står kvar på bänkadress. AI-analysen den 8 oktober föreslår S164 → LS195, S171 → LS199,
  S112b → LS72 (Vx112 THROWN) och S155 → LS172 eller LS173; förslagen och mätningarna står sist i genomgången.
  En vagn på varje växelblock avgör. S170 fick LS199 i 0.67.1 och S100a LS60 i 0.72.2 (regeln läser slS100).
- **Vx124** finns i källan men inte i planen (lämnas utanför); **M11:s kommentarer** säger basadress
  165 där adresserna är 170–174 och **M08:s ingångar** har förskjutna användarnamn (skrivfel utan verkan);
  **LS124** är kommenterad S125a men regeln använder LS121 (mät vilken som slår).
  Bedömningarna i sin helhet: [genomgången](genomgang-mgp-2026-10-06.md).

**Avsiktligt vilande:** Friställa spår och den extra lilla växellåsindikator som Casper bad oss avvakta med.

## Historik: tidigare praktiska steg

[Steg 1 är genomfört](provkorning-2026-09-24.md): två samtidiga tåg, nummerföljning, växellås, återtagning och avbrott provades i webbläsaren. Signalinformation finns via högerklick och anslutningsstatus i menyn; återtagning nås via Meny → Driftverktyg → Tågvägar och stödfunktionerna via menyn. Casper kan nu provköra version 0.32.0 på den befintliga webbadressen. [Kompisväxlarna har kontrollerats särskilt](kompisvaxlar.md), och ett fel som tillät omläggning på belagt sidospår har rättats. Manuell manövrering visar nu berörda kompisväxlar, deras återrapporterade lägen, spårstatus och spärrorsak. Växlar utanför vyn kan visas utan manöver.

Vid införandet av version 0.17.0 passerade 134 enhetstester och sex processhelhetstester. Backupens driftdata har återlästs i en isolerad kopia utan fältorder. Telegraminspelningen ger namngivna loggar med båda riktningarna, råtelegram och separat tolkning. Det förbereder jämförelsen mellan simulator och fysisk utrustning. Det ersätter inte hårdvaruanslutningen. Fortsätt samtidigt med verifierbara manöverfall, admin och visuell avstämning; aktivera inte okända signal- eller adressbindningar genom gissning.

Aktuell publicerad release och provstatus finns i [arbetsjournalen](arbetsjournal.md), [provresultaten](provresultat.md); driftuppgifterna hålls utanför förrådet.

[Avstämning av samtliga 54 användningsfall och tio produktkrav](acceptans-2026-09-23.md) visar exakt vad som är provat, avsiktligt vilande eller beroende av ytterligare underlag.

## Historik före driftbytet: förslag 0.82.3

Avsnitten nedan dokumenterar de separata förslagen och deras dåvarande provstatus. De ingår nu i 0.82.10 genom #89; del-PR #80–88 är stängda och main är `5560c2a`. Installationsförråden publicerades senare som 0.82.10. Aktuellt driftresultat finns överst och i [slutprotokollet](render-release-2026-10-18.md).

Stationernas läsvägar är samlade utan filflytt. Charlottendals hela profil, källhash, granskade regler och migreringsunderlag bevaras. Driftdata ligger kvar i `var/`, med `CHARLOTTENDAL_STATE_DIR` först. Se [stationsprovet](stationsprov-2026-10-18.md). Ingen merge eller publicering ingår; main driftsätter Charlottendal på Render.

## Historik före driftbytet: förslag 0.82.4

Stationspaketets XML-importör följer med, och källverifieringen är obligatorisk både vid paketbygge och i stationens GitHub-prov. Ett lokalt paket har verifierats utan push. Se [stationsprovet](stationsprov-2026-10-18.md).

## Historik före driftbytet: förslag 0.82.5

Skapa ägare och återställ användare väljer nu stationens egen driftkatalog, med befintlig prioritet för användar-, auth- och state-variablerna. Charlottendals register flyttas inte. Se [stationsprovet](stationsprov-2026-10-18.md).

## Historik före driftbytet: förslag 0.82.6

Mac och Windows väljer stationsidentitet före katalog och autostart. Charlottendals standardvägar är kvar. Mac-installation och uppdatering är provade isolerat; Windows är statiskt granskat, inte körprovat. Två stationer på samma värd kräver egna portar. Se [stationsprovet](stationsprov-2026-10-18.md).

## Historik före driftbytet: granskningsläge 18 oktober 2026

Förslagen 0.82.3–0.82.6 ligger i separata utkast-PR:er #80–83. Samtliga fyra kod-PR:er är gröna i GitHub. De är inte mergade eller publicerade. [Stationsprotokollet](stationsprov-2026-10-18.md) anger provade commits och återstående acceptansprov. Träkvistas linjetrafik och automat behöver egna trafikändringar före containersteget; se [nästa trafiksteg](trakvista-nasta-trafiksteg.md).

GitHub-förrådet för Träkvista heter sedan 18 oktober `beahead-ab/tk-tkl`, enligt Caspers önskemål. Samma förråds-id och senaste commit; gamla URL:er fungerar. Namnbytet har inte publicerat någon ny version eller ändrat driften.

## Historik före driftbytet: förslag 0.82.7

Linjer, orter, tidtabell, tågspårning och fältmodell använder samma stationsbeskrivning. Träkvistas A/B/C och fem stationsspår är uttryckligt bundna; saknad TrainMeet-koppling placerar inga tåg. Charlottendals underlag och driftvägar ligger kvar. [Protokoll och begränsningar](stationsstyrd-trafik-2026-10-18.md).

## Historik före driftbytet: förslag 0.82.8

Träkvistas automat väljer tidtabellens stationsspår och nästa verkliga granne, accepterar först efter aktiv infart och inväntar utgående enkelspårsklarering. Färskt trafikläge och oförändrad tågväg kontrolleras även efter väntande nätverksläsning. Charlottendals automat behåller sin prioritering och väntetid. [Trafikprotokoll](stationsstyrd-trafik-2026-10-18.md).

## Historik före driftbytet: förslag 0.82.9

Inställningar → Station väljer bland installerade stationer med kontrollerad omstart genom npm start. Separata driftkataloger och användare behålls; nya stationens TrainMeet ansluts uttryckligen. Befintliga fasta Pi/Mac-tjänster och Render behåller sin station. [Anvisning och avgränsning](stationsval.md), [protokoll](stationsstyrd-trafik-2026-10-18.md).

## Historik före driftbytet: verifierade utkast 0.82.7–0.82.9

Kod-PR:erna #85–87 är gröna i GitHub: den senaste kodrevisionen a824c55 har 617 godkända enhetsprov och 19 helhetsprov samt 344 enhetsprov och gröna trafik-/omstartsprov i det riktiga Tk-paketet utan push. Obligatoriska kontroller, separat root-uppdatering och Windows-parser är gröna. [Slutprotokoll](stationsstyrd-trafik-2026-10-18.md#fullständig-kontroll-i-github) förklarar överhopp och återstående acceptans. Detta är verifierade förslag, inte publicerad drift. Main är kvar på 904d564; inga installationsförråd eller Render-tjänster har ändrats.
