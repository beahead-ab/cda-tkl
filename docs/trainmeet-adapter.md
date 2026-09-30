# Läsande TrainMeet-anslutning

En separat adapter implementerar TrainMeets HTTP-v1-kontrakt, ursprungligen granskat i commit63f3fd1 (18 september). Den nu angivna demoserverns version har också identifierats och dess matchande källkod granskats enligt nedan. Verklig parkoppling har ännu inte utförts.

## TKL-id från 0.27.0

Meny → TrainMeet visar **TKL-id** tillsammans med serveradressen. En ny installation föreslår `cda-tkl`. Id:t är installationens identitet hos TrainMeet, skilt från stations-id som anger vilken station i träffen tidtabellen gäller. Välj ett eget id för varje separat TKL-installation.

**Spara anslutning** sparar adress och id tillsammans före parkoppling. Id:t får ha 3–64 tecken enligt TrainMeets verifierade format: ASCII-bokstäver, siffror, punkt, understreck, bindestreck och kolon. Det skickas som både `client_id` och `display_name`, med oförändrad typ `tkl_terminal`. Id:t visas i TKL även efter parkoppling och bevaras vid omstart och frånkoppling. Redan sparade identiteter byts inte automatiskt. För en parad anslutning krävs först Koppla från; en serveradress som låsts av installationen förblir låst även om klient-id ändras.

### Demoservern som Casper angav

25 september 2026 svarade `https://server.trainmeet.app/healthz` med version **1.11.0**, build **152156da**. Den vanliga webbsidan visade **Grimslöv 2027**. Matchande lokal källcommit har granskats: `/v1/pair` stöder `tkl_terminal`, klient-id och anslutningskod; stationsåtkomst prövas separat. Det är granskning av driftsatt versions kod, inte en genomförd verklig parkoppling.

För Charlottendals anslutning används serveradress `https://server.trainmeet.app`, TKL-id `cda-tkl`, den valda demostationens exakta stations-id och serverns anslutningskod. Koden är serverns anslutningskod, inte Cloud-träffkoden. Matchande serverversion visar den i **Skärmar → Visa anslutningsuppgifter** när inloggning/behörighet tillåter det. Administratörsinloggning och val av demostation återstår för att kontrollera dessa uppgifter i drift. Anslutningskoden matas in direkt i TKL; den ska inte läggas i dokumentationen.


Från version 0.19.0 finns en egen sida under **Meny → TrainMeet** (`/#trainmeet`). Operatören anger serveradressen och väljer **Spara anslutning** före parkoppling (knappen hette tidigare Spara adress). Adressen sparas på TKL-servern och återläses efter omstart. Administratören kan fortfarande låsa adressen med `CHARLOTTENDAL_TRAINMEET_ORIGIN`; då går den inte att ändra i gränssnittet.

Adressen måste vara en HTTPS-origin eller HTTP på loopback (`localhost`, `127.0.0.1`, `::1`). Sökväg, användaruppgifter, frågeparametrar och fragment avvisas. Omdirigeringar följs inte och TLS-verifiering är på. En parad anslutning måste först kopplas från innan adressen får ändras: en sparad nyckel flyttas aldrig till den nya servern. Revision och sessions-id skyddar mot samtidiga eller gamla formulär. Misslyckad lagring lämnar den gamla inställningen kvar.

**Adressen måste kunna nås av TKL-servern**, inte bara av webbläsaren. I webbdriften betyder `localhost` DigitalOcean-servern. En lokal TrainMeet-server på Mac eller Raspberry Pi behöver därför en förbindelse från TKL, exempelvis en separat upprättad krypterad tunnel. Att spara adressen öppnar ingen tunnel och gör inget nätverksanrop. Casper har nu angett den publika demoservern ovan; någon verklig parkoppling har ännu inte verifierats.

