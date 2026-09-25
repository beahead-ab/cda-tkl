# Provresultat · uppdaterat 23 september 2026

## Automatiska prov

124 av 124 enhetstester och sex helhetstester med riktiga processer, TCP, HTTP och virtuell serieport godkända på servern i version 0.15.0. Alla 340 anslutna huvud-/växeltågvägar provas genom etablering och passage. Se arbetsjournalen för varje publicering.

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


## Nytillkomna prov i version 0.11

Sju riktade enhetstester för telegraminspelning godkända lokalt: båda riktningar, felaktig kontrollsumma, okänd B1-variant, eko/transportkvittens, monoton ordning, filbeständighet, samtidiga paneler, gränser, avbrott, omstart och lagringsfel med bevarad nedladdning/återförsök. Transportprovet kontrollerar att tappningen inte skickar extra order och att en felaktig ram inte når kärnan.

Alla fyra processhelhetstester passerar lokalt. Två samtidiga tåg spelas in med B0, B1, B2 och preliminär E4, återtagning av lås fungerar och filen hämtas efter stopp. Lösenordsprovet kontrollerar skyddad inspelningslista/nedladdning, avvisat annat ursprung, sparning vid normal serveravstängning, historik efter omstart, avvisad gammal serversession och återkallad nedladdningsrätt efter utloggning.

UI-prov: Cu → Spår 1a går till KLAR och återtas under pågående inspelning. 4 762 rader sparas, historiken bevaras efter omladdning. En andra inspelning avslutas och sparas vid LocoNet-avbrott; startknappen är spärrad tills återanslutning. Därefter noll provlås, anslutning på, alla provblock fria. Alla 82 enhetstester och fyra helhetstester passerade därefter på servern; version 0.11.0 publicerad med backup och godkänd efterkontroll.


## Nytillkomna prov i version 0.12–0.13

Linjespärrar, programmeringsspår och modellklocka provas enligt docs/linjer-programmering-klocka.md. 97 enhetstester och fyra processprov passerade på servern före 0.12. Seriell gateway får en faktisk virtuell serieport i både macOS- och Linuxprovet: eko och oberoende fältbesked skiljs åt, skrivfel/timeout/avbrott återkallar anslutningen. TrainMeet-läsadaptern provas mot en separat HTTP-fixtur, inklusive parning, beständig privat token, gamla/snedordnade svar, fel station och omstart. 108 enhetstester och sex processprov passerade på servern före 0.13. Ingen fysisk utrustning eller riktig TrainMeet-installation var ansluten.

## Nytillkomna prov i version 0.14

Sex konfigurationstester kontrollerar gemensamma detektoralias, adresskonflikter, version/session, lagringsfel och källprofil. Processprovet prövar AIS-krav, beläggning, ny adress utan rapport, avstängd tågväg, profilbyte, okända lägen/AIS efter byte och återgång. Skyddade endpoints ingår i inloggningsprovet.

UI: adresskrock visas i utkast och avvisas för aktivering; direktmanöver för Vx170 stängs av och återställs genom versionshistoriken. Formulärets layout, exportlänk och återinläsning kontrollerade. Växelns informationsval är nu separat från manöverpluppen: visning lämnar växelläget orört. Provets Vx170 återställdes rakt.


## Nytillkomna prov i version 0.15

Tio riktade nummerföljningsprov och de tidigare sju informationsproven passerar. Hela befintliga sviten passerade med 122 enhetstester innan de sista två riktade fallen för återtagning/trasig sparad följning lades till och godkändes. Fyra utökade processprov passerar, inklusive två samtidiga nummerföljningar över oberoende TCP-processer, färdig passage och inloggningsskydd. XML/import/syntax är kontrollerade.

