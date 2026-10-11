# Arkitektur

```mermaid
flowchart LR
  UI[TKL-panel · tre utseenden] <-->|HTTP + händelseström| Core[Lokal TKL-kärna]
  Core <--> Store[Lås och journal på disk]
  Core <-->|LocoNet-over-TCP · SEND / RECEIVE| Buffer[Simulerad LocoBuffer]
  Buffer <-->|B0 / B1 / B2 / E4| Field[Separat anläggningsmodell]
  Control[Anläggningens provpanel] <-->|Eget HTTP-gränssnitt| Field
  TrainMeet[TrainMeet · framtida adapter] -.-> Core
```

TKL-kärnan importerar inte simulatorn, läser inte dess driftdata och anropar inte dess HTTP-gränssnitt. Endast dess konfigurerade LocoNet-adresser och telegram används. Samma parser och tågvägslogik ska senare kunna användas med en riktig gateway. En faktisk seriell adapter återstår att implementera.

`profiles/charlottendal.json` och `profiles/simulator.json` är statiska konfigurationer som genereras från samma adressunderlag. De är inte delat drifttillstånd. Katalogen i simulatorn beskriver bara fördefinierade detektorföljder för tåg; inga TKL-tågvägs-ID:n överförs på bussen.

## Tågvägens livscykel

1. Kontrollera aktuella fria detektorer, stoppbesked samt konflikter med kvarvarande lås.
2. Spara reservationerna innan växelorder skickas.
3. Vänta på rätt rapporterade växellägen; eko på B0 räcker inte. Växlar som delas i samma läge manövreras inte om.
4. Visa flödet genom den etablerade vägen. Det är en presentation på 1,2 sekunder; alla villkor kontrolleras även under denna tid.
5. Begär kör från sista signalen bakåt och invänta varje signals faktiska besked. Rapportkod kan fortfarande vara stopp trots begärt kör.
6. Vid beläggning eller fel begärs stopp och reservationerna ligger kvar. Provversionen har ingen automatisk sektionsvis upplåsning.
7. Återtagning inväntar fria avsnitt, aktuella kända växellägen och stopp på relevanta signaler innan låsen släpps. Ny körning kräver ny beställning.

**Återrapporternas aktualitet (sedan 0.77.0).** MGP-korten upprepar inga rapporter (Bennys trace 10 oktober 2026), så TKL
gör som JMRI: en växel- eller signalrapport gäller tills förbindelsen bryts. Ingångarna frågar kärnan av vid anslutning och
sedan var 15:e sekund, med JMRI:s åtta avfrågningsramar en sekund isär (`interrogateMs` och `interrogateStepMs` i profilen).
En ingång som inte svarat på 40 sekunder (`staleMs`) blir okänd, så att ett tyst kort aldrig betyder fritt. Vid anslutning
begär kärnan också stopp i alla signaler och normalläge i programmeringsreläet; korten svarar på ordern.

En växel är okänd tills den får en order, av en tågväg, av operatören eller av rangeraren; kärnan lägger ingen växel av sig
själv. En växel *rör sig* när den fått en order under förbindelsen och inte rapporterat sedan dess. Bara en växel som rör
sig hindrar handmanöver, lägesbyte och återtagning; en okänd växel som inte rör sig gör det inte, så en tågväg som hålls
efter en omstart kan återtas utan växelorder. Vid aktivering av driftbindningar krävs en växelrapport sedan anslutningen
bara för de växlar vars bindning ändras. Simulatorn gör som korten: den rapporterar vid ändring, order och avfrågning, inget
annat. Tystnadsvakten kopplar ned efter 40 sekunder utan trafik; avfrågningen ger trafik var 15:e sekund.

## Filer

| Del | Ansvar |
|---|---|
| `src/engine.mjs` | Tågvägar, reservationer, tillstånd och kommandon |
| `src/protocol.mjs` | Telegram, kontrollsummor och strömavkodning |
| `src/transport.mjs` | LocoNet-over-TCP, kvittenser och återanslutning |
| `src/server.mjs` | Lokal API-server och händelseström till panelen |
| `src/storage.mjs` | Atomisk filersättning och journal |
| `src/field.mjs`, `src/simulator.mjs` | Oberoende anläggning och buffert |
| `src/topology.mjs` | Importerad graf, växelkopplingar och sökning |
| `public/` | Panel, tre utseenden, simulatorpanel, tillgångar och originaldata |

Ingen extern JavaScript-kod eller font laddas. HTTP-servrarna lyssnar endast lokalt och kontrollerar Host/Origin samt JSON för ändrande anrop. Lokal körning behöver ingen inloggning. Webbdriften har lösenordsskydd och systemtjänster enligt driftbeskrivningen. Det kompletta XML-registret är skrivskyddat och laddas vid behov; det driver inte automatiskt förreglingskärnan.
