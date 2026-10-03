# Charlottendal TKL – lägesbild 26 september 2026

Grunden är körbar som separat TKL och anläggningssimulator. Den ersätter ännu inte den fysiska JMRI-installationen fullt ut. Att information finns importerad betyder inte att motsvarande funktion är implementerad eller verifierad mot banan.

## Färdigt i den körbara grunden

- Ren ställverkssida med fullskärm, manöverknappar och en nederrad med klockförankrad tidtabell och händelsekolumn under spårplanen, som skalas till bredden (0.43.0). Planen är harmoniserad med nederradens färger och typografi och har en statusrad över det övre bandet (0.44.0). En [meny](panel-och-verktyg.md) samlar TrainMeet, import, utseende, anslutningar och händelser. Signal- och kompisinformation visas vid behov; aktiva stopp och fel är fortsatt synliga.

- Originalpanelen med förladdade originalikoner, större träffytor och tågväg som tänds i färdriktningen. Samma start och mål återtar vägen.
- 210 huvudtågvägar och 130 växeltågvägar med etablerings- och passageprov. 49 växlar, 197 körbara layoutblock och 66 signaler. Låsta växlar kan inte läggas om manuellt. Kompisväxlar följer med; omläggning kontrollerar även kompisens spår utanför färdvägen.
- Separat simulator över telegramgränsen, inklusive två samtidiga tåg, beläggning, avbrott och uteblivna återrapporter. TKL läser inte simulatorns interna tillstånd.
- Beständiga lås, spårspärrar, AIS, nödåtertagning, sju linjespärrar, programmeringsspår samt lokal-/fjärrläge. Läget fjärr innebär ännu ingen anslutning till ett fjärrsystem.
- Tåginformation för 197 block och sju inkommande fält. Valbar nummerföljning kopplas uttryckligen till en klar tågväg och följer ordnade återrapporter; vid osäkerhet pausas den för kontroll.
- Hela original-XML bevarad och sökbar; 1 377 regeldefinitioner har spårbar införandestatus. Signalregistret innehåller alla 329 aspektrader och 117 relationer. V1–V4 visas som beräknade panelindikeringar, med okänt underlag där villkor saknas.
- Gemensam modellklocka med paus/start, trafikdygn och hastighet samt valbar lokal felsignal. Programmeringsspåret har beständigt lås och separat återrapport i simulatorn; fysisk funktion återstår att verifiera.
- Inloggning, befintlig webbdrift och kontrollerade versionsbyten med backup. Visningsnamn och beskrivningar kan ändras med utkast och versionshistorik.

## Publicerat på webbadressen

**Aktuellt: 0.51.0, release `8cf0f57`, publicerad 3 oktober 11:38, också i det publika `beahead-ab/cda-tkl-install`.** Stream Deck-layout per deck, känd på serienumret, flera deck samtidigt och en ny redigerare med dra och släpp, egen text och bild på knapparna och tåg på tur. Sedan 0.50.1 (bara installationen): Mac-installationen sparar driftdata i state och registrerar om launchd vid uppdatering. Sedan 0.50.0: CHARLOTTENDAL i en egen rad över planen, ingen zoom. Sedan 0.49.0: Installation på Raspberry Pi, Mac och PC med en rad, notis om ny version att installera. Sedan 0.47.0: Installation på Raspberry Pi med en rad, glidande NU-streck, Stream Deck utan klick. Sedan 0.46.0: dragbar gräns mellan ställverket och nederraden. Sedan 0.45.3: Träffklockan följer TrainMeet (daterad avläsning och ändringsflödet), försenade tåg ovanför NU-strecket. Sedan 0.45.2: chip för ny version, fokusring bara efter Tab; webbdriften parkopplad med Charlottendal på server.trainmeet.app. Sedan 0.45.1: kortare statusrad (SIMULERING, Återställ, Styra RBG, Zoom). Sedan 0.45.0: spårbeläggning som flik bredvid Händelser, Återställ panel och Lämna över rangerbangården som chips i statusraden, inget toast på ställverket. Innehåller också sex menyingångar, TrainMeet-klarering som TMBox, träffnätsstöd, Stream Deck samt parkopplingsdialog med klartextkod och läsbara avslag genom Cloudflare; se arbetsjournalen. Tidigare: Webbdriften kör uttryckligen i simuleringsläge. Anläggningsöversikt och kommunikationsdiagnostik är införda; fysisk MGP tas senare enligt användarens beslut. Se [handhavande](anlaggningsoversikt-kommunikation.md); driftjournalen för webbdriften hålls utanför förrådet. Följande avsnitt beskriver tidigare etapper.

