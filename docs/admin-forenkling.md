# Administration och kalkylblad · 0.28.1

## Beslutad riktning

Adminsidor visar sparade uppgifter och tydliga åtgärder. Korta ändringar görs i en modal med Spara och Avbryt. Större uppgifter har en egen adress och arbetsyta. Sökning och filtrering är kvar på översikterna. Panelens driftknappar behåller sitt direkta beteende.

Casper förtydligade under arbetet att tidtabellen ska redigeras som ett kalkylblad. Därför används inte en modal per tågrörelse.

| Del | Genomfört |
|---|---|
| Tidtabell | Översikt över aktiv källa, egen sparad tabell och pågående utkast. Ny tidtabell öppnar namndialog; Fortsätt/Redigera öppnar kalkylbladet. |
| Import | Egen sida `#import/upload` med mallar, filval och AI-information. Resultatet öppnas i samma kalkylblad. |
| Kalkylblad | Egen sida `#import/edit`. Cellredigering, pilar/Tab/Enter, flercellsmarkering, kopiering och inklistring av tabeller, nya rader, uteslutning, tömning och ångra/gör om. |
| Tidtabellskälla | Sparat val visas i översikten. Byte görs i modal och börjar gälla vid Spara. |
| TrainMeet | TKL-id, adress, station och status visas som läsbara uppgifter. Redigering och parkoppling har varsin modal. |
| Utseende och ljud | Läsbar sammanfattning. Inställningar börjar gälla vid Spara i modalen. |
| Visningsnamn | Sökbar objektlista och vald objekts sammanfattning. Namn/beskrivning samt aktivering redigeras i modaler. |
| Driftbindningar | Egen sida `#register/bindings`, med aktuella värden och separat bindningsmodal. Befintliga aktiveringsvillkor och versionshistorik kvar. |
| Registerdetaljer | Egen objektsida, med stabil länk som överlever omladdning. Anteckningen redigeras i modal. |
| Händelser / protokoll | Läsande loggvy. Ny inspelning öppnar en namndialog. |
| Konto | Befintlig separat lösenordssida uppfyller uppdelningen; ingen ändring av autentisering eller lösenordskrav. |
| Ställverk / simulator | Driftmanövrerna omfattas inte av adminomläggningen. |

## Kalkylbladets gränser

Elva fasta kolumner, högst 300 rader. De första tio följer CSV-/Excelmallens ordning. Den sista, Ta med, utesluter rader utan att tappa originalet. Ja/Nej används för Passerar och Ta med. Inledande nollor bevaras som text; tider efter midnatt stöds, exempelvis 25:10. Inklistring är atomär: ett ogiltigt eller för stort område läggs inte in delvis. Citat, tabbar och radbrytningar i inklistrade texter stöds. Alt+Enter ger radbrytning när en anmärkning redigeras.

Spara utkast sparar hela kalkylbladet i en servertransaktion. Befintliga radidentiteter och källreferenser verifieras och bevaras; nya rader får servergenererade identiteter utan påhittade källreferenser. Aktiv tidtabell ändras först vid Godkänn och använd. Även en tidigare godkänd import kan öppnas som ett nytt granskningsutkast. Proveniens och osäkerheter finns under Underlag för vald rad; originalfilerna finns kvar.

Ångra/gör om gäller högst 50 lokala ändringssteg fram till nästa sparning. Formler, formatering per cell, diagram, pivottabeller, kolumnsortering och samtidig samredigering ingår inte. TKL ansluter inte till ett Google-konto. Två samtidiga ändringar ger i stället revisionskonflikt; den gamla vyn behåller osparade celler och får inte skriva över den nya.

Modaler skyddar osparad inmatning med Fortsätt redigera/Kasta ändringarna i samma dialog, utan staplade modaler. Kalkylblad och filval skyddas vid sidbyte och webbläsaren får ett beforeunload-skydd vid omladdning. Sparade utkast finns kvar på servern.

## Godkänd förenkling i 0.28.1

Casper godkände båda rekommendationerna med ”ok kör”:

- Den separata sidan Anslutningar och konto är borttagen. Profilinformationen visas i Anläggningsregistret. TrainMeet, simulatorn och lösenordsbyte nås fortsatt via menyn. Äldre länkar till `#tools/connections` leder till registret.
- Avancerat samlar tre separata sidor: XML-granskning (`#advanced/xml`), införandestatus (`#advanced/migration`) och protokollinspelning (`#advanced/protocol`). Vanliga Händelser visar driftjournalen.
- XML-granskningen kontrollerar originalets innehåll och importens spårbarhet. Originalfil, källavsnitt och full registersökning är fortsatt tillgängliga. Införandestatus länkar fortfarande till varje källgrupp. Sparade loggar och inspelningsfunktionen är bevarade.
- Objektregistret, anteckningar, versionshistorik och aktiveringsspärrar finns kvar. Ingen ändring av backend, profiler, originaldata eller autentisering.

## Provning

- 183 enhetstester och sju processhelhetstester passerade. Det utökade tidtabellsprocessprovet verifierade därefter den nya kalkylbladssparningen över HTTP, gammal revision, omstart, bevarad aktiv tabell och oförändrat fälttillstånd.
- Isolerad lokal installation 9050/9051/9052. Ny tidtabell, modalens osparat-skydd, två inklistrade rader, inledande nollor, 25:10, ångra/gör om, Spara utkast, Godkänn och använd samt CSV-import till kalkylbladet provades via vanlig UI.
- Tangentbordsredigering med F2, Tab och Escape provades. Inmatning aktiverar Spara; Escape återställer cellen. Två öppna vyer verifierade att osparade celler bevaras vid en verklig revisionskonflikt och att omläsning kräver ett uttryckligt val.
- TrainMeet-fel visas i modalen med inmatningen kvar. Giltig sparning uppdaterar översikten. Inställningsprov bekräftade att vald blinkning inte tillämpas förrän Spara.
- Namn/beskrivning sparades i visningsutkast. Driftbindningsmodal, anteckningsmodal, protokollnamndialog och återöppning av objekt-/kalkylbladssidor kontrollerades. Inga observerade konsolfel.
- Visuell kontroll i faktisk 1280 × 720-vy. Försökt viewportbyte till mobilmått ändrade inte verktygets verkliga fönsterbredd; någon verifierad mobilrendering påstås därför inte.
- Provdata skapades endast i den isolerade lokala installationen, inte i webbdriften.

### Navigationsprov 0.28.1

Syntaxkontroll och diffkontroll godkända. Isolerat UI-prov verifierade de tre nya ingångarna, XML-avsnitt till objektdetalj, hela registersökningen, direktlänk/omladdning av XML-sidan, införandestatus, inspelningsmodalens öppning/avbryt, ren händelsesida och äldre anslutningslänk till profilen i registret. Visuell kontroll av Avancerat och den förenklade menyn; inga konsolfel observerades. Ingen inspelning, tidtabell eller driftmanöver skapades för provet.
