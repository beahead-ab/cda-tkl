# Provresultat · uppdaterat 23 september 2026

## Automatiska prov

75 av 75 enhetstester och fyra helhetstester med riktiga Node-processer, TCP och HTTP godkända på servern i version 0.10.0. Alla 340 anslutna huvud-/växeltågvägar provas genom etablering och passage. Se arbetsjournalen för varje publicering.

- Publicerade byteexempel för B0, B1, B2 och den preliminära E4-profilen; kontrollsummor och fragmenterade strömmar.
- Kommandoeko ändrar inte rapporterade växellägen.
- Hela vägen från reservation till rapporterat kör; sista signalen klarsätts först.
- Beläggning, för gamla rapporter, okända signalbesked, motriktat körbesked och oväntat växelläge återkallar medgivande och behåller lås.
- Uteblivet växelsvar och signal som vägrar kör når inte klar tågväg.
- Konflikter avvisas; oberoende vägar kan vara aktiva samtidigt. Delning av kopplad växel i samma läge orsakar ingen ny omläggning.
- Manöverlås, kopplade växelorder och inverteringen av Vx131.
- Omstart återställer lås men inga körmedgivanden. Trasig lagring och profilbyte med lås avvisas.
- Misslyckad låslagring skickar inga växelorder eller körmedgivanden.
- Helhetstest: riktiga order och återrapporter mellan processerna, beständiga anteckningar/lås, återtagning efter beläggning, avbrott/återanslutning samt avvisat POST-anrop från annat ursprung.
- Webbdrift: verifiering av JWT-signatur, avsändare, applikation, e-postadress och utgångstid; ogiltiga och saknade inloggningsbevis avvisas. Ofullständig inloggningskonfiguration stoppar publik uppstart.
- Separat helhetstest visar att både TKL och simulatorn skyddar gränssnitt, data och manöver-API även vid direktanrop förbi Cloudflare.

## Manuell kontroll i appens webbläsare

Original-, relä- och trafikutseende granskade. Tågväg lagd med SVG-plupparna; körbesked och låsta manuella växelknappar kontrollerade. Tåg startat i den separata simulatorn; beläggning och stopp syntes i TKL. Samma pluppar återtog vägen och frigav låsen efter fri rapport. Registersökning och sparad anteckning provade.

Dessa prov gäller den uttryckliga utvecklingsprofilen. Ingen fysisk LocoBuffer eller MGP-modul ingick, och ingen TrainMeet-server anropades.

## Nytillkomna prov i version 0.5

- Nödåtertagning under fri och belagd väg, avbrott, omstart och misslyckad lagring; inga skyddande lås tvångsraderas.
- AIS återställs först när nödåtertagningens lås är borta och alla signaler har nya stoppbesked.
- Beständigt lokal-/fjärrläge kontrolleras både i kärnan och genom HTTP; lägesbyte nekas med hållna lås.
- Äldre manöverformat migreras utan att AIS eller spårspärrar tappas.
- UI: fjärrläge spärrar lokal tågväg, nödmanöver förblir tillgänglig, byte nekas under tågväg, nödåtertagning behåller AIS efter frigivning.

Ett tidigt helhetstest försökte återställa AIS direkt efter frigiven väg, före stoppkvittens från övriga signaler. Kärnan nekade detta korrekt. Testet väntar nu på det fullständiga villkoret och knappen använder samma serverberäknade villkor.

## Nytillkomna prov i version 0.6

Sju enhetstester och ett utökat processprov kontrollerar tågnummerhanteringen. Exakt källunderlag: 197 block, sju inkommande minnen, 44 ankare inklusive dubbleringen SN2A. Registrering och atomisk flytt, omstart, beläggningsändring/avbrott, samtidiga paneler, lagringsfel och ogiltiga data passerar. Manuell flytt ändrar inte beläggning eller skapar tågvägslås.

UI-prov på9030: P421 registrerat på C upp och flyttat till SIA; ändring i en panel uppdaterade den andra utan att radera dess osparade P422. Den andra panelens spara-knapp spärrades. Beläggningsändring visade frågetecken, manuell kontroll återställde indikeringen. Omstart bevarade P423 och markerade det för kontroll. Fältbyte med osparad P424 behöll både valt fält och text. Original-, trafik- och reläutseende samt kompaktläge kontrollerade. Provnumret därefter tömt, simulatorns SIA fri, noll lås. Den extra provpanelen stängd.


## Nytillkomna prov i version 0.7

Alla 210 huvudtågvägar, inklusive de 18 med Spår 6, har genomgått etablering, ordnad passage och frigivning genom den oberoende fältmodellen. De 60 befintliga växeltågvägarna passerar samma prov som tidigare. Varje Spår 6-väg avvisas med belagd skyddsresurs. Motriktad infart avvisas innan nya order skickas; oväntad beläggning på SVI håller låsen och samma start-/målval återtar först när spåret är fritt.

