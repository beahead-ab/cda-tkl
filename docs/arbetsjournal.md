# Arbetsjournal – godkänd helleverans

## Aktuellt 23 september 2026, natt

**01:19: aktiv serverversion är `a88c3a8` (version 0.3), publicerad och efterkontrollerad. 192 huvudtågvägar  + 60 växeltågvägar, AIS, spårspärrar, adminstatus. 37 + 4 tester passerade på servern. Fortsätt nästa ofärdiga utvecklingsmoment; båda publiceringarna nedan är KLARA.**

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

### Kontrollpunkt 01:05 – första publiceringen klar

Commit `85fa2f3` finns på privat GitHub och är aktiv serverversion. 34 enhetstester + 4 helhetstester passerade på servern, XML-importen är fältvis verifierad. Backup `/root/charlottendal-backups/network-85fa2f3-20260922T230058Z`, föregående release 31d2f8b. HTTPS-login200 och båda API 401 utan session. Ingen ändring av lösenord eller Cloudflare. Första övergången rullade tillbaka på en för strikt login-statuskontroll; korrigerad kontroll accepterar simulatorns avsiktliga303 och publiceringen lyckades.

Pågående nästa ändring: import av 146 regler för växeltågväg (0019), en motsägande flervägsregel hålls spärrad. 60 par med synliga knappar kan anslutas; övriga dolda par står uttryckligt i avvikelselistan. Riktningen vid nollängdssegment mot växel härleds nu från växelns centrum, vilket reparerar källankare 2/4 och 3/2. Nya ändringar efter 85fa2f3 är ännu inte publicerade.

### Kontrollpunkt 01:15 – nästa milstolpe verifierad lokalt

192 huvudtågvägar + 60 synliga växeltågvägar genomgår etablering och full passage. Nollängdssegmentens riktning följer verklig anslutande växelgeometri. Alla 153 NX-par har täckningsrader i `route-coverage.json`; 103 tillåtna par (18 huvud  + 85 växel) står uttryckligt undantagna på grund av dolda/saknade panelknappar. Flervägsregeln0019C162 är motsägande och avvisas. Detta är inte full NX-drifttäckning.

Nya `controls.json` sparar AIS och administrativa spårspärrar, frikopplat från detektorer. AIS återkallar alla signalmedgivanden och håller lås; återställning kräver nya STOPP-rapporter. Spärr i aktiv väg håller vägen; borttagen spärr återupptar inte kör. Gränssnittet har huvud-/växeltågvägsläge, pilknappar, AIS och spårspärrar.

Alla 25 grupper/1 377 regler har nu maskinläsbar införandestatus i `public/data/migration.json`, tillgänglig i admin och i regeldetaljerna. Inga dolda luckor: återstående beteenden och externa beroenden är markerade. `npm run import:operations` / `verify:operations` hanterar alla genererade driftfiler.

37 enhetstester och 4 helhetstester godkända. Helhetstest omfattar även HTTP-manövrer för AIS, spärrar och växeltågväg. UI: 3/6→3/8 lagd, AIS höll låset, AIS återställd utan automatisk kör, vanlig återtagning gav 0 lås. Adminens statuslista med alla grupper visuellt kontrollerad. Lokal förhandsvisning kör på 9030/9031/9032 med temporärt tillstånd i `/private/tmp/charlottendal-network-preview` (inga kvarvarande lås efter UI-provet). Senaste ändringar ska versionsmärkas/publiceras med samma kontrollerade process innan nattarbetet går vidare.

## Konkreta nästa arbetspass

1. Slutför/efterkontrollera andra publiceringen (`a88c3a8`) och skriv aktiv release/backup här. Script finns i arbetsytans `work/deploy-network-a88c3a8.sh`; det testar, tar backup och vägrar profilbyte om lås återstår. Release85fa2f3 är första godkända delpubliceringen.
2. Läs `docs/trainmeet-forstudie.md` för funnet befintligt kontrakt; aktiv TrainMeet-version måste fortfarande verifieras. Ingen annan app har ändrats.
3. Förbered versionslagrat adminändringslager med validering/jämförelse/återställning; käll-XML ska vara oföränderlig. Första lämpliga ändringsbara fält är namn och verifierade bindningar, med tydlig skillnad mellan utkast/aktivt. Aktivering får inte ske med kvarvarande tågvägslås.
4. Komplettera manövrer enligt matriserna: lokala växelvillkor/knappgrupper, lokal/fjärr, rangeröverlämning, V1–V4, programmeringsspår/vändskiva. Behåll saknade skript/okända fysiska bindningar som uttryckliga beroenden. Använd inte hela godkännandet för att kalla otestad hårdvara verifierad.
5. Undersök dolda knappar mot panelmode-reglerna innan de 103 undantagna paren aktiveras. Många tvv-knappar döljs av källans panelscript; huvud-/växeltågvägsläget kan bli den tydliga ersättningen när signalgränser och villkor är prövade.
6. Fullständig svensk signalbildslogik, spårvis delutlösning, tågnummer/inkommande fält och övriga U-fall återstår. Alla luckor visas i adminens införandestatus.

