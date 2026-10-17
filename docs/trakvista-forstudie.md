# Träkvista och flera stationer · förstudie 15 oktober 2026

> **17 oktober:** Träkvista körs nu i cda-tkl på branchen, med Bennys CSV-tabeller som kontroll. Se [Träkvista TKL](trakvista.md) för hur den startas och vad som gjordes, och [Flera stationer](stationer.md) för jämförelsen med Charlottendal.

Caspers fråga: kan cda-tkl bli en TKL för Bennys Träkvista, och kan Träkvista ses som en konfiguration av cda-tkl så
att flera stationer kan konfigureras? Underlag: Bennys `Träkvista.xml` (JMRI 5.10.0, sparad 10 oktober 2026, nu i
`stations/trakvista/Trakvista.xml`, SHA-256 `3e7b63c9…97e79`), hans skärmbild och brev, dagens kod och det tidigare
svaret i [arbetsjournalen](arbetsjournal.md) från 11 oktober. Förstudien aktiverar ingenting; den ändrar ingen
Charlottendal-funktion.

## Kort svar

Ja. Kärnan (`src/engine.mjs`, `src/protocol.mjs`, `src/transport.mjs`, `src/field.mjs`) är stationsoberoende och
styrs helt av profilen. Det stationsbundna är vägen från JMRI-XML till profil och ett tjugotal filer med handskrivna
Charlottendal-tabeller. Förslaget är en motor och en stationsfil per station, med Charlottendal som första och
Träkvista som andra. Uppskattning: två till tre veckor, i den övre delen av bedömningen från 11 oktober, eftersom
Träkvista skiljer sig på fyra punkter som kostar arbete (LogixNG, växelrapport via två sensorer, enkelspår med
körriktning, dubbel korsningsväxel).

## Det som provats i förstudien

**Spårplan ur JMRI utan handpåläggning.** `scripts/import-layout.py` läser LayoutEditor-panelen i en JMRI-fil och
skriver samma struktur som `public/data/panel.json`: segment med beräknade ändpunkter, växlar, korsningar, vändskiva,
texter, sensor-, signal-, block- och minnesikoner, layoutblock och namntabeller, plus en ny sektion `slips` för
korsningsväxlar. Mot `Cda60.xml` ger den exakt dagens panel.json (274 segment, 49 växlar, 3 korsningar, vändskivan, 268
sensorikoner, 66 signalikoner, 198 layoutblock, 583 växelnamn, 604 sensorer, beskedstabellen). Enda skillnaden är 16
dekorativa texter (titeln, fyra färgkoder, nio fält i nederkanten, ett dolt D) och sju växelnummer som designexporten
dolde för hand. `npm run verify:layout` bevakar det. Därmed har panel.json en generator, vilket den saknade.

**Träkvista går igenom.** Panelen Träkvista (976 × 412) ger 83 segment, 11 växlar, 1 dubbel korsningsväxel
(Vx22a/Vx23), 94 sensorikoner, 25 signalikoner, 36 layoutblock, 31 signalmaster, 277 sensorer och 47 namngivna
växelobjekt. Bilden ritad ur den konverterade planen stämmer med Bennys skärmbild. Tre sidopaneler (A-sida, B-sida,
C-sida) hänger på huvudpanelen med EDGE_CONNECTOR och beskriver linjen vid varje gräns.

**Huvudtågvägarna följer samma mönster som Charlottendals.** LogixNG-gruppen *Ställa huvudtågväg* har 42 ConditionalNG;
27 av dem är tågvägsregler med exakt två NX-knappar var: 12 infarter (A, B, C mot spår I, II, III, IIIa, IIIc), 11
utfarter och 4 genomfarter (A–B, A–C, B–A, C–A). Charlottendals `IX:AUTO:0013` läses på samma sätt (tryckt först plus
två tvs-knappar), så `RoutePolicy` och `make-network-profile` kan användas oförändrade när paren väl är utlästa.

**Vägsökningen.** `Topology` ur den konverterade planen hittar 6 av 27 vägar med dagens kod. Med två tillägg i en
lokal kopia hittar den 27 av 27: korsningsväxeln som nod med A–C, A–D, B–C, B–D och lägena för Vx22a och Vx23 ur
slipens `states`, och en uttrycklig tabell knapp → spår (htvA → SA2, htvIII → SIII, htvIIIA → SIIIa …) i stället för
Charlottendals `htvSp`-heuristik. Exempel: B → Spår I går SB2, SB1, S22a, S22c, S32, S34, SI med Vx22a rakt, Vx23
rakt, Vx22c rakt, Vx32 och Vx34 avvikande.

