# Tågnummer och inkommande tåg · version 0.15

Panelen visar sju inkommande fält: A/B/C i upp- och nedriktning samt D. Klicka på ett fält eller Tågnummer för att öppna redigeringen. Registrera nummer, flytta till ett tomt informationsfält eller töm uppgiften. Alla 197 block kan väljas. Tågnumret är manuell information; TrainMeet är ännu inte anslutet.

44 källankare visar registrerade nummer på spårplanen i alla tre panelutseenden. De 38 ursprungligen dolda ankarnas hidden-attribut är bevarade i registret; den nya presentationen visar även dessa när numret har registrerats. Två ankare pekar på SN2A. De markeras med frågetecken och källavvikelse, och har inte tyst bytts till SU2A. SU2A kan redigeras i listan men saknar ett eget källankare på kartan. Läs förstudien för exakta källfynd.

## Kontroll av placering

Frågetecken och gul markering betyder att uppgiften behöver kontrolleras. Det gäller efter omstart, ändrad beläggning, förlorad återrapport eller förlorad kontakt med kärnan. Utan uttryckligt startad nummerföljning raderas eller flyttas numret aldrig automatiskt av en beläggningsrapport. Kontrollera platsen och välj Spara / bekräfta för att registrera att den fortfarande stämmer. Vid okänd beläggning behålls kontrollmarkeringen även efter manuell registrering.

Fritt/belagt visas separat från tågnumret. Ett nummer kan förberedas i ett fritt block, men det gör inte blocket belagt och bevisar inte att tåget finns där. Numret tillförs aldrig som en påhittad MGP-återrapport. Informationsmodulen kan inte skicka växelorder, påverka signalmedgivanden eller frigiva lås.

## Flytt och samtidiga paneler

Flytt tar bort numret från startfältet och lägger det i ett tomt målfält i en gemensam sparning. Ett befintligt nummer i målet skrivs aldrig över. Samma nummer får registreras på flera fält, exempelvis ett tåg som upptar flera block; detaljvyn visar då att det finns på flera platser. Detta är ingen automatisk positionsberäkning.

Servern kontrollerar informationsrevision, aktuell uppstart och beläggningsändringar. Gamla paneler kan inte skriva över nyare information. Osparad text bevaras vid konflikt och fältbyte spärras tills texten sparats eller senaste uppgifter lästs in. Stoppknapparnas tillgänglighet påverkas inte av informationsredigeringen.

## Lagring och drift

`train-information.json` ligger i samma skyddade datakatalog som övrigt tillstånd och ingår i katalogbackupen. Den ursprungliga manuella funktionen använde formatversion 1 med källans SHA-256, revision, manuellt ursprung, tider och de senaste 200 informationsändringarna. Panelen visar de senaste tolv. Senaste uppstartsidentitet och observerad beläggningsgeneration gör att gamla placeringsuppgifter alltid kräver ny kontroll efter omstart.

Sparning sker före byte av den aktiva informationskopian. Misslyckad lagring behåller både ändringens ursprung och mål. Okända fält, förfalskat MGP-ursprung, felaktigt format och inkompatibelt källunderlag avvisas. Kontroller för signaler och tågvägar är oförändrade. En återgång till version 0.5 ignorerar den nya informationsfilen utan att radera den; vid senare återgång till 0.6 markeras uppgifterna för kontroll.

`public/data/train-fields.json` genereras reproducerbart ur det kompletta källträdet. Import-/verifieringskedjan kontrollerar 197 block, sju inkommande fält och samtliga 44 ankare. Original-XML är oförändrad.

## Verifiering och återstående arbete

Sju nya enhetstester täcker exakta källankare, manuell registrering/flytt, omstart, ändrad/okänd beläggning, samtidiga ändringar, dubbletter, lagringsfel och ogiltiga data. Helhetstest provar riktiga HTTP-anrop under pågående separata TKL-/simulatorprocesser och bekräftar oförändrad beläggning och noll nya tågvägslås efter en informationsflytt.

Verifierat TrainMeet-inflöde och verklig MGP-hårdvara återstår. Nummerföljningen beskrivs nedan. Simulatorns interna tågidentiteter läses inte av TKL.

## Nummerföljning från version 0.15

Det manuella arbetssättet finns kvar. Operatören kan dessutom koppla ett kontrollerat, unikt nummer till en **klar tågväg före första beläggningen**. Välj numrets inkommande fält eller vägens första detektor, välj den klara vägen och tryck **Koppla valt tågnummer**. Operatören ansvarar för att rätt tåg kopplas till rätt väg; ingen identifiering av lok sker genom spårledningsmeddelandena.

Följningen använder kärnans accepterade passageordning, samma uppgifter oavsett fysisk eller simulerad anslutning. Varje fysisk detektor behandlas en gång även när flera XML-block delar den. Vid varje accepterad beläggning flyttas numret atomiskt till det avsnittets informationsfält. Ett källankare på kartan föredras bland vägens block med samma detektor. Exempelvis är SIA, SIB och SIC inte nödvändigtvis oberoende fysiska kvittenser. Listan **Visa plats** öppnar det informationsfält som valts.

Ett redan ifyllt målfält, inklusive dess detektoralias, skrivs aldrig över. Dubbelregistrerat nummer, okänd rapport, avbrott, ändrad passageordning, manuell återtagning eller hållen/försvunnen tågväg pausar följningen. Rapporternas återkomst återupptar den inte. **Avsluta följning** behåller numret för kontroll; manuell ändring av numrets fält avslutar också kopplingen. En ny körning kräver kontrollerad placering och en ny uttrycklig koppling före passage.

Efter sista detektorns frirapport visas **Passerad · kontrollera**. Numret stannar i sista informationsfältet med kontrollmarkering; ingen position utanför den verifierade vägen hittas på. Följningen skickar inga order, ändrar inga signalmedgivanden, frigör inga lås och skriver inget till TrainMeet. Det är ett specificerat nytt beteende, inte ett påstående om identisk funktion i de saknade JMRI-skripten.

### Beständighet och formatbyte

Format 2 lagrar nummer, följningsläge och historik i samma atomiska sparning. Format 1 läses utan informationsförlust; filen skrivs om vid nästa ändring. Tidigare kod till och med 0.14 kan inte läsa format 2. Återgång måste använda kompatibel kod; radera inte filen eller återställ en äldre tom fil för att tvinga fram uppstart. Omstart pausar alla pågående följningar och gör placeringen till en kontrolluppgift. Ett skrivfel behåller senaste varaktiga nummer och steg samt spärrar fortsatta informationsändringar tills lagringen kontrollerats och processen startats om.

Tio riktade prov täcker ordnad passage, alias, dubbletter, uteblivna/okända rapporter, avbrott, återtagning, ny väg med samma definition, omstart, samtidiga redigeringar, atomisk lagring och trasigt sparat läge. Processprovet följer två tåg över den separata LocoNet-anslutningen till färdig passage. TKL får varken simulatorns tåg-id eller tillgång till dess interna tågrörelse.
