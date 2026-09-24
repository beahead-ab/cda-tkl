# Charlottendal TKL – lägesbild 24 september 2026

Grunden är körbar som separat TKL och anläggningssimulator. Den ersätter ännu inte den fysiska JMRI-installationen fullt ut. Att information finns importerad betyder inte att motsvarande funktion är implementerad eller verifierad mot banan.

## Färdigt i den körbara grunden

- Ren ställverkssida med fullskärmsknapp och separat [Verktyg-sida](panel-och-verktyg.md) för trafik, manövrer, utseende, anslutningar och händelser. Signal- och kompisinformation visas vid behov; aktiva stopp och fel är fortsatt synliga.

- Tre panelutseenden, förladdade originalikoner, större träffytor och tågväg som tänds i färdriktningen. Samma start och mål återtar vägen.
- 210 huvudtågvägar och 130 växeltågvägar med etablerings- och passageprov. 49 växlar, 197 körbara layoutblock och 66 signaler. Låsta växlar kan inte läggas om manuellt. Kompisväxlar följer med; omläggning kontrollerar även kompisens spår utanför färdvägen.
- Separat simulator över telegramgränsen, inklusive två samtidiga tåg, beläggning, avbrott och uteblivna återrapporter. TKL läser inte simulatorns interna tillstånd.
- Beständiga lås, spårspärrar, AIS, nödåtertagning, sju linjespärrar, programmeringsspår samt lokal-/fjärrläge. Läget fjärr innebär ännu ingen anslutning till ett fjärrsystem.
- Tåginformation för 197 block och sju inkommande fält. Valbar nummerföljning kopplas uttryckligen till en klar tågväg och följer ordnade återrapporter; vid osäkerhet pausas den för kontroll.
- Hela original-XML bevarad och sökbar; 1 377 regeldefinitioner har spårbar införandestatus. Signalregistret innehåller alla 329 aspektrader och 117 relationer. V1–V4 visas som beräknade panelindikeringar, med okänt underlag där villkor saknas.
- Gemensam modellklocka med paus/start, trafikdygn och hastighet samt valbar lokal felsignal. Programmeringsspåret har beständigt lås och separat återrapport i simulatorn; fysisk funktion återstår att verifiera.
- Inloggning, befintlig webbdrift och kontrollerade versionsbyten med backup. Visningsnamn och beskrivningar kan ändras med utkast och versionshistorik.

## Färdig ändring som inväntar publicering

Version 0.24.0 lägger till direkt manuell tidtabell utan AI-nyckel. Manuell inmatning, filimport och TrainMeet visas i samma kolumnfält. Egna manuella tabeller kan återöppnas som utkast, med aktiv version bevarad fram till nytt godkännande. Tolv riktade tidtabellsprov och två helhetsprov samt webbläsarflödet är godkända. Samma publiceringshinder kvarstår.

Version 0.23.0 gör tidtabellen till ett fast, lågt kolumnfält under spårplanen. Kolumner och radantal anpassas till skärmen; bläddring håller höjden begränsad. Klick/högerklick öppnar fullständiga uppgifter nära tåget. Källval och import ligger i menyn. Provad med 37 importerade/TrainMeet-rörelser, alla tre skins, mobilbredd, fullskärm och levande klocka utan sidbyte. Syntaxkontroll godkänd; backend är oförändrad. [Handhavande](panel-och-verktyg.md). Samma publiceringshinder kvarstår.

Version 0.22.0 lägger till separat [tidtabellsimport med OpenAI](tidtabellsimport.md). Flera bilder/PDF läses som ett utkast med källhänvisningar, rättningar och uttryckligt godkännande före användning. Import och TrainMeet väljs separat under panelens Tidtabell-knapp. 161 enhetsprov och sju helhetsprov passerar; uppladdning, rättning, aktivering, källbyte och mobilbredd är provade med kontrollerat testsvar. En riktig AI-tolkning inväntar serverns API-nyckel. Ingen webbpublicering eller ändring av den kvarhållna tågvägen har gjorts.