På TrainMeet-sidan anger operatören stations-id och den vanliga anslutningskoden från TrainMeet. Appen använder POST/v1/pair med device_kind=tkl_terminal och en stabil klientidentitet. Stationsbehörigheten kontrolleras genom GET/v1/tkl/context. Nyckeln sparas först efter godkänt stationssvar, endast på servern i trainmeet.json med rättighet0600. Varken kod, nyckel eller andra serverns anslutningsuppgifter skickas tillbaka till webbläsaren. Katalogbackup ska skyddas som övriga driftdata.

Därefter läses stationens kontext och GET/v1/display ungefär var femte sekund. Från 0.21.0 hämtas dessutom GET/v1/timetable?station_id=… (driftpaketets schema 3). Från 0.23.0 visar ett fast kolumnfält direkt under spårplanen stationens tågrörelser för aktiv trafikdag, ankomst/avgång, från/till, spår, anmärkning och genomfart, samt levande ankomst-/avgångsstatus och TrainMeet-klockan. Meny → TrainMeet behåller anslutning, status och förbindelselägen. Klockan visas som senast mottaget besked; den lokala modellklockan byter inte ägare automatiskt.

Svaren måste ha protokollversion1, samma publikation/dag och rätt station. Dubbla rörelseidentiteter, äldre revisionsnummer, orimlig klocka och för stora svar avvisas. Vid avbrott behålls senaste goda uppgifter med tydlig märkning som gamla. Omstart kräver ny läsning. Upprepade snapshots ersätter innehållet i stället för att lägga till dubbla händelser. Vid serveromstart som sänker revisionen krävs uttrycklig ny parkoppling, eftersom kontraktet saknar en verifierad serverepok.

**Koppla från** raderar den lokala nyckeln men återkallar inte klientregistreringen hos TrainMeet; återkallelse görs där. HTTPv1 ger ännu inget verifierat kontrakt för säker automatisk återleverans av alla skrivande klareringskommandon. Denna adapter skriver därför endast den uttryckliga parkopplingen. Skift, rörelser och klareringar manövreras fortfarande i TrainMeet. Tågnummer från vyn flyttas inte automatiskt till TKL:s fysiska spår.

Adaptern har ingen referens till förreglingskärnan eller simulatorn och kan inte ändra beläggningar, lås eller signaler. Tjugo riktade prov samt ett processprov med adressinställning, parkoppling, omstart, nyckelskydd och oförändrat fälttillstånd passerar. Det nya konfigurationsanropet omfattas också av provet för inloggningsskydd. Aktuell serveradress, stations-id och normal anslutningskod behövs för att verifiera den riktiga installationen.

## Stationsklient som TMBox – vad som faktiskt stöds

TKL är stationsbunden och hämtar TrainMeets publicerade tidtabell, spårkatalog och levande trafikläge. TrainMeet äger dessa uppgifter. Identiteten är fortfarande den befintliga, behörighetskontrollerade typen `tkl_terminal`; den utger sig inte för att vara en fysisk ESP32.

Tidtabellsdelen lagras i minnet per publikation, trafikdag och station, och hämtas på nytt när någon av dem ändras, vid parkoppling/omstart eller med **Hämta senaste**. Den cachas inte på disk. Serverns radordning och tidssträngar bevaras. Spår visas med katalogens beteckning och driftplatskod, även vid ändrat spår. Okända spår-id visas som okända, inte som gissade spår. Tåg med samma nummer på olika driftplatser hålls isär genom rörelse-id. En ny tidtabell och nya driftuppgifter visas först när samtliga svar har verifierats; annars behålls senaste goda helhet, märkt som gammal. Tabellens schema 3 är separat från HTTP-protokollversion 1.

Adaptern importerar stationens tågrader och spår/driftplatser för visning. Endpointens övriga data, exempelvis hela tågturer (`services`), ruttstopp (`routes`), panelkonfiguration och nätverksuppgifter, förs inte vidare till webbläsaren. Ingen spårmappning till TKL:s fysiska block görs automatiskt.

