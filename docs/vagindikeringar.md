# V1–V4 · beräknade panelindikeringar

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
