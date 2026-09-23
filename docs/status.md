# Charlottendal TKL – lägesbild 23 september 2026

Grunden är körbar som separat TKL och anläggningssimulator. Den ersätter ännu inte den fysiska JMRI-installationen fullt ut. Att information finns importerad betyder inte att motsvarande funktion är implementerad eller verifierad mot banan.

## Färdigt i den körbara grunden

- Tre panelutseenden, förladdade originalikoner, större träffytor och tågväg som tänds i färdriktningen. Samma start och mål återtar vägen.
- 210 huvudtågvägar och 130 växeltågvägar med etablerings- och passageprov. 49 växlar, 197 körbara layoutblock och 66 signaler. Låsta växlar kan inte läggas om manuellt.
- Separat simulator över telegramgränsen, inklusive två samtidiga tåg, beläggning, avbrott och uteblivna återrapporter. TKL läser inte simulatorns interna tillstånd.
- Beständiga lås, spårspärrar, AIS, nödåtertagning sju linjespärrar, programmeringsspår samt lokal-/fjärrläge. Läget fjärr innebär ännu ingen anslutning till ett fjärrsystem.
- Tåginformation för 197 block och sju inkommande fält. Valbar nummerföljning kopplas uttryckligen till en klar tågväg och följer ordnade återrapporter; vid osäkerhet pausas den för kontroll.
- Hela original-XML bevarad och sökbar; 1 377 regeldefinitioner har spårbar införandestatus. Signalregistret innehåller alla 329 aspektrader och 117 relationer. V1–V4 visas som beräknade panelindikeringar, med okänt underlag där villkor saknas.
- Gemensam modellklocka med paus/start, trafikdygn och hastighet samt valbar lokal felsignal. Programmeringsspåret har beständigt lås och separat återrapport i simulatorn; fysisk funktion återstår att verifiera.
- Inloggning, befintlig webbdrift och kontrollerade versionsbyten med backup. Visningsnamn och beskrivningar kan ändras med utkast och versionshistorik.

## Kvar för en fullständig ersättning

| Del | Vad som återstår | Underlag som behövs |
|---|---|---|
| Verklig MGP/LocoBuffer | Seriell gateway och virtuellt portprov är byggda. Anslutning vid banan, rätt adresser och fysisk verifiering i båda riktningarna återstår. | Buffertmodell, inställningar, moduler/firmware och inspelad fysisk trafik. |
| Svenska signalbesked | Fulla huvud-/försignalbesked, signalberoenden och fysisk beskedsmappning. Nuvarande kör/stopp använder en uttryckligt preliminär CZ-profil. | Verifierade svenska beskedskoder och de saknade exakta ikondefinitionerna där originalunderlaget inte räcker. |
| Återstående driftfunktioner | Ranger-/godsområdets överlämning, vändskiva, återstående automatik och frigivning i delar av en tågväg. | Källbundna regler och specificerade ersättningar för saknade skript. |
| Oklara tågvägar | Tre motsägande huvudtågvägsregler, 15 undantagna växelpar och 20 NX-definitioner utan körbar koppling behöver avgöras. Dessa antal överlappar och ska inte summeras. | Rättelse eller beslutat undantag för de konkreta källoklarheterna. |
| TrainMeet | Läsande HTTPv1-adapter är byggd och provad lokalt. Riktig parkoppling, koppling mellan stations-/spår-id och skrivande klareringsutbyte återstår. | Bekräftat aktuellt gränssnitt och dess normala parning/inloggning. |
| Admin och panel | Driftbindningar, adresser och administrativa begränsningar har en färdig versionseditor. Godtycklig regeländring återstår; fortsatt avstämning mot Claudes layout och arbetsflöden, därefter gemensamt acceptansprov. | Den befintliga designen och provfallens förväntade beteenden. |

Tolv externa Jython-skript saknas fortfarande. Vissa beteenden har fått dokumenterade och provade ersättningar, men full överensstämmelse med den gamla installationen är inte fastställd. Nummerföljningen använder manuellt tilldelad tågidentitet; den identifierar inte lok och ändrar ingen TrainMeet-klarering.

**Avsiktligt vilande:** Friställa spår och den extra lilla växellåsindikator som Casper bad oss avvakta med.

## Nästa praktiska steg

Den publicerade versionen 0.14 har klarat 114 enhetstester och sex processhelhetstester. Nummerföljningen i 0.15 provas före publicering. Telegraminspelningen ger namngivna loggar med båda riktningarna, råtelegram och separat tolkning. Det förbereder jämförelsen mellan simulator och fysisk utrustning. Det ersätter inte hårdvaruanslutningen. Fortsätt samtidigt med verifierbara manöverfall, admin och visuell avstämning; aktivera inte okända signal- eller adressbindningar genom gissning.

Aktuell publicerad release och provstatus finns i [arbetsjournalen](arbetsjournal.md), [provresultaten](provresultat.md) och [driftuppgifterna](drift.md).