Version 0.21.0 lägger till stationens tidtabell via TrainMeets befintliga HTTP-gränssnitt och en Tidtabell-knapp under panelen. Spårkatalog, driftplatser, trafikdag, tider och anmärkningar samt levande driftstatus visas. Cache byts vid ny publikation/dag/station; tappad kontakt märker senaste data som gamla. Detta är läsande stöd, inte TMBox v2/MQTT eller skrivande klarering. 151 enhetsprov och sex helhetsprov passerar; referensfixtur från serverkoden och UI med spårbyte, avbrott och mobilbredd verifierade. Riktig anslutning inväntar serveradressen. Webbpublicering inväntar fortsatt tidigare återtagningsbesked.

Version 0.20.0 samlar panelmanövrerna under spårplanen som ställverksknappar: signalstopp/återställning, tågvägstyp, tågvägar/återtagning, avbryt val, nödåtertagning, spärrar, programmeringsspår, tågnummer, modellklocka och driftläge. Menyn innehåller stödsidorna. Spårtexterna använder normalvikt 400 med oförändrad storlek och källdata. Tre utseenden, mobilbredd och manövrer är provade i webbläsaren; sex helhetstester och syntax passerar. [Handhavande](panel-och-verktyg.md). Tidigare publiceringshinder nedan kvarstår.

Version 0.19.1 flyttar objektinformation till högerklick och en modal nära klickpunkten. Vänsterklick manövrerar fortsatt växeln, medan muspekning/fokus inte öppnar detaljer. Kompisuppgifter ingår i samma ruta. Tangentbord, fullskärm, skärmkant, mobilbredd, levande återrapport samt stängning utan genomsläppt växelmanöver är provade lokalt. Publiceringshindret nedan kvarstår.

Version 0.19.0 samlar stödfunktionerna i en hamburger-meny och ger TrainMeet en egen sida för serveradress och parkoppling. Adressen sparas över omstart; serverbyte kräver frånkoppling så att ingen gammal nyckel skickas vidare. Samtliga 146 enhetstester och sex processhelhetstester passerar lokalt. Meny, tangentbord, mobilvy, fullskärm, adressvalidering, sidbyte och formulärutkast är provade i webbläsaren. [Anslutning och begränsningar](trainmeet-adapter.md). Riktig TrainMeet-anslutning väntar på Caspers serveradress och placering. Publiceringen inväntar fortfarande besked om den kvarhållna tågvägen nedan.

Version 0.18.0 (`92bc576`) har V1–V3 med släckta vilolampor och växelvis röd blinkning vid korsande tågvägsreservation eller belagt korsande block. Den nya visningen följer panelens geometri; originalets XML-projektion bevaras. [Beteende och prov](vagindikeringar.md).

13 riktade indikeringsprov och sex processhelhetstester passerade lokalt. Serverns 141 enhetstester, sex helhetstester, XML-, operations- och syntaxkontroller passerade. Publiceringsförsöket stoppades av kvarvarande lås för Au → Spår 1a. Den tidigare versionen 0.17.1 (`97c6546`) återställdes med låsen bevarade. Tjänsterna är aktiva, anslutningen återställd utan startfel och HTTPS-login svarar 200. Casper har fått frågan om provvägen får återtas före ett nytt publiceringsförsök. Ingen tillåtelse har ännu kommit; ingen tågväg eller beläggning har raderats.

## Kvar för en fullständig ersättning

