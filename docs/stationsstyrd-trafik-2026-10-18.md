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
