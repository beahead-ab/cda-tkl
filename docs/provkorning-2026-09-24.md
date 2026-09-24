# Steg 1 – provkörning och designavstämning, 24 september 2026

## Underlag och omfattning

Caspers godkända steg 1: provköra ett trafikförlopp och jämföra panelens utseende och handhavande med Claude Design. Original- och reläpanelerna öppnades i det befintliga [designprojektet](https://claude.ai/design/p/d60a7b7b-d5aa-4db2-abc1-92414b959fdc). Det tidigare sparade designunderlaget används fortsatt för geometri, proportioner och trafikskärmens symboler. Inga designfiler ändrades i Claude.

Prov genomfördes i webbläsaren mot TKL på 9030 och den separata anläggningssimulatorn på 9031, med LocoNet-gräns på 9032. Detta är en simulatorverifiering, inte ett fysiskt MGP-prov eller en verifiering av samtliga svenska signalbesked.

## Åtgärdade observationer i version 0.16

- Signalernas detaljer var osynliga när verktygen dolts. De öppnas nu i en detaljruta som kan stängas med knappen eller Escape. Tangentbordsfokus återgår till signalen. V1–V4 använder samma visning.
- Anslutningsstatusen var dold i kompakt läge. Den finns nu vid panelnamnet. Ett ofullständigt start/slut-val rensas vid kontaktförlust eller fjärrläge. Nya knappval spärras utan aktuell anläggningskontakt; återtagningsknapparna finns kvar.
- Aktiva tågvägar och deras individuella återtagning var gömda tillsammans med verktygen. De har nu en egen, hopfällbar lista under spårplanen, även i kompakt läge.
- Reläpanelens passage fick en sammanhängande gul linje trots att etableringen visades med lampor. Passage använder nu samma lamputseende; kvarhållna lås har fortsatt sin särskilda varning.
- Meddelanden om avvisade manövrer kan stängas, så en historisk varning inte behöver ligga kvar efter att förutsättningarna har ändrats.
- På smala skärmar behålls en användbar spårplansbredd med vågrät bläddring. Övriga kontroller ryms i fönstret. Förklaringsraden kan radbrytas.
- Korslänkarna mellan lokal TKL och simulator följer nu deras valda portar. Publika adresser i driftkonfigurationen har fortsatt företräde.

## Utförda webbläsarprov

| Prov | Resultat |
|---|---|
| Två samtidiga infarter `Cu → Spår 1c` och `An → Spår 2c` | Båda klara samtidigt. Separata simulatorfärder påbörjades och passerade hela vägarna. |
| Nummerföljning P921 och G922 | Kopplades uttryckligen före första beläggningen. Nådde respektive sista detektor SIA och SIIA, med status ”Passerad · kontrollera”. Inga lås kvar efter ordnad passage. |
| Låst Vx100/Vx101 | Manöver avvisades i panelen medan infarten var lagd. |
| Samma start och slut en gång till | `Spår 2b → Spår 2a` återtogs och försvann först efter frigivningsvillkoren. |
| Förbindelsen bryts med klar väg och P923-följning | Synlig frånkoppling, okänt signalbesked, tågvägslås kvar och nummerföljning pausad. Ett påbörjat nytt knappval rensades. |
| Förbindelsen återkommer | Vägen låg kvar i stopp och följningen förblev pausad. Manuell återtagning och avslut krävdes. |
| Reläpanel under `Spår 2b → Spår 2a`-passage | Aktiv passage observerad. Linjelagrets beräknade färg var transparent och lampvisningen bevarad. |
| Signalbilder och utseenden | 66 signaler med 198 permanenta bildlager. Original, relä och trafikskärm visades; inga saknade bildreferenser. Trafikskärmens knappar visas som små kvadrater. |
| Detaljer och tangentbord | Signal kunde öppnas i kompakt läge med Enter och stängas med Escape, med fokus tillbaka på samma signal. |
| 390 px och 1440 px fönster | Ingen överbredd på dokumentet. Vid 390 px kan den 1000 px breda spårplanen bläddras separat och detaljrutan ryms. Även 1280 px panel provades. |
| Lokala korslänkar | TKL pekar på 9031 och simulatorn på 9030 efter omstart. |
| Webbläsarfel | Inga konsolfel/varningar i slutkontrollen. |

P921, G922 och P923 togs bort genom den vanliga editorn efter provet. Deras provhistorik behölls. Testvägarna frigavs normalt; ingen driftfil nollställdes.

## Automatiska kontroller

- 124 enhetstester godkända.
- Sex processhelhetstester godkända, inklusive inloggning, separata processer, seriell transport och lokal TrainMeet-fixtur.
- Syntaxkontroll och deterministisk operationsimport godkända.
- Hela original-XML verifierad: 30 432 noder och 96 142 attribut, med ursprungliga bytes, ordning, text och objektkopplingar bevarade.

## Återstående avstämning

Den körbara panelen behåller driftstatus, stopp och återtagning synliga även när designprototypen visar nästan enbart spårplanen. Detta är ett avsiktligt handhavandeval. Godkännande av känsla och slutligt utseende behöver fortfarande Caspers egen provkörning. Saknade originalskript, verifierade MGP-besked, faktisk LocoBuffer och riktig TrainMeet-parning är oförändrade beroenden; se [status](status.md).
