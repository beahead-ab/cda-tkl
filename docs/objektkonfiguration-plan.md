# Objekt och regler – plan för konfiguration av ställverket

Plan för diskussion, 2 oktober 2026. Ingen kod är skriven. Underlaget är en genomgång av Cda60.xml, driftprofilen, bindningsredigeraren och samtliga regelfamiljer i `src/`, med hänvisningar nedan.

## 1. Målet i en mening

Ett enda ställe i admin där hela stationen visas i hög upplösning, där varje objekt (växel, signal, spårledning, vägövergång) knyts till sin MGP-dekoder och där beteendet för en grupp objekt beskrivs i vanlig svenska, i text eller tal, och blir deterministiska, provade regler som TKL verkställer och som kan översättas till rätt kommandon mot MGP.

## 1b. En fristående modul

Konfigurationen byggs som en egen modul utan beroenden till andra adminfunktioner. Den läser bara tre saker: ritningens geometri, driftprofilen och källfilen Cda60.xml. Mot kärnan har den ett enda gränssnitt: regler och bindningar in, prövning och mätning ut. Den importerar inget från Driftinställningar, Anläggningsregistret, Visningsinställningar eller de andra adminsidorna.

Det gör att admin kan rensas när modulen är klar. Funktioner som inte behövs tas bort och läggs tillbaka först när de behövs igen. Modulen ska klara sig ensam även då.

## 2. Läget i dag, kort

**Objekt.** Driftprofilen har 49 växlar, 66 signaler, 197 spårledningsblock, 340 tågvägar och 3 spårkorsningar (X1–X3). Vägindikeringarna V1–V4 finns som visning.

**Fysiska adresser.** Bara växlarnas 49 adresser är verkliga; de är LT-numren ur JMRI-filen, ej uppmätta. Signalernas adresser (1501–1566) och spårledningarnas (3001–3132) är påhittade bänkadresser för simulatorn (`scripts/make-network-profile.mjs:101,116`). Ingen detektor är knuten till en verklig LocoNet-ingång.

**Det som redan finns i XML:en men inte används.** Cda60.xml innehåller 184 LocoNet-ingångar (LS), varav 156 med modulkommentar, till exempel `LS176 "M09-92-2, SX"`, och 149 signalutgångar (LT200–LT467) med kommentar, till exempel `LT200 "M01-signal 1/1, Hsi5"`. Modulreferenserna täcker M00–M11. Det är det bästa befintliga underlaget för den fysiska kopplingen, men det är JMRI:s bild och ersätter inte MGP:s egen konfiguration.

**Regler.** Det finns ingen gemensam regelmotor. Varje regelfamilj är antingen byggd ur XML:en vid generering eller skriven direkt i koden:

| Regelfamilj | Var den bor | Kan ändras i admin |
|---|---|---|
| Kompisväxlar (7 par) | `profile.coupled`, alltid samma läge | nej |
| Manuell växelmanöver | `profile.manualPolicies`, 30 klara och 5 olösta grupper | bara av/på |
| Rangerbangårdens gränsväxlar | `src/yard-boundaries.mjs`, Vx112, Vx131, Vx154 | nej |
| Tågvägar och skyddssignaler | `profile.routes`, `src/route-policy.mjs` | bara av/på |
| Vägövergångar V1–V4 | `public/data/indications.json`, endast visning | nej |
| Signalbesked | en adress per signal, kör/stopp, preliminära tjeckiska koder | adress och koder |
| Linjer, programmeringsspår | `profile.operatingControls` | adresser |

Bindningsredigeraren (Driftinställningar) kan ändra adresser och polaritet med utkast, konfliktkontroll och aktivering. Den kan inte skapa objekt, ange modul eller kanal, eller uttrycka beteende.

**MQTT.** Används i dag bara av TrainMeet:s TMBox v2. I JMRI-filen speglar Logix 0015 och 0022 ("MQTT status ut", "MQTT order in") växlarna till en andra anslutning (L2T). Broker, ämnen och syfte saknas.