UI: P815 kopplat till klar Cu → Spår 1c (källparet htvCu–htvSpIA), startat från simulatorn och följt från CuppIn via SU4B till sista gemensamma detektoravsnittets informationsfält SIA. Numret markerades för kontroll efter full passage. P816 följning pausades vid LocoNet-avbrott, återupptogs inte efter återanslutning, avslutades manuellt och provvägen återtogs. Båda provnummer tömda, noll lås och inga konsolfel. Informationsväljaren öppnar rätt plats från följningslistan.

Slutpublicering 0.15: samtliga 124 enhetstester och sex processprov passerade även på servern. Efterkontroll av tjänster, nya autentiserade endpoints och extern HTTPS passerade. Den verkliga driftbackupen kunde därefter läsas av applikationens modeller i en separat tillfällig katalog utan fältorder; originalbackup och live-data bevarades.

## 24 september 2026 – version 0.16

124 enhetstester och sex processhelhetstester godkända lokalt och på publiceringsservern. Hela XML och deterministisk operationsimport godkända. Webbläsarprov av två samtidiga tåg, nummerföljning, låst växel, samma start/slut för återtagning, avbrott/återanslutning samt kompakt detaljruta och tre utseenden dokumenteras i [provrapporten för steg 1](provkorning-2026-09-24.md). Publicerad som `bf2a372`; extern HTTPS och skyddad åtkomst verifierade.


## 24 september 2026 – version 0.16.1

134 enhetstester och sex processhelhetstester godkända lokalt och på servern. Tio nya regressionstester granskar kompisväxlarnas manöver, återrapporter, lås och skydd för sidospåret. Ett test reproducerade före rättningen att Cu → Spår 1c kunde lägga om Vx101 under belagt S101. Den nya kontrollen avvisar detta före order; redan korrekt bekräftade kompisar lämnas orörda, och förenliga vägar kan dela samma pågående omläggning.

Webbläsarprov från båda växelplupparna visade att båda bilderna följer med. Belagt S101 i den separata simulatorn avvisade tågvägen utan nya lås. S101 och växelparet återställdes efter provet. Full XML och deterministisk operationsimport godkända. Release `7dd7f71` publicerad med backup och godkänd efterkontroll av anslutning, lås och HTTPS/inloggningsskydd. [Fullständig provbeskrivning och avgränsning mot hårdvara](kompisvaxlar.md).


## 24 september 2026 – version 0.16.2

Manuell återkoppling provad i webbläsaren: tangentbordsfokus visar båda kompisväxlarna före manöver; direktplupp och detaljknapp visar individuella återrapporter. Belagt S101, tyst S101 och låst Vx100/Vx101 gav tydliga spärrorsaker utan omläggning. Visa Vx161 rullade fram en kompis från utanför en 390 pixlar bred vy utan order. Original, Reläpanel, Trafikskärm och kompakt läge kontrollerade; inga konsolfel/varningar. Noll provlås, båda Vx100/Vx101 rakt, S101 fritt och detektorfelet borttaget vid avslut. Fönsterstorleken återställd.

14 relevanta befintliga enhetstester och sex helhetstester godkända lokalt. Första helhetstestförsöket hindrades av sandlådans lokala portbehörighet (EPERM); omkörning med tillåten lokal nätverksåtkomst passerade. Servern körde hela sviten med 134 enhetstester och sex helhetstester godkända före publicering av `c868a44`. Syntax, XML/operationskontroller och extern efterkontroll passerade. Ingen fysisk anläggning eller riktig TrainMeet-anslutning användes.


## 24 september 2026 – version 0.17.0

Ren panel och separat Verktyg-sida har genomgått [webbläsarprov](panel-och-verktyg.md): smal/bred vy, direktlänk och bakåtknapp, osparat tågnummer, klick på tågnummer från panelen, signalruta, kompisväxel från verktygen, tågväg över sidbyte/registerbesök och återtagning, aktivt stopp och synkroniserad tågvägstyp. P1700 tömdes efter prov, AIS återställd, noll provlås. Inga konsolfel eller varningar.

