# Flera stationer: Charlottendal och Träkvista

17 oktober 2026. Hur Charlottendal och Träkvista delar program men hålls isär, hur Träkvistas förråd publiceras och hur
rättelser därifrån kommer tillbaka. Träkvistas eget läge står i [Träkvista TKL](trakvista.md), förstudien i
[Träkvista och flera stationer](trakvista-forstudie.md).

## Två förråd, ett program

| | cda-tkl (privat) | Tk-TKL (privat) |
|---|---|---|
| Innehåll | Programmet, Charlottendal och Träkvista, arbetsjournalen, driftsättningen, hela historiken | Programmet och Träkvista, inget mer |
| Utvecklas | Här: programmet och båda stationernas källor | Publiceras härifrån, en commit per publicering |
| Installeras från | `beahead-ab/cda-tkl-install` (publikt, `deploy/publish-install.sh`) | `beahead-ab/Tk-TKL` själv |
| Benny | Har inte tillgång | Kan få tillgång |

Programmet är detsamma i båda. En rättelse i kärnan görs i cda-tkl och provas där mot båda stationerna
(`test/trakvista.test.mjs` kör Träkvistas 57 tågvägar), och når Träkvista vid nästa publicering. Charlottendals data
(`profiles/`, `public/data/` med Cda60.xml), dess generatorer och de prov som läser dess filer följer aldrig med till
Tk-TKL; inte heller dokumenten utom de som `installation.docs` i `stations/trakvista/station.json` räknar upp.

## Publicera Tk-TKL

```sh
deploy/publish-station.sh trakvista          # programmet och Träkvista ur HEAD till beahead-ab/Tk-TKL
```

Skriptet bygger paketet ur en commit i cda-tkl (aldrig ur arbetsträdet), ger det Träkvistas identitet
(`scripts/make-station-repository.mjs`: tk-tkl, README ur `stations/trakvista/README.md`), kör proven i paketet och
pushar en commit, *Publicerad från cda-tkl <commit> · Träkvista TKL <version>*. En Pi med Träkvista hämtar den med
`sudo tk-tkl-update`. Första gången ersattes Tk-TKL:s historik med `--first`.

## Rättelser från Tk-TKL

Rättar Benny något i Tk-TKL, i programmet eller i `stations/trakvista/`, tas det in i cda-tkl innan nästa publicering.
Sökvägarna är desamma i båda förråden, så commiten går att lägga på direkt:

```sh
git -C ../Tk-TKL pull
git -C ../Tk-TKL format-patch --stdout <senaste publicering>..main | git am -3
```

Publiceringen jämför varje fil som ändrats i Tk-TKL sedan förra publiceringen med det som ska publiceras. Saknas en
ändring stannar den och visar commit och filer, så att inget i Tk-TKL skrivs över.

## Jämförelse

| | Charlottendal | Träkvista |
|---|---|---|
| JMRI | 5.8, Logix: 25 grupper, 1 377 conditionals | 5.10, LogixNG: 24 grupper, 339 ConditionalNG, 13 moduler, 38 CSV-tabeller |
| Externa Jython-skript | 12, saknas | 5, saknas (RemoteControl, BlockSignaling, TamSignaling, CheckMqtt, Automaten) |
| Panel | 2182 × 1320, 274 segment | 976 × 412, 83 segment |
| Växlar | 49, kompisväxlar, 3 spårkorsningar, vändskiva | 13: 9 på LocoNet, 4 interna (lokala), en dubbel korsningsväxel |
| Huvudtågvägar | 210 | 27 |
| Växeltågvägar | 130, 15 undantagna | 30, inga undantagna |
| Signaler | 66, varav 13 utan utgång, bildsats mod59 | 25, alla med utgång, mod68 eller mod59 efter panelmodell |
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
