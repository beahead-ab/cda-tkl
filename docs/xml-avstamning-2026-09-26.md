# Avstämning mot Cda60.xml · 26 september 2026

Granskad lokal kod: 535f8ff, version 0.37.0. Detta är en käll- och
implementationskontroll, inte ett intyg över aktuell produktion eller fysisk drift.

## Källbevarande

`python3 scripts/verify-source.py` och `python3 scripts/import-source.py --check`
passerar. Samtliga 30 432 noder, 96 142 attribut, texter, kommentarer, ordning och
18 huvudavsnitt stämmer med den arkiverade originalfilen. SHA-256:
`c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87`.
Den tidigare angivna Desktop-sökvägen finns inte längre; ingen nyare extern XML
har jämförts. Kontrollen gäller projektets bevarade Cda60.xml.

| Objekt i källregistret | Antal |
|---|---:|
| Signalmaster / signalikoner | 66 / 66 |
| Växelobjekt / växlar i layouten | 727 / 49 |
| Sensorer / sensorikoner | 604 / 268 |
| Block / layoutblock | 404 / 198 |
| Spårsegment / anslutningspunkter | 274 / 220 |
| Spårkorsningar / vändskivor | 3 / 1 |
| Vändskivans spåranslutningar | 11 |
| Minnen / minnesikoner | 174 / 7 |
| Signallogiker / signalrelationer | 56 / 117 |
| Logixgrupper / villkorsregler | 25 / 1 377 |
| NX start–målpar | 153 |
| Etiketter / blockikoner / lokikoner | 522 / 44 / 2 |
| Objekt i andra panelen CDA CPE | 62 |
| Ljudobjekt | 3 |

Alla ovanstående är bevarade i källregistret. Växelobjekt är inte liktydigt med
fysiska växlar; tabellen omfattar även virtuella/manöverrelaterade objekt.

## Panel och driftprofil

Oberoende jämförelse direkt mot XML visar samma ID:n för alla 274 segment,
49 layoutväxlar, tre korsningar och 66 signalikoner. Sensorikonernas 268
referenser inklusive dubletter stämmer. Vändskivans elva anslutningar, index
och vinklar stämmer. Samtliga `secondturnoutname` stämmer med panelmodellen.

Panelmodellen är ett urval för visningen, inte det fullständiga källarkivet:

- 506 av 522 etiketter finns i panelmodellen. De övriga är två gamla
  stationsrubriker, D, fyra färgkodsetiketter samt nio rubriker/fältnamn för
  inkommande tåg. Alla 522 finns kvar i källregistret. Moderna stations- och
  tåginformationsvyer ersätter delar av den äldre presentationen.
- 583 namngivna växeldefinitioner finns i panelmodellen; de 144 övriga saknar
  användarnamn. Alla 727 finns kvar separat i källregistret.
- Renderingen döljer avsiktligt dolda objekt, äldre ram/manöverfält och delar
  som ersatts av separata verktyg. Vändskivans fyra dekorativa diamantsegment
  ersätts nu av en cirkel och spårbrygga; originalgeometrin är bevarad.
- De två lokikonerna och den andra panelen är källbevarade, inte en identisk
  återgivning av hela JMRI-gränssnittet.

`npm run verify:operations` passerar. Driftprofilen innehåller 49 växlar,
197 block och 66 signaler, 340 grundvägar samt genererade alternativ.
Detta betyder inte att samtliga importerade JMRI-regler körs.

Återstående begränsningar i aktuella käll-/profilkontroller:

- 15 vägpar saknar sammanhängande granskad grafväg; tre huvudvägsregler har
  olösta källvillkor.
- 329 signalaspekter är registrerade; 19 källutgångar saknas. Full fysisk
  signalbeskedsmappning är inte verifierad.
- Delar av de virtuella spårledningsreglerna, signalautomatiken och
  rangeröverlämningen återstår.
- Tolv externa Jython-skript saknas. Skriptanropens bevarande innebär inte
  att skriptens beteende har återskapats.
- Vändskivans manöver och positionssensorer är inte anslutna.
- MGP-adresser, polaritet, lägesåterrapport och lokala dekoderregler behöver
  avstämmas mot faktisk utrustning.

## Var växelberoendena ligger

XML innehåller sju layoutkopplingar:
Vx100–Vx101, Vx110–Vx117, Vx111–Vx118, Vx120–Vx121,
Vx140–Vx142, Vx153–Vx161 och Vx162–Vx165.
Dessa finns i TKL:s topologimodell. Separat finns två Logix-regler för
Vx95/Vx96 (`IX:AUTO:0007C33/C34`), med olika `triggersCalc`-inställning;
de är inte likställda med en ständig dubbelriktad koppling.

Både JMRI och MGP kan konfigurera växelberoenden:

- JMRI kan använda layoutens andra växel, Routes och Logix för samverkan.
  https://www.jmri.org/help/en/html/tools/Routes.shtml
  https://www.jmri.org/help/en/package/jmri/jmrit/display/EditLayoutTurnout.shtml
- MGP:s Switch5 har uttryckligt stöd för växelberoenden, regelvillkor och
  lokala växelvägar. Möjligheterna måste kontrolleras mot installerad modell
  och firmware. Produktbeskrivning och instruktion:
  https://www.mollehem.se/index.php/dekodrar-loconet/vaxeldekoder-5-detail
  https://mollehem.se/doc/instruktioner/Instruktion_Switch5.pdf

Rekommendation för denna lösning: TKL äger tågvägsval, reservationer och
förregling. Eventuella lokala MGP-följdregler dokumenteras och återspeglas i
TKL:s resurskontroll, så att en lokal order inte oväntat flyttar en annan låst
växel. Bestäm en ansvarig för varje automatisk följdmanöver innan aktivering.
XML-filen är inte en verifierad avläsning av dekodrarnas interna inställningar.