Sex befintliga processhelhetstester godkända lokalt. Serverns hela svit passerade: 134 enhetstester och sex helhetstester, samt syntax, XML och operationsimport. Release `bea8a85` publicerad med backup och godkänd efterkontroll av tjänster, lås, HTTPS och inloggningsskydd. Ingen fysisk utrustning manövrerades.


## 24 september 2026 – version 0.17.1

Fullskärm provad via knapp och Enter, återgång via knapp och Escape, signaluppgifter samt sidbyte till Verktyg och tillbaka. Cu-startvalet bevarades vid fullskärmsbyte; därefter avbröts provvalet utan att lägga någon tågväg. Knappraden granskad vid 390 pixlars bredd, normal fönsterstorlek återställd. Inga konsolfel. Äldre WebKit-reserven är kodgranskad men inte provad i äldre Safari.

Lokal syntax godkänd. Serverns 134 enhetstester och sex processhelhetstester passerade tillsammans med XML-, operations- och syntaxkontroller. `97c6546` publicerad med backup och verifierad anslutning, noll lås, extern login 200 samt API 401 utan session. Ingen fysisk utrustning manövrerades.


## 24 september 2026 – version 0.18.0, provad men inte publicerad

V1–V3:s geometri, reservationsfaser, individuella block, flera orsaker, polaritet och okända rapporter täcks av sju nya tester. De sex äldre indikeringsproven passerar. Sex processhelhetstester godkända lokalt; det utökade nätprovet belägger/frigör S100, S121 och S165a genom simulatorns telegram. [Webbläsarproven](vagindikeringar.md) visar släckt viloläge, korrekt växelblinkning, genomgående tågväg, återtagning, avbrott/återanslutning, alla tre utseenden och fullskärm. Provdata och fönsterläge återställda; inga konsolfel.

Serverns hela kontroll passerade med 141 enhetstester och sex helhetstester samt XML/operations/syntax. Publicering av `92bc576` avbröts av befintliga tågvägslås; 0.17.1 (`97c6546`) är fortfarande den publicerade versionen. Återställda tjänster och kontakt verifierade. Provvägen Au → Spår 1a har bevarats och inväntar Caspers besked.

## 24 september 2026 – version 0.19.0, lokal meny och TrainMeet-inställning

146 enhetstester, sex processhelhetstester och syntaxkontroll passerade lokalt. Fem nya TrainMeet-prov täcker beständig serveradress, frånkoppling före serverbyte, revisions-/sessionskontroll, pågående begäran, låst installationsadress, otillåtna URL:er och misslyckad lagring. Processprovet konfigurerar adressen via API före parkoppling och verifierar återanslutning efter omstart. Inloggningsprovet omfattar det nya konfigurationsanropet.

Webbläsarprov: hamburger-meny på panel och stödsida, pilknappsfokus och Escape, avsnittslänk till utseende, tillbaka med bevarat stationsutkast, direkt omladdning av TrainMeet-sidan, avvisad HTTP-adress på nätverket, sparad loopbackadress samt återställd tidigare provadress. Ingen anslutningskod skickades till en riktig server. Menyn och formuläret granskade i 1280/390 pixlar. Fullskärm från menyn bevarade Cu-startvalet, och Escape i öppen meny stängde bara menyn. Provvalet avbrutet och normal fönsterstorlek återställd; inga konsolfel eller varningar.

Den riktiga TrainMeet-serverns adress och placering är fortfarande efterfrågade. Webbpublicering inväntar tidigare besked om Au → Spår 1a; ingen serverväg har raderats eller återtagits för detta arbete.

## 24 september 2026 – version 0.19.1, objektinformation med högerklick

Webbläsarprov av Vx100/Vx101: högerklick öppnade en riktig modal intill växeln med båda lägena och spårstatus. Efter Escape låg muspekare och fokus kvar på växeln utan att information öppnades. Vänsterklick lade paret avvikande utan informationsruta. Högerklick visade återrapporten och Lägg rakt återställde båda genom ordinarie manöver. Klick på växeln bakom modalens bakgrund stängde bara rutan; efterföljande Skift+F10 visade fortsatt rakt läge.