| Del | Vad som återstår | Underlag som behövs |
|---|---|---|
| Verklig MGP/LocoBuffer | Seriell gateway och virtuellt portprov är byggda. Anslutning vid banan, rätt adresser och fysisk verifiering i båda riktningarna återstår. | Buffertmodell, inställningar, moduler/firmware och inspelad fysisk trafik. |
| Svenska signalbesked | Fulla huvud-/försignalbesked, signalberoenden och fysisk beskedsmappning. Nuvarande kör/stopp använder en uttryckligt preliminär CZ-profil. | Verifierade svenska beskedskoder och de saknade exakta ikondefinitionerna där originalunderlaget inte räcker. |
| Återstående driftfunktioner | Ranger-/godsområdets överlämning, vändskiva, återstående automatik och frigivning i delar av en tågväg. | Källbundna regler och specificerade ersättningar för saknade skript. |
| Oklara tågvägar | Tre motsägande huvudtågvägsregler, 15 undantagna växelpar och 20 NX-definitioner utan körbar koppling behöver avgöras. Dessa antal överlappar och ska inte summeras. | Rättelse eller beslutat undantag för de konkreta källoklarheterna. |
| TrainMeet | Läsande HTTPv1-adapter är byggd och provad lokalt. Riktig parkoppling, koppling mellan stations-/spår-id och skrivande klareringsutbyte återstår. | Bekräftat aktuellt gränssnitt och dess normala parning/inloggning. |
| Admin och panel | Driftbindningar, adresser och administrativa begränsningar har en färdig versionseditor. Godtycklig regeländring återstår; första visuella avstämningen och trafikprovkörningen är genomförda, därefter återstår Caspers eget acceptansprov. | Den befintliga designen och provfallens förväntade beteenden. |

Tolv externa Jython-skript saknas fortfarande. Vissa beteenden har fått dokumenterade och provade ersättningar, men full överensstämmelse med den gamla installationen är inte fastställd. Nummerföljningen använder manuellt tilldelad tågidentitet; den identifierar inte lok och ändrar ingen TrainMeet-klarering.

**Avsiktligt vilande:** Friställa spår och den extra lilla växellåsindikator som Casper bad oss avvakta med.

## Nästa praktiska steg

[Steg 1 är genomfört](provkorning-2026-09-24.md): två samtidiga tåg, nummerföljning, växellås, återtagning och avbrott provades i webbläsaren. Signalinformation och anslutningsstatus finns på den renodlade panelen; återtagningslistan och stödfunktionerna finns nu under Verktyg. Casper kan nu provköra version 0.17.1 på den befintliga webbadressen. [Kompisväxlarna har kontrollerats särskilt](kompisvaxlar.md), och ett fel som tillät omläggning på belagt sidospår har rättats. Manuell manövrering visar nu berörda kompisväxlar, deras återrapporterade lägen, spårstatus och spärrorsak. Växlar utanför vyn kan visas utan manöver.

Den publicerade versionen 0.17.0 har klarat 134 enhetstester och sex processhelhetstester. Backupens driftdata har återlästs i en isolerad kopia utan fältorder. Telegraminspelningen ger namngivna loggar med båda riktningarna, råtelegram och separat tolkning. Det förbereder jämförelsen mellan simulator och fysisk utrustning. Det ersätter inte hårdvaruanslutningen. Fortsätt samtidigt med verifierbara manöverfall, admin och visuell avstämning; aktivera inte okända signal- eller adressbindningar genom gissning.

Aktuell publicerad release och provstatus finns i [arbetsjournalen](arbetsjournal.md), [provresultaten](provresultat.md) och [driftuppgifterna](drift.md).

[Avstämning av samtliga 54 användningsfall och tio produktkrav](acceptans-2026-09-23.md) visar exakt vad som är provat, avsiktligt vilande eller beroende av ytterligare underlag.

Version 0.25.0 lägger till direkt Excel-/CSV-import och nedladdningsbara mallar med tio fasta kolumner. Ingen AI-nyckel krävs. Exakta värden och radreferenser går genom befintlig granskning till panelens kolumner. 171 enhetstester och två riktade processhelhetsprov godkända. Lokalt uppdaterad, ännu inte webbpublicerad; tidigare obesvarade fråga om återtagning av Au → Spår 1a kvarstår.
