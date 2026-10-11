# Hur objekten hänger ihop, och varför det kommer att hålla

Underlag till planen för Objekt och regler, 2 oktober 2026. Siffrorna är räknade ur driftprofilen och Cda60.xml.

## Kort svar

Ja, alla tågvägar ska vara deterministiskt definierade innan de används i drift. Men de ska inte skrivas för hand. De räknas fram ur objektmodellen, granskas, provas i simulatorn och fryses som en tabell. Driften läser bara tabellen.

TKL gör redan så. De 340 tågvägarna, 210 huvudtågvägar och 130 växeltågvägar, är framräknade ur ritningen och JMRI:s regler och har var sitt etablerings- och passageprov. Det nya är att modellen blir det enda man redigerar, och att tabellen räknas om med en skillnadslista varje gång modellen ändras.

## Fyra lager

1. **Enheterna.** MGP-modulerna M00–M11 med sina utgångar och ingångar: växeldrivningar, signalutgångar, detektoringångar, programmeringsspårets relä och vändskivan. XML:en har 373 referenser till de tolv modulerna. Det är anläggningens fysiska inventarium.
2. **Objekten.** Det man pratar om: 49 växlar, 66 signaler, 197 spårledningar, 7 linjer (AN, AU, BN, BU, CN, CU, D), 3 spårkorsningar och 4 vägövergångar. Varje objekt har ett namn, en plats i spårgrafen och noll eller flera bindningar till enheter.
3. **Spårgrafen.** Hur objekten sitter ihop:
   - Spårsegment möts i noder. En växel är en nod med tre ben: roten A och benen B och C. Läge rakt förbinder A med B, avvikande A med C.
   - En spårledning är de segment och växelben som detekteras tillsammans, av en eller flera ingångar.
   - En signal står vid gränsen mellan två spårledningar och gäller i en riktning.
   - En linje börjar vid stationens utfart och leder till grannstationen.
4. **Det härledda.** Tågvägar, signalföljd, skyddssignaler, vilka växlar som berörs och i vilket läge, vilka spårledningar som passeras och i vilken ordning.

Reglerna ligger ovanpå: de begränsar både manuell manöver och vilka tågvägar som är tillåtna.

## En tågväg, konkret

Au → Spår 1c, ur driftprofilen:

| Del | Innehåll |
|---|---|
| Spårledningar i ordning | SU2B, S95b, S95, S100, S100a, S110, S110a, SIA |
| Växlar | Vx95 avvikande, Vx100 och Vx101 rakt, Vx110 och Vx117 rakt |
| Signaler som klareras | 1/1 och 1/5, bakifrån |
| Skyddssignaler i stopp | U2, 1/12, 1/10, 1/7 |
| Spårkorsning som reserveras | X3 |
| Källa i JMRI | IX:AUTO:0013C21 |

Vx101 och Vx117 är med för att de är kompisväxlar till Vx100 och Vx110. Inget i tågvägen är kunskap som ligger utanför modellen: allt följer av grafen, objekten och reglerna.

## Så prövar TKL en tågväg i drift

1. **Regler.** Tågvägen är tillåten i källan, ingen spärr gäller, operatören har behörighet.
2. **Konflikter.** Ingen spårledning är belagd eller reserverad, ingen växel är låst i annat läge, ingen korsning är upptagen, skyddssignalerna kan hållas i stopp.
3. **Lås och order.** Växlarna läggs. Varje order väntar på återrapport.
4. **Klarering.** När alla växlar rapporterat rätt läge klareras signalerna bakifrån, en i taget efter återrapport.
5. **Bevakning.** Oväntad beläggning, oväntat körbesked eller tappad rapport ger stopp. Låsen ligger kvar.
6. **Frisläppning.** När tåget passerat spårledningarna i rätt ordning släpps låsen.

TKL räknar aldrig med att en order har utförts. Varje steg kräver återrapport från fältet.

## Tabell i stället för beräkning i stunden

