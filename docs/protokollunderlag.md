# Charlottendal som fristående MGP-simulator

Förstudie från 2026-09-20. Simulatorn och TKL-kärnan är sedan dess byggda och testade som separata processer över LocoNet-over-TCP. Aktuell status finns i [arbetsjournalen](arbetsjournal.md). Förstudien nedan beskriver protokollunderlaget; inga kommandon har skickats till fysisk utrustning.

Målet är en egen Charlottendal-applikation som efterliknar anläggningen och MGP-dekodrarna. TKL ska köra samma program och behandla samma LocoNet-meddelanden som i fysisk drift. Valet av anslutning ligger i installationen; tågvägslogiken ska inte ha någon demogren.

## Gränsen mellan programmen

```text
TKL:s panel och förregling
          ↕
TKL:s LocoNet-avkodare och LocoBuffer-anslutning
          ↕
Seriell bytekanal: riktig port eller virtuell port
          ↕
Riktig LocoBuffer eller simulerad LocoBuffer
          ↕
LocoNet: fysisk buss eller simulerad meddelandebuss
          ↕
MGP-dekodrar eller Charlottendals dekodermodeller
```

Simulatorn äger tågens lägen, detektorernas tillstånd, servorörelser och de simulerade dekodrarnas signalregler. TKL äger tågvägar, konflikter, reservationer och lås. Simulatorn får bara veta det som en ansluten dekoder skulle få veta genom bussen. Ingen gemensam databas för drifttillstånd och inga anrop som direkt sätter TKL:s signaler eller beläggningar.

Layout, adresser och dekoderinställningar kan komma från samma importerade underlag. Oberoende tillstånd och oberoende förväntade provresultat behövs ändå, så att samma fel inte råkar ge godkänt på båda sidor.

## Vad källorna visar

| Del | Underlag | Säkerhet i slutsatsen |
| --- | --- | --- |
| Växelorder | `OPC_SW_REQ`, `B0` | Standardformat dokumenterat |
| Växelrapport | `OPC_SW_REP`, `B1` i ingångsformatet (bit 6) | **Uppmätt** på Bennys MGP-kort 9 oktober 2026: `B1 06 60 28` = THROWN, `B1 06 70 38` = CLOSED, som JMRI läser det |
| Sensorrapport | `OPC_INPUT_REP`, `B2` | Standardformat dokumenterat; adress/polaritet behöver anläggningsprofil. **Uppmätt** 9–10 oktober: bara vid ändring och som svar på avfrågning |
| Avfrågning | `OPC_SW_REQ` OFF till 1017–1020: `B0 78 27 10` … `B0 7B 07 33`, åtta grupper | **Uppmätt** 10 oktober: JMRI sänder alla åtta vid uppstart; MGP:s ingångskort svarar med `B2` för varje ingång |
| Signalens grundläge | Switch-order, CLOSED = GO och THROWN = STOP | Dokumenterat för Signal10 |
| Signalens besked | Växelrapport `B1` på signalens adress; signalen hanteras som en växel | **Uppmätt** 9 oktober 2026 (Bennys bana): ingen `E4`. SE-formen (`E4 09`, CZ-exemplet) finns kvar som val |
| LocoBuffer-USB | Virtuell COM-port, 57 600 baud, hårdvaruflödeskontroll | Dokumenterat för denna modell; användarens modell är ännu okänd |