**MGP.** Mollehems LocoNet-dekodrar (Signal10, Switch5, Servo5) bakom en LocoBuffer. TKL talar B0 (order), B1 (växelrapport), B2 (ingång) och E4 (signalbesked enligt ett tjeckiskt exempel). Ingen fysisk port har öppnats, och dekodrarnas SV-inställningar finns inte i något underlag vi har.

## 3. Vilka ID behövs egentligen

JMRI krävde många lager av namn: interna sensorer för varje spårledning och knapp, minnen, layoutblock, Logix-villkor och NX-identiteter. Det mesta finns för att JMRI själv skulle räkna. TKL behöver tre saker per objekt:

| Lager | Exempel | Roll |
|---|---|---|
| TKL-namn | `Vx103`, `1/5`, `SX` | Den enda nyckeln i regler, panel, journal och Stream Deck. Stabilt och läsbart. |
| Fysisk bindning | modul M02, kanal 4, LocoNet-adress 103, polaritet | Det som går på tråden. Uppmätt eller inte. |
| Spårbarhet | `LT103`, `IX:AUTO:0007C19`, XML-sökväg | Endast för att kunna visa var något kom ifrån. Aldrig nyckel. |

Förslag till städning:

- **Behålls som nyckel:** 49 växelnamn, 66 signalnamn, spårledningsblockens namn, tågvägarnas TKL-id.
- **Ersätts:** de 105 JMRI-beräknade spårledningarna (interna `slS`-sensorer) blir en direkt bindning från block till en eller flera LocoNet-ingångar. NX-identiteterna (153) ersätts av TKL:s tågvägs-id.
- **Endast spårbarhet:** LT/LS-systemnamn, Logix-id, XML-sökvägar.
- **Utgår:** minnen, layoutblockens interna data, oanvända LT/LS, L2T-speglingen så länge ingen mottagare finns.

Ett fysiskt objekt i den nya modellen:

```json
{
  "id": "Vx103",
  "kind": "turnout",
  "mgp": {"module": "M02", "channel": 4, "decoder": "Switch5"},
  "loconet": {"order": 103, "report": 103, "inverted": false},
  "status": "från XML, ej uppmätt",
  "source": {"system": "LT103", "comment": "M02-100-4"}
}
```

Tolkningen av `M02-100-4` som modul, basadress och kanal är en hypotes som måste bekräftas med den som satt upp MGP.

## 4. Vyn

Nås från admin: **Objekt och regler**. Vyn har tre lägen i toppraden: **Konfigurera** (urval, chatt, regelkort), **Genomgång** (AI går igenom hela anläggningen) och **Driftsättning** (mätning mot MGP). Planen ritas ur samma geometri som ställverket, men av modulens egen kod.

Designen finns i Claude Design: https://claude.ai/artifact/8CT3drdM8aStmoi9cgXS7y med fem vyer: välj och säg, alla spårledningar tända, tre växlar i ett urval, AI-genomgången och driftsättning av signal 1/5.

**Så lite som möjligt på skärmen.** Planen tar hela bredden och nästan hela höjden. Fyra lagerknappar ligger över planen: Nummer, Spårledningar, Adresser och Avvikelser. Under planen finns en enda rad: urvalet, AI:ns svar i en mening, Godkänn och Ändra, och fältet där man säger eller skriver. Ingen sidokolumn och ingen regeltext utöver meningen; detaljer visas bara när man frågar efter dem. AI:n gör grovjobbet, administratören väljer, säger och godkänner.

**Spårledningslagret** färgar varje spårledning i planen och skriver ut dess namn, alla 197. Av dem har 46 en namngiven ingång i XML:en, till exempel SIA med LS90 på M04 och LS100 på M05; resten föreslår AI:n ur JMRI:s spårledningsregler.

**Planen.** Hela stationen ritad ur panelgeometrin, anpassad till fönstrets höjd och därför bredare än skärmen; sidledes rullning med en minikarta som visar var man är. Växelnumren är stora och tydliga i alla lägen. Zoom finns men utgångsläget är "fyll höjden".

**Lager som tänds och släcks** i en filterrad över planen:

- växelnummer (på som standard), signalnamn, spårledningsnamn
- LocoNet-adresser, MGP-modul och kanal
- regelgrupper (färgad kontur runt objekten i en grupp)
- vägövergångar och deras påverkade block
- avvikelser (röd markering på objektet)
- JMRI-namn för spårbarhet

