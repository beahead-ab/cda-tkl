# Manöverläge och nödåtertagning · version 0.5

## Nödåterta alla

Knappen begär AIS och återtagning av samtliga befintliga reservationer. Varje väg frigivs individuellt först när dess spår är fria, växellägena kända, skyddande signaler i stopp och berörda signaler har lämnat nya stoppbesked efter återtagningsbegäran. Belagt eller okänt område behåller låsen. Knappen raderar aldrig lås genom tvång.

Panelen visar hur många lås som återstår. AIS kvarstår även när sista vägen frigivits. Återställning blir tillgänglig först efter att alla 66 signaler har lämnat aktuella stoppbesked efter sina senaste order. Återställningen återupptar inga gamla tågvägar.

En vanlig AIS-manöver håller vägarna och deras lås; den begär inte återtagning. Nödåtertagning begär dessutom frigivning när villkoren är uppfyllda. AIS och nödåtertagning är tillgängliga även i fjärrläge och medan panelen väntar på en annan manöver. Gränssnittet använder den ordnade händelseströmmen för tillståndet så att ett sent HTTP-svar inte kan återställa en äldre visning.

Efter omstart återställs reservationerna som hållna. Ingen kör eller automatisk frigivning återupptas. En pågående nödåtertagning och AIS finns kvar i registret, men operatören måste kontrollera återrapporterna och begära återtagning på nytt. Vid lagringsfel försöker kärnan fortfarande skicka stopp; frigivning och nya medgivanden spärras.

## Lokal- och fjärrläge

Lokal manövrering är startvärdet för äldre installationer. Fjärrläge spärrar nya lokala tågvägar, manuella växelomläggningar och borttagning av administrativa spårspärrar. Stopp, återtagning och tillägg av spårspärr förblir tillgängliga. Läget gäller på servern, även för direkta API-anrop och andra paneler.

Byte i båda riktningar kräver fungerande anslutning och lagring, inga kvarvarande reservationer, aktuella stoppbesked i alla signaler och aktuella växellägen utan pågående omläggning. Hållna lås räknas också. Läget sparas över omstart.

**Fjärrsystem är ännu inte anslutet.** Läget överlämnar ingen manöver till TrainMeet och skickar inga rangerkvittensmeddelanden. Källans särskilda panelindikeringar och saknade Jython-skript redovisas fortsatt som beroenden.

## Källspårning

- 0006C15/C16: serverlagrad manöverspärr ersätter panelens lokal-/fjärrväxling med striktare villkor.
- 0016C1: beständig begäran och räknare ersätter den korta indikeringspulsen.
- 0016C2: AIS ansluten; minnet Tågmöte saknar ännu driftfunktion.
- 0018: explicit återtagning av anslutna reservationer ersätter blind NX-växling. Oanslutna NX-fall är markerade i registret.

Originalregler och XML-fält är oförändrade. Detta är en dokumenterad ersättning för källbeteendet, inte ett påstående om att de saknade skripten har återskapats.

## Lagring och återgång till äldre version

`controls.json` använder formatversion 2 med AIS, spårspärrar, manöverläge och senaste nödåtertagning. Formatversion 1 läses med AIS och spärrar bevarade, lokal manövrering och tom nödåtertagning. Uppstart skriver inte om filen; första manöver som sparar kontroller skriver version 2. Ogiltigt format eller okänt manöverläge stoppar uppstart.

Version 0.4 och äldre avvisar formatversion 2. Det förhindrar att ett sparat fjärrläge eller en nödåtertagning tyst ignoreras vid nedgradering. Automatisk återgång före nya manövrer kan använda föregående release med oförändrad version 1. Efter att version 2 har sparats krävs kompatibel kod eller en separat granskad migrering av aktuellt tillstånd. Skriv aldrig över nya lås, spärrar eller manöverlägen med en äldre backup för att få tjänsten att starta. Backup är återställningsunderlag, inte en genväg runt manövervillkoren.

## Prov

54 enhetstester och fyra helhetstester med separata TKL-/simulatorprocesser passerar. Nya fall provar samtidiga fria/belagda vägar, stoppkvittens, omstart, avbrott, lagringsfel, beständigt fjärrläge och migrering av äldre manöverspärrar. HTTP-provet omfattar både lägesbyte och nödåtertagning under beläggning. UI-provet bekräftar spärrade lokala manövrer i fjärrläge, nekat lägesbyte med tågväg, nödåtertagning och kvarstående AIS. Fysiska MGP-telegram och extern fjärrstyrning ingick inte.
