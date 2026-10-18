# Stationsstyrd trafik, 18 oktober 2026

Casper har godkänt ett gemensamt program med stationen som inställning. Det genomförs i separata granskningssteg: manuell linjetrafik, automat och därefter stationsval med kontrollerad omstart. Ett nytt programförråd och en gemensam webbtjänst ingår inte. Inget mergas eller publiceras i detta arbete; main kan driftsätta Charlottendal på Render.

## Linjer och manuell trafik, förslag 0.82.7

Servern bygger en gemensam trafikbeskrivning som panel, ortsregister, tidtabell, spårning och den interna fältmodellen läser. Charlottendals sju riktade spår och inkommande minnen behålls med samma standarder, placeringar och spårurval. Ingen stationsfil eller profil ändras.

Träkvistas A/B/C binds uttryckligen till stationens knappar och block SA2/SB2/SC2. Spår I, II, III, IIIa och IIIc använder stationsfilens egna block. Geometri bestämmer bara pilarnas riktning; C har lodräta pilar. Något grann-id härleds inte ur namn, linjebokstav eller Charlottendals standarder. Administratören väljer rätt TrainMeet-station under Orter. En omappad linje förblir ej ansluten och placerar inga trafiktåg.

Äldre Träkvistainstallationer kan ha sju Charlottendalsposter i destinations.json. Orörda standarder ersätts i minnet. Egna namn, telefoner och kopplingar bevaras i sin helhet under migration.previous, med en synlig upplysning i ortsregistret. Ingen fil skrivs vid start. Den bevarade informationen följer med även vid senare uttrycklig sparning.

## Provprotokoll

| Kontroll | Lokalt resultat | Begränsning |
|---|---|---|
| CDA:s äldre orter, trafikmodell och kantbindningar | Riktade regressionsprov gröna; samma profil och samma sju kantbindningar | Ingen riktig bana |
| TK A→I→B, B→I→C och C→I→A | Direktkopplade Engine/Field/Tracker-prov gröna: nummer, ankomst, frigivning och utfart | Modeller och telegram, inte fysisk utrustning |
| Panelens gemensamma trafikmodell | Modellprov gröna för A/B/C, C-pilar, saknad koppling och CDA:s gamla placeringar | Full webbläsaracceptans återstår |
| Äldre TK ortsuppgifter | Prov för standarder, egna uppgifter, sparning och omstart gröna | Inga befintliga driftfiler används |
| Källkontroller | Syntax, verify:operations och verify:trakvista gröna | Genererade data ändras inte |
| Oberoende processer och paket | Nytt processprov tillagt i test:integration och test:station-traffic | Lokal lyssningsport nekas av miljön; körs i GitHub före slutligt besked |

Processprovet använder en lokal TrainMeet-provserver med andra orts-id:n än standarderna, separata ägare och driftkataloger. Det kontrollerar manuell in-/utfart på A/B/C, omappad C, uppställda tåg på alla fem TK-spår, Charlottendals regression samt omstart med sparade orter, anteckningar och hållna växellås. Samma stationsmedvetna prov körs i det riktiga paketet med publish-station mot ett temporärt provförråd och STATION_NO_PUSH=1. Det är ingen publicering till tk-tkl.

## Återstående acceptans

Casper behöver prova gränssnittet, riktiga grannkopplingar i sin träff och LocoBuffer/MGP vid banan. Automatens TrainMeet-klarering och stationsbytet behandlas i följande PR:er. Ingen av dessa provresultat ger tillstånd att styra fysisk bana med ny automat.

## Automat, förslag 0.82.8

Träkvista använder en separat tidtabellspolicy med gemensam kärna. Förloppet är aktiv infart → accept → följd ankomst → ankomstanmälan på verkligt spår → mottaget → begäran till nästa granne → beviljad utfart → aktiv utfart → avgångsklarering → följd avgång → avgångsanmälan. Samtidiga tickar skickar inte dubbla kommandon. Vid oklart/ändrat underlag, återtagen tågväg eller avslag lämnas trafiken till operatören. Charlottendals gamla spårordning, väntetid och klareringsbeteende har inga nya TrainMeet-krav.

65 riktade automat-, vakt- och adapterprov är gröna, varav två med verkliga Engine/Field/Tracker-klasser och mötande tåg på I/II. 24 adapter-/klareringsprov är gröna, med köad ändring av revision, tåg, dag, publikation och session. Dessa är direkta modulprov med lokala modeller. Det nya HTTP-processfallet kontrollerar hela sexstegssekvensen mot aktiva tågvägar och verkliga processers fält-/spårningsläge i både källa och paket; GitHub-resultat förs in när körningen är färdig. Ingen fysisk automatdrift eller webbläsaracceptans påstås.

Den statiska panelgranskningen med verkliga stationsdata och produktens etikett-/tågskyltkod hittade avskurna A/B-skyltar; skyltarna ligger nu inåt i Träkvistas panel. CDA:s gamla placeringar är oförändrade och regressionstestade. Fem siffror och saknade linjekopplingar ryms i modellbilderna. Bilderna är förenklat rasteriserade SVG-bilder, inte en webbläsarkörning. Flera samtidiga C-skyltar kan överlappa originalpanelens TAM-dekoration och behöver visuell acceptans; motsatta riktningar samtidigt på samma enkelspår är inget godkänt trafikfall.

