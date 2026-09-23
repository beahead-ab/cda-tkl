# Tågnummer och inkommande tåg · version 0.6

Panelen visar sju inkommande fält: A/B/C i upp- och nedriktning samt D. Klicka på ett fält eller Tågnummer för att öppna redigeringen. Registrera nummer, flytta till ett tomt informationsfält eller töm uppgiften. Alla 197 block kan väljas. Tågnumret är manuell information; TrainMeet är ännu inte anslutet.

44 källankare visar registrerade nummer på spårplanen i alla tre panelutseenden. De 38 ursprungligen dolda ankarnas hidden-attribut är bevarade i registret; den nya presentationen visar även dessa när numret har registrerats. Två ankare pekar på SN2A. De markeras med frågetecken och källavvikelse, och har inte tyst bytts till SU2A. SU2A kan redigeras i listan men saknar ett eget källankare på kartan. Läs förstudien för exakta källfynd.

## Kontroll av placering

Frågetecken och gul markering betyder att uppgiften behöver kontrolleras. Det gäller efter omstart, ändrad beläggning, förlorad återrapport eller förlorad kontakt med kärnan. Ett nummer raderas eller flyttas aldrig automatiskt av en beläggningsrapport. Kontrollera platsen och välj Spara / bekräfta för att registrera att den fortfarande stämmer. Vid okänd beläggning behålls kontrollmarkeringen även efter manuell registrering.

Fritt/belagt visas separat från tågnumret. Ett nummer kan förberedas i ett fritt block, men det gör inte blocket belagt och bevisar inte att tåget finns där. Numret tillförs aldrig som en påhittad MGP-återrapport. Informationsmodulen kan inte skicka växelorder, påverka signalmedgivanden eller frigiva lås.

## Flytt och samtidiga paneler

Flytt tar bort numret från startfältet och lägger det i ett tomt målfält i en gemensam sparning. Ett befintligt nummer i målet skrivs aldrig över. Samma nummer får registreras på flera fält, exempelvis ett tåg som upptar flera block; detaljvyn visar då att det finns på flera platser. Detta är ingen automatisk positionsberäkning.

Servern kontrollerar informationsrevision, aktuell uppstart och beläggningsändringar. Gamla paneler kan inte skriva över nyare information. Osparad text bevaras vid konflikt och fältbyte spärras tills texten sparats eller senaste uppgifter lästs in. Stoppknapparnas tillgänglighet påverkas inte av informationsredigeringen.

## Lagring och drift

`train-information.json` ligger i samma skyddade datakatalog som övrigt tillstånd och ingår i katalogbackupen. Filen har formatversion 1, källans SHA-256, revision, manuellt ursprung, tider och de senaste 200 informationsändringarna. Panelen visar de senaste tolv. Senaste uppstartsidentitet och observerad beläggningsgeneration gör att gamla placeringsuppgifter alltid kräver ny kontroll efter omstart.

Sparning sker före byte av den aktiva informationskopian. Misslyckad lagring behåller både ändringens ursprung och mål. Okända fält, förfalskat MGP-ursprung, felaktigt format och inkompatibelt källunderlag avvisas. Kontroller för signaler och tågvägar är oförändrade. En återgång till version 0.5 ignorerar den nya informationsfilen utan att radera den; vid senare återgång till 0.6 markeras uppgifterna för kontroll.

`public/data/train-fields.json` genereras reproducerbart ur det kompletta källträdet. Import-/verifieringskedjan kontrollerar 197 block, sju inkommande fält och samtliga 44 ankare. Original-XML är oförändrad.

## Verifiering och återstående arbete

Sju nya enhetstester täcker exakta källankare, manuell registrering/flytt, omstart, ändrad/okänd beläggning, samtidiga ändringar, dubbletter, lagringsfel och ogiltiga data. Helhetstest provar riktiga HTTP-anrop under pågående separata TKL-/simulatorprocesser och bekräftar oförändrad beläggning och noll nya tågvägslås efter en informationsflytt.

Automatisk tågnummerförflyttning, verifierat TrainMeet-inflöde och verklig MGP-hårdvara återstår. Simulatorns interna tågidentiteter läses inte av TKL.
