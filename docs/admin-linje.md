# Linje och redigering i administrationen

Infört i 0.32.0 efter Caspers val av Linje.

- Svartvita ytor, tunna avdelare och en smal sidomeny på breda skärmar. På små skärmar används trepunktsmenyn.
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