Slutgranskningen rättade tre avbrottsfall: av/på kan inte återuppta ett köat gammalt beslut; ett nekat eller overifierat callbacksteg behandlas aldrig som lyckat vid återaktivering; och avgång kräver både följd spårning och bekräftat fria stations-/utfartsblock. Efter osäkert svar behåller planen sin spärr även över nya trafikrevisioner. Operatören tar över och verifierar tågläget; omstart lämnar automaten avstängd. Nya regressioner provar alla sex protokollsteg.

## Stationsval, förslag 0.82.9

Ägar-API och Inställningar → Station använder startövervakaren. Varje gammal process måste avslutas felfritt före nästa start. Befintlig driftkatalog bevaras exakt vid explicit karta; olika fysiska kataloger krävs också över symboliska länkar. Pågående HTTP-kropp, tågväg, inspelning, automat eller bakgrundstrafik spärrar byte. Simulatorns användarkatalog följer samma station som serverns. TrainMeet-pausen är beständig tills connect/pair lyckas; refresh eller sparad token kan inte återuppta trafiken.

Start-/lagrings-/behörighetsprov är gröna lokalt. Tre HTTP-fall tillförs: fast instans (även i paket), byte med explicit karta och byte med standardkataloger i en temporär installation. Ingen original-var-katalog används. GitHub-resultat kompletteras efter körningen; localhost EPERM blockerar lokal processkörning. [Stationsvalets anvisning](stationsval.md) anger att befintliga Pi/Mac-tjänster och Render ännu är fasta. Native tjänstestart blir ett separat steg.

## Fullständig kontroll i GitHub

Resultaten avser de angivna kodcommitterna. Källproven kör npm test, npm run -s check, npm run -s verify:operations, npm run -s test:integration och npm run verify:trakvista, samt verify:layout och verify:xml. Paketprovet kör ett riktigt publish-station-bygge mot ett temporärt provförråd, med STATION_NO_PUSH=1, fulla enhetsprov, källverifiering och de nya processkommandona. Inget skickas till installationsförråden.

| PR / kodcommit | Enhetsprov i källan | Integration i källan | Tk-paket och övrigt |
|---|---|---|---|
| [#85 / 7e45904](https://github.com/beahead-ab/cda-tkl/pull/85) | 550 godkända, tre överhoppade | 15/15 | 277 enhetsprov; manuell trafik och källverifiering gröna, två root-uppdateringsprov och Windows-parser gröna. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39134765852). |
| [#86 / e472c3b](https://github.com/beahead-ab/cda-tkl/pull/86) | 603 godkända, tre överhoppade | 16/16 | 330 enhetsprov; manuell trafik, full automatsekvens och källverifiering gröna, två root-uppdateringsprov och Windows-parser gröna. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39134804189). |
| [#87 / a824c55](https://github.com/beahead-ab/cda-tkl/pull/87) | 617 godkända, tre överhoppade | 19/19 | 344 enhetsprov; manuell trafik, full automatsekvens, fast stationsspärr/omstart och källverifiering gröna, två root-uppdateringsprov och Windows-parser gröna. [Körning](https://github.com/beahead-ab/cda-tkl/actions/runs/39134975028). |

De tre överhoppade enhetsproven är två root-krävande uppdateringsprov, som körs separat i isolerade kataloger, samt ett Mac-specifikt prov som inte körs på Linux. Windows-jobbet använder PowerShells parser; det installerar inte programmet på Windows.

Charlottendals profiler, public/data och Träkvistas stationsunderlag är byteoförändrade mot main 904d564. Main är fortfarande 904d564 och installationsförråden har kvar sina tidigare commits 65039a0 respektive 008d18b. Det är inte en driftsättning.

## Granskning och förslag till steg 2

Casper granskar först #85 → #86 → #87 efter grundens #80–84. De är staplade för att hålla rättelserna åtskilda. Vid senare squash till main behöver följande PR baseras om på den nya main; varje merge dit kan driftsätta Charlottendal. Inget publiceras som del av granskningsarbetet.

Casper behöver prova panel, Studio, inloggning, Orter/TrainMeet och stationsbytet i webbläsaren. Modellbilderna och HTTP-proven ersätter inte visuell acceptans eller LocoBuffer/MGP vid banan. Flera C-skyltar behöver särskild visuell kontroll mot originalpanelens TAM-dekoration.

Steg 2 är som tidigare föreslaget containerprov för Render och lokal körning: bygg befintliga avbildningar, prova separata beständiga volymer, ägarstart, uppdatering och återställning. Casper skapar sedan Träkvistas egen Render-tjänst och deltar i acceptansen. Pi och Mac behåller vanliga installationer. Om stationsval ska införas i deras befintliga tjänster görs en egen PR per plattform för startövervakaren, med bevarade kataloger och stopp-/omstartsprov före faktisk installation.

Eget tkl-förråd, filflytt av Charlottendal och gemensam webbtjänst med inloggning/stationsval kräver senare beslut.
