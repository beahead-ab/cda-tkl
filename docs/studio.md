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

## Steg 2: vyn och Data-vyn

Sidan `/studio.html` är Studios eget skal, bredvid dagens admin och länkad därifrån under Anläggning → Objekt och regler. Den ligger bakom samma inloggning som resten av TKL, läser allt i tre anrop (`/api/config`, `/api/studio` och `/data/panel.json`) och gör resten som projektioner i webbläsaren. Fem flikar: Konfigurera, Data, Genomgång, Driftsättning och Anslutning. De två sista pekar tills vidare på dagens adminsidor.

**Konfigurera · Stationsplan.** Planen ritas ur `panel.json` av Studios egen kod (`public/studio-plan.js`), utan ställverkets ram och dekorationer, 2600 px bred som standard och rullbar i sidled med minikarta. Lager: växelnummer, signalnamn, spårledningar, adresser, MGP-modul och avvikelser. Spår utan detektering i källan är streckade, avvikelser är röda punkter. *Gå igenom* stegar genom de 115 växlarna och signalerna från vänster till höger. Objektkortet visar bindning, modulhypotes, kompis med grafkontrollens svar, tågvägar och status, och leder vidare till Data.

**Data.** Sex mängder som chips med antal: växlar, signaler, spårledningar, tågvägar, moduler och avvikelser. Relationerna är avnormaliserade kolumner, som i TrainMeet Cloud. Ett valt objekt filtrerar alla mängder genom sina relationer, och högerkolumnen visar relationerna med antal. Djuplänken `#data?set=tagvagar,signaler&objekt=Vx100` läses en gång; därefter lever valet i sessionslagring.

**Genomgång.** Avvikelselistan med objekt och länkar till Data och planen, samt kompisparen enligt spårgrafen och förslaget för X1 och X2. AI-genomgången kommer i steg 4.

Logiken utan DOM ligger i `public/studio-model.js` och provas i `test/studio-view.test.mjs` mot den riktiga lasten. Sidan har inga inline-skript och laddar bara egna filer, så den går under serverns CSP. Ingen redigering finns ännu: steg 3 är regelspråket för det som redan finns.

## Steg 3: regelspråket för det som redan finns

`src/studio/rules.mjs` är regelspråket med sju typer: `follow`, `forbid`, `authority`, `condition`, `detection`, `aspect` och `crossing`. Steg 3 fyller de tre som täcker dagens beteende och låter kompilatorn bevisa att ingenting ändras.

**Dagens profil som regler.** `rulesFromProfile` ger 53 regler: 7 `follow` ur `coupled`, 3 `authority` ur `yardBoundaries`, 35 `condition` med utlösaren manuell manöver ur `manualPolicies.rules`, 7 `condition` för linjespärrarna och 1 för programmeringsspåret ur `operatingControls`. Fem manuella villkor bär statusen olöst, precis som i dag.

**Kompilatorn.** `compileRules` ger tillbaka `coupled`, `manualPolicies` (med `byTurnout` och `boundaryOverrides`), `yardBoundaries` och `operatingControls`. `node scripts/make-rules.mjs` skriver `profiles/charlottendal-rules.json` och faller om kompileringen skiljer sig från profilen på någon punkt. `--check` ingår i `verify:operations`, så filen kan inte bli inaktuell obemärkt. Kärnan läser fortfarande fragmenten, och de är bevisat identiska, så beteendet är exakt detsamma: alla tester är gröna utan att en rad i `src/engine.mjs` ändrats.

**Tågvägarna ur reglerna.** `recomputeRouteTurnouts` visar att varje tågvägs växellägen är vägens egna växlar utvidgade med följreglerna. Det reproducerar alla 340 rader i tabellen. Därmed kan Studio visa vad en ändrad följregel skulle göra, utan att röra den frysta tabellen.

**Förslaget för X1 och X2.** `proposeCrossoverRules` byter de två paren som inte bildar förbindelse mot de fyra diagonala paren ur spårgrafen. Effekten är räknad: 137 tågvägar ändrar växellägen, 104 huvudtågvägar och 33 växlingsvägar. De 67 diagonala vägarna får rätt par, och de 70 raka vägarna låser de diagonala växlarna rakt i stället för grannen på samma spår. Förslaget har status förslag, kompileras inte och ändrar ingenting. Det blir ett utkast med simulatorprov och aktivering i steg 4.

**Validering och tillbakaläsning.** `validateRules` stoppar okända objekt, ogiltiga lägen, en växel i två följgrupper och regler som dagens kärna inte kan verkställa (`forbid` prövas först i steg 4, `detection`, `aspect` och `crossing` kommer i steg 6). `explainRule` återger varje regel på svenska, så att det som godkänns är det som faktiskt kommer att gälla.

**I Studio** finns reglerna under Konfigurera → Regler, med klartext, objekt, var de verkställs, status och källa, och förslaget för X1 och X2 överst med sin effekt. Data-vyn har fått mängden Regler, och ett valt objekt filtrerar fram sina regler.
