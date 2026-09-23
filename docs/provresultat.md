# Provresultat · uppdaterat 23 september 2026

## Automatiska prov

61 av 61 enhetstester och fyra helhetstester med riktiga Node-processer, TCP och HTTP godkända i version 0.6. Alla 252 anslutna huvud-/växeltågvägar provas genom etablering och passage. Se arbetsjournalen för varje publicering.

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
