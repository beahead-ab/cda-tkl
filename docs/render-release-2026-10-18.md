# Charlottendal på Render, kontrollerat byte 18 oktober 2026

Casper godkände bytet efter genomgången av 0.82.9. Releasekandidaten är 0.82.10, med rättelsen från den sista kontrollkörningen. Bara Charlottendals befintliga webbdrift omfattas; inga installationsförråd publiceras och inget ändras i TrainMeet Server. Pi, Mac, fysisk LocoBuffer/MGP och Träkvistas framtida Render-tjänst ingår inte i driftbytet.

## Utgångsläge

- Tjänst: CDA-TKL, `srv-db2m51ei0phs7393n0g0`, Frankfurt, Docker.
- Publik adress: https://cda-tkl.trainmeet.app/.
- Verifierad körande version: 0.82.2.
- Fungerande commit: `904d5643219e87cfe14e95ec9c46056d90d64aa9`.
- Fungerande Render-deploy: `dep-dbabc42vcj2c73a1p5cg`.
- Beständig disk: 1 GB, monterad på `/data`. Återställningsmarkören finns; katalogerna state/ och auth/ finns. Innehållet exponeras inte i protokollet eller CI.
- Render visar dagliga disksnapshots, senast 18 oktober kl. 02:24 enligt gränssnittet. En aktuell skyddad filkopia ska också tas före bytet; dagens snapshot ersätter inte den.
- Automaten och TrainMeet-träffen är aktiva vid första kontrollen. Driftbyte ska föregås av lugnt läge och ett valt avbrott.

## Release och prov

Ändringarna i PR #80–88 samlas för en enda squash-merge till main. Charlottendals `profiles/`, `public/data/`, profil-id och sourceHash bevaras. Dockerfile.render och deploy/render är oförändrade mot den fungerande versionen. Render startar server och återrapport som tidigare, med `/data/state` och `/data/auth`, fast station och LocoNet ej ansluten.

Den sista kontrollen på #88 (39136533075) misslyckades i Träkvistas automatiska processprov. Policyn hann se kärnans normala återtagning efter passage som en manuell återtagning och lämnade över. Releasekandidaten ska rätta just den situationen och behålla överlämnandet vid avbruten eller ofullständig passage. Kod-, integrations-, paket- och containerprov ska vara gröna på releasekandidatens faktiska commit före merge.

Ett separat containerprov använder bara syntetisk ägare, temporär disk och isolerat nät. Det provar återställningsspärr, inloggning, panel, Studio, simulator, sparad inställning och omstart. Inga produktionshemligheter, verkliga TrainMeet-kommandon eller stationsdata från drift används.

## Återgång

Behåll den fungerande Render-deployen ovan och en aktuell skyddad säkerhetskopia av disken. Vid fel återgår programmet till föregående fungerande deploy med aktuella driftdata kvar. Återlägg inte gamla lås eller spärrar blint från en diskbackup; en full återställning är en separat driftåtgärd.

`/healthz` kan svara 200 även i väntan på återställning och direkt när barnprocesserna startas. Efterkontrollen ska därför också omfatta faktisk panel, skyddad inloggning, `/api/config`, `/api/state`, Studio och `/anlaggning/`, rätt version och kvarvarande inställningar.

## Resultat

**Genomfört:** Charlottendal kör nu 0.82.10 på sin befintliga Render-tjänst. PR #89 squash-mergades som `5560c2a9c8b7fedcd2116c9d17213d950dfeab36`; deploy `dep-dbaeca0ae00c739lu7u0` är live. Merge-trädet `b907e010a79c2bd7bef409440b5c8e9cb19ca9be` är exakt det provade release-trädet. Del-PR #80–88 stängdes som ingående i releasen, utan fler driftsättningar.

### Slutlig kontroll före merge