**Urval.** Klick väljer ett objekt; skift-klick lägger till fler. Urvalet visas som en rad med objekt ovanför chatten. Den gula markeringsringen från ställverket återanvänds.

**Höger kolumn, två flikar:**

1. **Avvikelser.** Alltid synligt antal. Varje rad säger vad som saknas eller strider, vilka objekt det gäller och vad som löser det. Klick visar objekten i planen.
2. **Objekt och grupp.** Kort för valt objekt: bindning, status (uppmätt eller ej), regler som berör det, tågvägar som går över det, senaste telegram. För en grupp: medlemmar, regler i klartext, var de verkställs, provresultat.

**Chatten** under planen: textfält och mikrofon. Svaret är aldrig ett fritt textsvar utan ett **regelkort** (se §5) med knapparna Godkänn som utkast, Ändra och Förkasta.

**Driftsättningsläge**, en egen omkopplare: klick på ett objekt skickar en provorder eller väntar på en rapport, visar telegrammen och låter operatören markera bindningen som uppmätt med datum och namn. Det är så "det vi verkligen har kvar att göra" betas av objekt för objekt.

## 5. Från fritext till deterministiska regler

AI:n är en översättare, aldrig en auktoritet. Flödet:

1. Operatören väljer objekt och skriver eller säger vad som ska gälla.
2. Servern skickar till Claude API: urvalet, objektens grannar i spårgrafen, befintliga regler i gruppen, regelspråkets schema och ordlistan. Svaret måste följa schemat (verktygsanrop med fast JSON-schema).
3. **Deterministisk validering** i TKL: alla objekt finns, lägena är möjliga för objekttypen, inga motsägelser mot befintliga regler, ingen regel gör en befintlig tågväg omöjlig utan att det sägs ut.
4. **Tillbakaläsning:** regeln återges i svenska av TKL, inte av AI:n, så att operatören godkänner det som faktiskt kommer att gälla.
5. **Prov i simulatorn:** varje regel får genererade scenarier (alla lägeskombinationer för gruppen, plus berörda tågvägar). Resultatet visas på kortet.
6. **Utkast → aktivering** med samma villkor som bindningar i dag: alla signaler i stopp, inga tågvägslås, färska rapporter, skäl anges. Versioner sparas och kan återställas.

### Regelspråket

Ett litet antal regeltyper räcker för allt som finns i dag och för exemplen i önskemålet:

| Typ | Betydelse | Täcker i dag |
|---|---|---|
| `follow` | när A läggs till p, läggs B till q; enkel- eller dubbelriktad | kompisväxlar (då alltid samma läge) |
| `forbid` | kombinationen A=p och B=q får aldrig förekomma | delar av manuella grupper |
| `authority` | vem som får lägga vilket läge: TKL, rangerare, ingen | gränsväxlarna vid rangerbangården |
| `condition` | manöver eller tågväg kräver att block är fria, signaler i stopp | manuella växlar, programmeringsspår |
| `detection` | blocket är belagt när ingång a eller b är aktiv | JMRI:s 95 spårledningsregler |
| `aspect` | signalens besked och vilka koder MGP rapporterar | signalkoderna |
| `crossing` | vägövergången aktiveras av tågväg eller beläggning, förringning, bomåterrapport | V1–V4 |

Exemplen ur önskemålet, uttryckta i språket:

**Dubbelväxel som speglar varandra** (Vx100/101 i dag):

```json
{"type":"follow","group":"Vx100–101","when":{"Vx100":"T"},"then":{"Vx101":"T"},"both_ways":true}
```

En dubbelväxel där bara den ena följer, eller där de ska ligga motsatt, är samma typ med andra värden. Det går inte att uttrycka i dag, där en kompisgrupp alltid får samma läge.

**Tre växlar vid rangerbangården** där bara TKL får lägga in mot spåren och rangeraren bara får lägga tillbaka:

```json
{"type":"authority","object":"Vx112","tkl":["C","T"],"ranger":["T"]}
{"type":"condition","object":"Vx112","to":"C","requires":{"yard_owner":"tkl","free":["S112"]}}
```

