# Egen tidtabell och import · 0.24.0

TKL kan importera en tidtabell från flera bilder och PDF-filer utan TrainMeet. OpenAI läser underlagen tillsammans och skapar ett utkast. Ingenting används i panelen innan användaren har granskat och godkänt det.

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

Uppdatera också Nginx från `deploy/nginx-app.conf` vid publicering: endast importens uppladdningsadress tillåter 23 MB JSON, och rättningsadressen 2 MB. Övriga anropsgränser behålls. Base64-innehållet är större än originalfilerna. Tolkningen startas i bakgrunden och uppladdningsanropet väntar inte på AI-svaret.

Integrationen använder [Responses med PDF-indata](https://developers.openai.com/api/docs/guides/file-inputs) och [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). [Modellens egenskaper](https://developers.openai.com/api/docs/models/gpt-5-mini) kontrollerades mot OpenAI-dokumentationen. Begäran har `store: false`, inga verktyg och en fast OpenAI-adress. Detta är inte ett löfte om noll lagring hos leverantören.

## Sparande och fel

`timetable-import.json` i appens datamapp innehåller källa, granskningsutkast och godkänd tabell. Originalfiler ligger i `timetable-imports/<import-id>/`, med rättighet 0600 för filer och 0700 för importmappar. De exponeras endast bakom appens ordinarie inloggning och bara när de hör till aktuellt utkast eller aktiv tidtabell. Hela datamappen ska ingå i backup.

Kastade och ersatta importers original ligger kvar på disk men kan inte hämtas via appen. Automatisk gallring och en historikvy ingår inte ännu; lagringsutrymme behöver därför följas upp. Utkast och godkänd tabell sparas före tillståndsbyte. Samtidiga rättningar skyddas av versionskontroll; äldre formulär skriver inte över senare uppgifter.

AI vägras lämna ett användbart utkast när svaret avbrutits, saknar källreferenser eller själv anger att underlag inte kunnat läsas färdigt. Otydliga uppgifter markeras för kontroll. Den befintliga aktiva tidtabellen finns kvar vid misslyckad import. Ett avbrutet jobb markeras som misslyckat efter omstart och måste startas om uttryckligen av användaren. Ett AI-anrop kan redan ha debiterats även om svaret inte når appen.

## Verifiering

För 0.24.0 passerar tolv riktade tidtabellsprov samt två processhelhetsprov (import/manuell inmatning och inloggningsskydd). Proven omfattar manuell tabell utan AI-nyckel, tillägg, granskning, återöppning, bibehållen aktiv tabell, omstart, revisionskonflikt, radgräns och avsaknad av fältorder. Webbläsarprov: två manuella tåg, automatiskt sparande före ny rad, aktivering till panelens kolumner och ändrat spår som visas först efter godkännande.

Tidigare importleverans:
161 enhetstester och sju processhelhetstester godkända. Proven omfattar flerfilsöverföring, storleks-/typkontroll, dubbletter, sidreferenser, felaktiga och ofullständiga AI-svar, samtidighet, lagringsfel, inloggningsskydd, beständiga rättningar och källbyte. Integrationsprovet verifierar att inga fältorder eller klockändringar skapas.

Webbläsarflödet har provats med en separat testserver och kontrollerat AI-testsvar: uppladdning av bild och PDF, osäker rad, rättning, sparande, granskningsspärr, aktivering samt byte till TrainMeet och tillbaka. Från 0.23.0 visas tidtabellen i kolumner med bläddring; vid 390 pixlar ryms en kolumn utan sidöverflöde. Testfixturernas filer provar transporten, inte verklig dokumenttolkning.

**Kvar före riktig AI-användning:** konfigurera servernyckeln och verifiera tolkningen på representativa tidtabellsbilder och flersidiga PDF:er. Ingen verklig AI-tolkning har ännu körts i denna installation. Webbpubliceringen inväntar också tidigare besked om den kvarhållna provtågvägen Au → Spår 1a.
