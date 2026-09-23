# Utökade växeltågvägar · version 0.8

Välj **Växeltågväg** över spårplanen. Start- och mållistan är sorterad efter signalnummer. De 70 nya vägarna nås via listan; en hjälptext visas när ett val saknar synlig knapp i originalpanelen. **Lägg / återta tågväg** används för båda åtgärderna, eller Återta på den aktiva vägen.

Profilen omfattar nu 210 huvudtågvägar och 130 växeltågvägar. De 70 nya vägarna använder 30 källsensorer med dolda eller saknade originalikoner. Ingen gissad kartplacering, ändrad signalriktning eller omskrivning av XML har införts. [Den explicita granskningslistan](../profiles/shunt-catalog-review.json) innehåller regler, NX-par, signaler, målsignal och källsensorer. Importen vägrar fortsätta om källfilens kontrollsumma eller de granskade sambanden ändras.

Varje ny källregel har två tvv-knappvillkor och ett matchande NX-par. Källan anropar också det saknade HandleRangering.py. Ersättningen är den redan införda kärnans uttryckliga reservation och återtagning, med alla berörda spår fria och kända, bekräftade växellägen och skyddande signaler i stopp. Detta aktiverar inte rangeröverlämning eller körning mot belagt spår och påstår inte identiskt beteende med det saknade skriptet. Svenska växlingsbesked och fysisk MGP-mappning återstår att verifiera.

Alla 340 anslutna vägar har klarat etablering och full passage i anläggningsmodellen. De nya vägarna har också provats för beläggning, spärr, konflikt, avbrott, signalvägran och återtagning. Se [provresultat](provresultat.md).

## Kvarvarande undantag

Följande 15 tillåtna källpar förblir oanslutna eftersom deras skyddsgräns inte är tillräckligt tydlig. Avvisningen gäller även direkta API-anrop. Därutöver förblir den motsägande regeln 0019C162 spärrad.

| Start | Mål | Orsak |
|---|---|---|
| kolgardut | LastSp3in | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| kolgardut | 6/6 | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| LastSp1ut | 9/5 | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| 9/10 | LastSp1in | Målet saknar identifierad signalgräns; särskilda växlingsvillkor krävs. |
| 9/10 | LastSp2in | Målet saknar identifierad signalgräns; särskilda växlingsvillkor krävs. |
| LastSp2ut | 9/5 | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| 6/7 | kolgardin | Målet saknar identifierad signalgräns; särskilda växlingsvillkor krävs. |
| 6/7 | lokstallin | Målet saknar identifierad signalgräns; särskilda växlingsvillkor krävs. |
| lokstallut | LastSp3in | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| lokstallut | 6/6 | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| 3/2 | LastSp3in | Målet saknar identifierad signalgräns; särskilda växlingsvillkor krävs. |
| LastSp3ut | kolgardin | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| LastSp3ut | lokstallin | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| LastSp3ut | 6/11 | Signalriktning/start stämmer inte entydigt med XML-regelns NX-start. |
| 2/2 | 2/4 | Målets signalgräns kan inte bekräftas från vald grafväg. |

Lastspår, kolgård och lokstall behöver uttryckliga växlingsgränser och villkor före införande. 2/2 → 2/4 har en geometrisk väg men målsignalens skydd kan inte bekräftas längs den valda vägen. Ingen genväg runt dessa kontroller har lagts in.
