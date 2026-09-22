# TrainMeet – underlag inför anslutning

23 september 2026. Läsande förstudie; ingen TrainMeet-installation har ändrats eller anslutits.

Lokalt källunderlag finns i `/Users/casper/Documents/Codex/2026-08-10/jag-2/work/trainmeet-server-tkl-fix`, commit `63f3fd1` från 18 september. Det är en arbetsgren och inte bevis på vilken version som kör i drift. Kopior av andra server-/molnreleaser finns i samma överordnade arbetsyta. Den lokala `main`-arbetskatalogen är äldre och ska inte antas vara aktuell.

## Två befintliga gränssnitt

- `src/tmbox_gateway/http_server.py` visar ett klientparat HTTP-gränssnitt: `POST /v1/pair`, `GET /v1/tkl/context?station_id=…`, `POST /v1/tkl/shift/start`, `/shift/finish`, `/movement`, `/clearance`, `/line-available`. Kontexten innehåller aktiv träff/dag, station, terminal, skift, tågrörelser och förbindelsetillstånd. Stationsbehörighet kontrolleras av servern.
- `docs/protocol/v2/README.md` beskriver separat TMBox-protokoll över MQTT: enhetsregistrering, tilldelning, konfiguration, kommandon, kvittenser och retained snapshots. `message_id`, `expected_revision` och avslag på gamla revisioner ingår. Återanslutning använder kompletta retained snapshots, inte återspelning av händelser. All trafiktid är träffklockan.

Välj gränssnitt efter att aktuell serverversion och driftsätt är fastställda. Använd inte TMBox:s äldre beskrivning av ett isolerat lokalt nät som grund för att exponera en molnanslutning utan dess normala autentisering.

## Föreslagen ansvarsfördelning att implementera

TrainMeet äger träff, klocka, tågnummer, rörelser, stationsuppdrag och tågklareringsutbytet. Charlottendal TKL äger lokala tågvägar, växel- och signalmedgivanden, administrativa spärrar samt lås. Fysiska besked kommer endast genom anläggningens bussanslutning.

En spårtilldelning eller ett klareringsmeddelande är ingen fysisk beläggningsrapport och får aldrig skriva en detektor fri. Ett upptäckt tågnummer behöver knytas till en verifierad fysisk passage eller uttryckligt operatörsval; ett nummer ensamt får inte lösa upp lås.

Nästa steg: verifiera aktiv versions kontrakt och parningsmekanism, koppla dess station/spår-id till XML-objekt i ett versionslagrat ändringslager, och börja med läsning av klocka och tågrörelser. Prova omleverans, gamla revisioner och återanslutning utan dubbla manövrer före skrivande integration. Befintliga TrainMeet-system ska inte ändras som en genväg för TKL-provet.