Signal 1/12 och V1 öppnades med högerklick. Vx171 vid högerkanten placerade rutan till vänster om klicket. Native dialog verifierad modal; hela rutan rymdes i 390 × 760. Escape i V1-rutan behöll fullskärm och Cu-startval. Provvalet avbrutet, växelparet rakt, normal fönsterstorlek återställd. Ett upptäckt klientfel efter borttagen hover-titel rättades; inga nya konsolfel efter omladdning. Syntaxkontroll godkänd. Ändringen rör presentation och händelsehantering; kärna och driftdataformat är oförändrade.

## 24 september 2026 – version 0.20.0, manöverfält och normal spårtext

JMRI-panel-normal.png, den öppna Claude-panelen och tidigare fysiska ställverksbilder användes för jämförelsen. Spårtexterna har verifierad vikt 400; originalets storlekar och koordinater bevaras. Manöverrad och typografi granskade i Original, Reläpanel och Trafikskärm samt 390 × 760. Ingen horisontell överströmning i manöverraden.

Webbläsarprov: huvud-/växeltågvägsknappar synkroniserade med listan, Cu-startval och Avbryt val, Cu → Spår 1c till återrapporterat kör och normal återtagning via fältet under panelen. Alla signaler i stopp, återställning efter stoppkvittens, byte till fjärr och tillbaka, samt nödåtertagning utan kvarvarande provvägar och återställning. Spårspärrar, linjer/programmeringsspår och modellklocka öppnades där; osparat tågnummerutkast bevarades vid fältbyte och återlästes utan lagring. Högerklicksmodal för Vx100 fungerade efter omflyttningen. Menyn/Verktyg innehåller nu endast stödsidorna.

Avslutat i lokalt läge, huvudtågväg, AIS av, inga provtågvägslås, Original och normal fönsterstorlek. Inga konsolfel. Sex processhelhetstester och syntax godkända. Första testförsöket blockerades av sandlådans lokala portbehörighet; godkänd omkörning med testportar/virtuell serieport passerade. Ingen backend, fysisk anläggning eller serverdata ändrad.

## 24 september 2026 – fast panel, 0.26.0

- 174 enhetstester godkända lokalt. Tre nya prov täcker sammanslagning av 100 uppdateringar till en bildruta, stillastående/avbruten animationsslinga, monotont ljusflöde inklusive ändrad rörelsepreferens samt uteblivna DOM-skrivningar för identiska värden. Efter sista preferensjusteringen passerade de tre riktade proven igen. Syntaxkontroll godkänd.
- Separat lokal provanläggning 9050/9051/9052, 23 uttryckligt märkta provrörelser. Ingen testdata i webbdriften.
- Vid 1280×720: spårplanen x=0, y=88, bredd=1280, höjd=296 i slutlig layout. AIS, startval, tågväg, modal, tom/fylld tidtabell och bläddring gav ingen panel- eller sidförflyttning. Tidigare mätning före tio pixlars ökning av den fasta tidtabellsytan gav höjd 306, också utan förflyttning mellan tillstånden.
- 1920×1080: sex tidtabellskolumner med tre rörelser vardera; samma panelgeometri i Original, Reläpanel och Trafikskärm. Högerklick visar aktuellt signalbesked utan scrollning. Smal vy 390×844 håller sidan stilla; manuell panorering reserverad för spårplan/knappfält.
- Tågväg Cu → Spår 1a etablerad i simulatorn. Vid avbruten LocoNet visas frånkopplad status och förladdade mörka bilder/okänt besked, med oförändrad geometri. Återanslutning återupptar inte körmedgivandet.
- Fullskärmsknappen kunde aktiveras i testverktyget men webbläsaren rapporterade inget aktivt fullskärmselement. Faktisk fullskärmsövergång har därför inte verifierats i detta prov. Befintlig fullskärmskod är oförändrad. Ingen uppmätt FPS-garanti; bildrutetakt beror på skärm och dator.

