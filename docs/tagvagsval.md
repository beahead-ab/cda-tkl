# Tågvägsval som lämnar fler samtidiga rörelser möjliga

Från 0.34.0 jämför profilbyggaren alla sammanhängande alternativ för varje tillåtet källpar. Den prioriterar den väg som blockerar minst antal andra fysiska NX-rörelser. Därefter prioriteras färre avvikande växelpassager och kortare väg. Samma NX-rörelse räknas en gång även om både huvud- och växeltågväg har knappar för den.

Jämförelsen tar hänsyn till delade spårledningar, korsningar, hela kopplade växelgrupper, signaler och signaler som måste hållas i stopp. Endast alternativ med rätt start- och målsignal räknas; särskilt granskade katalogvägar behåller sina tillåtna signalgränser. Överskriden sökgräns avbryter bygget i stället för att tyst välja från en ofullständig lista.

I exemplet Cu → spår 2c ligger vägen kvar på övre spåret genom Vx100 och går över vid Vx110/Vx117. Vx102 reserveras inte. Cn → spår 11 kan därför läggas samtidigt. Båda beställningsordningarna provas med separata fältrapporter och fullständig passage.

Detta är ett förberäknat normalval för varje knappkombination, inte en automatisk omläggning av en redan lagd väg. Driftmotorn prövar fortfarande beläggning, aktuella lås, spärrar, återrapportering och skydd innan den manövrerar. Om normalvägen är upptagen nekas begäran; dynamiskt val av nästa alternativ ingår inte här.

Byte till den nya profilen kräver att gamla tågvägs- och programmeringslås är lösta. Profilens identitet ändras; gamla reservationer får inte raderas eller ges ett nytt fingeravtryck för att kringgå kontrollen. Simulatorns profil behöver bytas samtidigt, i ett avtalat driftuppehåll.

## Förlängning vid en gemensam signalgräns

Driftmotorn känner igen fortsättningar med samma tågvägstyp och samma källsignal som mål/start. När nästa del har reserverats och fått körmedgivande får den första delens målsignal visa kör utan att den första delen hålls. Övriga skyddssignaler kräver fortsatt stopp. Varje del behåller sina lås och löses ut först efter egen verifierad passage eller återtagning. Ett kort vänteläge för stoppåterrapport vid passage/normal återtagning hanteras utan att slå ut tidigare delar; utebliven rapport eller fel får inte kringgås.