Automationen ska fortsätta med meningsfull implementation/testning fram till 08:00Europe/Stockholm23september och sedan pausas. Endast meningsfull ändring, slutresultat, verkligt fel eller nödvändigt användarbeslut behöver avisering.

### Kontrollpunkt 01:19 – andra publiceringen klar

`a88c3a8` är aktiv på cda-tkl.trainmeet.app och finns på privat GitHub. Backup `/root/charlottendal-backups/network-a88c3a8-20260922T231757Z`, tidigare release 85fa2f3. Alla 37 enhetstester och 4 helhetstester godkända även på servern. Fältvis XML-verifiering, reproducerbar driftimport och extern inloggnings-/API-kontroll godkända. Inga kvarvarande lås före profilbyte; ingen autentisering har ändrats.

Nästa arbetspass ska börja med nästa ofärdiga funktion, exempelvis versionslagrat adminändringslager eller lokala växelvillkor. Publiceringssteg 1 ovan är klart. Nattens automation är kontrollerad och ACTIVE var 20:e minut fram till 08:00. Inga subagenter. Lokal förhandsvisning 9030/9031 fortsätter för kommande UI-prov. Båda lokala testvägar återtagna, AIS återställd och inga provspärrar kvar.

### Kontrollpunkt 01:55 – versionslagrad admin

Nytt visningslager för signaler, växlar, spåravsnitt, knappar och tågvägar. Namn/beskrivningar kan sparas i gemensamt serverutkast, jämföras och aktiveras som oföränderliga versioner. En äldre version hämtas till nytt granskningsutkast. Aktivering nekas när aktiva/återställda lås eller kärnans lagringsfel finns. Revisionskontroll skyddar samtidiga adminpaneler. Misslyckad lagring ändrar inte aktiv version eller utkast.

Visningslagret påverkar aldrig profilens identiteter, adresser, signalbesked, manöverregler eller låsfingeravtryck. Därmed är detta en första fungerande adminetapp, inte färdig fysisk konfigurationshantering. Original-XML är oförändrad. Kartans tryckta källtexter behålls; ändrade namn visas i detaljvy, register och relevanta listor. Läs `docs/admin.md`.

42 enhetstester och 4 processbaserade helhetstester passerar. Testerna provar även admin via HTTP under pågående tågväg. Full XML-verifiering och reproducerbar operationsimport passerar. UI på 9030: namnändring sparad, jämförd, aktiverad och sökbar; återställningsutkast spärrat medan Cu→SpIA låg, aktiverat efter återtagning. Provnamnet återställt till original som version 2 i lokal temporär state. Inga lokala provlås eller utkast kvar. Förhandsvisningens nya process: session 81448.

Serverpreflight: a88c3a8, båda tjänster aktiva, 0 lås. Version 0.3.1 förbereds för kontrollerad publicering. Nästa funktion efter admin: granska och införa XML:s lokala växelvillkor, samt nödåtertagning utan att skapa en genväg som raderar skyddande lås. Kontrollera även signalernas GO-kvittens mot rapportsekvens (STOP använder redan färsk sekvens). Övriga kvarvarande planpunkter gäller fortsatt.


### Kontrollpunkt 01:58 – admin publicerad

Release `eedf31a` / 0.3.1 är publicerad på befintlig cda-tkl-server och pushad till privat GitHub. 42 enhetstester, 4 helhetstester, syntax, full XML-kontroll och driftimport godkända på servern. Backup `/root/charlottendal-backups/network-eedf31a-20260922T235720Z`, tidigare release a88c3a8. Externt: /login200; /api/state, /api/configuration, /api/presentation och simulatorns /api/state alla401 utan session. Inga lås eller utkast ändrade i produktion.