## Inventering av Träkvista

| Del | Innehåll |
|---|---|
| JMRI | 5.10.0, LogixNG: 24 grupper, 339 ConditionalNG, 1 042 uttryck, 2 222 åtgärder, 13 moduler, 110 globala variabler, 38 CSV-tabeller |
| Växlar | 9 på LocoNet (LT1–LT13) med rapport TWOSENSOR via LS212–LS258 (vx31-t/vx31-c …), 4 interna utan adress (Vx10–Vx13, IT1–IT4), 1 dubbel korsningsväxel Vx22a/Vx23 |
| Signaler | 25 fysiska master SE-TSFS-2010 (dvsi_4 ×9, hdvsi_5 ×6, hsi_5 ×3, hsi_7 ×3, ssi_2 ×4) på utgångarna LT100–LT132, med beskedstabeller i XML; 6 virtuella hsi_7 för linjerna (AInSignal, AOutSignal …); bildsats mod68 |
| Spårledningar | 25 interna block (SA1, SA2, S21a … SIV, SSI, SSII) med LocoNet-ingångar LS200–LS245 (sl*) och ir* i växlarna; regler i gruppen *Spårledningar* (25 ConditionalNG) |
| Knappar | htvA, htvB, htvC, htvI, htvII, htvIII, htvIIIA, htvIIIC; tvs som i Charlottendal; växeltågvägsknappar heter vtv1.4 … (Charlottendal: tvv) |
| Tågvägar | 27 huvudtågvägar; *Ställa växeltågväg* 30 ConditionalNG och 33 NX-par; 24 signalmastlogiker; 32 tågvägstabeller (`tables/14-26.csv` …) |
| Linjer | A (Bilbo), B (Charlottendal), C (ej ansluten, lila, etikett XX): enkelspår med Körriktning, Linjen fri, Tåg på linjen, Inkommande TAM med Accept/Neka |
| Annat | Driftplatslås LS50/LT50 (K16), Friställd, Automatiskt tågmöte, Automatisk tågpassering, Avgång mot A respektive B/C från spår I–III |

Benny: ofyllda spår (Lokspår 1–2, Tankplats, Timmerlossning, växlarna 10–13) är bara lokalt styrda, övrigt ska kunna
fjärrstyras; 23 och 22a är ofyllda av misstag. Vilka block som ritas ofyllda bestäms av `blocks.csv` genom modulen *Ändra
panelens spårfärg*, inte av XML.

## Det som skiljer från Charlottendal

1. **LogixNG i stället för Logix och Jython.** `scripts/import-operations.py` läser `conditionals`; Träkvista har
   inga. Reglerna ligger som socketträd över `LogixNGDigitalActions` och `LogixNGDigitalExpressions`, med moduler och
   CSV-tabeller. Förstudiens läsare för huvudtågvägarna visar att trädet går att följa deterministiskt.
2. **Växelläge via två sensorer.** Varje LocoNet-växel rapporterar läget på två ingångar på signalkortet. Profilen
   behöver en bindningstyp för det; kärnan läser i dag växelrapporten B1 på växelns adress.
3. **Enkelspår med körriktning.** Charlottendals sju linjer är riktade spår. Träkvistas tre är dubbelriktade med
   Körriktning per linje. Linjemodellen i `src/operating-policy.mjs` och klareringen behöver den varianten.
4. **Dubbel korsningsväxel.** Saknas i Charlottendal: `Topology`, panelens ritning, Studios plan och tågspårningen
   behöver noden. Kärnan behöver inget nytt; tågvägen bär båda växlarna med sina lägen.
5. **MQTT och konfigurationsserver.** Bennys panel är en nod (`nodeId tk`) som hämtar sin konfiguration från
   `http://mqtt-broker.local/`, får etiketterna (stationA/B/C, tågnummer) därifrån och sänder status och TAM över MQTT.
   I TKL motsvaras det av TrainMeet: orter per linje, klarering och tåg på linjen. Inget av det behöver byggas om.
6. **Bildsats mod68** för signalerna; `public/assets/mod59` räcker inte. Ikonerna tas in från JMRI med proveniens
   som mod59.
7. **Utanför XML:** `htv-buttons.csv`, `vtv-buttons.csv`, `other-buttons.csv`, `blocks.csv`, `texts.csv`,
   `tidtabell.csv` och de 32 tågvägstabellerna ligger i Bennys JMRI-profil.

