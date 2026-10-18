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

## Provresultat

| Kontroll | Resultat |
|---|---|
| Baseline: syntax, operations, layout, XML och Träkvistas källverifiering | Samtliga fem kommandon gröna på 0.82.2. |
| Studio, Charlottendal | 340 tågvägar, 49 växlar, 66 signaler. Granskade regler och migrering finns; kompilerad profil identisk. |
| Studio, Träkvista | 57 tågvägar, 13 växlar, 25 signaler. Kompilerad profil identisk. |
| Gemensam läsväg | Riktade prov för hela profilobjektet, legacy-profiler, state-prioritet, Studio med separat källrot samt saknade och avvikande underlag passerar. |
| HTTP, lokal panel, Studio i webbläsaren | Inte godkänt i denna miljö: lokal lyssning stoppas av `listen EPERM`. Nya HTTP-prov kontrollerar exakta bytes och att en station aldrig lämnar ut den andras källor. |
| Fulla enhets- och processprov | Kräver en miljö med lokala portar. GitHub-arbetsflödet i PR:n kör hela kedjan; resultaten ska granskas före merge. Inga prov hoppas över för att kringgå begränsningen. |
| Docker/Render-start | Inte provat: Docker-socketen är inte åtkomlig här. Ingen Render-tjänst har startats eller ändrats. |
| Pi, LocoBuffer och riktig bana | Inte fysiskt provat. En virtuell LocoBuffer eller intern återrapport visar inte att banans givare eller MGP-kort fungerar. |

GitHub-provet kör `npm test`, `npm run -s check`, `npm run -s verify:operations`,
`npm run -s verify:layout`, `npm run -s verify:xml`, `npm run verify:trakvista` och `npm run -s test:integration`.
Det använder inga produktionsuppgifter och driftsätter inget.

## Konkreta fynd

1. Tk-paketets borttagningslista tar bort den delade XML-importören. Då försvinner `verify:trakvista` ur package.json, och arbetsflödets `--if-present` döljer det. Rättas separat.
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