Version **0.33.0**, release `8bef196`, publicerades 26 september kl. 02:51 på [cda-tkl.trainmeet.app](https://cda-tkl.trainmeet.app/) utan omstart. [Linje och adminprinciperna](admin-linje.md) är införda, med gemensam vänstermeny för samtliga adminvyer, separata redigeringsflöden och en renare panel. Meny → Zoom behåller reglage 50–300 %, Visa hela och lokalt sparat val. Original är enda panelutseendet. Backend är oförändrad från 0.30.0 och driftdata bevarades. Se driftjournalen för rollback av gränssnittsöverlägget.

- Start- och slutplupp blinkar lugnt växelvis under förberedelsen av en accepterad tågväg. Klart läge ger fast sken; återtagning, hållna lås, AIS och kontaktbortfall ger ingen förberedelseblinkning.
- Fast ställverksyta: spårplan, tidtabell och knappar har fasta fält. Driftmeddelanden ligger som toast ovanpå; inget tomt meddelandefält reserveras. Detaljer öppnas ovanpå, hover flyttar inga symboler och ljusflödet följer bildrutorna med monoton tidsmätning.
- V1–V3 har släckta vilolampor och som standard lugn, dämpad röd växelblinkning (3 s per lampa och mjuka kanter). Meny → Utseende och ljud erbjuder även fast rött sken. Det ursprungliga snabba läget är borttaget. Aktiveringsvillkoren är oförändrade.
- Stödfunktioner ligger i menyn. Objektinformation öppnas med högerklick nära objektet. Endast Återställ panel finns direkt under spårplanen; övriga manövrer ligger under Driftverktyg. Återställningen nollställer tågvägar efter nya stoppbesked och bevarar spårledningarnas beläggningar. Spårtexterna har normalvikt.
- TrainMeet har en egen anslutningssida och en läsande tidtabellsadapter. Serveradress `https://server.trainmeet.app` och TKL-id `cda-tkl` är sparade. Serverns version 1.11.0 har identifierats; stationsval, anslutningskod och verklig parkoppling återstår.
- Adminsidorna visar översikter med separat redigering. Tidtabeller redigeras på en egen kalkylbladssida med celler, tangentbordsstyrning, områdesmarkering, kopiera/klistra in, ångra/gör om och sparade utkast. Aktivering kräver godkännande. [Inventering och kvarvarande avstämning](admin-forenkling.md).
- Samma enkla vita rader visar tidtabellen från TrainMeet, manuell inmatning eller importerade filer. Högst tre kolumner fylls nedåt och sedan åt höger; utrymme till höger är reserverat för senare valda funktioner.
- Excel-/CSV-import med tio fasta kolumner och nedladdningsbara mallar fungerar utan AI-nyckel. Underlagen granskas och godkänns före användning. [Format och handhavande](tidtabellsimport.md).
- Bilder/PDF kan förberedas för AI-tolkning, men serverns OpenAI-nyckel behöver fortfarande läggas in. Verklig tolkningskvalitet är ännu inte verifierad.

Version 0.30.0 klarade 188 enhetsprov och åtta processhelhetsprov både lokalt och på servern. Återställning med beläggning, väntande stoppbesked, omstart och lagringsfel samt bevarad övergångsvarning har verifierats.

Version 0.28.0 klarade 183 lokala enhetsprov, sju processhelhetsprov och ett utökat kalkylbladsprov över HTTP. På servern passerade 37 riktade prov, sju processhelhetsprov, låsomstartsprov och syntaxkontroll. Befintligt tidtabellsutkast, TrainMeet-inställningar, adminfiler, inloggning och tre tågvägslås bevarades. Inloggad webbläsare visar 0.28.0 och den nya kalkylbladssidan utan konsolfel. I 0.28.1 har Casper godkänt att den separata anslutningssidan tas bort och profilinformationen flyttas till registret. XML-granskning, införandestatus och protokollinspelning ligger nu under Avancerat. Navigationsprov, syntax och serverns låsomstartsprov passerade; backend och källdata är oförändrade.

Version 0.27.0 klarade 178 lokala enhetsprov samt riktat HTTP-processprov. På servern passerade 20 TrainMeet-prov, HTTP-processprov, omstartsprov och syntaxkontroll. Id:t sparades via det vanliga gränssnittet och verifierades efter omladdning.

Version 0.25.0 klarade serverns XML-/operations- och syntaxkontroller, 171 enhetstester och sju processhelhetstester. Version 0.26.0 klarade **174 lokala enhetstester**, webbläsarprov och serverns tre nya renderingsprov/syntaxkontroll; jämförelsen bekräftar oförändrad backend och driftdata. Därefter verifierades tjänster, anslutning, skyddade API:er, inloggning och meny/import i webbläsaren. Backup och föregående kodversion är bevarade; se [driftuppgifterna](drift.md). Inga provtidtabeller lades in i webbdriften.

## Kvar för en fullständig ersättning

| Del | Vad som återstår | Underlag som behövs |
|---|---|---|
| Verklig MGP/LocoBuffer | Seriell gateway och virtuellt portprov är byggda. Anslutning vid banan, rätt adresser och fysisk verifiering i båda riktningarna återstår. | Buffertmodell, inställningar, moduler/firmware och inspelad fysisk trafik. |
| Svenska signalbesked | Fulla huvud-/försignalbesked, signalberoenden och fysisk beskedsmappning. Nuvarande kör/stopp använder en uttryckligt preliminär CZ-profil. | Verifierade svenska beskedskoder och de saknade exakta ikondefinitionerna där originalunderlaget inte räcker. |
| Återstående driftfunktioner | Ranger-/godsområdets överlämning, vändskiva, återstående automatik och frigivning i delar av en tågväg. | Källbundna regler och specificerade ersättningar för saknade skript. |
| Oklara tågvägar | Tre motsägande huvudtågvägsregler, 15 undantagna växelpar och 20 NX-definitioner utan körbar koppling behöver avgöras. Dessa antal överlappar och ska inte summeras. | Rättelse eller beslutat undantag för de konkreta källoklarheterna. |
| TrainMeet | TKL-terminalkontraktet är byggt för trafikpass, klarering och tågrörelser och provat mot fejkad server med träffens verkliga data. Riktig parkoppling mot server.trainmeet.app 1.16.5 är verifierad från den lokala installationen. Prov i skarp träff med trafikpass och klarering samt webbdriftens egen parkoppling återstår; linjen klar är inte infört. | Serverns anslutningskod via administratörsinloggning; stations-id är `station-charlottendal`. |
| Admin och panel | Driftbindningar, adresser och administrativa begränsningar har en färdig versionseditor. Godtycklig regeländring återstår; första visuella avstämningen och trafikprovkörningen är genomförda, därefter återstår Caspers eget acceptansprov. | Den befintliga designen och provfallens förväntade beteenden. |

Tolv externa Jython-skript saknas fortfarande. Vissa beteenden har fått dokumenterade och provade ersättningar, men full överensstämmelse med den gamla installationen är inte fastställd. Nummerföljningen använder manuellt tilldelad tågidentitet; den identifierar inte lok och ändrar ingen TrainMeet-klarering.

**Avsiktligt vilande:** Friställa spår och den extra lilla växellåsindikator som Casper bad oss avvakta med.

## Nästa praktiska steg

[Steg 1 är genomfört](provkorning-2026-09-24.md): två samtidiga tåg, nummerföljning, växellås, återtagning och avbrott provades i webbläsaren. Signalinformation finns via högerklick och anslutningsstatus i menyn; återtagning nås via Meny → Driftverktyg → Tågvägar och stödfunktionerna via menyn. Casper kan nu provköra version 0.32.0 på den befintliga webbadressen. [Kompisväxlarna har kontrollerats särskilt](kompisvaxlar.md), och ett fel som tillät omläggning på belagt sidospår har rättats. Manuell manövrering visar nu berörda kompisväxlar, deras återrapporterade lägen, spårstatus och spärrorsak. Växlar utanför vyn kan visas utan manöver.

Vid införandet av version 0.17.0 passerade 134 enhetstester och sex processhelhetstester. Backupens driftdata har återlästs i en isolerad kopia utan fältorder. Telegraminspelningen ger namngivna loggar med båda riktningarna, råtelegram och separat tolkning. Det förbereder jämförelsen mellan simulator och fysisk utrustning. Det ersätter inte hårdvaruanslutningen. Fortsätt samtidigt med verifierbara manöverfall, admin och visuell avstämning; aktivera inte okända signal- eller adressbindningar genom gissning.

Aktuell publicerad release och provstatus finns i [arbetsjournalen](arbetsjournal.md), [provresultaten](provresultat.md); driftuppgifterna hålls utanför förrådet.

[Avstämning av samtliga 54 användningsfall och tio produktkrav](acceptans-2026-09-23.md) visar exakt vad som är provat, avsiktligt vilande eller beroende av ytterligare underlag.
