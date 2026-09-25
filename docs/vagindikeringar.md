# V1–V4 · beräknade panelindikeringar

## Lugnare visning från version 0.26.2

**Meny → Utseende och ljud → Övergångslampor** erbjuder två lägen. **Lugn blinkning** är standard: 3 000 ms period per lampa, 1 500 ms fasförskjutning och dämpat rött ljus med 300 ms mjuk tändning och släckning. Varje lampa blinkar 20 gånger per minut, hälften så ofta som i 0.26.1. Det är ett avsiktligt lugnare visningsläge för ställverkspanelen.

**Fast rött sken** låter båda lamporna lysa dämpat när övergången är aktiv. Det ursprungliga snabba läget har tagits bort; ett äldre sparat val av detta faller tillbaka på Lugn blinkning. Valet sparas i den aktuella webbläsaren. Samma SVG-lampor finns kvar; inga mått eller positioner ändras. Viloläge, okänt underlag, orsaker, reservationer och V4 är oförändrade. Inställningen ändrar inga fältorder.

## V1–V3 från version 0.18.0

På Caspers begäran visas V1, V2 och V3 som vägövergångar: båda lamporna är släckta när ingen korsande tågväg är reserverad och samtliga korsande block är bekräftat fria. Vid reservation eller beläggning blinkar lamporna växelvis rött. Ingen grön lampa eller röd vilolampa används för dessa tre övergångar. V4 har kvar sin tidigare visning.

