# Linje och redigering i administrationen

Infört i 0.32.0 efter Caspers val av Linje. Genomgående gemensam navigation och arbetsyta i 0.33.0.

- Samma svarta bakgrund, typografi och tunna avdelare från sidomeny till arbetsyta. Sidomenyn ligger fast bredvid innehållet från 540 px skärmbredd. Under 540 px öppnas samma meny som en sidolåda med trepunktsknappen. Ställverket ligger överst; panelen får hela skärmen när man återvänder dit.
- Översikter visar sparade värden och ingångar till redigering. Sökning, filtrering och sortering får ligga direkt på sidan.
- Korta formulär öppnas i dialog. Spara och Avbryt finns i dialogens fasta nederkant. Fältens formatfel visas intill inmatningen och värdet behålls. Serverfel visas i samma dialog.
- Tidtabellens kalkylblad, importgranskning, visningsinställningar och driftinställningar har egna arbetsytor. Namn, beskrivningar och enskilda bindningar redigeras i dialog därifrån.
- Osparade formulär och celländringar skyddas vid avbrott och navigering. Fortsätt redigera behåller inmatningen; Kasta ändringarna lämnar utan att spara. Inga dialoger staplas.
- Spara utkast ändrar inte den aktiva tidtabellen. Använd i ställverket är ett eget steg efter granskning. Profiler har fortsatt sin separata granskning, versionshistorik och befintliga driftvillkor.
- Utseende, zoom och ljud är märkta Den här enheten. TrainMeet, tidtabeller och anläggningsuppgifter gäller Hela anläggningen.
- Driftknapparnas manövrer är oförändrade.

Panelens namn- och statusrad är borttagen. Trepunktsmenyn ligger uppe till vänster och visar LocoNet-status. Ortsnamnen har vektorpilar utan ramar. Tom tidtabell visar inga tomtexter eller bläddrare; reserverad höjd behålls för en stillastående spårplan. Bläddring visas först när raderna inte ryms. Återställ panel ligger vid nederkantens högra sida.

## Verifiering

Syntax och tio riktade prov för rendering, zoom och kalkylblad godkända. Lokalt webbprov: Spara/Avbryt, osparat formulär och kalkylblad, fältnära fel, separat visningsarbetsyta, TrainMeet-översikt och Avancerat. Tom tidtabell och tre rader saknar bläddring; 37 rader har fungerande nästa sida utan ändring av spårplanens höjd. Breda och smala skärmar kontrollerade. Inga driftmanövrer eller provtidtabeller läggs i produktionen under publiceringen.


## Genomgång 0.33.0

Alla adminområden använder samma sidomeny och innehållskant: tidtabellsöversikt, import, kalkylblad, TrainMeet, anläggningsregister, objektdetaljer, visningsinställningar, driftinställningar, utseende/ljud, händelser, Avancerat med XML-granskning, införandestatus och protokollinspelning samt Byt lösenord. Undersidor visas under sin huvudkategori med aktuell sida markerad. LocoNet-status ligger längst ned i menyn. Kontosidan delar navigationsmodul med huvudappen; inloggningssidan har samma svartvita färger.

Visuellt kontrollerat vid 1280, 650 och 390 px, inklusive mobilens öppna/stänga meny och sidbyte. TrainMeet-dialogen öppnas över innehållsytan. Kalkylbladets navigeringsskydd kontrollerat med både Fortsätt redigera och Kasta ändringarna. Kontolayout kontrollerad med skrivskyddad lokal visningsmodell utan lösenord. Syntax och elva prov för rendering, zoom, kalkylblad och lösenordsskydd godkända. Produktionskontrollen gör inga driftmanövrer och ändrar inga inloggningsuppgifter.


## Gemensam meny även för driftverktygen · 0.33.1

Samma monterade meny används nu både bakom panelens tre punkter och som fast vänstermeny i administrationen. Ordning, namn, genvägar och status är samma. Driftverktygens sex avsnitt öppnas som egna arbetsytor bredvid menyn; den separata äldre driftlådan är borttagen. Zoom öppnas ovanpå aktuell sida. Endast själva ställverket får fullbredd när menyn stängs. Inga driftkommandon skickas av navigering.
