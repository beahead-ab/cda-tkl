# Läsande TrainMeet-anslutning

En separat adapter implementerar det lokalt granskade HTTP-v1-kontraktet i TrainMeet-serverns commit63f3fd1 (18september). Detta bevisar inte vilken version som kör i Caspers drift. Ingen befintlig TrainMeet-installation har anslutits eller ändrats.

Administratören anger `CHARLOTTENDAL_TRAINMEET_ORIGIN` till den verifierade serverns HTTPS-origin, eller en lokal tunneladress överHTTP. Omdirigeringar följs inte och TLS-verifiering är på. Adressen är en installationsinställning; panelen får inte godtyckligt dirigera om en sparad nyckel.

Under **TrainMeet → Anslut till TrainMeet** anger operatören stations-id och den vanliga anslutningskoden från TrainMeet. Appen använder POST/v1/pair med device_kind=tkl_terminal och en stabil klientidentitet. Stationsbehörigheten kontrolleras genom GET/v1/tkl/context. Nyckeln sparas först efter godkänt stationssvar, endast på servern i trainmeet.json med rättighet0600. Varken kod, nyckel eller andra serverns anslutningsuppgifter skickas tillbaka till webbläsaren. Katalogbackup ska skyddas som övriga driftdata.

Därefter läses stationens kontext och GET/v1/display ungefär var femte sekund. Vyn visar tågrörelser, ankomst/avgång, spår, ankomst-/avgångsstatus, förbindelselägen samt TrainMeet-klockan. Klockan visas som senast mottaget besked; den lokala modellklockan byter inte ägare automatiskt.

Svaren måste ha protokollversion1, samma publikation/dag och rätt station. Dubbla rörelseidentiteter, äldre revisionsnummer, orimlig klocka och för stora svar avvisas. Vid avbrott behålls senaste goda uppgifter med tydlig märkning som gamla. Omstart kräver ny läsning. Upprepade snapshots ersätter innehållet i stället för att lägga till dubbla händelser. Vid serveromstart som sänker revisionen krävs uttrycklig ny parkoppling, eftersom kontraktet saknar en verifierad serverepok.

**Koppla från** raderar den lokala nyckeln men återkallar inte klientregistreringen hos TrainMeet; återkallelse görs där. HTTPv1 ger ännu inget verifierat kontrakt för säker automatisk återleverans av alla skrivande klareringskommandon. Denna adapter skriver därför endast den uttryckliga parkopplingen. Skift, rörelser och klareringar manövreras fortfarande i TrainMeet. Tågnummer från vyn flyttas inte automatiskt till TKL:s fysiska spår.

Adaptern har ingen referens till förreglingskärnan eller simulatorn och kan inte ändra beläggningar, lås eller signaler. Sju riktade prov samt ett processprov med parkoppling, omstart, nyckelskydd och oförändrat fälttillstånd är införda. Aktuell serveradress, stations-id och normal anslutningskod behövs för att verifiera den riktiga installationen.
