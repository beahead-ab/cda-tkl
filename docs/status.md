# Charlottendal TKL – lägesbild 24 september 2026

Grunden är körbar som separat TKL och anläggningssimulator. Den ersätter ännu inte den fysiska JMRI-installationen fullt ut. Att information finns importerad betyder inte att motsvarande funktion är implementerad eller verifierad mot banan.

## Färdigt i den körbara grunden

- Ren ställverkssida med fullskärm, manöverknappar och tidtabellskolumner under spårplanen. En [meny](panel-och-verktyg.md) samlar TrainMeet, import, utseende, anslutningar och händelser. Signal- och kompisinformation visas vid behov; aktiva stopp och fel är fortsatt synliga.

- Tre panelutseenden, förladdade originalikoner, större träffytor och tågväg som tänds i färdriktningen. Samma start och mål återtar vägen.
- 210 huvudtågvägar och 130 växeltågvägar med etablerings- och passageprov. 49 växlar, 197 körbara layoutblock och 66 signaler. Låsta växlar kan inte läggas om manuellt. Kompisväxlar följer med; omläggning kontrollerar även kompisens spår utanför färdvägen.
- Separat simulator över telegramgränsen, inklusive två samtidiga tåg, beläggning, avbrott och uteblivna återrapporter. TKL läser inte simulatorns interna tillstånd.
- Beständiga lås, spårspärrar, AIS, nödåtertagning, sju linjespärrar, programmeringsspår samt lokal-/fjärrläge. Läget fjärr innebär ännu ingen anslutning till ett fjärrsystem.
- Tåginformation för 197 block och sju inkommande fält. Valbar nummerföljning kopplas uttryckligen till en klar tågväg och följer ordnade återrapporter; vid osäkerhet pausas den för kontroll.
- Hela original-XML bevarad och sökbar; 1 377 regeldefinitioner har spårbar införandestatus. Signalregistret innehåller alla 329 aspektrader och 117 relationer. V1–V4 visas som beräknade panelindikeringar, med okänt underlag där villkor saknas.
- Gemensam modellklocka med paus/start, trafikdygn och hastighet samt valbar lokal felsignal. Programmeringsspåret har beständigt lås och separat återrapport i simulatorn; fysisk funktion återstår att verifiera.
- Inloggning, befintlig webbdrift och kontrollerade versionsbyten med backup. Visningsnamn och beskrivningar kan ändras med utkast och versionshistorik.

## Publicerat på webbadressen

Version **0.26.0**, release `ed27e49`, publicerades 24 september kl. 22:53 på [cda-tkl.trainmeet.app](https://cda-tkl.trainmeet.app/). Den tidigare blockeringen med tågvägslås är löst genom normal återtagning. Aktuellt stoppläge och inloggning bevarades; simulatorn fortsatte köra.

- Fast ställverksyta: status, spårplan, tidtabell och knappar har reserverade fält. Detaljer öppnas ovanpå, hover flyttar inga symboler och ljusflödet följer bildrutorna med monoton tidsmätning.
- V1–V3 har släckta vilolampor och växelvis röd blinkning vid korsande tågvägsreservation eller belagt korsande block.
- Stödfunktioner ligger i menyn. Objektinformation öppnas med högerklick nära objektet. Panelmanövrerna ligger under spårplanen och spårtexterna har normalvikt.
- TrainMeet har en egen anslutningssida och en läsande tidtabellsadapter. Verklig serveradress och parkoppling återstår.
- Samma låga kolumnfält visar tidtabellen från TrainMeet, manuell inmatning eller importerade filer.
- Excel-/CSV-import med tio fasta kolumner och nedladdningsbara mallar fungerar utan AI-nyckel. Underlagen granskas och godkänns före användning. [Format och handhavande](tidtabellsimport.md).
- Bilder/PDF kan förberedas för AI-tolkning, men serverns OpenAI-nyckel behöver fortfarande läggas in. Verklig tolkningskvalitet är ännu inte verifierad.

Version 0.25.0 klarade serverns XML-/operations- och syntaxkontroller, 171 enhetstester och sju processhelhetstester. Version 0.26.0 klarade **174 lokala enhetstester**, webbläsarprov och serverns tre nya renderingsprov/syntaxkontroll; jämförelsen bekräftar oförändrad backend och driftdata. Därefter verifierades tjänster, anslutning, skyddade API:er, inloggning och meny/import i webbläsaren. Backup och föregående kodversion är bevarade; se [driftuppgifterna](drift.md). Inga provtidtabeller lades in i webbdriften.

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

[Steg 1 är genomfört](provkorning-2026-09-24.md): två samtidiga tåg, nummerföljning, växellås, återtagning och avbrott provades i webbläsaren. Signalinformation och anslutningsstatus finns på den renodlade panelen; återtagning nås via panelens Tågvägar-knapp och stödfunktionerna via menyn. Casper kan nu provköra version 0.26.0 på den befintliga webbadressen. [Kompisväxlarna har kontrollerats särskilt](kompisvaxlar.md), och ett fel som tillät omläggning på belagt sidospår har rättats. Manuell manövrering visar nu berörda kompisväxlar, deras återrapporterade lägen, spårstatus och spärrorsak. Växlar utanför vyn kan visas utan manöver.

Vid införandet av version 0.17.0 passerade 134 enhetstester och sex processhelhetstester. Backupens driftdata har återlästs i en isolerad kopia utan fältorder. Telegraminspelningen ger namngivna loggar med båda riktningarna, råtelegram och separat tolkning. Det förbereder jämförelsen mellan simulator och fysisk utrustning. Det ersätter inte hårdvaruanslutningen. Fortsätt samtidigt med verifierbara manöverfall, admin och visuell avstämning; aktivera inte okända signal- eller adressbindningar genom gissning.

Aktuell publicerad release och provstatus finns i [arbetsjournalen](arbetsjournal.md), [provresultaten](provresultat.md) och [driftuppgifterna](drift.md).

[Avstämning av samtliga 54 användningsfall och tio produktkrav](acceptans-2026-09-23.md) visar exakt vad som är provat, avsiktligt vilande eller beroende av ytterligare underlag.