Det finns delvis i dag i `src/yard-boundaries.mjs`, men fältet för TKL:s tillåtna lägen läses aldrig och listan över rangerbangårdens växlar skiljer sig mellan dokumentation och kod. Det blir en avvikelse i listan tills regeln är skriven och provad.

### Var reglerna verkställs

| Regeltyp | I TKL | I MGP |
|---|---|---|
| `follow` | ordrar till alla följare; tågvägarnas växellägen räknas om vid aktivering | bara om dekodern redan är uppsatt så (Switch5 kan hålla egna beroenden) |
| `forbid`, `authority`, `condition` | prövas före varje order: manuell manöver och tågväg | nej |
| `detection` | kopplar ingångar till block | ingångarnas adresser och polaritet |
| `aspect` | vilket besked som begärs och tolkningen av rapporten | dekoderns beskedslogik och koder |
| `crossing` | aktivering och spärr av tågväg | utgångar och återrapport för bommar och ljus |

Inkopplingspunkterna i koden finns redan: `Engine.manualStatus` och `boundaryCommandReason` för manuell manöver, `OperatingControls.routeReason` och `Engine.checkRoute` för tågvägar. Följregler kräver dessutom att tågvägarnas växellägen räknas fram vid aktivering i stället för vid generering.

**Grundprincip:** TKL är alltid sista spärren. Om en regel också ligger i en MGP-dekoder ska den finnas i TKL:s modell, märkt "verkställs även i MGP", så att de två aldrig kan säga olika saker utan att det syns som en avvikelse.

### Från regel till MGP

En regel blir i första hand TKL-logik och LocoNet-ordrar till befintliga adresser. Det som måste ligga i dekodrarna (adresser, polaritet, beskedskoder, eventuella lokala växelberoenden) samlas per modul i en **MGP-sammanställning**: modul, dekodertyp, kanal, adress, SV-värden. Den kan exporteras för programmering och senare jämföras mot det dekodrarna rapporterar. Att skriva SV-värden direkt över LocoNet är ett senare steg, först när läsningen är verifierad.

## 5b. AI-genomgång av hela anläggningen

Utöver regler för ett urval kan administratören be AI:n gå igenom hela anläggningen. Utgångspunkten är att reglerna ska följa det som är ritat.

1. AI:n läser ritningen (spår, växlar och deras ben, signaler, vägövergångar), driftprofilen och Cda60.xml.
2. Den grupperar objekten efter vad ritningen säger: kompisväxlar, växlar som skiljer rangerbangården från spåren, manuella knappgrupper, vägövergångar och de block de berör, signaler och nästa signal.
3. För varje grupp lämnar den ett kort med en av fyra statusar: **förslag** (regel eller bindning att granska), **saknas** (regel som behövs men inte finns), **beslut** (källan säger emot sig själv) och **underlag** (något som bara MGP-uppgifterna kan avgöra).
4. Varje förslag går samma väg som ett regelkort från chatten: deterministisk validering, tillbakaläsning på svenska, prov i simulatorn, utkast och aktivering. Inget aktiveras av genomgången.
5. En ny genomgång efter en ändring i ritningen visar vilka regler som inte längre stämmer med den, till exempel en regel som pekar på ett ben som inte finns.

Första genomgången skulle i dag ge ungefär detta, räknat ur källorna: 7 kompisgrupper som förslag, 3 gränsväxlar som förslag, 5 manuella grupper som saknas, signal- och spårledningsadresser ur XML som förslag, vägövergångarna V1–V4 som saknas, 4 motsägande tågvägsregler som beslut och MGP-underlaget som underlag.

## 5c. Tal i alla webbläsare

Webbläsarens inbyggda taligenkänning fungerar bara i vissa webbläsare (Chrome och Edge via sina molntjänster, Safari via Apples diktering, inte Firefox). För att fungera i alla spelar vyn i stället in ljudet med webbläsarens vanliga inspelning, som alla moderna webbläsare har, och skickar det till TKL-servern som gör om det till text. Där kan en svensk taligenkänningsmodell köras på servern, så att inget ljud lämnar den, eller en molntjänst användas. Valet påverkar kostnad och svarstid, inte vyn.