MGP beskriver switch-order, switch-feedback, sensorstatus och säkerhetsmeddelanden som separata meddelandetyper. Växeladresser ligger i intervallet 1–2048 och sensoradresser i 1–4096. [MGP: meddelanden mellan dekodrar](https://mollehem.se/index.php/meddelanden).

Signal10 skiljer på grundläge och visat besked. GO-grundläge kan fortfarande ge stopp på grund av lokala regler. SV23 avgör om switch-feedback återger grundläget eller en förenklad stopp/kör-status. SE-meddelandena rapporterar signalstatus. [Signal10, avsnitt 1.2–1.3](https://mollehem.se/doc/instruktioner/Instruction_Signal10_en.pdf).

Servo5 kan konfigureras med SV42 för att rapportera okänt läge under rörelse. [Servo5-manual](https://mollehem.se/doc/instruktioner/Instruction_Servo5_en.pdf). JMRI har ett särskilt `LNALTERNATE`-läge för MGP:s återrapportering. Dekoderrapport är dock inte i sig bevis för att mekaniska växeltungor har ett oberoende kontrollerat ändläge. [JMRI:s LnTurnout](https://github.com/JMRI/JMRI/blob/master/java/src/jmri/jmrix/loconet/LnTurnout.java).

## Byteformat och beräknade exempel

Nedanstående är beräknade protokollexempel, inte inspelad trafik från Charlottendal. Kontrollsummorna har räknats och kontrollerats lokalt.

LocoNet-ramens första byte är opcode. Övriga byte har högsta biten noll. Längden följer opcode eller ett längdfält. XOR av samtliga byte, inklusive kontrollsumman, ska vara `FF`. För `B0`/`B1` kodas användaradress A som A−1, uppdelad i sju låga och fyra höga adressbitar. `B0` har separata riktnings- och aktiveringsbitar; `B1` har både en utgångsvariant och en ingångsvariant. De får inte blandas. [Digitrax: LocoNet Personal Use, sidor 6 och 9–10](https://www.digitrax.com/static/apps/cms/media/documents/loconet/loconetpersonaledition.pdf).

| Betydelse | Hexbyte |
| --- | --- |
| Order adress 123 CLOSED, aktiverad utgång | `B0 7A 30 05` |
| Order adress 123 THROWN, aktiverad utgång | `B0 7A 10 25` |
| Växelrapport adress 123 CLOSED, ingångsformatet som MGP-korten sänder (bit 6 satt, bit 4 satt) | `B1 7A 70 44` |
| Växelrapport adress 123 THROWN, ingångsformatet (bit 4 noll) | `B1 7A 60 54` |
| Utgångsrapport adress 123 CLOSED (utgångsformatet, avkodas också) | `B1 7A 20 14` |
| Utgångsrapport adress 123 THROWN | `B1 7A 10 24` |
| Utgångsrapport adress 123, båda utgångsbitar noll (bara simulatorn: rörelse pågår) | `B1 7A 00 34` |
| Sensor 1400 HIGH | `B2 3B 75 03` |
| Sensor 1400 LOW | `B2 3B 65 13` |

I MGP-profilen för mellanläge är rapporten med båda utgångsbitarna noll en kandidat för okänt/rörelse; den måste jämföras med verklig trafik. HIGH/LOW översätts till belagt/fritt genom en verifierad sensorprofil. CLOSED/THROWN översätts till rakt/avvikande per växel, inte med en global regel.

För sensorer är adressavkodningen `1 + 2 × (IN1 + 128 × (IN2 & 0x0F)) + ((IN2 & 0x20) >> 5)`. Aktivitetsbiten är `0x10`. [JMRI:s meddelandeavkodare](https://github.com/JMRI/JMRI/blob/master/java/src/jmri/jmrix/loconet/messageinterp/LocoNetMessageInterpret.java).

### Signalrapport: konkret referens, ännu inte svensk specifikation

Petr Šídlos eget exempel från 2023 skapar en virtuell signal som används av en MGP Signal10 CZ. Koden använder:

```text
E4 09 addressHigh addressLow 00 01 aspect 00 checksum
addressHigh = (adress − 1) / 128, heltalsdel
addressLow  = (adress − 1) modulo 128
```

Exemplet väljer beskedskoder `00` för stopp, `08` för normalt körbesked och `12` hex (18 decimalt) för begränsat 40-besked. För exempeladressen 815 ger det:

```text
E4 09 06 2E 00 01 00 00 3B
E4 09 06 2E 00 01 08 00 33
E4 09 06 2E 00 01 12 00 29
```

Det visar hur ett externt program kan uppträda som en signal inför MGP. Det bevisar inte att hela formatet eller alla beskedskoder gäller svensk Signal10. Betydelsen av de fasta fälten är inte fullständigt förklarad i exemplet. [Författarens beskrivning](https://sites.google.com/site/sidloweb/mgp/Signal10_CZ), [publicerad källfil virtualSignal815.py](https://drive.google.com/file/d/1-p7KtYeY4P7L-cf01e-pfjJf-VG50VH3/view).

## LocoBuffer och dubbelriktad trafik

LocoBuffer är bryggan mellan datorns seriella bytekanal och LocoNet. USB-modellens manual anger 57 600 baud och hårdvaruflödeskontroll; sända data läses tillbaka från bussidan. Ett sådant eko är transportinformation, inte bekräftelse på utförd växelrörelse eller visat signalbesked. [RR-CirKits: LocoBuffer-USB](https://rrcirkits.com/locobuffer-usb/LB-USB-manual.pdf), [JMRI:s USB-adapter](https://github.com/JMRI/JMRI/blob/master/java/src/jmri/jmrix/loconet/locobufferusb/LocoBufferUsbAdapter.java).

En virtuell serieport är det närmaste sättet att prova samma drivrutin. Simulatorn läser TKL:s råbyte, sätter ihop ramar, förmedlar dem till dekodermodeller och returnerar eko och nya rapporter. Serieportsläsningar kan innehålla delar av en ram eller flera ramar. En virtuell port provar inte USB-elektronik, verklig CTS/RTS-timing eller elektriska kollisioner; dessa behöver fysisk provning.

Om programmen ska köras på olika datorer kan båda installationerna använda en gateway med LocoNet-over-TCP. Det dokumenterade protokollet har `SEND`, `RECEIVE` och `SENT OK/ERROR`. `SENT OK` följer sändningens eko och är fortfarande ingen dekoderbekräftelse. I fysisk drift kopplas gatewayn till LocoBuffer; i simulatorn till den virtuella bussen. Då byts endast anslutningsadress i TKL. [LocoNet-over-TCP-specifikationen](https://loconetovertcp.sourceforge.net/Protocol/LoconetOverTcp.html).

TKL:s inläsning bör därför vara: byte → validerad ram → meddelandetyp/adress → anläggningsobjekt → rapporterat tillstånd → omprövning av berörda tågvägar. Utgående väg: förreglingsbeslut → order → byte → transport. Rapporterat tillstånd uppdateras genom inkommande rapporter.

## Ett första komplett provförlopp

1. TKL reserverar resurser för en väg och skickar växelorder.
2. Simulerad LocoBuffer ger transporteko. TKL räknar inte detta som färdig omläggning.
3. Simulerad Servo5 rapporterar mellanläge när profilen använder det, och senare slutläge.
4. När erforderliga rapporter finns kan TKL ge signalens körmedgivande.
5. Simulerad Signal10 räknar enligt sin egen konfiguration och rapporterar besked via LocoNet.
6. Ett simulerat tåg belägger ett avsnitt. Sensorrapport når både TKL och simulerade MGP-dekodrar.
7. TKL och MGP reagerar inom respektive ansvar. Ett signalbesked kan därmed ändras utan en ny direkt order från TKL.

Testpanelen i simulatorn ska kunna välja utebliven rapport, långsam växel, kvarstående stopp trots GO, lokal manöver, förbindelseavbrott och dekoderomstart. Dessa scenarier får inte specialhanteras inne i TKL.

## SV2-programmering (steg 6 i Studio)

`src/sv2.mjs` följer SV Programming Message Formats v13, format 2: `E5 10 SRC SV_CMD 02 SVX1 DST_L DST_H SV_ADRL SV_ADRH SVX2 D1 D2 D3 D4 CHK`, där SVX1 och SVX2 bär bit 7 för de fyra följande bytena. Discover (07) och Identify (08) besvaras med MANUFACTURER_ID i SV_ADRL, DEVELOPER_ID i SV_ADRH, PRODUCT_ID i D1–D2 och serienummer i D3–D4, låg byte först. Standard-SV: 1 EEPROM-storlek, 2 programversion, 3–4 serienummer. Studio skickar Discover, Identify och läsning; skrivning, adressbyte och omstart finns som meddelanden men skickas inte förrän läsningen är verifierad på ett riktigt kort. Simulatorns tolv kort svarar med MGP:s identitet (tillverkare 126, utvecklare 1, produkt 6 eller 9) och påhittade serienummer.

| Betydelse | Hexbyte |
| --- | --- |
| Discover från PC (SRC 1) | `E5 10 01 07 02 10 00 00 00 00 10 00 00 00 00 0E` |
| Identify till kort 80 | `E5 10 01 08 02 10 50 00 00 00 10 00 00 00 00 51` |
| Läs SV1–4 på kort 17 | `E5 10 01 06 02 10 11 00 01 00 10 00 00 00 00 1F` |

Uppmätt i Bennys trace 10 oktober 2026: kortet skriver sin adress i DST, och SRC är frågarens agentnummer (JMRI 1, MGP-appen 0).
MGP-korten svarar på Discover med tillverkare 126, utvecklare 1 och produkt 6 (Signal10 SE), 9 (servokortet med adressen i
SV21 och ingångar) eller 5 (inte identifierat). Signal10 SE stöder läsning av fyra SV i taget; MGP-appen läser hela
konfigurationen så (SV 33–81, 294–725 och 800–899). Maskad skrivning är inte provad.

| Betydelse | Hexbyte |
| --- | --- |
| Discover från MGP-appen (SRC 0) | `E5 10 00 07 02 10 00 00 00 00 10 00 00 00 00 0F` |
| Svar från kort 110: tillverkare 126, utvecklare 1, produkt 6, serienummer 663 | `E5 10 00 47 02 10 6E 00 7E 01 14 06 00 17 02 49` |
| Läs SV 294–297 på kort 110 / svar 14, 0, 176, 14 | `E5 10 00 06 02 10 6E 00 26 01 10 00 00 00 00 47` / `E5 10 00 46 02 10 6E 00 26 01 14 0E 00 30 0E 33` |

## Vad som återstår att verifiera på Charlottendal

- Exakt LocoBuffer-modell, portinställningar, eko och beteende vid frånkoppling.
- Dekodertyper, firmwareversioner och SV-inställningar, särskilt signalernas SV23 och servonas SV42.
- Svenska SE-koder behövs bara om någon mast sänder `E4`; Bennys monitorering visar `B1` (stopp/kör), inte beskedskoder.
- Återrapportering vid start och återanslutning: **delvis uppmätt** (Bennys trace 10 oktober). Ingångskorten svarar på
  avfrågningen (`B0 78–7B 27/07`, växelorder OFF till 1017–1020) med `B2` för varje ingång; växel- och signalkorten svarar
  bara med `B1` när de får en order. Korten upprepar inget av sig själva. Sedan 0.77.0 frågar TKL av ingångarna vid
  anslutning och var 15:e sekund, och växel- och signalrapporter gäller tills förbindelsen bryts (se
  [arkitekturen](arkitektur.md)). Tystnad betyder fortfarande aldrig fritt: en ingång som inte svarat på 40 sekunder blir
  okänd. Kvar att se: att varje ingångskort på Charlottendal svarar på avfrågningen.
- Orderns ON/OFF-sekvens är uppmätt (ON, rapport, OFF; TKL sänder OFF 200 ms efter ON sedan 0.76.0); svar på upprepad order och verkliga fördröjningar återstår.
- Om återrapporten bygger på beräknat servoläge eller oberoende lägesgivare.

I `Cda60.xml` finns exempelvis `Vx123 = LT123`, `Vxi123 = L2T123` och inverterad `Vx131 = LT131`. De olika anslutningsprefixen måste bevaras tills deras avsedda användning är klarlagd. Flera växlar använder JMRI-läget MONITORING; det är inte belägg för att fysisk feedback finns. Underlaget ger adresser och panelkopplingar men ersätter inte en export av dekodrarnas SV-konfiguration.

Nästa konkreta etapp är en meddelandematris med proveniens: dokumenterat, beräknat, publicerat exempel eller uppmätt. Därefter en liten separat simulator med en växel, två beläggningsavsnitt och en signal. En rålogg från verklig utrustning används som oberoende jämförelse innan vi kallar den svenska MGP-profilen verifierad.
