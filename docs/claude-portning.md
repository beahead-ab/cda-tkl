# Samarbete med Claude Design · 22 september 2026

På Caspers begäran kontaktades Claude i det befintliga designprojektet. Claude fick en konkret beskrivning av glappet mellan prototypen och appen: fyra fasta driftvägar, delvis ansluten anläggningsmodell, förenklad rendering och saknade adminfunktioner. Inga lösenord, nycklar eller driftkonton delades.

[Portningshjälp i Claude Design](https://claude.ai/design/p/d60a7b7b-d5aa-4db2-abc1-92414b959fdc?file=Portningshj%C3%A4lp.md)

Claude skapade en guide och sex moduler i projektets `port/`: graf, vägberäkning, förregling, signalbesked, ritmodell och acceptanstester. Den första leveransen uppgav 20 godkända tester. Detta är Claudes resultat, inte en lokal verifiering av hela leveransen. Koden granskades genom projektets filvy; zip-exporten gav ingen tillgänglig lokal fil.

## Redan införda lokala ändringar

- Beskärningen beräknas ur samma synliga objekt som designen: x=24, y=128, 2102×688. Den tidigare fasta höjden 640 kunde kapa innehåll.
- Knapparna snäpps till spårlinjerna. 20 tågvägsknappar och 48 växelknappar renderas, med träffytor som anpassas till skala och grannar. Växelknappar använder backendens befintliga lås och manövervillkor; en grupp får inte delmanövreras om hela gruppen saknas i profilen.
- Alla 66 signaler har permanenta bildlager för stopp, kör och mörkt. De 17 använda ikonvarianterna förladdas och avkodas utan att blockera spårplanens uppstart. Långsam/felande bildhämtning får inte slå ut hela panelen.
- Källa för signalmått/rotation, etikettstorlek, reläpanelens lamplinser och trafikskärmens små kvadratiska knappar följer designen närmare.
- Vägkostnaden använder växelns verkliga interna benlängder i stället för ett fast påslag. Befintlig transitiv låsexpansion, konfliktdetektering och startblockskontroll behålls.
- Två lokala regressionstester kontrollerar Claudes referensfall: Lekby `htvCu→htvSpIA` samtidigt med Kungsfors nedspår `htvAn→htvSpIIA`, samt exakt passerade växelben för `htvSpIIB→htvSpIIA`.

## Granskning av första kodleveransen

Följande konkreta problem återkopplades till Claude med begäran om rättningar och regressionstester:

1. `releaseByOccupancy` kapade vägens blocklista även vid återkommande FREE/UNKNOWN-rapporter, utan bevisad tågpassage. Periodiska rapporter får inte frigöra en lagd väg.
2. Förreglingsmodulen skapade själv simulerade stopp-/köråterrapporter. Simulatorn måste vara separat och uppströms klarsättning respektive frigivning måste invänta verkliga adapterrapporter.
3. Vägsökningen saknade kontroll av startblockets blockering. Låsexpansion behövde bli dubbelriktad/transitiv med konfliktdetektering, och söktillståndet behövde skilja mellan olika växeltilldelningar.
4. Växelkvittens måste avse en färsk rapport efter order och omfatta kopplade växlar. Förändrade eller för gamla rapporter efter etablering ska dra in medgivanden och hålla låsen.

Den första förreglingsmodulen ersätter därför inte appens befintliga kärna. Den befintliga kärnan har redan beständiga lås och separata fältåterrapporter.

## Claudes reviderade leverans

Claude bekräftade samtliga fyra fynd och levererade en reviderad guide samt sju moduler, nu med `cda-sim-adapter.js` som separat simulator. Claude rapporterar **35 OK / 0 FEL** i sin acceptanssvit. Det resultatet är fortfarande inte en lokal verifiering: även den nya knappen för det mindre portningspaketet visade nedladdning men lämnade ingen åtkomlig fil i Downloads/Desktop. Paketet och källfilerna finns kvar i Claude-projektet.

I den granskade revisionen kräver automatisk blockfrigivning observerad OCCUPIED→FREE i ordning. Kärnan lämnar order till adaptern och kvitterar dem inte själv. Växelkontrollen omfattar kopplade växlar och gamla rapporter. Claude har även rättat påståendet om att grafimport automatiskt ansluter hela banan och dokumenterat att adapterprofiler, beständiga lås, flankskydd och klassificering av conditionals saknas i leveransen.

Detta är referenskod, inte en färdig ersättare för `Engine`. Fortsatt granskning krävs särskilt av signalrapporternas ålder/orderkoppling, kvittens av sista signalen, automatisk frigivning efter sista blocket, skydd vid okänd/gammal blockrapport samt återupptagning från HELD. I den lästa versionen hade dessa kontroller inte samma omfattning som appens befintliga kärna. Använd graf/rendering selektivt och behåll de befintliga kontrollerna.

## Lokal verifiering

- JavaScript-kontroll, 27 enhetstester och 3 processbaserade helhetstester godkända.
- Webbläsaren visar 66 signaler med 198 permanenta bildlager och 68 manöverknappar.
- Anpassad vy ger `scrollWidth === clientWidth`; 200 % zoom ger motsvarande större panel och återgår till anpassad vy.
- `2b→2c` etableras och får återrapporterat kör. Samma start-/slutpar återtar vägen och lämnar noll tågvägslås.
- Original och reläpanel granskade visuellt; inga webbläsarfel efter omladdning.
- Proven kördes mot separat lokal app och simulator på port 9020/9021/9022. Ingen ändring av produktionsdata.

## Kvar för full överensstämmelse

Nästa samlade integration behöver koppla den kompletta grafen till driftprofiler för den separata simulatorn, aktivera dynamisk vägsökning i backend och föra över adminens ändringslager/kartmarkering. Att importera grafen ansluter inte automatiskt alla 49 växlar och 66 signaler. Den nuvarande körbara profilen är fortfarande begränsad till fyra provtågvägar; referenstestet för parallella infarter verifierar grafen, inte ett färdigt driftflöde genom LocoNet.

Inga av dessa ändringar är publicerade på produktionsservern. Hela XML-importen och dess oförändrade original bevaras.