Två saker gäller oavsett motor:

- Taligenkänning hör fel på fackord: JMRI blir "Jimmy", TMBox blir "tmvox". Servern skickar därför med en ordlista med objektnamn, stationer och uttryck, och AI:n matchar det som hörts mot objektlistan. Urvalet och regeln visas alltid som text innan något godkänns.
- Datorns egen diktering (macOS, iOS, Windows) skriver i vilket textfält som helst i vilken webbläsare som helst. Den fungerar redan från första dagen, innan inspelningen är byggd.

## 5d. JMRI

TKL kör inte JMRI och skriver aldrig till JMRI. Cda60.xml är en kopia som bara läses, och JMRI-installationen vid banan rörs inte. Från filen används bara det som beskriver anläggningen: objektens namn, ritningens geometri, relationerna mellan objekten och adresserna som förslag. JMRI:s egna mekanismer (Logix, minnen, interna sensorer, NX-identiteter) används inte i drift.

Två förutsättningar:

- Cda60.xml måste vara den senaste exporten. Om JMRI-konfigurationen har ändrats sedan dess behövs en ny export innan genomgången körs.
- JMRI och TKL får inte styra samma LocoNet samtidigt, eftersom båda skickar order. När TKL kopplas in är JMRI avstängt eller bara lyssnande.

## 6. Signaler och tågvägar

I dag ger TKL varje signal kör eller stopp som en växelorder till en adress och läser beskedet som en E4-kod. Vilket besked signalen visar räknar dekodern ut. JMRI-filen visar att varje mast har en egen utgång, till exempel 1/5 → LT210, där kastad betyder stopp och sluten tillåtande besked. Det passar TKL:s modell, men adresserna i profilen är fel tills de byts mot de verkliga.

Planen för signaler:

- **Adresser.** De 66 signalernas bänkadresser ersätts med utgångarna ur XML:en som förslag, med status "ej uppmätt", och verifieras i driftsättningsläget.
- **Besked.** De svenska beskedskoderna saknas. Regeltypen `aspect` håller dem per masttyp och syns i objektkortet.
- **Tågvägar.** Skyddssignaler och ordningen signalerna klareras i ändras inte; de syns i objektkortet för varje signal och tågväg, så att en ny regel kan prövas mot dem.
- **Signalrelationerna i JMRI ska följas.** JMRI har 117 relationer av typen "från signal A till signal B" (signalmastlogik), där spårledningarna och växlarna däremellan räknas fram ur ritningen. 73 av dem finns som på varandra följande signaler i TKL:s tågvägar. 44 finns i JMRI men på ingen tågväg i TKL, till exempel 3/2 → 6/6 och 1/4 → Xv. Genomgången ska pröva varje tågväg mot relationerna och ta upp de 44 som avvikelser: antingen saknas en tågväg, eller så används relationen inte och det ska sägas uttryckligen. Dessutom anger 65 punkter i ritningen vilken signal som står vid vilken spårledningsgräns; även det ska tågvägarna stämma mot.
- **Vägövergångar.** V1–V3 beräknas i dag bara för visning. Med regeltypen `crossing` blir aktivering, förringning och spärr av tågväg en del av samma regelverk och syns i planen.

## 7. Avvikelselistan från start

Det här är redan känt och blir listans första innehåll:

| Avvikelse | Antal | Löses av |
|---|---|---|
| Signaler med bänkadress | 66 | bindning ur XML + mätning |
| Spårledningar utan verklig ingång | 197 block, 132 adresser | `detection` + mätning |
| Växeladresser ej uppmätta | 49 | driftsättningsläget |
| Manuella växelgrupper olösta | 5 | `follow`/`condition` |
| Motsägande tågvägsregler | 3 + 1 | beslut per regel |
| Undantagna växeltågvägar | 15 | beslut per par |
| NX-definitioner utan tågväg | 20 | beslut per par |
| Gränsväxlar: TKL-lägen kontrolleras inte, listor skiljer sig | 3 | `authority` |
| Svenska beskedskoder saknas | alla masttyper | `aspect` + underlag |
| Vägövergång V4 saknar 4 villkor, ingen bomåterrapport | 4 | `crossing` |
| Vx95/Vx96 automatik ej införd | 1 | `follow` |
| Vx124 finns i källan men inte i planen | 1 | beslut |
| Vändskivans anslutning okänd | 1 | MGP-underlag |
| Programmeringsspårets relä ej verifierat | 1 | mätning |
| Signalrelationer i JMRI utan tågväg i TKL | 44 | tågväg eller uttryckligt undantag |

