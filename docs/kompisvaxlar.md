# Kompisväxlar och skydd av det andra spåret

## Bekräftad koppling

Övergången på Lekbysidan består av Vx100 och Vx101. Originalets `Cda60.xml` anger `secondturnoutname="Vx101"` för Vx100 och `secondturnoutname="Vx100"` för Vx101. De ligger på S100 respektive S101 och binds av manöverregeln `IX:AUTO:0007C1`.

En manuell manöver av endera växeln beställer samma logiska läge för båda. Båda återrapporterna krävs för att visa båda växlarna i bekräftat läge. Tågvägens lås omfattar också kompisen på det andra spåret, även när tåget bara ska gå rakt förbi på ett av spåren.

## Rättningen i 0.16.1

Provningen hittade en lucka vid automatisk växelomläggning för en ny tågväg. Efter att paret lagts avvikande kunde `Cu → Spår 1c` beställa rakt läge för båda, trots beläggning på S101. S101 ingår inte i den tågvägens passage och kontrollerades därför inte före ordern. Ett nytt regressionstest reproducerade felet före rättningen.

Nu kontrolleras varje växel som behöver ändras mot sin egen spårledning, även utanför tågets färdväg. Belagt, okänt, administrativt spärrat eller reserverat spår stoppar hela begäran innan någon växel- eller signalorder skickas. Samma skydd kontrolleras medan växlarna läggs om. Om beläggning uppstår då hålls tågvägen i stopp med kvarvarande lås.

En kompis utanför färdvägen som redan har aktuellt, korrekt återrapporterat läge behöver ingen ny order. Därför går det fortfarande att lägga en oberoende tågväg längs det andra spåret. Två förenliga tågvägar kan också invänta samma redan beställda omläggning; den andra begäran startar inte om växeln.

Kompisens spårledning läggs inte till som ett fiktivt passageavsnitt. Tåget passerar inte där, och automatisk frigivning ska fortsatt följa den verkliga färdvägen.

## Verifiering

Tio riktade regressionstester kontrollerar:

- Manöver från Vx100 respektive Vx101, både rakt och avvikande, med verkliga order/rapporter mot den oberoende fältmodellen.
- Kompletta kompisväxellås i samtliga 340 körbara tågvägar.
- Att en tågväg på ena spåret låser kompisen på andra spåret och att avvisad manöver skickar noll order.
- Uteblivet kompisväxelsvar: inget körmedgivande och ingen automatisk fortsättning efter återkomst.
- Oväntad omläggning av kompisen under klar tågväg: stopp och lås kvar.
- Belagd kompis som behöver flyttas: hela begäran avvisas.
- Redan korrekt kompis på belagt sidospår: ingen omläggningsorder och oberoende väg kan bli klar.
- Beläggning under pågående kompisomläggning: vägen hålls i stopp.
- Okänd eller administrativt spärrad kompisdetektor: inga order.
- Två förenliga tågvägar under samma pågående omläggning: en order per växel, båda kan senare bli klara.

Lokalt och på publiceringsservern: 134 enhetstester och sex processhelhetstester godkända. Även den äldre, avgränsade provprofilen har fått explicita växeldetektorer så samma kontroll används där; den publicerade nätprofilens adresser är oförändrade.

I webbläsaren provades båda plupparna: båda växelbildernas aktiva ben följde med till avvikande och tillbaka till rakt. Med båda avvikande och S101 belagt i den separata simulatorn avvisades Cu → Spår 1c med ”Vx101 kan inte läggas om: S101 är belagt eller saknar aktuell återrapport.” Inga tågvägslås skapades och växlarna låg kvar avvikande. Provet avslutades med S101 fritt och båda växlarna rakt.

Detta verifierar manöverlogik, förregling och återrapport i simulatorn. Banans elektriska polarisering, växeldrivens fysiska funktion och faktiska kortslutningsskydd måste verifieras vid hårdvaruprovet.


## Publicering

Version 0.16.1 (`7dd7f71`) publicerad på [cda-tkl.trainmeet.app](https://cda-tkl.trainmeet.app) den 24 september 2026 kl. 03:27 svensk tid. Backup och tidigare release finns kvar enligt [driftuppgifterna](drift.md). Efterkontrollen visade anslutna tjänster, inga aktiva lås och fortsatt inloggningsskydd.

## Tydlig manuell återkoppling i version 0.16.2

När en växelplupp pekas ut med musen eller får tangentbordsfokus markeras den och samtliga kopplade växlar med tillfälliga blå ringar. En informationsruta visar vilka växlar som påverkas, deras faktiska återrapporterade lägen, berörda spårs beläggning och lås/spärrar. Den klickade pluppens närmaste växel namnges som vald; manövern går fortfarande till den verifierade gruppen i servern.

Efter en manöver ligger informationen kvar. Begärt läge skiljs från återrapporterat läge. Vid utebliven eller okänd spårrapport för kompisen visas att det inte går att bekräfta fritt spår. Rutan ändrar inte serverns villkor: belagda, okända, spärrade eller låsta berörda resurser tillåter ingen manuell omläggning. En misslyckad begäran visas också i rutan. Ingen extra bekräftelseruta eller påstådd elektrisk kortslutningsdetektering har införts.

Växlar utanför den aktuella vyn märks ”utanför vyn”; **Visa Vx…** rullar fram dem utan att skicka order. Informationen fungerar även i kompakt läge och med Original, Reläpanel och Trafikskärm. Stängknappen eller Escape tar bort markeringen; val av tågväg eller signalinformation avslutar också den manuella visningen. Den tillfälliga markeringen är inte den extra växellåsplupp som hålls vilande.

Webbläsarprov: fokus före manöver utan lägesändring, Vx100 till avvikande, Vx101 tillbaka till rakt genom detaljknappen, belagt respektive tyst S101, tågvägslås för Cu → Spår 1c och visning av Vx161 utanför en 390 pixlar bred vy. Markeringar och information kontrollerade i alla tre utseenden samt kompakt läge. Provets spår/frånfällda fel återställda och tågvägen återtagen normalt. 14 riktade befintliga växelprov och sex processhelhetstester godkända lokalt; syntaxkontroll passerar. Inga driftvillkor, adresser eller dataformat har ändrats.


Version 0.16.2 är publicerad som `c868a44` den 24 september kl. 06:14 svensk tid. Serverns samtliga 134 enhetstester och sex processhelhetstester passerade före byte. Backup och efterkontroller dokumenteras i [driftuppgifterna](drift.md).
