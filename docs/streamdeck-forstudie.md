# Stream Deck som manöverenhet – förstudie

1 oktober 2026. Resonemang inför bygge; ingenting är implementerat.

## Utgångsläge

Casper har en Elgato Stream Deck och vill manövrera stationen med dess knappar i två driftlägen:

- Hemma: Stream Deck i Macen, panelen i webbläsaren mot webbdriften cda-tkl.trainmeet.app eller mot den lokala installationen på Macen.
- På träff: Stream Deck i den Raspberry Pi som kör cda-tkl och driver stationens skärm, med träffens TrainMeet-server på det lokala nätet.

Knapparna ska kunna definieras både från Pi:n och från webben på Macen, och samma knappar ska betyda samma sak i båda lägena.

## Vägval

Tre sätt att få knapptrycken till stationen har vägts.

| Alternativ | Hur | Bedömning |
|---|---|---|
| Elgato-plugin i Elgatos program | Plugin i Stream Deck-appen på Mac/Windows pratar med TKL över HTTP | Finns inte på Raspberry Pi. Två kodvägar och två ställen att definiera knappar på. |
| Egen tjänst med USB-HID | Node-tjänst med `@elgato-stream-deck/node` på Mac och Pi, egen inloggning mot TKL, egen rendering av knappbilder | Fungerar överallt men blir en tredje klient med egen autentisering, egen tillståndsspegling och native-beroenden på Pi:n. |
| WebHID i själva panelsidan | Panelen i Chromium öppnar Stream Deck direkt via WebHID med `@elgato-stream-deck/webhid` | Ingen ny tjänst, ingen ny inloggning, samma tillstånd och samma spärrar som panelen redan har. Kräver Chromium-baserad webbläsare och säker origin. |

**Rekommendation: WebHID i panelsidan.** Stream Deck blir då ett tangentbord till panelen, inte en egen klient. Det ger fyra saker gratis:

1. **Samma manöverregler.** Ett knapptryck gör exakt vad ett klick på pluppen gör: samma startval, samma låskontroll, samma fjärrlägesspärr, samma toast vid avslag. Kärnan är fortsatt ensam auktoritet, och Stream Deck skickar aldrig fältorder själv.
2. **Samma inloggning.** Mot webbdriften är panelsidan redan inloggad med sessionskakan. Ingen enhetsnyckel behöver uppfinnas för en separat tjänst.
3. **Samma tillstånd.** Sidan har redan hela driftbilden från händelseströmmen och kan rita knappbilderna med samma symboler och färger som spårplanen: pluppens tågvägsfärg, röd vid AIS, blinkande sträcka vid klareringsförfrågan, dämpat vid kontaktbortfall, precis som TMBox visar INGEN KONTAKT.
4. **Samma kod på Mac och Pi.** Pi:ns skärm körs redan som webbläsare i helskärm mot den egna installationen. Macen hemma kör samma sida mot webbdriften eller mot den lokala installationen. Ingen skillnad i hur knapparna fungerar.

Begränsningarna är kända och hanterbara. WebHID finns i Chrome, Edge och Chromium, inte i Safari eller Firefox; på Macen används därför Chrome för panelen. WebHID kräver säker origin: HTTPS eller localhost. Webbdriften är HTTPS och Pi:n visar sin egen installation på localhost, så båda driftlägena uppfyller det. Däremot kan en Mac som visar Pi:ns installation över träffnätet på vanlig HTTP inte öppna Stream Deck; på träff sitter Stream Deck därför i Pi:n. Elgatos egen programvara ska inte köras samtidigt på Macen, eftersom två program då ritar på samma knappar. På Pi:n behövs en udev-regel som ger kioskanvändaren läs- och skrivrätt till enheten. Biblioteket läggs in under `public/vendor/` eftersom panelens innehållspolicy bara tillåter egna skript.

## Knapparnas definition

Knapplayouten tillhör anläggningen, inte datorn. Den sparas därför på TKL-servern som ett versionerat utkast med granskning och aktivering, på samma sätt som visningsinställningarna, under en ny adminsida Manöverenhet. Valet att använda Stream Deck på just den här datorn, och själva enhetsbehörigheten i webbläsaren, är per enhet, märkt Den här enheten som zoom och ljud.

Redigeringen görs i ett rutnät som följer vald modell: 15 knappar på MK.2, 32 på XL, 8 knappar och 4 vred på Stream Deck +, 8 på Neo. Varje knapp får en åtgärd ur en katalog som hämtas från installationens egna register, så inget kan skrivas in som inte finns:

- **Plupp.** Knappen är en start- eller slutplupp och följer panelens startval. Au följt av Spår 1b lägger samma tågväg som två klick på spårplanen; samma par igen återtar den. Knappen visar tågvägens färg.
- **Driftåtgärd.** Alla signaler i stopp, Återställ stopp, Återställ panel, Nödåterta alla, huvud- eller växeltågväg, spårspärr, linjespärr, programmeringsspår, lämna över rangerbangården.
- **Tågklarering.** En sträcka per knapp. Knappen visar sträckans läge och grannens kod, blinkar vid inkommande förfrågan och gör det som läget medger: godkänn, avgått, mottaget eller återta. Begär klarering använder det tågnummer som är registrerat på utfartsspåret eller nästa planerade avgång, med bekräftelse. På Stream Deck + kan ett vred bläddra tågnummer ur dagens tidtabell.
- **Sida.** Byter knappsida, till exempel Drift, Klarering, Tågvägar norr. Hemsidan nås alltid med ett tryck.

Åtgärder som är svåra att ångra, som Nödåterta alla och Återställ panel, kräver långtryck på en knapp som visar sitt armerade läge. Alla signaler i stopp går direkt, eftersom det är stoppåtgärden. I fjärrläge och vid kontaktbortfall blir knapparna dämpade och trycken avvisas med samma besked som i panelen.

Knappbilderna ritas i webbläsaren med canvas från panelens egna symboler och typsnitt, så ingen bildhantering behövs utanför sidan. Layouten kan exporteras och importeras som JSON mellan webbdriften, den lokala installationen på Macen och Pi:n, som har varsin driftdata. Redigering kan alltså göras från vilken inloggad webbläsare som helst mot respektive installation, även från Macen mot Pi:n över träffnätet, eftersom redigeringen inte kräver WebHID.

## Byggordning

1. Prov på Macen: öppna Stream Deck via WebHID från panelsidan, visa 15 pluppar med tågvägsfärg från händelseströmmen och lägg en tågväg med två knapptryck. Ger svar på knapptrycksfördröjning, bildkvalitet och samexistens med Elgatos program.
2. Layoutmodell och adminsidan Manöverenhet med utkast, aktivering, export och import. Katalogen av åtgärder byggs från befintliga register.
3. Tågklareringsknappar med blinkande förfrågan, långtryck för skyddade åtgärder, dämpning vid fjärrläge och kontaktbortfall.
4. Pi: udev-regel, helskärmsläge i Chromium, dokumenterad installation och prov med samma layout som på Macen.
5. Senare vid behov: ett Elgato-plugin för Macen som återanvänder samma layout och åtgärdskatalog, om Stream Deck också ska användas för annat än stationen.

Modellen avgör rutnätets form och om vred finns; den behöver fastställas före steg 2.

## Steg 1 byggt · 1 oktober 2026 (lokalt, ej publicerad)

Panelsidan kan nu öppna en Stream Deck via WebHID. Under Utseende och ljud finns kortet Stream Deck, märkt Den här enheten, med Anslut och Koppla bort. Webbläsaren visar sin egen enhetsväljare vid första anslutningen; därefter återupptas anslutningen automatiskt när sidan öppnas, utan ny fråga. Utan WebHID, i Safari eller Firefox, eller på en osäker adress visas en förklaring och knappen är spärrad.

Knapparna i steg 1 är fasta: sida 1 börjar med Sida, Alla signaler i stopp, Återställ stopp, Återställ panel med långtryck och Avbryt val, följt av plupparna i ordningen linjer före spår och huvudtågvägsknappar före växeltågvägsknappar. Följande sidor börjar med Sida och fortsätter med resten av plupparna, så alla pluppar nås oavsett modell. Ett tryck på en plupp gör exakt vad ett klick gör: samma startval, samma kontroll av möjliga slutpunkter, samma avslag i fjärrläge. Bilderna ritas från plupparnas egna klasser: ljus när fri, grön i tågväg, gul vid kvarhållet lås, röd vid beläggning, ring vid valt start eller möjlig slutpunkt, dämpad när valet inte tillåter knappen, blinkande under förberedelse och gul kant vid linjespärr. Alla knappar dämpas vid kontaktbortfall.

Biblioteket `@elgato-stream-deck/webhid` 7.7.1 (MIT) ligger paketerat utan ändringar under `public/vendor/`, eftersom panelens innehållspolicy bara tillåter egna skript. Modellen läses från enheten, så samma kod gäller 6, 8, 15 och 32 knappar; vred och beröringsremsa används inte än. Layoutredigeraren och tågklareringsknapparna är nästa steg.

Provat: tre tester för sidindelning, utseende och blinkfas; syntaxkontroll; modulen laddas i panelen utan fel. Ingen Stream Deck var ansluten till Macen vid bygget, så det första fysiska provet görs av Casper i Chrome mot den lokala installationen.