Den granskade servern har också TMBox v2 över MQTT (`docs/protocol/v2/README.md`): enhetsanmälan, stationstilldelning, config, snapshot, närvaro och kvitterade kommandon med meddelande-id och revisioner. Det är **inte implementerat i denna adapter**. HTTP-endpointarna `/v1/tmbox-v2/*` kräver dessutom administratörsrättigheter och används därför inte som genväg för en TKL-klient. Om TKL även ska registreras och utbyta klareringar exakt som en TMBox behövs en separat v2-transport och prov mot den riktiga servern. Klareringsgodkännande ska hållas skilt från fysisk tågväg och körsignal.

Proven omfattar en fryst tidtabell genererad av den granskade TrainMeet-serverns egen `RuntimePublication.timetable` med dess `runtime_package_v3`-testdata, samt dag-/publikationsbyte, uppdatering, felaktiga katalogreferenser, flera driftplatser, upprepade tågnummer och bevarande av senaste goda data. Fixture är testdata, inte Caspers riktiga tidtabell. Webbläsarprovet använder också en tillfällig provserver; normal anslutning mot fysisk/lokal installation återstår.

## Orter på panelen (0.36.0)

Anläggningsregister → Orter och telefonnummer sparar separat namn/nummer för Cu, Cn, Au, An, Bu, Bn och D i destinations.json. Varje utfart väljer lokalt namn eller explicit station-id från TrainMeets display.stations (id/name). Katalogen uppdateras varje poll; inget automatiskt namnmatchat byte av station görs. Vid avbrott visas senaste namnet, och admin markerar gamla uppgifter. Saknas stationen används det lokala reservnamnet med tydlig adminstatus. Telefon anges lokalt: den granskade HTTP-v1-källan saknar telefonfält. Inget påhittat telefonkontrakt används. Befintliga XML-nummer 72/71 är lokala grundvärden. D har inget namngivet mål i underlaget och visas initialt som D.

Namn/nummer är endast presentation och ändrar inte tågvägar, adresser, lås eller klareringar. Sparande kontrollerar revision och skriver hållbart innan den aktiva visningen ändras.

## Stationen som TMBox mot server.trainmeet.app · 30 september 2026 (lokalt, ej publicerad)

Servern i drift är 1.16.5 (build 9fcf769a) och exponerar bara HTTPS på port 443. TMBox v2 över MQTT går på träffens lokala Mosquitto utan lösenord och är stängt utåt, så cda-tkl ansluter som `tkl_terminal` med HTTP v1. Servern översätter en TMBox:s knapptryckningar till samma stationskommandon som TKL-kontraktet använder, så klareringsflödet är detsamma; skillnaden är att klienten heter TKL i serverns lista över stationer och klienter. Den webbläsar-TKL som redan står tilldelad Charlottendal där är serverns egen webbklient, inte cda-tkl.

Anslutningskoden under Skärmar → Visa anslutningsuppgifter gäller även TKL-terminaler och ger åtkomst till träffens alla stationer. Charlottendal heter `station-charlottendal` i Grimslöv 2027 med sträckorna Vagnsta (dubbelspår), Lekby (dubbelspår) och Kungsfors (enkelspår). Parkopplingen görs i Tidtabeller → TrainMeet; koden matas in där och skrivs aldrig in i dokumentationen. Adapterns validering är kontrollerad mot 1.16.5:s verkliga display-svar (stationer, sträckor, klocka med sekunder, 80 tågrörelser vid Charlottendal).

Adaptern skriver nu stationens egna kommandon:

