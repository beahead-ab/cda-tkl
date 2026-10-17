# Träkvista i cda-tkl · kopian körs, och jämförelsen med Charlottendal

17 oktober 2026. Fortsättning på [förstudien](trakvista-forstudie.md). Underlag: Bennys `Trakvista.xml` (JMRI 5.10.0) och
hans 38 CSV-tabeller (`Tk-csvfiler.zip`), båda i `stations/trakvista/`.

## Kort svar

Ja, cda-tkl går att kopiera och köra som Träkvista. Kopian är branchen `claude/trakvista-station-config-3aacbi`: den är
hela cda-tkl, skild från main och därmed från webbdriften på Render. Träkvista körs där med samma kärna, samma
anläggningssimulator och samma panel som Charlottendal. Alla 27 huvudtågvägar och 30 växeltågvägar läggs, klareras och
löses upp efter tågets passage, både i proven och över den riktiga servern med simulerad LocoNet. Charlottendal fungerar
som förut på samma branch, och alla Charlottendals genererade filer är oförändrade.

Jämförelsen talar för en gemensam plattform: en motor och en stationskatalog per station, inte två kopior. Det som
behövde ändras i den delade koden för att få Träkvista att köra var litet och gällde sådant som Charlottendal inte har
(korsningsväxel, lodrät linje, egna växlingsknappar, lokalt styrda spår). Det stationsbundna sitter i källorna och i de
handskrivna Charlottendal-funktionerna, inte i kärnan.

## Starta Träkvista

```sh
npm run start:trakvista          # TKL och anläggningen för Träkvista, på de vanliga portarna 8910–8912
npm run import:trakvista         # återskapa Träkvistas filer ur Trakvista.xml och CSV-tabellerna
npm run verify:trakvista         # kontrollera att de genererade filerna är aktuella
node --test test/trakvista.test.mjs
```

Stationen väljs med `CHARLOTTENDAL_STATION=trakvista`; utan den startar Charlottendal som förut. Träkvistas driftdata
ligger i `var/trakvista/`, så två stationers lås blandas aldrig. Kör inte båda samtidigt på samma portar.

![Träkvista i TKL](trakvista-tkl.png)

Bilden: A → Spår II och växeltågvägen 1/7 → 4s lagda genom att klicka i panelen. Lokspåren, Tankplatsen och
Timmerlossningen är ritade ofyllda, som i Bennys panel.

## Vad som gjordes

| Del | Fil | Vad |
|---|---|---|
| Spårplan | `scripts/import-layout.py` | JMRI:s LayoutEditor till panel.json, med korsningsväxlar. Ger exakt Charlottendals panel.json (`npm run verify:layout`). |
| Regler | `scripts/import-logixng.py` | Huvud- och växeltågvägar, NX-par, ankarpunkter, växelben och spårledningar ur LogixNG-träden. Blocklistorna i CSV-tabellerna som kontroll. |
| Profil | `scripts/make-station-profile.mjs` | Driftprofil och fältprofil med samma bibliotek som Charlottendals generator. |
| Stationsfil | `stations/trakvista/station.json` | Knapp → spår, linjerna A, B, C, lodrät riktning, lokala växlar, panelens stil. |
| Stationsval | `src/station.mjs` | `CHARLOTTENDAL_STATION`, stationens data och driftdatakatalog. |
| Kärnan | `src/topology.mjs`, `src/route-policy.mjs`, `src/exit-route.mjs`, `src/train-tracking.mjs` | Dubbel korsningsväxel och riktning på lodrätt spår. |
| Panelen | `public/app.js` m.fl. | Korsningsväxeln, ingen vändskiva, vtv-knapparna, ofyllda lokala spår, stationens namn. |
| Prov | `test/trakvista.test.mjs` | Tio prov, bland annat alla 57 tågvägar mot simulatorn. |

Ändringen i den delade koden är ungefär 140 rader i 15 filer. De nya generatorerna är cirka 380 rader.

## Jämförelse

