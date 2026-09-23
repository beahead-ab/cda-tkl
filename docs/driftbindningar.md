# Driftbindningar och manöverregler

Under **Anläggningsregister → Driftbindningar och manöverregler** finns versionslagrade utkast för 637 objekt/grupper: växlar, detektorer, signaler, programmeringsspår, de 340 granskade tågvägarna och direktmanövrer. Ursprunglig XML och grundprofil bevaras. Utdata kan hämtas som en komplett driftprofil med versionshistorik och källkontrollsumma.

Växlar har adress och omvänd riktning. Detektorer har adress/polaritet; alla block som delar samma källsensor och ursprungliga adress ändras tillsammans. Signaler har orderadress, rapportadress samt uttryckliga listor över stopp-/körkoder. Koderna konfigurerar fortfarande det befintliga binära medgivandekontraktet; ett kodnummer innebär ingen verifierad full svensk signalbild. Programmeringsrelä och dess rapportadress kan granskas separat.

Granskade tågvägar och direktmanövrer kan stängas av administrativt. Återaktivering tar enbart bort den extra spärren: källans grundvillkor, oklara par, resurslås och saknade rangeruppgifter kan inte kringgås. Verktyget är inte en editor för godtyckliga nya förreglingsalgoritmer eller för saknade externa skript.

## Spara, granska och aktivera

1. Välj typ/objekt, ändra värden och spara till utkast.
2. Granska varje fälts före/efter-värde och alla valideringsfel. Adresskonflikter mellan växel-/signalorder/programmeringsrelä, mellan detektorer/programmeringsrapport och mellan signalrapporter avvisas. Samma signalbeskedskod får inte vara både stopp och kör.
3. Beskriv underlaget, begär AIS och återta alla tågvägs-/programmeringslås. Avsluta pågående telegraminspelning.
4. Aktivera. Servern kontrollerar både grundvillkoren och färska telegram enligt de **föreslagna bindningarna**: kända växellägen, fria spår, stopp i signaler och normaldrift på programmeringsspåret. En oanvänd adress utan återrapport kan inte aktiveras. Kontrollen bygger på mottagna telegram, aldrig simulatorns interna läge.
5. Driftversionen sparas innan byte. Transport och TKL-modell skapas om, rapporterna blir okända och panelerna läser om inställningarna. AIS bevaras. Operatören kan återställa AIS först efter nya stoppåterrapporter.

Simulatorns profil ändras inte automatiskt. Det hjälper till att upptäcka en felaktig bindning: samma felskrivna adress kopieras inte till båda sidor. Förbered eventuell ändrad fältkonfiguration separat och verifiera dess telegram. Ingen fysisk modul har omprogrammerats av denna funktion.

## Återgång och lagring

Hämta en tidigare version från historiken till utkast. Återgång är en ny version och kräver samma kontroll av den föreslagna profilens färska återrapporter. Vid kontrollen används även telegram som inte är bundna i den nuvarande profilen; en felaktig nuvarande bindning behöver därför inte fabriceras som känd för att återgå till en fungerande profil.

bindings.json ingår i katalogbackup. Samtidiga paneler använder session/version för att avvisa gamla ändringar. Misslyckad lagring byter inte driftmodell. Aktivt ändringslager låses till grundprofilens kontrollsumma; om grundprofilen ändras måste bindningarna granskas inför programuppdatering. Radera aldrig sparade lås eller ersätt dem med gammal tom state för att få igenom ett byte. Fysisk driftsättning markeras fortsatt false.

Sex riktade konfigurationstester och processprovet omfattar alias, konflikter, gamla paneler, lagringsfel, fel källprofil, administrativa begränsningar, AIS, belagt spår, adress utan rapport, aktivering, bevarad AIS och återgång. UI-provet skapade en adresskollision, stängde av Vx170:s direktmanöver i version 1 och återställde grundprofilen i version 2. Inga operatörsspärrar raderades för testet.

Äldre program än 0.14 läser inte bindings.json. Återgång till sådan kod får därför inte ske med ett aktivt ändringslager. Publiceringsskriptet stoppar en sådan automatisk återgång och bevarar alla inställningar. Återställ och kontrollera grundprofilen med kompatibel kod innan en äldre programversion övervägs.
