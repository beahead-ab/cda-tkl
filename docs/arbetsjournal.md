# Arbetsjournal – godkänd helleverans

## Aktuellt 23 september 2026, natt

Casper: ”jag godkänner allt! Kör på inatt hela vägen.” Hela planen i `../../granskning-2026-09-23/plan.md` (relativt denna dokumentmapp) är godkänd. Arbeta självständigt genom implementation, tester och kontrollerad publicering inom befintlig kostnadsram. Verklig MGP/TrainMeet-verifiering får inte påstås utan underlag. Inga subagenter är beställda.

Utgångspunkt: main `7ca60ea`, arbetskopia ren före nattarbetet. Servern har äldre `31d2f8b`. Driftuppgifter finns i `drift.md`. Referens-XML och granskning är fullständiga; 12 externa Jython-skript saknas även efter sökning i Desktop/Documents och tillgängliga zip-arkiv.

Casper har därefter uttryckligen godkänt: ”Ja, nattarbete och kontrollerad publicering”. Automationen `charlottendal-tkl-nattarbete-till-08` är skapad, aktiv var 20:e minut fram till 08:00 den 23 september. Det tidigare avslaget är löst. Stoppa automationen när arbetet är klart eller tidsgränsen nåtts.

### Kontrollpunkt 00:50

192 huvudtågvägar genererade från 210 tillåtna knappkombinationer; 18 dolda knappfall undantagna. Alla 49 växlar och 66 signaler har provbindningar, samt 197 körbara layoutblock (dekorationsramen undantagen). Alla 192 vägar etableras i tester genom oberoende fältmodell och LocoNet-bytes. Parallella infarter, låst växel, återtagning, ordnad tågpassage och oväntad beläggning har provats. 6 nya nätverkstester och 17 befintliga kärn-/designtester godkända. Full testsvit/processprov och visuell kontroll återstår före första delpublicering.

Låsen frigörs nu efter fullständig ordnad passage och stoppåterrapport; delvis frigivning under pågående passage är ännu inte implementerad. Signalernas fysiska beskedskoder förblir preliminära. Nya nätverksprofilen är standard, den gamla fyrvägsprofilen finns kvar som `CHARLOTTENDAL_PROFILE=legacy` för regression och återgång. Ett profilbyte med kvarvarande lås stoppas av kärnan.

## Nästa steg

1. Gör XML-regelgruppernas migreringsstatus och tillåtna/nekade huvudtågvägspar till reproducerbara data. Konservativt blockera motsägande eller trasiga regler; dokumentera besluten.
2. Generera en utökad utvecklingsprofil från hela spårplanen, med separat fältmodell och uttryckliga provbindningar. Bevara gamla fyrvägsprofiler som regressionsunderlag.
3. Använd XML:s `eastboundsignalmast`/`westboundsignalmast` på ankare för signalordning. Nytt konkret fynd: Claude-provet visade U4 för Cu→SpIA, men XML knyter österut till 1/3 vid A96; U4 gäller västerut. Närmaste ikon är alltså olämplig som auktoritet.
4. Koppla normal tågvägsdrift genom hela modellen, därefter driftmanövrer, admin och integrationer enligt planen. Kontrollera stegvis med meningsfulla tester och UI-prov.

## Oförändrade gränser

- Friställa spår (0021) är avstängd i källan och förblir avstängd. Extra lås-/frilägesplupp är tidigare pausad.
- Inget fysiskt MGP-beteende får härledas enbart ur JMRI:s logiska turnout-objekt. Dekoderkonfiguration och trafikloggar saknas.
- Befintliga driftlås får inte raderas vid profilbyte. Ny release/profil kräver preflight, backup och hantering av kvarstående lås.
- TKL-kärnan får aldrig läsa simulatorns HTTP-status eller simulera sina egna återrapporter.

## Verifierat före nattarbetet

27 enhetstester och 3 integrationstester var godkända vid föregående implementation. XML-registret har fältvis verifierats mot originalet. Dessa är historiska resultat; nya ändringar måste verifieras på nytt.

### Kontrollpunkt 01:00 – nätverksprofil

Alla 192 huvudtågvägar har nu även genomgått full ordnad tågpassage och automatisk frigivning. Simulatorn kräver kör i alla signaler längs den valda färden och stannar vid nästa röda signal. TKL återtar passerade signaler i ordning, med bibehållna medgivanden framför tåget. Delad detektor innebär gemensam konfliktresurs. 34 enhetstester, varav 7 nya nätverkstester; 4 processbaserade helhetstester. XML-fältverifiering och syntaxkontroll godkända före senaste mindre ändring; slutkontroll pågår.

Visuellt provat lokalt på port 9030: Cu→Spår 1c, An→Spår 2c samtidigt, skifte mellan alla tre skins, samma knappar återtar och noll lås efteråt. Simulatorn på 9031 visar rätt felprov och filtrerade spårledningar. Hittade och rättade att längre färder förbi röd signal felaktigt erbjöds; enhetstest täcker det.

Serverpreflight: befintlig release 31d2f8b, båda tjänster aktiva, inga kvarvarande tågvägslås. Verifierad hostnyckelfil finns i arbetsytans `work/charlottendal-known-hosts`, inte i standardsökvägen. SSH kräver `-o UserKnownHostsFile=work/charlottendal-known-hosts`. Inga serverändringar gjorda ännu.

Återstår efter denna milstolpe: växeltågvägar/NX-täckning, lokala manövervillkor och knappgrupper (framför allt grupper utanför XML:s direkta name2-kopplingar), manöverfält, spärrar, AIS/nödåtertagning, övriga U01–U54, adminändringslager och integrationskontrakt. Fysiska MGP-mätningar och TrainMeet-anslutning har inte utförts.