Det tidigare läget (borttaget från 0.26.2) följde 80 blinkningar per minut per lampa, mitt i intervallet 75–85, med 40 procent tänd och 60 procent släckt tid enligt [TSFS 2014:30, 11 kap. 4 §](https://www.transportstyrelsen.se/tsfs/TSFS%202014_30.pdf). Perioden är 750 ms, tänd tid 300 ms och fasförskjutningen mellan lamporna 375 ms. Det ger 75 ms mörker mellan vänster och höger lampa. Rytmen använder verklig tid och påverkas inte av modellklockans hastighet. Befintliga SVG-lampor animeras utan bildbyte eller omladdning.

| Övergång | Streck i panelkällan | Korsande block | Korsande körbara tågvägar |
|---|---|---|---|
| V1 | T152 | S100, S101, S103 | 147 |
| V2 | T166 | S120, S121, S125, S126, S130 | 166 |
| V3 | T172 | S165a, S166a, SIIID | 100 |

Listorna genereras från streckens skärningar med spårsegment och växelben. Dekorativa ändstreck räknas inte som spår. Tågvägar avgörs av den faktiska färdvägens geometri; även korsande växeltågvägar ingår. Detta är en uttrycklig ny visningsregel och skiljer sig från XML:s äldre NX/sensor-OR: exempelvis S121, S165a och S166a saknades som direkta sensorvillkor i respektive äldre regel. Originalreglerna och deras beräknade värde bevaras för spårbarhet; nya visningen använder det separata fältet `warning`.

En accepterad reservation räcker från etablering till dess att låsen har frigivits. Återtagning eller kvarvarande lås släcker inte lamporna i förtid. Ett känt aktivt villkor räcker för blinkning även om ett annat är okänt. Saknas beläggningsrapport, eller är den gammal, får övergången frågetecken i stället för att visas som bekräftat inaktiv. Vid bruten kontakt eller lagringsfel visas också okänt underlag. Klick på lamporna visar korsande block och aktuella orsaker.

Ändringen är läsande panelvisning och skickar inga bomorder eller nya fältorder. Den implementerar inte fysisk bomåterrapport, förringningstid eller en fysisk vägskyddsanläggning.

### Prov för den nya visningen

- Sju nya tester täcker geometri, samtliga 197 blocks påverkan, alla korsande körbara tågvägar i sju reservationsfaser, flera samtidiga orsaker, sena/saknade rapporter, avbrott och polaritet. De sex tidigare indikeringsproven passerar, inklusive verklig Engine/Field över telegramkö med etablering, hållet lås och återtagning.
- Processhelhetsprovet belägger och frigör S100, S121 och S165a i den separata simulatorn och kontrollerar TKL:s varningar över HTTP; pågående tågväg och släckning efter passage ingår. Alla sex helhetstester passerade lokalt.
- Webbläsarprov: viloläge släckt, separat beläggning för V1/V2/V3, korrekt orsak för S121, genomgående Cu → Bu med alla tre blinkande, återtagning till släckt samt kontaktavbrott till frågetecken och återanslutning till släckt. Alla tre panelutseenden och fullskärm kontrollerade. Webbläsarens faktiska animationsperiod var 0,75 s och höger lamps fasförskjutning −0,375 s; både vänster/höger tändning och mörkerpaus observerade. Inga konsolfel eller varningar.
- Provblock fria, inga provvägar kvar, Original-utseende och normalt fönsterläge återställda efter provet. V4 oförändrad.

## Tidigare visning och bevarad XML-projektion


Version 0.10 visar källans åtta lampor V1g/r–V4g/r på sina ursprungliga platser i alla tre panelutseendena. Samma lägen finns som fyra små val under spårplanen, märkta **Beräknat**. Klick öppnar underlaget, kända villkor och en länk till hela XML-regeln. Från kompaktläge öppnas verktygen så att detaljerna kan läsas.

Detta är läsande panelindikering. Den skickar inga order, styr inga bommar, ändrar ingen sensor och påverkar inga tågvägslås. TKL använder endast sina egna reservationer och återrapporter genom det ordinarie LocoNet-gränssnittet; inga interna simulatoruppgifter läses. Varken grön eller röd lampa är en verifierad fysisk bomkvittens.

## Regel och avsiktlig ersättning

Grupp 0012 är aktiverad i originalet. Dess fyra regler innehåller 80 NX_ACTIVE-villkor och 13 SENSOR_ACTIVE-villkor. logicType=2 betyder ALL_OR i JMRI. Den äldre texten i antecedent innehåller på flera ställen AND, men används inte för ALL_OR. Generatorn verifierar de exakta fyra reglernas typer, negationer, variabelantal och åtgärder; den är ingen generell exekverare av importerad XML. Fulla originalet bevaras som tidigare.

Det nya systemet har fler tydliga tågvägsfaser än källans enkla NX_ACTIVE. Följande ersättning används och är testad:

| Underlag | Villkorets värde |
|---|---|
| Anslutet NX utan reservation | Inaktivt |
| Anslutet NX i klar tågväg eller tågpassage | Aktivt |
| NX reserverat men under etablering, klarsättning, återtagning eller med kvarvarande lås | Okänt |
| NX utan körbar koppling | Okänt |
| Färsk, samstämmig sensoråterrapport | Dess rapporterade ACTIVE/INACTIVE med hänsyn till profilens polaritet |
| Saknad, gammal eller motsägande sensoråterrapport | Okänt |
| Bruten kontakt eller lagringsfel | Alla villkor okända |

OR beräknas med tre värden. Minst ett känt aktivt villkor ger grön lampa. Alla måste vara kända och inaktiva för röd lampa. I övriga fall visas frågetecken utan fastställt lampbesked. En grön indikering kan därför ha ofullständigt underlag om ett känt aktivt villkor redan avgör OR; detaljvyn redovisar detta genom antalet kända villkor.

V1 har 33, V2 35 och V3 19 anslutna villkor. V4 har endast två anslutna sensorvillkor av sex. Dess fyra NX hör till de ännu oanslutna lastspårsvägarna och behandlas alltid som okända. Med fria sensorer visar V4 därför okänt. När exempelvis slSL1 rapporterar aktivt blir OR känt aktivt, men underlaget är fortsatt endast två av sex.

Alias för samma källsensor delar samma provadress och måste ha samstämmiga, färska rapporter. Fysisk MGP-adressättning, bomlogik, tidsfördröjningar och rörelseåterrapport kan inte härledas från dessa interna IS251–IS258-lampor.

## Prov

Sex riktade prov verifierar alla fyra källregler, varje enskilt sensorvillkor, alla 76 anslutna NX genom sju tågvägsfaser, okända V4-villkor, sensorpolaritet, gamla/motsägande rapporter, bruten kontakt och lagringsfel. Ett förlopp med riktig Engine och separat Field går över telegramkö: aktiv väg, hållna lås, återtagning och avbrott. Läsningen förändrar inga order eller lås. Processprovet kontrollerar samma indikatorfält genom HTTP före, under och efter två tågpassager.

UI-prov: V1 okänt under etablering och grönt efter bekräftad körväg, bevarat genom skinbyte och omladdning; alla tre skins visuellt granskade. V4 okänt med två av sex kända, grönt när simulatorns SLI belades, okänt direkt vid brutet LocoNet, återanslutet och återställt efter fritt. Källregel och kompaktläge provade. Noll tågvägslås och fria provblock efteråt.

Inga nya drifttillstånd lagras. Detta lägger ett informationsfält till serverns svar men ändrar inte driftprofilens identitet, beständiga lås, inloggning eller befintliga dataformat.


## Publiceringsläge för 0.18.0

Kod `92bc576` är pushad och har klarat serverns 141 enhetstester och sex helhetstester samt XML/operations/syntax. Publiceringen avbröts därefter av kvarvarande lås för Au → Spår 1a. Föregående 0.17.1 (`97c6546`) är återställd och i drift. Ändringen är färdig för ett nytt försök när provvägen får återtas; Caspers besked inväntas.
