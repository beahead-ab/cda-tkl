# För agenter som arbetar i cda-tkl

Charlottendal TKL (CDA-TKL), Caspers ställverk mot TrainMeet. Allt skrivs på svenska: dokument, commits och PR:er.
Läget och historiken står i `docs/status.md` och `docs/arbetsjournal.md`, och flera stationer (Charlottendal och
Träkvista) beskrivs i `docs/stationer.md`.

## Förråden

| Förråd | Vad | Att tänka på |
|---|---|---|
| `beahead-ab/cda-tkl` | Det här: programmet, Charlottendals data, dokumenten och arbetsjournalen | Squash-merge av PR till main |
| `beahead-ab/cda-tkl-install` | Det publicerade installationsförrådet som Pi, Mac och PC installerar och uppdaterar från | Publiceras efter varje release, se nedan |
| `beahead-ab/tk-tkl` | Träkvista | Publiceras ur cda-tkl med `deploy/publish-station.sh trakvista` (`docs/stationer.md`) |
| `beahead-ab/trainmeet-server` | TrainMeet Server | **En merge startar om server.trainmeet.app: merga bara med Caspers OK.** PR-titeln märks `[patch]` eller `[minor]`, och versionsboten sätter numret. CHANGELOG "## Nästa version". |
| `beahead-ab/trainmeet-cloud`, `beahead-ab/trainmeet-tkl` | Cloud och TrainMeet TKL | Bär serverns översättningskatalog. Efter en ny sträng i servern: `node tools/sync-i18n.mjs --siblings` i servern och en PR i varje. |

Webbdriften `cda-tkl.trainmeet.app` körs på Render, som bygger om när main ändras.

## Prov

```sh
npm test                      # enhetsprov, alla ska gå igenom
npm run -s check              # syntax
npm run -s verify:operations  # tågvägar och indikeringar
npm run -s test:integration   # startar servrar; live-offline har en gång tagit för lång tid och gått igenom vid omkörning
```

## Release

1. Höj versionen på fyra ställen:
   - `package.json` (rad 3)
   - `package-lock.json` (raderna 3 och 9)
   - sidfoten i `public/index.html`
2. Lägg en post överst i `public/releases.json` (den provas).
3. Skriv ett avsnitt i `docs/arbetsjournal.md` och en rad i `docs/status.md`. Ändras gränssnittet, skriv också i
   `docs/panel-och-verktyg.md`.
4. Gör en PR och squash-merga den.
5. Publicera installationsförrådet. `$INSTALL` är en klon av `cda-tkl-install`, och kommandot körs från cda-tkl:
   ```sh
   cd $INSTALL && git pull -q && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + && \
   (cd <cda-tkl> && git archive HEAD install.sh install.ps1 package.json package-lock.json src public profiles packaging \
     scripts/start.mjs scripts/install-raspberry-pi.sh scripts/install-mac.sh scripts/locobuffer-gateway.mjs \
     scripts/serial-port.py scripts/create-owner.mjs scripts/recover-user.mjs docs/installation.md docs/raspberry-pi.md \
     docs/anvandare.md docs/loconet-anslutning.md) | tar -x -C $INSTALL && mv docs/installation.md README.md && \
   sed -i 's/](raspberry-pi\.md)/](docs\/raspberry-pi.md)/g; s/](loconet-anslutning\.md)/](docs\/loconet-anslutning.md)/g' README.md && \
   git add -A && git commit -q -m "Charlottendal TKL X.Y.Z" && git push -q origin main
   ```
6. Gör en dokumentations-PR som för in publiceringen: raden **Publicerad: X.Y.Z** (main-commit, PR-nummer,
   install-commit, datum) i `docs/status.md` och `docs/tagsparning.md`, och en publiceringsrad i arbetsjournalen.

En ändring som bara rör dokumentationen behöver ingen publicering, utom när filen finns i installationsförrådet:
`installation.md`, `raspberry-pi.md`, `anvandare.md` och `loconet-anslutning.md`.

Efter varje release brukar Casper be om "uppdatera tagsparning.md (loconet-anslutning.md, raspberry-pi.md) med X.Y.Z".
Det betyder: uppdatera publiceringsraden och lägg till en mening om vad versionen ändrar, eller om den inte ändrar
något för just det dokumentet.

## Överlämning 18 oktober 2026

