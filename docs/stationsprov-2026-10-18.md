# Stationsprov: Charlottendal och Träkvista

18 oktober 2026. Utgångspunkt: cda-tkl main `904d5643219e87cfe14e95ec9c46056d90d64aa9`, version 0.82.2.
Tk-TKL är ett publicerat paket; inga ändringar görs direkt där. Inga verkliga driftdata eller hemligheter används.
Alla ändringar här är förslag på egna grenar. **Merge till cda-tkl main driftsätter Charlottendal på Render och väntar på Casper.**
Installationsförråden publiceras inte i detta arbete.

## Inventering

- En kodbas finns redan. `CHARLOTTENDAL_STATION` och `packaging/identity.env` väljer station vid start.
- Stationsdata är JSON/XML. Driftdata är JSON-filer, med `CHARLOTTENDAL_STATE_DIR` först, annars `var/` för Charlottendal och `var/<id>/` för andra stationer.
- Charlottendals filer ligger kvar i `profiles/` och `public/data/`, inklusive `source/Cda60.xml`.
- Profilens hela JSON-objekt och egenskapsordning måste bevaras: sparade driftbindningar kontrollerar mer än id och sourceHash.
- Träkvista publiceras med `deploy/publish-station.sh trakvista`. Bennys rättelser ska tas in i cda-tkl före nästa publicering.
- Charlottendals befintliga Render-Dockerfile och Träkvistas paketmall är två befintliga körsätt. Render-inställningarna ändras inte.

## Lokala provresultat och begränsningar

| Kontroll | Resultat |
|---|---|
| Baseline: syntax, operations, layout, XML och Träkvistas källverifiering | Samtliga fem kommandon gröna på 0.82.2. |
| Studio, Charlottendal | 340 tågvägar, 49 växlar, 66 signaler. Granskade regler och migrering finns; kompilerad profil identisk. |
| Studio, Träkvista | 57 tågvägar, 13 växlar, 25 signaler. Kompilerad profil identisk. |
| Gemensam läsväg | Riktade prov för hela profilobjektet, legacy-profiler, state-prioritet, Studio med separat källrot samt saknade och avvikande underlag passerar. |
| HTTP, lokal panel, Studio i webbläsaren | Inte godkänt i denna miljö: lokal lyssning stoppas av `listen EPERM`. Nya HTTP-prov kontrollerar exakta bytes och att en station aldrig lämnar ut den andras källor. |
| Fulla enhets- och processprov | Baseline gav 496 godkända, tre EPERM-blockerade och två root-krävande överhoppade enhetsprov av 501. Alla 14 integrationsprov blockerades av EPERM. Kräver en miljö med lokala portar. GitHub-arbetsflödet i PR:n kör hela kedjan; resultaten ska granskas före merge. Inga prov hoppas över för att kringgå begränsningen. |
| Docker/Render-start | Inte provat: Docker-socketen är inte åtkomlig här. Ingen Render-tjänst har startats eller ändrats. |
| Pi, LocoBuffer och riktig bana | Inte fysiskt provat. En virtuell LocoBuffer eller intern återrapport visar inte att banans givare eller MGP-kort fungerar. |

GitHub-provet kör `npm test`, `npm run -s check`, `npm run -s verify:operations`,
`npm run -s verify:layout`, `npm run -s verify:xml`, `npm run verify:trakvista` och `npm run -s test:integration`.
Det använder inga produktionsuppgifter och driftsätter inget.

## Konkreta fynd

1. Tk-paketets borttagningslista tar bort den delade XML-importören. Då försvinner `verify:trakvista` ur package.json, och arbetsflödets `--if-present` döljer det. Föreslagen rättelse i egen PR.
2. `create-owner.mjs` och `recover-user.mjs` väljer `var/` även för Träkvista utan explicit state-variabel. Rättas separat så att verktyg och server väljer samma användarregister.
3. Mac och Windows använder Charlottendals installationsnamn och kan ersätta en befintlig installation när Tk-TKL installeras. Rättas separat med stationens befintliga identitet; Charlottendals standardvägar bevaras.
4. Träkvistas trafik från A/B/C är inte färdig. `destination-data.js`, `TrainTracker` och automaten känner Charlottendals linjer och knappnamn. Direkt modulprov ger tom linjemappning och inga automatvägar för Träkvista, trots att manuella tågvägar kan provas. **Träkvistas TrainMeet-trafik och automat ska därför inte beskrivas som godkända.** Det kräver en egen stationsanpassning och processprov med en lokal provserver.

## Före godkännande av steg 1

Kör panel, Studio, ägarinloggning och Uppdatering för båda stationerna, lokalt och i det byggda Tk-paketet.
Kontrollera omstart med sparade lås, användare, driftbindningar och inställningar i isolerad tillståndskatalog.
Prova trafikspelets tåg mot en lokal TrainMeet-provserver med LocoNet ej ansluten, för båda stationerna.
En riktig uppdatering av installerad Pi/Mac och acceptansprov vid banan återstår; kör inte produktionsuppdateringen som ett prov.
Två stationer på samma dator behöver egna portar för HTTP, återrapport och LocoNet-förbindelse; standardportarna är gemensamma.

## Förslag till nästa steg

Stäng först Träkvistas linje-/trafiklucka och slutför process- och webbläsarproven ovan. Casper granskar PR:er och protokoll före merge.
Därefter kan steg 2 prova befintliga Render-avbildningar, beständig lagring och start/omstart för varje station.
Casper skapar Träkvistas Render-tjänst och deltar i acceptansprovet. Pi och Mac behåller sina vanliga installationer.
Ett separat programförråd `tkl`, filflytt för Charlottendal och gemensam tjänst med stationsval kräver ett senare beslut.
Spår 6, rangerbangården, programmeringsspåret, V1–V4 och automatens spårordning ligger kvar i `src/`.