- Trafikpass: `POST /v1/tkl/shift/start` med operatör, terminalnamn lika med TKL-id och eventuellt övertagande, samt `/v1/tkl/shift/finish` med avsluta eller lämna över och anteckning.
- Klarering per sträcka: `POST /v1/tkl/clearance` med request, accept, reject, cancel, depart och arrive. Tillståndsmaskinen fri → begärd → klar → på linjen → fri speglas lokalt bara för att visa rätt knappar; servern avgör. Avslag visas med serverns egen text, till exempel "Sträckan är redan upptagen", och kontexten läses om efter varje kommando oavsett utfall.
- Tågrörelser: `POST /v1/tkl/movement` med uppställt, förare på plats, närmar sig, ankommit och verkligt spår. Oförändrade fält skickas med sina aktuella värden så att ingen av serverns två kodvägar nollställer dem.
- Sträckkatalogen i display-svaret sammanfogas med stationens förbindelselägen till `lines` med grannens namn, spårtyp, riktning och tillåtna åtgärder. Saknat läge visas som okänt, aldrig som fritt.
- Ett kommando väntar på en pågående poll; poll och kommando skriver aldrig samtidigt i senaste goda kontext. Godkända steg journalförs som händelser av typen `trainmeet`.

**TMBox-läge.** En box är i tjänst så länge den är tilldelad. Med TMBox-läget påslaget i dialogen Starta trafikpass håller TKL trafikpasset aktivt på samma sätt: saknas aktivt trafikpass vid en poll startas ett nytt med det sparade operatörsnamnet, högst ett försök per minut och aldrig genom övertagande av någon annans pass. Valet sparas i trainmeet.json tillsammans med operatörsnamnet, överlever omstart och stängs av med en knapp i trafikpasskortet. Senaste misslyckade försök visas med serverns text. Ett aktivt trafikpass är det servern kräver för att ta emot klareringskommandon från en TKL-terminal.

Arbetsytan Drift → Tågklarering visar trafikpasset, en ruta per sträcka med status och knappar (Begär klarering med tågnummer, Godkänn, Neka, Återta, Avgått, Mottaget) samt dagens tågrörelser med Uppställt, Förare på plats, Närmar sig och Ankommit med valfritt spår. En inkommande förfrågan ger toast, markerad ruta och räknare på Driftverktyg. Utan trafikpass är knapparna spärrade; utan parkoppling hänvisas till TrainMeet-sidan. Klarering påverkar aldrig tågvägar, lås eller signalbesked.

Inte infört: linjen klar (publicera och kvittera), TMBox:s spårväljare före ankomst annat än som spårfält, dubbelspårens riktningskanaler visas som ett läge per sträcka, och prov av klareringsflödet i skarp träff återstår.

Riktig parkoppling gjordes 30 september 2026 kl. 03:37 från den lokala installationen mot server.trainmeet.app 1.16.5, med koden inmatad i TKL:s dialog: Ansluten, Charlottendal i Grimslöv 2027, trafikdag Dagl, 80 tågrörelser, spåren 11, 12, 13, 1a, 2a, 3 och 4, träffklocka 11:18 i 4× och alla tre sträckor fria. Tidtabellsfältet under spårplanen visar träffens rader med driftplats och spår. Inget trafikpass startades; det är operatörens beslut. Webbdriften på cda-tkl.trainmeet.app har egen driftdata och parkopplas separat.

Provning: sju adaptertester för sträckor, trafikpass, klarering, seriell körning mot poll, tågrörelser, TMBox-läge och ordalydelse; ett nytt processprov genom hela TKL-servern med trafikpass, begäran, avslag, tågrörelse och journal; totalt 292 enhetstester och 10 integrationstester godkända. Lokalt webbläsarprov mot en fejkad server byggd av träffens verkliga display-svar: trafikpass, begäran mot Lekby med Återta, grannens godkännande, Avgått, på linjen och fritt när Lekby tog emot; inkommande förfrågan från Vagnsta med larm, Godkänn, grannens avgång, Mottaget och fritt; uppställt, förare på plats och redo för tåg 93; journalrad för varje steg och inga JavaScript-fel.