Extra UI-prov med två öppna paneler bekräftade direkt uppdatering av ett namn i den andra panelens lista, och direkt återställning. Alla lokala ändringar återställda till original i visningsversion4; inga kvarvarande provlås eller utkast. Temporära andra panelen stängd, tab16/18 behållna för nästa pass. Session81448 kör förhandsvisningen på9030/9031. Automationen är fortsatt aktiv var20min fram till08.

Nästa pass: fortsätt på lokala växelvillkor eller signal-/återrapportsgranskning enligt föregående kontrollpunkt; adminetappen ovan är färdig. Vid granskning av GO-kvittens: engine.mjs clearing använder updatedAt >= signalSentAt men ännu inte reportSequence > commandSequence. Framkalla och prova gränsfallet med två telegram under samma millisekund innan ändring. Befintligt receive begär STOPP vid oväntat GO (med200ms respit), så dra ingen slutsats utan regressionstest. Inga kärnändringar gjorda i denna adminrelease.

### Kontrollpunkt 02:30 – signalordning och lokala växelvillkor

Ett nytt regressionstest bevisade fel i version0.3.1: GO mottaget före körorder kunde räknas som kvittens när tidstämpeln var samma millisekund, och vägen blev active. Rättat med rapportsekvens efter senaste order samt hållning av vägen vid oombett GO under setting/establishing/clearing. Reservationer ligger kvar. Test av omsänd GO-order samma millisekund kräver ny rapport. Detta fastställer mottagningsordning, inte fysisk korrelation i telegram utan order-ID.

`src/manual-policy.mjs` sammanställer35 knappregler i0007 till20 ready/15 unresolved. De20 gäller24 av49 växlar. Fem knappgrupper har inte fullständig layoutkoppling; tio kräver rsAckRangeFri. Samtliga enskilda växelvägar spärras också för dessa15 regler, så detaljvyn kan inte kringgå gruppvillkoret. Två automatiska Vx95/Vx96-regler återstår. ALL_AND-semantik verifierad i sparad officiell JMRI5.8 Conditional.java och DefaultConditional.java; inaktuella R-uttryck körs inte för logicType1.

Manuell omläggning för ready-regler kräver lokala fria spårledningar, inga administrativa spärrar, inga berörda resurs-/NX-lås, skyddande signaler i stopp och aktuella växellägen. Hela banan behöver inte vara fri. Egna växelblock är ett strängare tillägg för exempelvis171/172. Status och orsak visas i panelens detaljvy. Source-migration visar individuella regelstatusar. Läs docs/manuella-vaxlar.md.

48 enhetstester och4 processbaserade helhetstester passerar. Alla20 manuella regler har faktiskt bytes-/fältprov för rätt kopplad grupp. Prov omfattar oberoende tågväg, lokalt belagt/okänt/spärrat, skyddande signal, kvarstående lås och alla15 blockerade regler. UI: Vx170 lades om under Cu→SpIA, infarten blev klar, Vx100 kvar låst; Vx114 spärrad med orsak. Provvägen återtagen och Vx170 återlagd rakt. Lokal previewsession62756 på9030/9031. Visningsversion4 från förra passet bevarad. Full operationsverifiering och syntax godkända; XML-test ingår i sviten.

Serverpreflight: releaseeedf31a, tjänster aktiva,0 lås. Version0.4.0 förberedd; publicering och efterkontroll återstår. Nästa funktion efter denna etapp: spårvis delutlösning (med bevarade skyddsresurser) eller nödåtertagningens specificerade villkor; fler signalbilder och återstående integrationsberoenden kvarstår.


### Kontrollpunkt02:32 – version0.4 publicerad

Releasee0b10a5 är aktiv och finns på privat GitHub. Backup `/root/charlottendal-backups/network-e0b10a5-20260923T003132Z`, tidigare eedf31a.48 enhetstester och4 helhetstester godkända på servern. Full XML/operations/syntaxkontroll godkänd. Efterkontroll tjänster anslutna/noll lås, externa login200 och TKL-/admin-/simulatorAPI401. Inga driftlås eller administrativa visningsändringar raderade.

