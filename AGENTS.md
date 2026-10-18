# För agenter som arbetar i cda-tkl

Charlottendal TKL (CDA-TKL), Caspers ställverk mot TrainMeet. Allt skrivs på svenska: dokument, commits och PR:er.
Läget och historiken står i `docs/status.md` och `docs/arbetsjournal.md`, och flera stationer (Charlottendal och
Träkvista) beskrivs i `docs/stationer.md`.

## Förråden

| Förråd | Vad | Att tänka på |
|---|---|---|
| `beahead-ab/cda-tkl` | Det här: programmet, Charlottendals data, dokumenten och arbetsjournalen | Squash-merge av PR till main |
| `beahead-ab/cda-tkl-install` | Det publicerade installationsförrådet som Pi, Mac och PC installerar och uppdaterar från | Publiceras efter varje release, se nedan |
| `beahead-ab/Tk-TKL` | Träkvista | Publiceras ur cda-tkl med `deploy/publish-station.sh trakvista` (`docs/stationer.md`) |
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

**Öppet:** inga issues och inga öppna PR:er i cda-tkl, trainmeet-server, trainmeet-cloud, trainmeet-tkl, trainmeet,
trainmeet-iphone, trainmeet-tmbox eller trainmeet-hem. Alla lokala grenar hör till pull requests som redan är
sammanslagna; undantaget är `claude/anslut-sida` (trainmeet-server #200), som stängdes med avsikt.

**Kvar sedan tidigare, låg prioritet:** förslag för mätpunkterna och svar om MGP-genomgången
(`docs/genomgang-mgp-2026-10-06.md`, Studio → mätning).

**Bra att veta:**
- Tk-TKL publiceras med `deploy/publish-station.sh trakvista` efter varje release, som cda-tkl-install. Skriptet kör
  paketets prov och stannar om Tk-TKL har ändringar som saknas i cda-tkl.
- Borttagningen av tåg gäller bara med LocoNet ej ansluten. Med LocoNet ansluten rör TKL aldrig tågen.
