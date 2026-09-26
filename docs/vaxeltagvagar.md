# Utökade växeltågvägar · version 0.8

Från version 0.34.1 kan 71 befintliga växeltågvägar väljas genom att klicka på startsignalen och en markerad slutsignal. Det gäller dvärgar, huvuddvärgar och kombinerade huvud-/dvärgsignaler med entydigt kopplade källgränser. Virtuella JMRI-master ärver sin definierade signaltyp; frånvaro av individuella utgångar innebär inte att de saknar växlingsbild. Ingen ny tågväg eller signalriktning införs av gränssnittet.

Klick på samma start eller Escape avbryter valet. Högerklick/Skift+F10 visar information. Klick på en huvudtågvägsplupp ersätter ett pågående signalval och väljer huvudtågväg. Plupparna finns alltid kvar oavsett listverktygets läge. De tidigare separata växlingspilarna visas inte längre.

Vägen kan utökas från sin slutsignal. Ursprunglig start och kedjans senaste slut begär återtagning av hela kedjan; kärnans vanliga beläggnings- och stoppkontroller gäller fortfarande. Markerade mål visar godkända val i katalogen, inte ett löfte om att vägen kan läggas i det aktuella driftläget. Backend prövar samtliga lås och villkor när beställningen görs.

Markeringen runt signalen ändrar aldrig signalbeskedet. När kör är återrapporterat för en växeltågväg används den förladdade växlingsbilden (huvudsignal i stopp och dvärg i växling för kombinerade typer). Den fysiska MGP-mappningen är fortsatt preliminär enligt signalregistret.

Alla 130 växeltågvägar finns också under **Driftverktyg → Tågvägar → Växeltågväg**. Där finns de återstående vägarna med andra sorters slutpunkter. **Lägg / återta tågväg** används för båda åtgärderna, eller Återta på den aktiva vägen.

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


## Täckning av NX-definitioner

Från version 0.8.1 redovisas både hela källpar och eventuella delpar mellan signalerna. 133 av källans 153 NX-definitioner är kopplade till minst en av de 340 provade vägarna. 20 återstår utan körbar koppling. Detta antal ska hållas isär från de 15 undantagna knappkombinationerna: flera käll-NX kan sakna eget aktuellt knappval, och en sammansatt väg kan innehålla flera NX-referenser. Alla 153 rader finns i registret med sin täckning.