Läs nya `docs/manoverfalt-forstudie.md` före nästa funktion. Källfynd: rsAckRangeFri=LS931, rsAckRangeRet=LS933 (verkliga källadresser finns, fysisk användning fortfarande inte mätt).0006C3:s sanna/falska grenar beror på saknade HandlePanel/HandleFreeArea-skript.0016 pulserar nödindikering ochAIS;0018 har137 NX_ACTIVE-villkor och141 NX-växlingsåtgärder, fyra regler innehåller extrapar. En kontrollerad ersättning kan begära stopp och normal återtagning av samtliga befintliga reservationer utan att tvångsradera skyddande lås. Lokal/fjärrbytet ska kräva inga kvarvarande reservationer och hålla nödstopp tillgängligt. Inget av dessa nästa steg är aktiverat i0.4.

Nästa pass ska fortsätta ny funktion enligt förstudien, inte göra om redan godkända prov. Manuell växel-/signalordningsetapp är färdig. Lokal preview62756 på9030/9031, tab16/18 markerade för fortsatt arbete, inga provlås. Automationen fortsätter till08:00, inga subagenter.

### Kontrollpunkt 03:10 – nödåtertagning och manöverläge färdiga lokalt

Version 0.5 inför beständig nödåtertagning med individuella frigivningsvillkor och AIS kvar till manuell återställning. Samtidiga fria och belagda vägar provade: endast fri väg med nya stoppbesked frigavs. Omstart behåller lås och kräver ny återtagningsbegäran. Fjärrläge spärrar lokala manövrer på servern; lägesbyte kräver noll reservationer samt aktuella signal-/växelbesked. Inget fjärrsystem anslutet. Kontrollregistret har formatversion 2; nedgradering efter nya manövrer kräver kompatibel kod eller granskad migrering, aldrig borttagning av register. Läs docs/manoverlage-och-nodatertagning.md.

54 enhetstester och fyra processhelhetstester godkända. UI visar rätt manöverspärrar, nödåtertagning och separat AIS-återställning. Lokal preview session 65246 på 9030/9031, inga lås, lokal manövrering, AIS av; visningsversion 4 bevarad. Ett för tidigt AIS-återställningsförsök i helhetstest nekades korrekt; provet och UI inväntar nu alla signalers stoppkvittens. Händelseströmmen äger panelens tillstånd, sena HTTP-svar skriver inte över nyare information. Signalbilder byts fortsatt utan nyinläsning.

Kontrollerad publicering återstår. Nästa lämpliga funktion är tågnummer/inkommande fält med källspårning eller granskning av de oanslutna dolda tågvägarna. Rangerområdets exakta gränser och fysisk MGP-mätning återstår; inga gissade kopplingar ska aktiveras. Nattarbete fortsätter enligt godkänd automation till 08:00.

### Kontrollpunkt 03:12 – version 0.5 publicerad

`f1e7eb1` är aktiv serverrelease och pushad till privat GitHub. Backup `/root/charlottendal-backups/network-f1e7eb1-20260923T011118Z`, tidigare `e0b10a5`. Alla 54 enhetstester och fyra helhetstester godkända på servern; originalets 30 432 noder och 96 142 attribut fältvis verifierade. Syntax och deterministisk operationsimport godkända. Tjänsterna är anslutna; noll lås vid bytet. Externt /login200 och TKL-/admin-/simulatorAPI401 utan session, med normal TLS-verifiering. Auth, administrativa uppgifter och tillstånd bevarade.

Ny förstudie `docs/tagnummer-forstudie.md`: 44 blockinnehållsikoner för 43 unika blocknamn, 38 dolda/6 synliga. SN2A är dubblerad på (40,422)/(40,472), medan SU2A saknar ikon. Detta är en redovisad källavvikelse, inte tyst korrigerat. Sju inkommande minnen IM:AUTO:0166–0172 ligger utanför beskärningen och refereras inte av importerade Logix-regler. Nästa pass kan införa separat serverlagrad informationshantering med revision och tydlig källa, utan att koppla simulatorns P421 direkt till TKL eller påverka förregling. Automatisk tågidentifiering kräver entydig förflyttningsmodell och är inte bevisad av beläggningsbytesen ensam.

Nästa pass ska börja med förstudien och nästa ofärdiga del av godkända planen, inte göra om denna publicering. Lokal preview session 65246, TKL9030/simulator9031/wire9032, state `/private/tmp/charlottendal-network-preview`; AIS av, lokal manövrering, noll lås, visningsversion4. Tab16/18 markerade för fortsatt arbete. Automation `charlottendal-tkl-nattarbete-till-08` kontrollerad ACTIVE var20min; deadline23september08:00Europe/Stockholm. Inga subagenter och inga nya kostnader.
