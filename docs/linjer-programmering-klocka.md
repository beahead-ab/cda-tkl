# Linjespärrar, programmeringsspår och modellklocka

## Linjer

Under **Linjer och programmeringsspår** finns sju beständiga spärrar för A/B/C upp-/nedspår samt D. De följer Logix0023C1–C7:s ssAN–ssD och respektive källknapp/grafankare. Berörda vägar stoppas med låsen kvar; nya vägar avvisas. Avspärrning återupptar aldrig en hållen väg. Spärren ändrar ingen detektorrapport. Fjärrläge tillåter spärrning men inte att en lokal panel tar bort spärren.

## Programmeringsspår

Logix0025C1 anger ProgSpår=LT134, ProgOn=LS940 och Vx133=CLOSED. Ersättningen låser växel133 samt S133, S133c och SLIII beständigt innan reläordern skickas. Ett lok får stå på SLIII; S133 måste vara fritt. Växeln måste redan vara bekräftat rakt, skyddande signaler i stopp och berörda resurser utan tågvägslås. AIS och fjärrläge hindrar tillkoppling.

Status visar begäran, bekräftat programmeringsläge eller kvarvarande spärr. **Begär normaldrift** kräver nya separata B1- och B2-rapporter efter just den ordern innan låset släpps. Order-eko räcker inte. Okänt läge, bortfall, oväntad tillkoppling eller omstart behåller/skapar spärren. Återanslutning eller sent normalt besked löser inte ensamt ut en tidigare hållen spärr. Ny uttrycklig begäran om normaldrift behövs. Simulatorn har separat relärörelse och ett felval för utebliven programmeringsrapport.

Detta är ett dokumenterat nytt återrapporteringskontrakt över befintliga källadresser. Originalregeln skrev själv ProgOn; XML bevisar inte att den verkliga modulen skickar LS940 eller B1 enligt denna modell. Elektrisk funktion, isolering och fysisk återrapport är **inte driftsatta eller verifierade**. Inga CV-kommandon eller lokprogrammerare ingår.

Kontroller sparas nu i controls.json format3. Version1/2 läses och migreras i minnet; nästa manöver sparar format3. Äldre program före0.12 kan därefter inte läsa kontrollerna. Återgång kräver kompatibel kod/granskad migrering av aktuellt tillstånd, aldrig återläsning av gamla tomma kontroller över nya spärrar. Profilbyte vägras med kvarvarande programmeringsreservation.

## Modellklocka och fel

Klockan är gemensam på servern, med trafikdygn, tid, paus/start och hastighet0,1–60. Den använder monoton tid och påverkar varken färskhetskontroller, lås eller säkerhetstider. Tid/hastighet sparas vid ändring, var femte sekund medan klockan går och vid normal avstängning. Efter omstart är den pausad vid senaste sparade tid (högst omkring fem sekunders checkpointförlust vid ett processhaveri). Ursprungsklockans historiska datum från2017 startas inte automatiskt. TrainMeet är ännu inte tidskälla. Flera panelers gamla ändringar avvisas med sessions-/versionskontroll.

Manöverfel behåller textorsaken och visar en tre sekunders lokal fellampa. **Ljud på** aktiverar en kort syntetisk signal i den egna webbläsaren. Det är en ersättning för saknade äldre ljudfiler, inte en import av dem. Knappval rensas med Avbryt/Esc; inget generellt reset-kommando raderar anläggningens tillstånd.