## 8. Det som måste fram innan utveckling

Från den som satt upp MGP:

1. Modullistan M00–M11: dekodertyp, firmware, adressintervall, vad varje kanal driver.
2. SV-inställningarna per modul, särskilt lokala växelberoenden och signalernas beskedslogik.
3. De svenska beskedskoderna som Signal10 rapporterar.
4. Om dekodrarna rapporterar av sig själva vid start och periodiskt, eller måste frågas.
5. Vad JMRI:s MQTT-spegling (L2T) användes till och om något ska ta emot den i dag.
6. LocoBufferns modell och inställningar.

Från Casper:

7. Ska bindningsredigeraren uppgå i den nya vyn? Förslag: ja, med tabellen kvar som export.
8. Rangerarens gränssnitt: fysisk panel, webbsida eller båda.
9. AI-tjänst: Claude API med nyckel på servern, inget skickas från webbläsaren.
10. Tal: Chromes inbyggda diktering räcker i första steget.

## 9. Ordning att bygga, varje steg körbart för sig

1. **Objektregister och ID-städning.** Ny objektfil med TKL-namn, fysisk bindning och spårbarhet. XML:ens LS- och LT-kommentarer läses in som förslag. Ingen ändring av driften förrän aktivering. Avvikelselistan byggs här.
2. **Vyn utan redigering.** Planen i hög upplösning, lager, urval, objektkort, avvikelser. Designen finns i Claude Design (§4).
3. **Regelspråk och kompilator för det som redan finns.** Kompisväxlar, gränsväxlar, manuella villkor, programmeringsspår och linjespärrar uttrycks som regler. Provet: exakt samma beteende som i dag, alla 326 enhetstester och processprov gröna.
4. **Chatten och genomgången.** Fritext och tal → regelkort → validering → simulatorprov → utkast → aktivering. Därefter AI-genomgången av hela anläggningen (§5b), som använder samma kedja.
5. **Driftsättningsläget och MGP-sammanställningen.** Mätning objekt för objekt mot verklig utrustning; export per modul.
6. **Signaler och vägövergångar** in i regelverket med `aspect` och `crossing`.

Steg 1–3 kan göras utan MGP-underlaget. Steg 5–6 kräver det.

## 10. Underlag för Claude Design

Rita adminvyn "Objekt och regler" för Charlottendal TKL i samma stil som ställverket: svart bakgrund, IBM Plex Sans och Mono, betydelsefärgerna rött (belagt, larm), grönt (lagd tågväg, ok, uppmätt) och gult (låst, väntar, osäkert, markering), struktur i kalla gråtoner. Skärm 1920×1080.

- Överst en filterrad med lager: växelnummer, signalnamn, spårledningar, LocoNet-adress, MGP-modul, regelgrupper, vägövergångar, avvikelser, JMRI-namn. Till höger urvalets objekt som chips.
- Mitten: stationsplanen ifylld på höjden och bredare än skärmen, sidledes rullning, minikarta upptill. Växelnummer stora. Valda objekt med gul ring, regelgrupper med färgad kontur, avvikelser med röd punkt.
- Höger kolumn 420 px med flikarna Avvikelser (antal i rött) och Objekt. Visa ett objektkort för en dubbelväxel med bindning, status, regler och tågvägar.
- Nederst chatten: urvalet, textfält, mikrofon. Visa ett regelkort som svar på "när Vx100 läggs avvikande ska Vx101 följa, och tvärtom": regeln i klartext, var den verkställs, provresultat i simulatorn, knapparna Godkänn som utkast, Ändra, Förkasta.
- Ett andra läge: driftsättning, där ett valt objekt visar provorder, senaste telegram och knappen Markera som uppmätt.