[CI 39139292652](https://github.com/beahead-ab/cda-tkl/actions/runs/39139292652) är helt grön på `1ac7ff4007d28efd17c73ed856ff64c2be2ad0ef`:

| Kontroll | Resultat |
|---|---|
| npm test | 619 godkända av 622, tre avsiktligt överhoppade: två root-prov och ett Mac-specifikt |
| Syntax, operations-, layout-, XML- och Träkvistakontroller | Alla gröna |
| Processintegration | 19/19, inklusive båda stationerna och komplett automatflöde |
| Root-krävande uppdatering/återgång | Körda separat, 2/2 i isolerade kataloger |
| Träkvistas verkliga stationspaket | 346 godkända enhetsprov; käll-, trafik- och omstartsprov gröna; ingen push |
| Windows | PowerShell-parser grön; ingen verklig installation |
| Render-avbildning och Chromium | Bygge, ägare/inloggning, panel, Studio, Uppdatering, fast station och riktig containeromstart med bevarade inställningar gröna |

### Byte och verklig efterkontroll

Automaten pausades genom panelen. API-kontrollen visade inga tågvägar, programmeringslås, rangerbegäran, nödläge eller lagringsfel. Därefter togs en ny backup: `/data/release-backups/before-0.82.10-20261018T153015Z.tar.gz`, kl. 17:30:15 svensk tid, 19 filer, 12 validerade JSON-filer, 1 722 994 byte och behörighet 0600. SHA-256: `4086a10913901320c16ff800180db673d2868fe6e48f13fe1e57db8d3660f5a6`.

Render byggde automatiskt efter den enda main-mergen. Under själva omstarten syntes ett kort 502-svar; därefter svarar den nya tjänsten normalt. Följande är kontrollerat i faktisk drift:

- `/healthz`: running. Config och state: 0.82.10, Charlottendal, profil `charlottendal-network-v1` och samma sourceHash `c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87`.
- Befintlig session fungerar. Panelen visar träffen, Studio visar 340 tågvägar/49 växlar/66 signaler, Uppdatering visar installerad 0.82.10 och anläggningsvyn visar en ansluten LocoNet-klient.
- Intern förbindelse connected, LocoNet ej ansluten, storageFault null, samma kontroll-/spärrläge och bindnings-/visningsversion 0. Stationsvalet är låst till Charlottendal som avsett på Render.
- TrainMeet är anslutet och inte stale, med samma parkoppling, serveradress, TKL-id, station, publikation, trafikdag och grannförbindelser. Ingen ny parkoppling eller manuell TrainMeet-manöver gjordes under efterkontrollen.
- Privat jämförelse mot den färska backupen: 13 statiska filer är byteoförändrade, inklusive controls, onboarding, tågtabellsimport, trainmeet, växelgrupper och tidigare auth-/konfigurationsfiler. Samma två användare, med identiska användarposter, lösenordsuppgifter och roller. Inga hemligheter skrivs ut. Loggar, spårning och klockcheckpoint skiljs från statiska inställningar.
- Automaten återställdes till på som före bytet. Efterkontrollen visar enabled true, fortsatt anslutning och inga lagringsfel. Inget nytt trafikförlopp tvingades fram i drift; fulla trafikförlopp verifieras av processproven ovan.

Driftbilden från Uppdatering visar installerad 0.82.10 och anslutet TrainMeet. Bilden lämnas utanför GitHub; protokollet innehåller endast kontrollresultaten.

Installationsförråden publicerades inte och TrainMeet Server ändrades inte. Pi, Mac och Windows har inte uppdaterats. Fysisk LocoBuffer/MGP och Träkvistas riktiga grannar omfattas inte av denna driftkontroll. Dokumentationen färdigställs i en egen PR utan ytterligare main-merge, så att rapporteringen inte startar om driften en gång till.

## Förslag till steg 2

1. Prova Träkvistas egen Docker-avbildning med syntetisk tom disk, första ägare, omstart och återgång. Charlottendals containerprov är klart; Träkvistas avbildning och nya Render-start ska fortfarande provas separat. **Provet finns nu**, se nedan; den verkliga Render-tjänsten återstår.
2. Före publicering: jämför tk-tkl med senaste publiceringsmarkören, ta in eventuella Benny-rättelser och kör hela publiceringsprovet. Själva publiceringen görs först i en uttryckligen godkänd omgång.
3. Casper skapar Träkvistas Render-tjänst med egen beständig disk och ägare. Prova rätt station, inloggning, uppdatering/återgång och verkliga, uttryckligt valda TrainMeet-grannar tillsammans med Casper/Benny. Varje station kör och uppdateras separat.
4. Pi och Mac behåller vanliga installationer med USB, helskärm och Stream Deck. Önskas stationsval i deras befintliga tjänster krävs en separat integration av startövervakaren per plattform, med bevarade driftkataloger och verkliga installationsprov.

Ett eget tkl-förråd och en gemensam webbtjänst med inloggning/stationsval kommer senare efter Caspers beslut.

## Tidigare förberedelser

Förberedelse verifierad 18 oktober:

- Samlad release: [PR #89](https://github.com/beahead-ab/cda-tkl/pull/89), utan publicering av installationsförråden.
- Säkerhetskopia: `/data/release-backups/before-0.82.10-20261018T145421Z.tar.gz`, skapad kl. 16:54:21 svensk tid. Arkivet innehåller 19 filer, varav 12 JSON-filer som lästs och validerats. Storlek 1 719 128 byte, filbehörighet 0600, skyddad katalog. SHA-256: `20a5c9cb9c23a50a780cccceb66dc08f2143facc161c0668eb1b0408ccc02780`. Inga drift- eller autentiseringsfiler laddas upp till GitHub.
- Faktiskt container- och Chromium-prov är grönt i [39138960895](https://github.com/beahead-ab/cda-tkl/actions/runs/39138960895), på kodhuvudet `cc52c6c`. Inloggning, panel, Studio, Uppdatering, fast station och riktig containeromstart med bevarad session, ort, anteckning och klocka passerar. De fyra skärmbilderna är visuellt granskade. Detta är syntetisk provdata, inte en kontroll av drifttjänsten.
- Charlottendals nya containerprov stannar i cda-tkl genom `deploy/charlottendal-only.txt`; paketprovet kräver att det inte följer med till Träkvista. Den sista samlade kontrollen körs på releasegrenens slutliga commit före merge.

## Träkvistas containerprov

`scripts/test-station-container.mjs` provar stationens egen avbildning på samma sätt som Charlottendals, fast för en ny
installation. Paketet byggs av `deploy/publish-station.sh` mot ett tomt provförråd utan push, och avbildningen byggs ur
paketets eget `Dockerfile.render`. Ett eget jobb i `.github/workflows/prov.yml` kör det på varje pull request, med
protokoll, containerlogg och skärmbilder som artefakt. Infrastrukturen delas med Charlottendals prov i
`scripts/container-prov.mjs`; inget av det följer med till stationens förråd.

Provet kontrollerar, allt med syntetiska data på ett internt Docker-nät:

- Tom datavolym ger en ny installation: ägaren skapas ur `TKL_OWNER_EMAIL` och `TKL_OWNER_PASSWORD`, `/healthz` svarar
  running utan väntan på återställning, panelen och Studio kräver inloggning och fel `Host` nekas.
- Det tillfälliga lösenordet byts vid första inloggningen: skyddade API:er svarar 428 före bytet, och det gamla
  lösenordet går inte att använda efteråt.
- Rätt station: `trakvista`, profilen `trakvista-network-v1` med sin källhash, låst stationsval med bara Träkvista i
  listan, inget lagringsfel och ansluten intern simulator.
- Webbläsaren: inloggning, renderad spårplan, stationens namn i panelens rubrik och sidhuvud, Studio utan fel med
  stationens plan, och stationsinställningarna med Träkvista som fast installation. Tre skärmbilder sparas.
- Källregistrets valfria filer: stationen saknar Charlottendals signalregister och införandestatus, sidorna hanterar
  det själva, och provet kräver att det är just de två och inga andra uteblivna svar.
- Riktig containeromstart på samma volym bevarar ägare, session, ortsinställning och modellklocka.
- Återgång: föregående publicerade version (den senaste i cda-tkl:s historik med ett annat versionsnummer) byggs som
  egen avbildning och startas på samma volym. **Den startar inte**, se nedan; provet kräver just det och att den nya
  versionen sedan startar igen på samma volym med ägare, ort och klocka kvar.

Kvar att notera: panelens sidfot är statisk text i `public/index.html` och säger *Charlottendal TKL · version X* också i
en annan stations installation. Versionen stämmer, och rubriken, sidhuvudet och fliknamnet följer stationen. Rättelsen
rör `public/` och kräver därför en egen versionshöjning med publicering; den ingår inte här. Provet är syntetiskt: ingen
verklig bana, ingen TrainMeet-parkoppling, ingen publicering och ingen Render-tjänst.

## Återgång till en version före stationens egna linjer

Containerprovet visar att en rollback av Träkvistas tjänst till **0.82.2** inte startar på en disk som 0.82.10 har
skrivit. Containern avslutas med kod 1 och `Ogiltiga sparade ortsuppgifter`: 0.82.2 läser `destinations.json` mot
Charlottendals sju linjer, medan stationens egna linjer (A, B, C) kom med 0.82.7. Felet ligger alltså i den gamla
versionen, inte i den nya, och disken tar ingen skada — 0.82.10 startar igen på samma volym med ägare, ortsinställning
och klocka kvar, vilket provet också kontrollerar.

Vad det betyder för drift:

- Träkvistas kommande Render-tjänst kan inte rullas tillbaka till en version före 0.82.7 genom att bara välja en äldre
  deploy. En sådan återgång kräver att diskens säkerhetskopia från före bytet läggs tillbaka först.
- Charlottendal berörs inte på samma sätt: dess sju linjer är desamma i båda versionerna. Vid varje framtida
  driftbyte gäller ändå samma ordning som den 18 oktober: färsk skyddad säkerhetskopia före merge, och känd
  fungerande deploy att gå tillbaka till.
- Att gå framåt igen är ofarligt. Den väg som provet visar är: återgången stoppas av den gamla versionen, tjänsten
  startas på nytt med den nya versionen, och driften är oförändrad.