| | Charlottendal | Träkvista |
|---|---|---|
| JMRI | 5.8, Logix: 25 grupper, 1 377 conditionals | 5.10, LogixNG: 24 grupper, 339 ConditionalNG, 13 moduler, 38 CSV-tabeller |
| Externa Jython-skript | 12, saknas | 5, saknas (RemoteControl, BlockSignaling, TamSignaling, CheckMqtt, Automaten) |
| Panel | 2182 × 1320, 274 segment | 976 × 412, 83 segment |
| Växlar | 49, kompisväxlar, 3 spårkorsningar, vändskiva | 13: 9 på LocoNet, 4 interna (lokala), en dubbel korsningsväxel |
| Huvudtågvägar | 210 | 27 |
| Växeltågvägar | 130, 15 undantagna | 30, inga undantagna |
| Signaler | 66, varav 13 utan utgång, bildsats mod59 | 25, alla med utgång, bildsats mod68 |
| Spårledningar | 197, varav 162 med ingång | 36, varav 25 med ingång |
| Linjer | 7 riktade spår (dubbelspår) | 3 enkelspår med körriktning och TAM |
| Växelns återrapport | Växelrapport B1 | Två sensorer per växel (TWOSENSOR) |
| Lokal styrning | Hela stationen lokal eller fjärr | Per spår: ofyllda spår bara lokalt |
| Växling startas | Från signalen | Med egna vtv-knappar vid signalen |
| Grannarna | TrainMeet | MQTT och konfigurationsserver |
| Egna funktioner | Spår 6, rangerbangården, programmeringsspåret, V1–V4, vändskivan | Timmerspår, lokstall, automatiskt tågmöte och tågpassering |

## Det som är gemensamt

Kärnan, LocoNet-protokollet, förbindelsen, anläggningssimulatorn, spårgrafen, vägvalet, signalplanen, frigivningen,
panelens ritning och manöver, TrainMeet, Stream Deck, tidtabellen, användarna och installationen. Allt detta körde
Träkvista utan stationsspecifik kod, sedan korsningsväxeln och den lodräta riktningen fanns.

## Det som är stationens eget

- **Källan och importören.** Charlottendal har Logix och Träkvista LogixNG. Importörerna skriver samma kontrakt
  (`operations-source.json`), så resten av kedjan är gemensam. Bennys andra stationer (Bilbo) har troligen samma
  LogixNG-mall och kan använda Träkvistas importör.
- **Stationsfilen.** Knapparnas spår, linjerna, riktningen på lodrätt spår, lokala växlar och panelens stil.
- **Charlottendals handskrivna funktioner.** Spår 6, rangerbangården, programmeringsspåret, V1–V4 och automatens
  spårordning ligger kvar i koden och gäller bara Charlottendal. De bör flyttas till stationsfilen eller egna moduler.

## Kvar för Träkvista

1. **Linjerna A, B och C.** Klareringen och tågen på linjen följer i dag Charlottendals orter (Au, An …).
   Enkelspåret med körriktning, Linjen fri, Tåg på linjen och TAM behöver läsas ur stationsfilen. Lamporna syns i
   panelen men är inte kopplade.
2. **Växlarnas återrapport via två sensorer.** Kärnan läser växelrapport B1. Bennys växlar rapporterar på två ingångar.
3. **Lokalt styrda spår.** De är märkta och ritade, men kärnan hindrar ännu inte fjärrstyrning av dem.
4. **Bildsatsen mod68.** Panelen använder mod59-bilderna tills mod68 finns med proveniens.
5. **Studio.** Studio bygger på Charlottendals källor och är avstängt för Träkvista.
6. **Manöver av enskild växel.** Regeln är härledd ur grafen, inte översatt från gruppen *Spärra växlar*.
7. **Automatiskt tågmöte, tågpassering och Friställd** finns inte. De bygger på Bennys Automaten.py.

## Att fråga Benny

- De fem Jython-skripten, särskilt BlockSignaling.py, TamSignaling.py och Automaten.py.
- Tre växlar har avvikande återrapport i XML. Vx31 har sensorerna i omvänd ordning (vx31-c före vx31-t). Vx21a läser
  21b:s sensorer (vx21b-c, vx21b-t). Vx21b läser ir21a och ir21b. Det finns inga sensorer vx21a-t och vx21a-c.
- Tabellen `23-37.csv` (2/3 → 3/7) listar S22a och S22c. Tågvägen går över S21a, S21b och SIII, så tabellen ser ut att
  vara kopierad från 2/4 → 2/6. De andra 29 tabellerna med motsvarande tågväg stämmer exakt.
- Hur växlarna 10–13 läggs. De är interna i JMRI och har ingen LocoNet-adress; TKL ger dem en bänkadress i simuleringen.
  Växeltågvägen 2/6 → 4v går genom Vx13.
- Konfigurationsserverns format, om grannarna ska komma därifrån i stället för TrainMeet.

## Kopia eller plattform

En separat GitHub-kopia går att skapa med ett kommando från branchen, eftersom den har hela historiken. Den här
sessionen kan bara skriva till cda-tkl, så ett nytt förråd behöver skapas av en ägare i beahead-ab.

Rekommendationen är ändå en gemensam plattform. Två kopior skulle dela samma kärna men utvecklas isär; varje rättelse i
kärnan skulle behöva göras två gånger. Den här branchen visar att samma kod bär båda stationerna med ett stationsval.
Nästa steg är att flytta Charlottendals källor till `stations/charlottendal/` och dess handskrivna tabeller till
stationsfilen, och att läsa linjerna ur stationsfilen.