## Det stationsbundna i dagens kod

- Importkedjan: `import-operations.py` (Logix-grupperna 0012, 0013, 0019, 0023, 0025), `make-network-profile.mjs`
  (Spår 6/IS266, `shunt-catalog-review.json`, Vx-undantag), `make-rules`, `make-migration`, `make-train-fields`,
  `make-signal-catalog.py`, `make-indications` (V1–V4), `make-signal-endpoints`; `import-source.py` är generell
  sånär som på sökvägen och sammanslagningen med äldre `admin.json`.
- Handskrivna tabeller: linjerna och knapparna i `src/operating-policy.mjs`, grannarna i `public/destination-data.js`,
  spårordningen i `src/train-automation.mjs`, rangerbangården i `src/yard-*.mjs` och `src/ranger-*.mjs`, vägskydden i
  `src/crossing-indications.mjs`, `htvSp`-heuristiken, beskärningen vid y < 850 och *perrong* i `src/topology.mjs`.
- Namn och titlar i ett fyrtiotal filer (`Charlottendal` i sidhuvud, titlar, filnamn vid export, localStorage-nycklar,
  Studios texter, `profiles/charlottendal-*.json`, `public/data/source/Cda60.xml`), miljövariablerna `CHARLOTTENDAL_*`
  och tjänstenamnen i `deploy/` och `packaging/`. Proven räknar Charlottendals antal (210, 130, 49, 66, 197).

## Förslag: motor och stationsfil

```
stations/
  charlottendal/   source/Cda60.xml · station.json · genererat: panel.json, admin.json, operations-source.json, profiler
  trakvista/       Trakvista.xml (finns) · station.json · genererat på samma sätt
```

- `station.json` bär det som i dag är handskrivet: id och namn, linjer med riktning och grannar, knapp → spår,
  bildsats, beskärning, undantag (Spår 6, rangerbangården, vägskydden) och vad som är lokalt styrt.
- Servern väljer station med en miljövariabel (`CHARLOTTENDAL_STATION`, standard `charlottendal`) och serverar den
  stationens data och profiler. En installation kör en station, som i dag: TrainMeet parkopplar en station per TKL, och
  Pi:n står på stationen. Flera stationer i samma process behövs inte.
- Importkedjan blir per station med samma kontrakt (`operations-source.json`: huvud- och växeltågvägspar, NX-par,
  signalrelationer, spårledningsregler), med en läsare för Logix och en för LogixNG.
- Gränssnittet tar titel och sidfot ur profilen, localStorage-nycklar ur stations-id, och ritar korsningsväxlar.

## Steg och uppskattning

1. Stationskatalog och val av station: flytta Charlottendals källor och genererade filer utan beteendeändring, alla
   prov gröna. 1–2 dagar.
2. Generell spårplan: `import-layout.py` (klar), korsningsväxel i `Topology`, panelen, Studio och tågspårningen,
   knapp → spår ur stationsfilen. 1–2 dagar.
3. LogixNG-läsare för Träkvista: huvudtågvägar (klart i förstudien), växeltågvägar, spårledningsregler,
   signalmastlogik, `blocks.csv`. 2–3 dagar.
4. Träkvistas profil och simulatorprofil: adresser ur XML, växelläge via två sensorer, beskedstabeller per signal,
   virtuella linjesignaler, enkelspår med körriktning, driftplatslåset; etablerings- och passageprov för alla vägar.
   3–5 dagar.
5. Panelen: mod68 med proveniens, TAM-rutorna som klareringen, Linjen fri, Körriktning, Tåg på linjen, Friställd och
   automatiken. 2–3 dagar.
6. Driftsättning hos Benny som för Charlottendal: mätning objekt för objekt i Studio, TrainMeet-parkoppling för
   Träkvista, installation på Pi.

## Beslut som behövs

- En station per installation (rekommenderas) eller flera i samma process.
- Katalogen `stations/<id>/` och att Charlottendals källor flyttas dit.
- Behålla `CHARLOTTENDAL_*` och tjänstenamnen (installationsförrådet beror på dem) eller byta till stationsneutrala.
- Från Benny: CSV-tabellerna, mod68-ikonerna eller tillåtelse att hämta dem från JMRI, konfigurationsserverns format,
  och vilka objekt som ska fjärrstyras när 22a/23 är rättade.