## Version 0.26.1 – övergångarnas visningsläge

Syntaxkontroll och tre renderingsprov godkända. Lokalt webbläsarprov på 9040: aktiv V1 använder 1,5 s period och höger lampa −0,75 s förskjutning; V2/V3 är mörka utan animation. Fast rött ger båda aktiva lamporna rgb(199,91,80), inga animationer och fortsatt mörka vilolampor. Fast-läget bevarades efter omladdning; Lugn blinkning återvaldes. Högerklick visar rätt lägesbeskrivning och den befintliga reservationsorsaken. Spårplanens mått före/efter visningsbyte var identiska. Inga konsolfel. V4 och backend har inte ändrats.

Publicering 25 september kl. 02:47: samma prov och backendjämförelse godkända på servern. Två befintliga lås återställdes till held efter uttryckligt godkänd omstart. Webbkontroll bekräftade 0.26.1, anslutning, 1,5 s / −0,75 s på aktiva V1–V3 och inga konsolfel. Inga provvägar eller provtidtabeller tillfördes.

## Version 0.26.2 – långsammare blinkning

Syntaxkontroll godkänd. Isolerad webbläsarprovning på 9050: aktiv V1 visar 3 s ease-in-out och −1,5 s på höger lampa. Vilande V2/V3 saknar animation. Menyn innehåller exakt Lugn blinkning och Fast rött sken. Fast sken ger båda aktiva lamporna dämpat rött och behåller vilolamporna mörka. Inga konsolfel. Backend och aktiveringsvillkor oförändrade.

0.26.2 publicerad: serverns syntax, tre renderingsprov, omstartsprov, tjänst-/åtkomst-/låskontroller godkända. Sparat lugnt läge kvar efter omladdning lokalt. Produktionsfliken kräver ny inloggning efter utgången session; inget inloggat UI-efterprov påstås.

## Version 0.26.3 – start-/slutindikering

Syntaxkontroll och fyra renderingsprov godkända. Nytt prov täcker växling genom setting/establishing/clearing med stabila ändpunktsroller, samtliga avslutande driftfaser, kontaktbortfall, samtidiga vägar och delad knapp. Lokalt UI på 9050: första klick väljer Cu utan förberedelseblinkning; andra klick på Bu ger båda ändpunkterna aria-busy=true och 2,4 s / −1,2 s animation. Bekräftad klar väg har fast grönt i trafikskärmen, ingen animation och aria-busy=false. Samma två klick återtar vägen. Förloppet provat på Trafikskärm och Reläpanel; runda pluppar och fyrkanter stöds, ingen transform. Inga konsolfel.

0.26.3 publicerad: fyra renderingsprov, syntax, omstartsprov och backendjämförelse godkända på servern. Efterkontroll bekräftade tre oförändrade reservationer i held, anslutning och skyddade API:er. Inloggad driftflik visar 0.26.3 utan konsolfel; ingen blinkning/aria-busy på stoppade vägars ändpunkter.

## Version 0.27.0 – synligt TrainMeet-id

20 riktade TrainMeet-prov godkända, inklusive valt id/visningsnamn i faktisk parkopplingspayload, sparning/omstart/frånkoppling, bevarande av äldre identitet, spärr mot ändring när parad, formatkontroll, diskfel och fast serveradress. Isolerat processprov över HTTP med omstart verifierar cda-tkl-demo i både client_id/display_name och ingen ny parkoppling efter omstart. Gränssnittsprov: standard cda-tkl, eget id sparas och återläses efter omladdning, osparat id spärrar Parkoppla och mellanslag avvisas av formuläret. Inga konsolfel.

Hela enhetssviten passerade: 178/178. Syntax och diffkontroll godkända.