**Publicerat:** 0.82.2 (cda-tkl main `bdb6601`, #78; cda-tkl-install `65039a0`; Tk-TKL `008d18b`).

**0.82.2** tar med #75 och #76 (versionsnoteringar för flera stationer och Tk-TKL på Render), som ändrade `public/` och
`packaging/` efter 0.82.1. Både cda-tkl-install och Tk-TKL har 0.82.2.

**Klart i den här omgången:**
- 0.82.0: TrainMeet ansluts med bara serverns adress och anslutningskoden.
  - TKL väljer stationen själv (`TrainMeet.connect`, `matchStation`).
  - En ny installation får eget TKL-id (`cda-tkl-pi`, `-mac`, `-pc`; Träkvista `tk-tkl…`).
  - Med LocoNet ej ansluten tas tåg som trafikspelet inte har här bort från banan efter tio sekunder
    (`TrafficTrains.stale`, `Field.removeTrain`), och spårningen glömmer dem (`TrainTracker.forget`).
  - Bakgrunden står i arbetsjournalen 17–18 oktober.
- 0.82.1: TKL hänvisar till Drift → Anslut en box i TrainMeet Server för adressen och koden.
- trainmeet-server #201 (mergad): en rad om CDA-TKL i Anslut en box. #200 (en egen sida `/anslut`) är stängd,
  eftersom Drift räcker.
- Översättningskatalogen är synkad: trainmeet-cloud #83 och trainmeet-tkl #46.

**Historiskt läge före stationsarbetet:** inga issues och inga öppna PR:er i cda-tkl, trainmeet-server, trainmeet-cloud, trainmeet-tkl, trainmeet,
trainmeet-iphone, trainmeet-tmbox eller trainmeet-hem. Alla lokala grenar hör till pull requests som redan är
sammanslagna; undantaget är `claude/anslut-sida` (trainmeet-server #200), som stängdes med avsikt.

**Kvar sedan tidigare, låg prioritet:** förslag för mätpunkterna och svar om MGP-genomgången
(`docs/genomgang-mgp-2026-10-06.md`, Studio → mätning).

**Bra att veta:**
- Tk-TKL publiceras med `deploy/publish-station.sh trakvista` efter varje release, som cda-tkl-install. Skriptet kör
  paketets prov och stannar om Tk-TKL har ändringar som saknas i cda-tkl.
- Borttagningen av tåg gäller bara med LocoNet ej ansluten. Med LocoNet ansluten rör TKL aldrig tågen.

## Förrådsnamn 18 oktober 2026

Casper bad om gemener: GitHub-förrådet heter nu `beahead-ab/tk-tkl` (samma id 1423516520 och main-commit 008d18b). Den äldre URL-stavningen Tk-TKL fungerar också. Namnbytet ändrar inga paket, profiler eller driftdata. Källpaketets äldre URL-stavning är ett giltigt alias och kan normaliseras vid en senare granskad installationsändring; publicera inget enbart för namnbytet.

## Fortsättning 18 oktober 2026: Render 0.82.10

Casper godkände ett kontrollerat byte av Charlottendals befintliga Render-tjänst. PR #89 squash-mergades till main `5560c2a`; deploy `dep-dbaeca0ae00c739lu7u0` är live med 0.82.10. PR #80–88 ingår och är stängda. Charlottendals filer ligger kvar i profiles/ och public/data/, profil-id/sourceHash och driftkatalog är bevarade. Stationernas trafik, Träkvistas offlineautomat och lokalt stationsval genom npm start ingår i programmet. Befintlig native tjänstestart och Render kör fasta stationer.

Slutlig CI 39139292652: 619 enhetsprov, 19 integrationer, två separata root-prov, 346 paketenhetsprov, syntax/källkontroller, Windows-parser och faktiskt Docker-/Chromium-prov gröna. Den sista kontrollen rättade ett timingfel efter verifierad tågvägspassage. Render-efterkontroll och privat backupjämförelse är gjorda; befintlig session, två användare, inställningar och TrainMeet bevarades, automaten är åter på.

Installationsförråden är fortfarande 0.82.2; inget publicerades till cda-tkl-install/tk-tkl och inget ändrades i TrainMeet Server. Nästa steg är Träkvistas container och därefter godkänd publicering/Caspers nya Render-tjänst. Se docs/render-release-2026-10-18.md. Slutrapporten ligger i en egen dokumentations-PR utan ytterligare main-merge; main är fortfarande en driftsättningsgren.

## Fortsättning 18 oktober 2026: 0.82.10 publicerat till installationerna

**Publicerad: 0.82.10 (18 oktober 2026; cda-tkl main `88942ef`, #90; programrelease #89; `beahead-ab/cda-tkl-install` main `e5b89e6`; `beahead-ab/tk-tkl` main `4dac44b`).**

Båda målförråden är verifierade mot publiceringsskriptens resultat: 35 respektive 57 ändrade filer och inga borttagningar. Installationsförrådets tagg `v0.82.10` pekar på `e5b89e6`. Tk-TKL saknade rättelser efter sin senaste publiceringsmarkör. Charlottendals Render-tjänst, källans main och TrainMeet Server ändrades inte i publiceringsomgången. Träkvistas faktiska Render-tjänst och fysisk bana återstår.

Vid publiceringen av 0.82.10 var #91 fortfarande utkast med grön CI på `5f53405`, och dess rättade installationsskript användes för att bevara `scripts/create-owner.mjs`, `scripts/recover-user.mjs`, `docs/anvandare.md` och `docs/loconet-anslutning.md`. Rättelsen ingår nu i main genom #93. Rena dokumentationsrapporter använder `[skip render]` enligt avsnittet nedan.

## Fortsättning 18 oktober 2026: 0.82.11 slutförd

**Publicerad: 0.82.11 (18 oktober 2026; cda-tkl main `24da68c`, #93; cda-tkl-install `4ffd4c8`; tk-tkl `33312ac`; tagg `v0.82.11`).**

#93 squash-mergades efter helt grön CI `39162680842`; #91 och #92 ingår och är stängda. Main har det rättade installationsskriptet som bevarar användarskripten och guiderna. Båda paketen är verifierade mot skriptens resultat, med fem respektive sju ändrade filer och inga borttagningar.

Charlottendal kör 0.82.11 på Render (`dep-dbaisa942hec73dm7qp0`); befintlig session, profil/källhash, TrainMeet och tio stabila filer är bevarade. Automaten var redan avstängd och är fortsatt avstängd. Det redan hållna tågvägslåset bevarades. Färsk skyddad och validerad backup togs före merge, se driftprotokollet.

Träkvistas egen Render-tjänst är nu live på https://tk-tkl.onrender.com, från tk-tkl `33312ac`, deploy `dep-dbaj7oqjnfac73fu8510`. Egen beständig disk 1 GB på `/data`, station `trakvista`, profil `trakvista-network-v1`, hälsokontroll `running` och skapad ägare är verifierade. Första inloggningen och det obligatoriska lösenordsbytet återstår hos Casper; ingen ägarsession finns ännu. Den inbyggda webbläsaren blockerade `/auth.js` med `ERR_BLOCKED_BY_CLIENT`, medan servern levererade skriptet med HTTP 200. Faktisk panelacceptans, verkliga grannar och fysisk bana återstår. Slutrapportens CI `39164669517` är också helt grön.

Renders dokumenterade `[skip render]` i commit-meddelandet används för denna slutrapport och andra rena dokumentationsuppdateringar som inte behöver en ny deploy. Ändras programmet ska en vanlig granskad och provad release göras. Ingen Render-inställning ändras av markeringen.


## Fortsättning 20 oktober 2026: Träkvistas spårplan stabil i 0.82.12

**Publicerad: 0.82.12 (20 oktober 2026; cda-tkl main `5cd6e64`, #96; cda-tkl-install `8760f3e`; tk-tkl `3d0fbf8`; tagg `v0.82.12`).**

Hela CI `39427935970` är grön. Hela låsvillkoret till `classList.toggle` är nu booleskt även utan programmeringsspår. Träkvistas containerprov kräver stabila knappar över flera rapporter, och containerjobben är fästa vid den tidigare fungerande Ubuntu 24.04-basen. Träkvista kör `dep-dbbmpuei0phs738n3io0` med bevarad ägarsession och tre byteoförändrade stabila filer. 24 avläsningar av den riktiga panelens 56 knappar var identiska. Första inloggning och lösenordsval är genomförda.

Charlottendals webbdrift är kvar på 0.82.11 genom `[skip render]`; båda installationspaketen har 0.82.12. Färsk skyddad backup och exakta publiceringsträd står i driftprotokollet. Verkliga TrainMeet-grannar och fysisk bana återstår.
