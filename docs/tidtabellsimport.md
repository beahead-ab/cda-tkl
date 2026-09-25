# Uppdaterat arbetsflöde från 0.28.0

Meny → Tidtabell och import är en översikt. **Ny tidtabell** skapar ett namngivet utkast och **Importera** öppnar en egen importsida. **Redigera** eller **Fortsätt med utkastet** öppnar en kalkylbladssida för direkt cellredigering och inklistring av flera rader från Excel/Google Sheets. Även godkända importer kan redigeras som ett nytt utkast. **Spara utkast** sparar samtliga celler; **Godkänn och använd** aktiverar först efter granskning. Tidtabellskällan byts genom en modal. [Detaljer och avgränsningar](admin-forenkling.md).

Nedan beskrivs format och regler; äldre hänvisningar till en radblankett avser nu motsvarande celler i kalkylbladet.

# Egen tidtabell och import · 0.25.0

TKL kan ta emot en egen tidtabell manuellt, från Excel/CSV med fasta kolumner eller genom AI-tolkning av bilder och PDF. Ingenting används i panelen innan användaren har granskat och godkänt det. Alla källor visas i samma kolumnfält under spårplanen.

## Importera Excel eller CSV

Öppna **Meny → Tidtabell och import → Importera Excel eller CSV**. Hämta **Excelmall** eller **CSV-mall**, ersätt de två exempelraderna och välj **Läs in fil**. Ingen AI-tjänst eller API-nyckel används. Mallarna hämtas via `/api/timetable-import/template.xlsx` respektive `.csv`, bakom samma inloggning som panelen.

Rubrikraden och kolumnordningen ska vara exakt:

| Kolumn | Innehåll |
| --- | --- |
| Tågnummer | Obligatoriskt. Text, till exempel P401 eller 00402. |
| Station | Obligatoriskt. Station eller driftplats. |
| Trafikdag | Obligatoriskt. Exempelvis Dagl, Lör eller 2026-09-24. |
| Ankomst | HH:MM eller tomt. |
| Avgång | HH:MM eller tomt. Minst en av de två tiderna krävs. |
| Spår | Valfri beteckning, exempelvis 1a. |
| Från | Valfri avsändande station. |
| Till | Valfri mottagande station. |
| Passerar | Ja för passage utan uppehåll, annars Nej. |
| Anmärkning | Valfri text, högst 2 000 tecken. |

En fil får innehålla högst 300 tågrörelser och vara högst 2 MB. Övriga textfält får vara högst 160 tecken. Helt tomma rader hoppas över. Tider till och med 99:59 stöds, inklusive 25:10 efter midnatt. Sekunder avrundas inte till minuter. Inledande nollor i textvärden bevaras.

- **Excel:** `.xlsx`, med data på bladet **Tidtabell**, rubriker på rad 1 och tio kolumner A–J. Mallen har även ett instruktionsblad **Läs mig**. Andra blad avvisas så att data inte tappas tyst. Vanliga Excel-tidsceller och HH:MM-text stöds. Mallen använder textformat för beteckningar och tidsformat för tider. Behåll textformatet för tågnummer/spår. Använd värden utan formler; även formler med sparat resultat avvisas. Dolda datarader, sammanslagna celler, felvärden, makron och externa arbetsbokslänkar avvisas. Äldre `.xls` måste sparas som `.xlsx`.
- **CSV:** UTF-8, med eller utan BOM, semikolon eller komma. Rubrikerna avgör avskiljaren. Citattecken, avskiljare och radbrytningar i ett fält hanteras enligt CSV-reglerna. Vid redigering av CSV i Excel behöver beteckningskolumner importeras som text för att Excel självt inte ska ta bort nollor.

Felformaterade uppgifter ger rad-/kolumnfel före utkastet skapas. Ett giltigt utkast granskas, rättas, sparas och godkänns på samma sätt som annan egen tidtabell. Varje rad visar fil och radnummer, samt bladnamn för Excel. Originalet kan laddas ner. Dubbletter måste rättas eller uteslutas före aktivering. Den tidigare aktiva tidtabellen ligger kvar under hela granskningen och vid fel.