0.27.0 publicerad och efterkontrollerad: 20 TrainMeet-prov, HTTP-processprov, låsomstartsprov och syntax passerade på servern. Tre bevarade held-lås, anslutna tjänster, oförändrad inloggning och skyddade API:er. Livegränssnittet sparade cda-tkl och återläste det efter omladdning utan konsolfel. Serveradressen är https://server.trainmeet.app; verklig parkoppling återstår.

## Version 0.28.0 – administration och kalkylblad

183 enhetstester och sju processhelhetstester godkända. Utökat HTTP-processprov för kalkylblad, revision och omstart passerade också. Syntax och diffkontroll godkända. [UI-prov, inventering och kvarvarande avstämning](admin-forenkling.md).

0.28.0 publicerad kl. 20:53 som f1ce9d8. Serverns 37 riktade prov, sju processhelhetsprov, låsomstartsprov och syntaxkontroll passerade. Efterkontroll verifierar anslutna tjänster, skyddade API:er, oförändrade admin-/inloggningsfiler och tre bevarade held-lås. Livegränssnittet visar den nya översikten och befintligt enradigt utkast i kalkylbladet; anslutningsmodal öppnad/avbruten utan ändringar. Inga konsolfel observerades. Ingen liveprovdata skapades.


## 25 september 2026 kl. 21:14 · version 0.28.1

Release `ff62c71` ersätter `f1ce9d8` efter Caspers godkännande av de två menyförenklingarna. Profilinformationen finns i Anläggningsregistret; den dubblerande anslutningssidan är borttagen. XML-granskning, införandestatus och protokollinspelning nås under Avancerat. Äldre anslutningslänk leder till registret. Konto/lösenordsbyte, TrainMeet och driftjournalen finns kvar.

Lokalt UI-prov verifierade navigation, direktlänk/omladdning, källavsnitt till objektdetalj, helregistersökning, inspelningsdialog samt förenklad meny. Syntax/diffkontroll godkända. Serverns syntax och låsomstartsprov passerade; backend, profiler, källdata, simulatorfiler, nginx och beroenden jämfördes och är oförändrade. Ingen ny full testsvit kördes för denna rena navigationsändring; 0.28.0:s 183 enhetsprov och sju helhetsprov är föregående fulla resultat.

Backup: `/root/charlottendal-backups/network-ff62c71-20260925T191454Z`. Föregående kod: `/opt/charlottendal/releases/f1ce9d8`. Endast TKL omstartad, simulatorn fortsatte köra. Samma tre held-reservationer med alla resurser bevarade. Tidtabell, TrainMeet, konfiguration, bindningar, anteckningar, inspelningsarkiv, stoppläge och autentisering jämfördes med backup och var oförändrade. Inga liveprovdata eller manövrer.

Livewebbläsaren visar 0.28.1, LocoNet ansluten, tre ingångar under Avancerat och profilinformationen i registret. Den borttagna sidan saknas och XML-verktygen visas inte på registeröversikten. Inga konsolfel observerades.


## Version 0.28.2 – toastmeddelanden

Syntax- och diffkontroll samt fyra befintliga renderingsprov godkända. Isolerat UI-prov på 9050: AIS visas som toast, avvisad tågväg under AIS ger tillfällig toast, automatisk borttoning efter åtta sekunder, tangentbordsfokus pausar tiden och Tab ut återupptar den. Återställ stopp släcker AIS-beskedet och lämnar ingen tom meddelanderad. Inga konsolfel.

Vid 1280 × 720 låg spårplanen på x=0, y=40, bredd=1280, höjd=344 både före och under AIS/toast. Tidtabell och knappar hade också identiska mått. När den faktiska vyn ändrades till 319 × 880 verifierades separat oförändrad spårplan före/under AIS (1000 × 504, x=0, y=40) och toastbredd 291 vid x=14. Provets AIS återställdes, inga provvägar skapades. Backend och driftdataformat har inte ändrats.