| | Beräkna vid varje begäran | Framräknad och fryst tabell |
|---|---|---|
| Exempel | JMRI:s NX | TKL |
| Granskning | det som körs har aldrig setts som helhet | varje tågväg kan granskas och jämföras |
| Prov | går inte i förväg | varje tågväg provas i simulatorn |
| Ändring i ritningen | ändrar beteendet direkt | syns som skillnadslista före aktivering |

Riktiga ställverk arbetar på samma sätt, med tågvägstabeller som granskas innan de tas i bruk.

## Varför det kommer att hålla

- **Logiken finns och är provad.** 340 tågvägar med etablerings- och passageprov, kompisväxlar, skyddssignaler och beläggningsspärrar. 326 enhetstester och 10 processprov.
- **Det som återstår är fakta, inte logik.** Adresser, svenska beskedskoder och MGP:s egna inställningar. Fakta kan mätas, ett objekt i taget.
- **Avvikelser syns.** Genomgången jämför modellen mot JMRI:s 117 signalrelationer och de 65 punkter i ritningen där en signal står vid en spårledningsgräns. 44 relationer saknar tågväg i dag och blir beslut.
- **Ingen AI i drift.** AI:n hjälper till att bygga modellen. Driften läser bara den frysta, provade tabellen och reglerna.

## Det som kan gå fel

| Risk | Hur vi möter den |
|---|---|
| Fel adress | Driftsättning objekt för objekt; inget räknas som klart förrän det mätts. |
| Dekodrarna rapporterar bara vid ändring | **Bekräftat** av Bennys trace 10 oktober 2026 och **löst i 0.77.0**: växel- och signalrapporter gäller tills förbindelsen bryts, kärnan frågar av ingångarna var 15:e sekund och en ingång som inte svarat på 40 sekunder blir okänd. En växel är okänd tills den får en order. Kvar att se på Charlottendal: att varje ingångskort svarar på avfrågningen (Bennys kort 6 gjorde det inte). Se [arkitekturen](arkitektur.md). |
| Dekodrarna har egna beroenden | MGP-underlaget; beroendet speglas i modellen och syns som "verkställs även i MGP". |
| En spårledning har flera ingångar, eller en ingång flera spårledningar | Uttryckligt i bindningen. SIA har två ingångar på två moduler. |
| En tågväg saknas eller är fel | Jämförelsen mot JMRI:s signalrelationer, och provkörning av varje tågväg på banan. |
| Tåg som rullar förbi slutsignalen | Ingen skyddssträcka, så att tågvägar kan ligga direkt efter varandra. Slutsignalen i stopp och bevakningen av oväntad beläggning är skyddet. |

## Ingen skyddssträcka

Beslutat 2 oktober 2026, efter omprövning samma dag: tågvägarna får ingen skyddssträcka bortom slutsignalen. En tågväg ska kunna ligga direkt bakom en annan, så att slutsignalen för den ena är startsignalen för nästa. TKL fungerar redan så i dag.

Skyddet mot ett tåg som rullar förbi slutsignalen är i stället att slutsignalen står i stopp tills nästa tågväg är lagd, och att oväntad beläggning bortom den spärrar tågvägen och ger stopp.

## Så landar det i praktiken

Ingen operationell koppling till JMRI, beslutat 2 oktober 2026. JMRI kopplas bort från LocoNet för gott, och TKL är ensam på bussen från första steget. Cda60.xml finns kvar som en ritning att läsa ur, inte som ett system att köra.

1. **Lyssna.** TKL kopplas till LocoNet i ett läge där den inte skickar något. Det visar vad dekodrarna rapporterar av sig själva vid start och om de rapporterar periodiskt, och det fångar rapporter när någon lägger en växel eller ett tåg kör. Det besvarar den viktigaste tekniska frågan utan risk. Lyssningsläget är ett litet tillägg till telegraminspelningen som redan finns.
2. **Mät.** Driftsättningsläget provar varje objekt, ett i taget: provorder, återrapport, och en bekräftelse av det man ser på banan.
3. **Prova tågvägarna** utan tåg på banan och sedan med tåg, enligt en lista ur tabellen.
4. **Drift.**

Vägen tillbaka går genom TKL själv: varje aktivering sparar den föregående versionen av bindningar och regler, och den kan återställas. Inget steg förutsätter att JMRI startas igen.