## Paketrättelsen, 0.82.4

Den delade XML-importören behålls och verifieringen krävs. Det negativa provet stoppar en inaktuell genererad fil före commit. Ett riktigt lokalt Tk-paket gav 230 godkända enhetsprov och två miljöblockerade socketprov; paketets verify:trakvista är grönt. Inget skickades till Tk-TKL eller något annat installationsförråd. GitHub kör ett nytt fullständigt paketprov utan stubbar och utan push.

## Användarverktygen, 0.82.5

Två verktyg följer serverns driftkatalog. Tretton nya processcenarier och tre användarprov passerar. De körs i isolerade kopior och verifierar ägarinloggning, återställning, sessionens ogiltigförklaring och att andra register inte ändras. Originalfelet har reproducerats. Det är inte ett prov av inloggningssidan i webbläsaren.

## Installationsnamn, 0.82.6

15/15 riktade installationsprov passerar. Mac-installeraren och uppdateringen körs i temporär miljö med ersatta systemkommandon: Träkvistas katalog, appnamn och autostart är egna, Charlottendals data bevaras och app.env skrivs inte över. Befintlig migration från Charlottendals äldre var-katalog fungerar som förut. Windows har statiska prov; PowerShell och Windows-körning återstår. Standardportar och panelgenvägarnas adresser är oförändrade: två samtidiga installationer på samma dator är inte färdigkonfigurerade av denna ändring.

Direkta lagringsprov av båda stationerna etablerade tågvägar med Field-modellens telegram, läste om Engine från temporära JSON-filer och bevarade samma växellås i läget held. Visningsinställningar och användarsession återlästes också. Detta visar diskformat och moduler, inte full processomstart eller webbläsarflöde.

Slutgranskningen lade till prov som avvisar befintliga null-/skalärfiler i Studio och som tillåter uttryckliga användarsökvägar även utan stationsunderlag. 17 riktade Studio-/profilprov och 16 användarprov är gröna. GitHub-provet kör dessutom de två root-krävande uppdaterings-/rollbackproven i isolerade kataloger och PowerShells parser på Windows. Detta installerar inget på en verklig Pi, Mac eller Render-tjänst.

## Slutlig kontroll i GitHub

Kodrevisionerna i PR #80–83 provas i GitHub eftersom den lokala miljön blockerar lyssningsportar. Resultaten nedan avser respektive angiven commit, inte bara baslinjen eller ett tidigare förslag.

| PR / kodcommit | Enhetsprov | Integration | Övrigt |
|---|---|---|---|
| [#80 / 6d428e3](https://github.com/beahead-ab/cda-tkl/pull/80) | 518 godkända, två root-prov överhoppade | 14/14 | Alla fem syntax-/källkontroller gröna. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39130874878). |
| [#81 / 2687572](https://github.com/beahead-ab/cda-tkl/pull/81) | 519 godkända, två root-prov överhoppade | 14/14 | Alla kontroller gröna. Tk-paket: 249 godkända, källverifiering grön, ingen push. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39130941059). |
| [#82 / 82d85dd](https://github.com/beahead-ab/cda-tkl/pull/82) | 532 godkända, två root-prov överhoppade | 14/14 | Alla kontroller gröna. Tk-paket: 262 godkända, källverifiering grön, ingen push. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39130975945). |
| [#83 / 47de9a1](https://github.com/beahead-ab/cda-tkl/pull/83) | 533 godkända, tre överhoppade (två root, ett Mac) | 14/14 | Alla kontroller gröna, två root-krävande uppdaterings-/rollbackprov körda separat, Tk-paket: 263 godkända, källverifiering grön, ingen push och Windows-parser grön. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39131020255). |

Proven visar bland annat exakt HTTP-data per station, Studio, ägarinloggning i Träkvistas nya Render-gateway, Charlottendals processomstart med sparade inställningar/lås och trafikspelets tåg mot lokal TrainMeet-provserver. De visar inte att Träkvistas A/B/C eller automat fungerar; den luckan kvarstår. Visuell webbläsaracceptans, riktig Windows-installation, faktisk Pi-uppgradering och fysisk LocoBuffer/MGP återstår.

Ingen merge, push till cda-tkl-install/Tk-TKL, ändring i trainmeet-server eller ändring av Render har gjorts. Alla Charlottendals profiler och public/data samt Träkvistas genererade stationsdata är byteoförändrade mot main 904d564.

## Granskning och nästa beslut

PR:erna är staplade för att skilja rättelser och versionssteg åt: #80 → #81 → #82 → #83. Casper granskar först. Om Casper senare väljer squash-merge till main behöver nästa PR baseras om på uppdaterad main innan den kan squashas; merga inte en följd-PR till en tidigare arbetsgren som ett sätt att publicera. Varje merge till main kan driftsätta Charlottendal. Installationsförråden publiceras först efter ett separat beslut.

[Nästa trafiksteg](trakvista-nasta-trafiksteg.md) föreslår två separata PR:er för Träkvistas linjer/manuella TrainMeet-trafik och därefter automat. Render-containrar och Caspers nya Träkvista-tjänst kommer sedan. Eget tkl-förråd och gemensam tjänst ingår inte.

## Godkänt fortsatt arbete

Casper har nu godkänt linjetrafik, automat och lokalt stationsval med kontrollerad omstart som separata granskningssteg. Uppdaterat [trafikprotokoll](stationsstyrd-trafik-2026-10-18.md) redovisar ändringarna och vilka prov som återstår. Eget tkl-förråd, filflytt, gemensam tjänst, merge och publicering ingår fortfarande inte.
