# Studio · steg 1: objektregister och avvikelselista

Första körbara steget i planen för [Objekt och regler](objektkonfiguration-plan.md), byggordningen i §9. Modulen ligger i `src/studio/` och är fristående: den läser driftprofilen, panelgeometrin, `Cda60.xml` och de genererade filerna i `public/data`, räknar, och ändrar ingenting. Inga driftvillkor, adresser eller dataformat påverkas. Designen och rapporten finns i Claude Design (duken *cda-tkl Studio i TrainMeet-stil* och rapporten *cda-tkl Studio – funktion, LocoNet/MGP och lösningsförslag*).

## Köra

```
npm run studio
```

skriver objektregistrets mängder, kompisparen enligt spårgrafen, spåravkänningens läge och avvikelselistan. Samma uppgifter finns som JSON på `GET /api/studio` i TKL-servern. `test/studio.test.mjs` låser talen mot den aktuella källversionen; ändras källan ska testet ändras medvetet.

## Vad som räknas fram

**Objektregistret** (`registry.mjs`): 49 växlar, 66 signaler, 197 spårledningar och 12 moduler M00–M11, var och en med TKL-namn, LocoNet-bindning och spårbarhet till LT/LS och kommentaren i XML:en. Kommentaren `M02-100-1` läses som modul, basadress och kanal, en hypotes tills den som satt upp MGP bekräftat den. Status är alltid *ur XML, ej uppmätt* eller *bänkadress i simulatorn*. Signal 1/5 har sin huvudutgång på M02 men dvärgutgångarna på M01, vilket registret visar som två moduler.

**Spårgrafen** (`graph.mjs`) följer varje växels avvikande ben genom JMRI:s layout till nästa växel. Fem av de sju kompisparen bildar en hel förbindelse. Paren Vx140 + Vx142 och Vx162 + Vx165 gör det inte: de ligger på samma spår i dubbelkorsväxlarna X1 och X2. Grafen föreslår i stället de diagonala paren Vx140 + Vx143, Vx141 + Vx142, Vx162 + Vx166 och Vx163 + Vx165. Förslaget är inte infört; tågvägarna och profilens `coupled` är oförändrade tills banan har mätts.

**Spåravkänningen** (`detection.mjs`) läser JMRI:s regler för de 105 källsensorerna. Logiktypen gäller, inte villkorstexten: `logicType` 1 är alla, 2 är någon av, och "R1 and R2" med logiktyp 2 betyder någon av. 130 spårledningar har en ingång, 20 har flera (någon belagd räcker), 10 är växelberoende delar som delar adress med sitt block. 10 spårledningar har en sensor som ingen regel sätter och 11 spår saknar sensor helt. Av 184 LS-ingångar används 97; 87 är obundna och 70 saknar modul i kommentaren. Sju spår har knappen *Spärra spår*, som är en administrativ spärr och ingen detektering.

**Avvikelselistan** (`deviations.mjs`) ger 18 rader, varav 6 blockerar driftsättning. De 15 första är planens kända luckor (§7) räknade ur källorna, inklusive de 44 signalrelationerna i JMRI utan tågväg (en relation har en tågväg när de två signalerna klareras i följd). De tre sista är nya: två kompispar utan förbindelse, 21 spårledningar utan detektering och 87 obundna ingångar.

## Avgränsning

Steg 1 ritar ingenting och har ingen redigering. Nästa steg enligt planen är vyn utan redigering och Data-vyn, därefter regelspråket för det som redan finns med kravet att alla befintliga tester förblir gröna.