Filinläsningen kör i en separat worker med 10 sekunders gräns och begränsat minne. ZIP-filens både angivna och verkliga uppackade storlek kontrolleras (12 MB, högst 128 poster). Rättningar från andra klienter under inläsningen upptäcks innan något sparas. Inläsningen har ingen koppling till fältorder eller TrainMeet-skrivningar. Bibliotek: [read-excel-file](https://github.com/catamphetamine/read-excel-file), [csv-parse](https://csv.js.org/parse/), [yauzl](https://github.com/thejoshwolfe/yauzl) och [saxes](https://github.com/lddubeau/saxes).

## Skriv in en tidtabell manuellt

Öppna **Meny → Tidtabell och import → Skapa tidtabell manuellt**. Skriv namn och tågrörelser med station, trafikdag, tider, spår, från/till och anmärkning. **Lägg till tågrörelse** sparar nuvarande uppgifter och lägger till en tom rad med samma station/trafikdag som föregående rad. **Ta med rad** bestämmer vilka rörelser som ska användas; avmarkera sådant som ska utgå.

Spara utkastet, markera att uppgifterna är kontrollerade och välj **Godkänn och använd tidtabellen**. Den visas direkt i samma fält under spårplanen som filimport och TrainMeet. Ingen AI-tjänst, API-nyckel eller fil krävs. Samma gräns på 300 rader och samma kontroll av obligatoriska uppgifter och dubbletter gäller.

En tidigare manuellt skapad tidtabell kan öppnas med **Redigera tidtabellen**. Den aktiva tabellen ligger kvar under redigering och ersätts först vid nytt godkännande. Ett utkast kan kastas utan att den aktiva tabellen ändras. Aktiverad tidtabell och utkast överlever omstart. Det finns en egen tidtabell åt gången, skapad manuellt eller från filimport.

## Importera bilder och PDF

1. Öppna **Meny → Tidtabell och import**. Ange en station som ledtråd om underlaget innehåller flera stationer.
2. Välj 1–8 filer: PDF, PNG, JPEG eller WebP. Högst 8 MB per fil och 16 MB tillsammans. Gränsen är 300 tågrörelser per import.
3. Välj **Tolka med AI**. Först då skickas filerna till OpenAI. Panelen kan användas under tiden.
4. Granska raderna mot originalen. Varje rad har fil- och sidhänvisning; bilder kan visas på sidan och PDF-originalet laddas ner. Kontrollera även att alla relevanta rörelser finns med: AI:s uppgift om fullständighet är ingen oberoende garanti.
5. Rätta tågnummer, station, trafikdag, ankomst, avgång, spår, från/till, anmärkning och eventuell genomfart. Uteslut dubbletter eller felaktiga rader med **Ta med rad**. Spara rättningarna.
6. Markera att granskningen är gjord och välj **Godkänn och använd tidtabellen**. Ändringar i utkastet återställer granskningsmarkeringen. Valda rader måste ha tågnummer, station, trafikdag och minst en tid; identiska tågrörelser måste först rättas eller uteslutas.

Tidtabellen visas i ett lågt kolumnfält direkt under spårplanen. Bläddra mellan grupper av tågrörelser och öppna fullständiga uppgifter genom klick eller högerklick. Välj mellan **TrainMeet** och **Egen tidtabell** under **Meny → Tidtabell och import**. En ny godkänd import ersätter den tidigare separata tidtabellen. TrainMeet-anslutningen och dess tidtabell finns kvar. Den separata tabellen visar planerade uppgifter med station och trafikdag, utan levande klareringsstatus. Den ändrar inga växlar, signaler, beläggningar, tågnummersfält eller klockor.

## OpenAI på servern

Sätt `OPENAI_API_KEY` i serverns skyddade miljöfil för TKL-tjänsten. Nyckeln ska inte läggas i Git, webbläsarkod, dokument eller chatt. Exempel på variabler finns i `deploy/app.env.example`; standardmodell är `gpt-5-mini`, valbar genom `CHARLOTTENDAL_TIMETABLE_MODEL`. Modellen måste stödja bild- och PDF-inmatning samt strukturerade svar. En tjänsteomstart krävs efter ändring; använd ordinarie driftprocedur med hänsyn till kvarvarande lås.

Utan nyckel visar importsidan att AI inte är ansluten och spärrar tolkning. Sparade, godkända tidtabeller fungerar fortfarande. API-kostnaden hör till det OpenAI-projekt vars nyckel används; ange önskade användningsgränser där. Appen återförsöker inte automatiskt efter avbrott, kvotfel eller omstart.

Uppdatera också Nginx från `deploy/nginx-app.conf` vid publicering: AI-uppladdningen tillåter 23 MB JSON, Excel/CSV-adressen `/api/timetable-import/table` 3 MB och rättningsadressen 2 MB. Övriga anropsgränser behålls. Base64-innehållet är större än originalfilerna. AI-tolkningen startas i bakgrunden och uppladdningsanropet väntar inte på AI-svaret.

Integrationen använder [Responses med PDF-indata](https://developers.openai.com/api/docs/guides/file-inputs) och [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). [Modellens egenskaper](https://developers.openai.com/api/docs/models/gpt-5-mini) kontrollerades mot OpenAI-dokumentationen. Begäran har `store: false`, inga verktyg och en fast OpenAI-adress. Detta är inte ett löfte om noll lagring hos leverantören.

## Sparande och fel

`timetable-import.json` i appens datamapp innehåller källa, granskningsutkast och godkänd tabell. Originalfiler ligger i `timetable-imports/<import-id>/`, med rättighet 0600 för filer och 0700 för importmappar. De exponeras endast bakom appens ordinarie inloggning och bara när de hör till aktuellt utkast eller aktiv tidtabell. Hela datamappen ska ingå i backup.

Kastade och ersatta importers original ligger kvar på disk men kan inte hämtas via appen. Automatisk gallring och en historikvy ingår inte ännu; lagringsutrymme behöver därför följas upp. Utkast och godkänd tabell sparas före tillståndsbyte. Samtidiga rättningar skyddas av versionskontroll; äldre formulär skriver inte över senare uppgifter.

AI vägras lämna ett användbart utkast när svaret avbrutits, saknar källreferenser eller själv anger att underlag inte kunnat läsas färdigt. Otydliga uppgifter markeras för kontroll. Den befintliga aktiva tidtabellen finns kvar vid misslyckad import. Ett avbrutet jobb markeras som misslyckat efter omstart och måste startas om uttryckligen av användaren. Ett AI-anrop kan redan ha debiterats även om svaret inte når appen.

## Verifiering

För 0.25.0 passerar samtliga 171 enhetstester och två riktade processhelhetsprov (tidtabellsimport och lösenord). Excel-/CSV-proven omfattar mallarnas faktiska innehåll, tidsvärden inklusive 00:00/25:10, 1904-datumsystem, XML-namnrymder, nollor, citattecken, radbrytningar, felrubriker, obligatoriska fält, formler, dolda rader, sammanslagna celler, storleksgränser, samtidiga rättningar, aktivering och omstart. HTTP-prov verifierar nedladdning/HEAD, originalfil, åtkomstskydd och att tågvägar, beläggningar och klockans auktoritet är oförändrade.

I webbläsaren har Excelmallen laddats upp utan AI-nyckel, granskats, fått rättat spår och aktiverats i panelens ordinarie kolumner. CSV-mallen har laddats ner, lästs in med radreferenser och aktiverats i samma panelkolumner. Föregående aktiva tabell bevarades under granskningen. Ingen riktig AI-tolkning ingår i dessa prov.