Källans skilda gränser 6/8 och 6/9 samt skyddande målsignal kontrolleras uttryckligt. Processprovet lägger Spår 6 → Spår 11 och kontrollerar målsignal 3/10 i stopp före återtagning. Panelprovet visade Spår 6 i listan, etablerad KLAR-väg och frigivning med samma val. Noll provlås kvar. Ingen ny knappkoordinat har lagts till i spårplanen.


## Nytillkomna prov i version 0.8

Alla 130 granskade växeltågvägar, inklusive de 70 nya listvalen, passerar etablering och ordnad passage. De 210 huvudtågvägarna har provats igen med den utökade profilens signalberoenden. Var och en av de 70 nya vägarna avvisas vid beläggning och administrativ spärr; källans start, mål och signalordning kontrolleras mot en explicit granskningslista. Alla 15 kvarvarande undantag avvisas utan order eller nya lås.

Extra prov kontrollerar konflikt med huvudtågväg, återtagning med belagt spår, anslutningsavbrott och signal som vägrar kör. En redan begärd återtagning kvarstår vid avbrott och fullföljs först efter nya fria/stoppåterrapporter; inga körorder skickas vid återanslutningen. Detta skiljer sig från processomstart, då operatören måste begära återtagning på nytt.

Processprovet lägger och återtar 7/10 → IIIev, kontrollerar målsignalen i stopp och avvisar både 2/2 → 2/4 och 9/10 → LastSp1in. I UI visades 7/10 → IIIev som KLAR; samma listval återtog till noll lås. Start-/målslistor i växeltågvägsläge sorteras i naturlig nummerordning. Originalets dolda ikoner och kartkoordinater är oförändrade.


## Korrigerad NX-spårning i version 0.8.1

Sammansatta vägar behåller nu både källans hela NX-par och de ingående delparen. Det nya provet följer 3/5 → 6/9 genom den mellanliggande signalen 6/7, både som huvud- och växeltågväg, och kontrollerar att ursprungsreferensen finns kvar i en aktiv respektive hållen reservation. Alla 130 växeltågvägar behåller originalregelns uttryckliga NX-id.

Täckningsregistret identifierar nu 133 av 153 NX-definitioner med minst en körbar väg; 20 saknar ännu koppling. Antalet körbara vägar är fortsatt 340. För de 25 berörda vägarna är geometri, signalordning och låsta fysiska resurser oförändrade. En nytillkommen full NX-referens används av en ansluten manuell växelregel; dess manöver var redan spärrad av de överlappande fysiska resurserna. Fullständigt regressionsprov kontrollerar den uppdaterade profilen.


## Nytillkomna prov i version 0.9

Fyra riktade signalregisterprov passerar: 66 master, 329 källbindningar, 310 lösta och 19 tomma utgångar, 117 relationer, exakt bildmatchning utan antagna typalias samt käll-/bildkontrollsummor och reproducerbar generering. Aktuell rapport skiljs från begärt medgivande; gamla, bortkopplade och okända besked döljer giltig råkod. Inloggningsprovet har utökats för den nya katalogen. Full serverkörning godkänd: 69 enhetstester och fyra helhetstester.

UI: 1/5 med LT210, 6/8 med fem tomma utgångar, virtuell 6/7 och 3/5 med saknad bilddefinition kontrollerade. Länk till 3/5 → 6/7 öppnade rätt källvillkor. Förladdade GIF visades med originalmått, tabellen var läsbar på smal skärm. Lagd Cu → Spår 1a visade kör; återtagning i en andra panel uppdaterade den redan öppna signalvyn till stopp. Inga provlås kvar. Se docs/signalregister.md.


## Nytillkomna prov i version 0.10

Sex riktade prov och utökat processprov för V1–V4 passerar lokalt. Alla 80 NX- och 13 sensorvillkor är källbundna. Var och en av de 76 anslutna NX prövas i sju faser, varje sensor kan ensam avgöra OR och alla fyra oanslutna V4-NX förblir okända. Alias, polaritet, gamla och motstridiga rapporter, anslutningsavbrott och lagringsfel kontrolleras. Läsande indikering skickar inga order och frigör inga lås. De fyra processhelhetstesterna passerar.

UI: etablering/aktiv/återtagning för V1, V4:s delvis kända underlag och SLI-beläggning, avbruten/återupprättad LocoNet, skinbyte, omladdning, källregel och öppning från kompaktläge. Se docs/vagindikeringar.md. Alla 75 enhetstester och fyra helhetstester godkända på servern före publicering av 5104907; backup och efterkontroll godkända.
