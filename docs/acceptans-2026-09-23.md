# Leveransavstämning mot samtliga användningsfall

23 september 2026 · programversion 0.15.0. Den ursprungliga planen godkändes av Casper. Tabellen redovisar resultatet, inte ett nytt godkännande eller ett intyg för fysisk drift. Testad betyder i den separata provanläggningen om inget annat anges. Hela XML och alla 1 377 regeldefinitioner är bevarade; importerad information är inte detsamma som körklar funktion.

## XML-fall

| Fall | Levererat / avgränsning | Återstår utanför den verifierade funktionen |
|---|---|---|
| U01 Spårplan | Full geometri, namn, växlar, korsningar, signaler och tre skins. | Fysiskt acceptansprov av anslutningarna. |
| U02 Råsensor till spårledning | Telegrammottagning och källreglerna bevarade; driftprofilen använder uttryckliga provadresser. | De 95 beräkningsreglerna och sensorfiltreringen måste kopplas till verifierade råsensorbindningar innan fysisk drift. Ingen likhet mellan ett provadressbesked och en riktig sammansatt spårledning hävdas. |
| U03 Delade sensorer | Gemensamma adresser uppdaterar alla tillhörande block; alias ändras tillsammans i admin. | Fysisk adress-/polaritetskontroll. |
| U04 Tågidentitet | Manuell registrering och uttryckligen startad nummerföljning, atomisk flytt, osäkerhetsmarkering. | Automatisk identifiering av lok ingår inte; kräver identitetskälla. |
| U05 Inkommande | Alla sju inkommande fält återförda till kompakt manöverrad. | Riktig TrainMeet-parning och beslutad stationsmappning. |
| U06 Dolda objekt/minnen | Fullständigt sökbart källregister med referenser, originalvärden och anteckningar. | Ingen automatisk körning av okända minnesregler. |
| U07 Första knapp | Markerat startval, avbryt/Esc och återställning efter målval. | Eventuell automatisk timeout behöver väljas som ny produktregel. |
| U08 Tillåtet mål | 210 huvudtågvägar med källbundna par och tester. | Tre motsägande källregler spärrade. |
| U09 Otillåtna par | Källbundna vägran, orsak, felindikering och valfri ljudsignal. | Motstridiga källfall rättas inte automatiskt. |
| U10 Delvägar/NX | 133 av 153 NX-definitioner kopplade till minst en provad väg; sammansatta källreferenser bevarade. | 20 saknar entydig körbar koppling. |
| U11 Förregling | Beläggning, okända/gamla rapporter, växlar, korsningar och skyddande signaler spärrar. | Full fysisk kontroll av flank- och skyddsgränser. |
| U12 Samtidiga vägar | Två oberoende tåg körda samtidigt genom separata processer; konflikter vägras. | Alla fysiska driftkombinationer kräver anläggningsprov. |
| U13 Passage/frigivning | Ordnad passage och bevarade lås till fri väg och nya stoppbesked. | Frigivning i delar kräver fastställda skyddsgränser. Hela vägen hålls tills dess. |
| U14 Aktiv väg | Aktiv lista och verkliga reservationer spärrar lägesbyte. | Extern statusmottagare ej ansluten. |
| U15 Signalberoenden | Signalordning, skyddsvillkor och 117 sökbara källrelationer. | Full svenska aspektberoenden och ansvarsfördelning mot MGP behöver fastställas. |
| U16 Alla signalbesked | 329 källaspekter, originalbilder där definition finns, förladdning och råkodsvisning. | Exakta definitioner för hsi_4, hdvsi_8 och sly_2 saknas; fysisk fullbeskedsmappning och 19 tomma utgångar måste avgöras. |
| U17 Medgivandedvärgar | Alla 26 särskilda regler och utgångar bevarade. | Aktivering beror på verifierade svenska besked/utgångar. |
| U18 Sh2/Sh3 | Samtliga 66 särskilda regler finns i registret. | Samma aspekt-/utgångsberoende som U16–U17. |
| U19 Stopplyktor | Ikoner och källregler finns; ingår där granskad väg har signalgräns. | Full separat källautomatik kräver beskedsmappning. |
| U20 Clear40/Clear80 | Källans 10 regler och signalrelationer finns. | Full fysisk aspektkedja återstår. Nuvarande kör/stopp är uttryckligen en provprofil. |
| U21 Enskild växel | Lokala källvillkor, fria spår, stopp, lås och adminspärr prövas. | 15 manöverregler med oklara grupper/rangerkvittens spärrade. |
| U22 Växelgrupper | Verifierade kopplingar ger gemensam manöver; knappgrupp och fysisk koppling skiljs åt. | Oklara gruppkopplingar får inte gissas. |
| U23 Låst växel | Manöver vägras med orsak; lås överlever omstart och avbrott. | Fysiskt prov av utebliven/fel återrapport. |
| U24 Växelläge | B0-eko är ingen kvittens; separat B1, okänt läge, inversion Vx131 och adresseditor. | L2T hålls separat. Verifiera faktisk DIRECT/MONITORING-återrapport vid banan. |
| U25 Växeltågväg | 130 granskade vägar med etablering och passageprov, 70 via katalogval. | 15 oklara par kvar. Antal överlappar andra undantagslistor. |
| U26 Återställ växeltågväg | Återtagning och normal passage tar bort indikering först efter frigivning. | Exakt äldre skriptbeteende kan inte intygas utan HandleRangering.py. |
| U27 Spegling gods/TKL | Källans tio regler och adresser bevarade. | Extern mottagare, överlämningskontrakt och busskoppling saknas. |
| U28 Rörelsebegäran gods | Tolv varianter bevarade med villkor och åtgärder. | Behöver samma externa begäran/kvittenskontrakt som U27. |
| U29 Rangerhastighet | Skriptanrop och argument bevarade. | SetShuntingSpeed.py och SetNormalSpeed.py saknas; inga hastigheter påhittade. |
| U30 Rangerområde | Begäran/kvittens och källvillkor dokumenterade. | Områdesgräns och HandleFreeArea.py saknas. |
| U31 Friställa spår | Källans disabled-regler förblir avstängda. | Avsiktligt vilande enligt Casper. |
| U32 Extra fri-/låsplupp | Lås visas i detaljer och tågvägsstatus. | Extra pluppen fortfarande pausad enligt Casper. |
| U33 Lokal/fjärr | Beständigt manöverläge; kontroll före byte; lokala manövrer spärras i fjärr. | Fjärrsystemet är inte anslutet. |
| U34 Övre/nedre manöverläge | Start-/målval och huvud-/växeltågvägsläge finns. | Sex saknade skript gör ursprungsfunktionens exakta effekt okänd. |
| U35 Paneltyp | Original, Reläpanel och Trafikskärm använder samma servermodell. | Nya skins påstås inte vara identiska med JMRI:s mod59/mod68-läge. |
| U36 Externa paneler/broker | Begäran och rapportobjekt bevarade. | Mottagare, transport och medgivandegränser saknas. |
| U37 Linjespärr | Sju källbundna linjespärrar, beständiga och oberoende av frirapport. | Fysisk kontroll av linjegränser. |
| U38 Spårspärr | Egen beständig spärr; ändrar inte fysisk beläggning. | Fysisk kontroll av spårledningskoppling. |
| U39 AIS | Alla signaler begärs stopp, lås kvarstår; nya stoppbesked före återställning. | Full fysisk signalkodsverifiering. |
| U40 Nödutlösning | Kontrollerad återtagning med antal återstående lås och separat AIS-återställning. | Äldre minnet Tågmöte har ingen fastställd ersättningsfunktion. |
| U41 NX-nödåtertagning | Alla anslutna reservationer återtas via fria/kända resurser och stoppkvittens. | Oanslutna NX-fall enligt U10. |
| U42 Felåterkoppling | Orsak och journal, tre sekunder visuell lampa och valfri syntetiserad felsignal. | Ursprunglig bell_stroke.wav saknas. |
| U43 RESET | Avbryt knappval finns. Driftlås raderas aldrig av en panelreset. | Full effekt i HandlePanel.py behöver originalskript eller beslutad specifikation. |
| U44 V1–V4 | Läsande trevärda indikatorer från alla 93 källvillkor; okända ingångar framgår. | Fyra V4-NX saknar koppling; ingen fysisk bomstyrning är belagd. |
| U45 Vändskiva | Alla elva spår/kommandon och L2T-bindningar bevarade. | L2-anslutning och positionskvittens saknas. Senast skickade bitmönster är inte ett lägesbevis. |
| U46 Programmeringsspår | Beständig reservation före order, skyddsvillkor och oberoende normalåterrapport. | Fysisk LT134/LS940-funktion och elektrisk omkoppling behöver verifieras. |
| U47 Status ut | Tillstånd finns via autentiserat API och händelseström; MQTT-objekt bevarade. | Broker/topics/behörighet och kontrakt saknas. |
| U48 Fjärrorder | Ingen oskyddad genväg till växlar införs. Alla källregler finns. | Godsområdets medgivande och MQTT-kontrakt saknas. |
| U49 Uppstart | Okända fältlägen, bevarade spärrar/lås och nya stoppbegäranden. | Verifiering med riktig anläggning efter ström-/anslutningsavbrott. |
| U50 CDA CPE | Andra panelens 21 ikoner och 41 etiketter finns i källregistret. | Panelens syfte/manöverbehörighet behöver avgöras före ny operatörsvy. |
| U51 Modellklocka | Gemensam klocka, trafikdygn, hastighet, start/paus och beständighet. | Extern klockmaster kräver beslutat synkkontrakt. |
| U52 Ljud | Valfri lokal felsignal, alltid tillsammans med visuell återkoppling. | Originalets ljudfiler och övriga begäran/kvittensljud saknas. |
| U53 Källbevarande | Originalet byteidentiskt, alla 30 432 noder/96 142 attribut och kommentarer bevarade. | Inget känt bortfall. |
| U54 Status/avvikelser | Alla 25 grupper och 1 377 regler har explicit införandestatus. Adresser, visning och begränsningar har utkast/historik. | Okända regler aktiveras inte genom en generell editor. |

