# Anläggningsöversikt och anslutningslägen

Första steget mot en egen, begriplig stationsmodell. JMRI-exporten är ett källunderlag; inga gamla JMRI-skript körs av den nya översikten. Befintlig tågvägs- och låslogik är oförändrad.

## Anläggningsöversikt

Öppna **Anläggningsregister → Anläggningsöversikt**. Sök på namn, källreferens eller aktiv adress. Välj ett objekt i spårplanen eller resultatlistan. Zooma och rulla i båda riktningarna; dra en tom yta för att flytta vyn. Slå på etiketter för växlar, signaler, block, sensorer och modulreferenser var för sig.

**På spårplanen** begränsar resultatlistan till objekt med känd position. Avmarkera för att även se importerade objekt utan position. **Hämta inventering** sparar objekt, relationer, geometri, källhash och aktiva bindningar som JSON.

Källpost, aktiv LocoNet-bindning och fysisk verifiering är separata uppgifter. LT-adresser som överensstämmer med XML märks som sådana. Signal- och detektorernas provbindningar märks som ej fysiskt verifierade. Kommentarer som `M08-140-1` visas som modulreferenser från XML; de bevisar inte vilken fysisk modul som sitter på bussen. Interna och externa objekt slås inte ihop utifrån liknande namn.

Växelgrupper visar befintliga källrelationer och vilka objekt som ingår. Gruppen 140/141/142/143 får exempelvis ingen gissad lägestabell. Redigering av nya samverkansregler och deras provning är ett följande steg.

## Beslut 26 september 2026

Fortsatt utveckling och webbdrift sker helt mot simulatorn. Fysisk MGP-integration och verifiering tas upp när utrustningen ansluts om några veckor. Simulatorns provning av regler och meddelanden fortsätter under tiden; detta kräver inga gamla JMRI-skript.

## Utvecklingsläge

`npm start` startar två separata lokala processer: TKL och anläggningssimulatorn. Startprogrammet väljer uttryckligen `CHARLOTTENDAL_CONNECTION_MODE=simulator` och loopback som mål. Simulatorn tar emot samma protokollorder och lämnar egna lägesrapporter; TKL hittar inte på kvittenser inne i sin driftlogik.

För en separat provinstallation:

```sh
CHARLOTTENDAL_STATE_DIR=/private/tmp/charlottendal-demo npm start
```

Felprov, beläggningar och tåg körs i simulatorns egen vy. Menyn och kommunikationsvyn anger att det är simulerade svar. Även inspelningsfilerna sparar anslutningsläget.

## Fysisk anslutning

Starta endast TKL med `npm run backend`. Ange `CHARLOTTENDAL_CONNECTION_MODE=hardware`, `CHARLOTTENDAL_WIRE_HOST` och `CHARLOTTENDAL_WIRE_PORT` för den avsedda LocoNet-over-TCP-gatewayen. Använd en separat beständig `CHARLOTTENDAL_STATE_DIR` för verklig drift. Samma instans kan inte växla mellan simulator och hårdvara under pågående manövrer; läget väljs vid serverstart.

Utelämnat läge visas som **anslutningstyp ej angiven**, även om TCP-kontakten fungerar. Loopback betyder inte automatiskt simulator eftersom en fysisk gateway också kan köras lokalt. Valet `hardware` är installationens uppgift, inte ett bevis på fysisk verifiering.

Det sker ingen automatisk övergång till simulerade svar om hårdvarukontakten bryts. Befintlig hantering av okända lägen, stopp och kvarvarande lås gäller fortfarande. Faktisk MGP-beskedsmappning måste verifieras mot utrustningen innan den används i fysisk drift.

## Kommunikation och inspelning

Under **Avancerat → Protokollinspelning** finns:

- Anslutningsläge, gateway och kontaktstatus.
- Senaste begärda läge per växel/signal, beräknade orderbytes och godkända återrapportbytes enligt aktiv profil, inklusive invertering och separat rapportadress.
- Aktuell jämförelse: väntar, matchande återrapport, överskriden svarstid eller frånkopplad.
- De senaste 100 normaliserade TCP-protokollraderna med riktning, tid, avkodning och objektnamn. Filtrera på objekt eller adress.

**Beräknad order** beskriver den senaste begäran; raden `SEND …` visar det som faktiskt skickades till TCP-transporten. `SENT OK` är endast transportkvittens och ett mottaget B0-eko är ingen lägesrapport. Återrapporter måste vara färska och ligga efter senaste ordern för att diagnostiken ska visa matchning. LocoNet saknar transaktions-ID; tidsordningen bevisar inte att en viss order orsakade rapporten. Matchning återupptar aldrig automatiskt en tågväg som driftlogiken håller kvar.

Starta inspelning före provet. JSON-filen innehåller normaliserade skickade/mottagna rader, förväntade bytes vid skickad växel-/signalorder, profilens bindningar och anslutningsläge. `engine-event` bevarar TKL:s faktiska händelser och beslut, bland annat rapporttolkning, reservation, etablering, kvarhållning och frigivning. Händelsernas `seq` anger inspelningsordningen. Händelseloggen är också tillgänglig i **Händelser**.

Detektorer skickar tillståndsrapporter utan motsvarande växelorder. Förväntade svar visas därför för växlar och signaler; specialkommandon för exempelvis programmeringsspår finns fortfarande som rå trafik och ordinarie drifthändelser. Det är inte en fullständig MGP-protokollanalysator.

Befintliga inspelningsgränser gäller: två minuter, 10 000 händelser eller 4 MB; bruten kontakt avslutar inspelningen. Kontrollera avslutsorsaken i filen. Filer sparas på servern, utan överföring till någon extern tjänst.
