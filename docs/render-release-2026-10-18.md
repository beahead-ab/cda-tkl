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

Förberedelse pågår. Ingen merge eller driftsättning är utförd när denna kandidat skrivs. Provresultat, säkerhetskopia, release-PR, faktisk deploy och efterkontroll kompletteras i samma protokoll.

Förberedelse verifierad 18 oktober:

- Samlad release: [PR #89](https://github.com/beahead-ab/cda-tkl/pull/89), utan publicering av installationsförråden.
- Säkerhetskopia: `/data/release-backups/before-0.82.10-20261018T145421Z.tar.gz`, skapad kl. 16:54:21 svensk tid. Arkivet innehåller 19 filer, varav 12 JSON-filer som lästs och validerats. Storlek 1 719 128 byte, filbehörighet 0600, skyddad katalog. SHA-256: `20a5c9cb9c23a50a780cccceb66dc08f2143facc161c0668eb1b0408ccc02780`. Inga drift- eller autentiseringsfiler laddas upp till GitHub.
- Faktiskt container- och Chromium-prov är grönt i [39138960895](https://github.com/beahead-ab/cda-tkl/actions/runs/39138960895), på kodhuvudet `cc52c6c`. Inloggning, panel, Studio, Uppdatering, fast station och riktig containeromstart med bevarad session, ort, anteckning och klocka passerar. De fyra skärmbilderna är visuellt granskade. Detta är syntetisk provdata, inte en kontroll av drifttjänsten.
- Charlottendals nya containerprov stannar i cda-tkl genom `deploy/charlottendal-only.txt`; paketprovet kräver att det inte följer med till Träkvista. Den sista samlade kontrollen körs på releasegrenens slutliga commit före merge.