## Tillkommande krav

N01–N06: fristående program, tre skins, förladdade bilder/träffytor, flödesanimation, samma start/slut för återtagning och separat simulator är införda. N07: läsande TrainMeet-kontrakt, parning och versions-/stationskontroll provade mot separat fixtur; riktig anslutning och skrivande klarering återstår. N08: gemensamt tillstånd över flera paneler, återanslutning och omstart provade. N09: serverlagrade utkast, validering, jämförelse, aktivering under AIS och återställning införda för visning/driftbindningar/administrativa begränsningar; godtyckliga förreglingsregler är inte redigerbara. N10: HTTPS på cda-tkl.trainmeet.app, lösenordsinloggning och tidigare beslutad sexteckensgräns är publicerade och efterkontrollerade. Ingen fysisk anslutning eller full extern integration har verifierats av ett simulatorprov.

## Det konkreta underlag som låser upp nästa driftsättningssteg

- MGP-modell/firmware, modulinställningar och inspelad trafik för växelorder/kvittens, belagt/fritt och alla signalbesked. LocoBuffer-modell, seriella inställningar och port.
- De tolv externa Jython-skripten, de tre saknade signaldefinitionerna och ljudfilerna från den gamla installationen, om de finns kvar.
- Beslut om de motsägande/undantagna tågvägarna, rangerområdets gränser, vändskivans L2-anslutning och hur CDA CPE ska användas.
- Riktig TrainMeet-adress, station, anslutningskod och bekräftat skrivkontrakt med återanslutning/idempotens. Läsadaptern är färdig; ingen påhittad parkoppling har gjorts.

Programvarans provresultat finns i [provresultat](provresultat.md), senaste publicering i [arbetsjournal](arbetsjournal.md), drift i [drift](drift.md). Ingen punkt som kräver ovanstående underlag är markerad som färdig fysisk drift.
