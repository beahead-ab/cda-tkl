# Ställverk och Inställningar – omstrukturering av administrationen

Underlag 4 oktober 2026, efter Caspers beslut i samtal. Förebilden är TrainMeet
Server (server.trainmeet.app): Drift är en skärm med allt man gör under träffen,
Inställningar är resten, ett avsnitt i taget. Det som rör anläggningens beskrivning
(register, bindningar, visningsnamn, orter, tågvägar, XML) tas i en egen sittning
enligt [admin-v2.md](admin-v2.md) och [objektkonfiguration-plan.md](objektkonfiguration-plan.md);
här får det bara en plats.

## Beslut

1. **Lokal tidtabell utan nät tas bort helt**: manuell tidtabell, Excel/CSV-import,
   AI-import, källvalet mellan import och TrainMeet. TrainMeet är tidtabellens enda källa.
2. **Tågklarering flyttar in i ställverkets nederrad** som en tredje flik, med
   larmräknaren på fliken.
3. **Alla knappar i ställverkets övre högra hörn flyttar till samma flik**: Återställ,
   Styra RBG, uppdateringschipet och "Ny version · ladda om". Överkanten visar bara
   CHARLOTTENDAL och statuschipet (meddelanden från kärnan, kontakt saknas, SIMULERING).
   SIMULERING är ett läge, inte en knapp, och får stå kvar där.
4. **Adminfönstret heter Inställningar**, med tre grupper och inga mellansidor.
5. Rankningen av vad som används mest godkänd (nedan).

## Vad som används mest

- Varje träff, flera gånger: ställverket, Återställ, Styra RBG, tidtabell och händelser
  i nederraden, Tågklarering, Stream Deck.
- Varje träff, en gång: parkoppla TrainMeet och välja station, koppla LocoNet, ljud och
  blinkning på den här datorn, uppdatera TKL.
- Ibland: spärra ett spår, nödåterta, lokal/fjärr, hela journalen, protokollinspelning.
- Sällan och omfattande: anläggningens beskrivning. Egen sittning.

## Ställverket är Drift

Nederraden får tre flikar: **Händelser**, **Spårbeläggning** och **Drift**.

Fliken Drift innehåller, uppifrån:

- En knapprad: Återställ, Styra RBG, Spärra spår, Nödåterta alla, Lokal/fjärr, Ljud,
  och när det gäller: Uppdatering 0.x (öppnar Inställningar → Uppdatering) och
  Ny version · ladda om. Modellklockans Starta/Ställ visas bara när stationen inte är
  parkopplad med TrainMeet; annars följer klockan träffen.
- Tågklareringen: en ruta per sträcka med grannens läge och knapparna, dagens
  tågrörelser med Uppställt, Förare på plats, Närmar sig, Ankommit och Flytta hit.
  Samma innehåll som dagens Drift → Tågklarering, inklusive larm och räknare.

Fliken visar räknaren för inkommande förfrågningar, "Drift (2)", och nederraden
byter till Drift när en förfrågan kommer om operatören inte har valt en annan flik
de senaste sekunderna (samma regel som larmet har i dag).

Övre högra hörnet töms. Det ska inte finnas något administrativt i ställverkets ram.

Därmed försvinner hela gruppen Drift ur adminfönstret: Driftverktyg, Tågvägar
(listan återkommer i Data-vyn), Tågklarering, Spårspärrar, Linjer och
programmeringsspår, Tågnummer, Modellklocka, Lokal- och fjärrläge.

## Inställningar

Ett avsnitt i taget, sidomeny till vänster i tre grupper, som serverns. Under 540 px
sidolåda som i dag. Sidfoten behåller Zoom, Fullskärm, Byt lösenord och Simulator ↗.

**Träffen** · gäller hela anläggningen, sparas i TKL-servern
- **TrainMeet** · anslutning, station, status. Dagens Tidtabeller → TrainMeet.
- **Händelser** · hela journalen med sök. Nederraden visar de senaste.

**Den här datorn** · gäller bara den här installationen
- **Utseende och ljud** · tema, blinkning, ljud, zoom.
- **Stream Deck** · anslutning och layout, oförändrat.
- **Banan (LocoNet)** · anslutningsstatus, port, Lyssna/inspelning bakom en knapp.
  Dagens LocoNet-rad i sidfoten plus Protokollinspelning.
- **Uppdatering** · dagens Avancerat → Uppdatering.

**Anläggningen** · beskriver stationen, ändras sällan
- **Anläggning** · en ingång till dagens register, översikt, orter, visningsnamn,
  driftinställningar, XML-granskning och införandestatus, oförändrade tills de ersätts
  av Objekt och regler.

Från sju ingångar och 27 adresser till tre grupper med sju avsnitt.

## Det pedagogiska lagret

Fem regler som hålls i varje avsnitt, hämtade från serverns Inställningar:

1. Titel och en räckviddsrad: "Utseende och ljud · gäller den här datorn".
2. Rader som Etikett · Värde · grå konsekvens: "Koppla från · raderar nyckeln för den
   här servern; parkopplingen till andra servrar sparas".
3. Egen Avbryt/Spara per panel, släckta tills något är ändrat, "Inget ändrat".
4. En sidfotsrad per panel om vad avsnittet inte gör: "Tågvägar och signaler påverkas
   aldrig av TrainMeet."
5. Status som text och form, inte bara färg: Ansluten / Kontakt saknas / Ej ansluten.
   Det sällsynta bakom en knapp, det farliga bakom en fråga.

## Byggordning, en release per steg

1. **Nederradens Drift-flik** (byggd 4 oktober, se panel-och-verktyg.md; Ljud av/på ligger tills vidare kvar under Utseende). Klareringen och knapparna flyttar in, övre högra hörnet
   töms, gruppen Drift tas bort ur adminfönstret. Händelser och Spårbeläggning rörs
   inte. Störst nytta, lägst risk: inga serverändringar.
2. **Inställningar** (byggd 4 oktober; tidtabellssidorna ligger tillfälligt som flikar under TrainMeet, Simulator ↗ som flik under Banan, XML-granskning och Införandestatus som flikar under Anläggning; `#advanced` och `#tools` leder vidare till sin första sida). Nytt namn, tre grupper, avsnitten flyttas till sina platser,
   översiktssidorna tas bort, Anläggning blir en ingång. Innehållet i varje avsnitt är
   oförändrat i det här steget.
3. **Lokal tidtabell bort** (byggd 4 oktober; `#import…` leder till TrainMeet, beroendena csv-parse, read-excel-file, yauzl, saxes och fflate borttagna). `public/timetable-import.js`, `timetable-sheet.js`,
   `timetable-sheet-model.js`, `timetable-format.js`, `src/timetable-import.mjs`,
   API-vägarna under `/api/timetable-import`, mallarna, proven
   `timetable-import.test.mjs`, `timetable-sheet.test.mjs`,
   `timetable-import-integration.mjs`, `docs/tidtabellsimport.md` och raderna i README.
   Tidtabellsfältet under spårplanen visar bara TrainMeet.
4. **Det pedagogiska lagret**, avsnitt för avsnitt (TrainMeet byggt 4 oktober; gemensamma klasser `settings-*` i `admin-line.css`, `unchanged` och `canSave` i `createAdminDialog`): TrainMeet, Banan, Utseende och
   ljud, Uppdatering, Stream Deck, Händelser.

Varje steg provas i Chromium på 1280 och 390 px innan det publiceras. Adresserna
`#…` som försvinner får en omdirigering till sin nya plats så att bokmärken och
dokumentation fortsätter fungera.
