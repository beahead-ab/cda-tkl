# Arbetsjournal – godkänd helleverans

## Aktuellt 23 september 2026, natt

**04:10: aktiv serverrelease är 470ff88, version 0.8.1. Publicerad och efterkontrollerad: 340 tågvägar, 65 + 4 godkända serverprov, 133/153 NX-definitioner med körbar koppling. Fortsätt nästa ofärdiga steg; publiceringen är KLAR.**

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

### Kontrollpunkt 03:31 – manuell tåginformation klar lokalt

Version0.6 tillför serverlagrad manuell tåginformation: alla197 block kan väljas, sju inkommande fält visas kompakt och44 källankare visar nummer i alla tre skins. Dubbleringen SN2A bevaras och markeras, SU2A kan redigeras via lista. Informationen är strikt skild från förreglingen; inga påhittade MGP-nummer och ingen läsning av simulatorns interna tåg.

Ny TrainInformation-modul sparar revision, session, observationsepok, manuellt ursprung, tid och200 händelser i train-information.json. Flytt skriver båda fälten i samma filoperation och vägrar skriva över mål. Samtidighetskontroll omfattar revision, uppstart och beläggningsändringar. Uppgiften markeras för kontroll efter omstart, ändrad/okänd beläggning eller avbrott. Dubbletter tillåts men redovisas; automatisk förflyttning kvarstår. Registret är information, inte driftkvittens. Läs docs/taginformation.md.

61 enhetstester och fyra processhelhetstester passerar; sista ändringen för okänd beläggning har även riktat omprov. Syntax, reproducerbar import och källankare godkända. UI: registrera/flytta, två samtidiga paneler med osparad text, beläggning, omstart, manuell kontroll, skydd vid fältbyte och alla skins/kompaktläge provade. Selektortestet vid nekat fältbyte fick verktygstimeout eftersom valet avsiktligt återställdes; nativeUI-kontroll bekräftade rätt valt fält och osparad text. Inget applikationsfel. Provnumret tömt efteråt, SIA fri, noll lås och lokal manövrering. Ny previewsession46199 på9030/9031/wire9032, tab16/18 behålls. Visningsversion4 kvar.

Publicering med backup och efterkontroll återstår. Nästa etapp: fortsatt prövning av kvarvarande driftfall, särskilt signalbilder/beroenden eller de103 dolda källparen. Automatisk tågnummerförflyttning kräver en tydlig entydig modell; inför inte direkt koppling till simulatorns train-ID. Alla tidigare dokumenterade externa beroenden kvarstår. Nattarbetet fortsätter till08:00.

### Kontrollpunkt 03:36 – version 0.6 publicerad

Release `d2f8fb6` är aktiv på cda-tkl-servern och sparad på privat GitHub. Backup `/root/charlottendal-backups/network-d2f8fb6-20260923T013515Z`, tidigare `f1e7eb1`.61 enhetstester och fyra helhetstester godkända även på servern. XML, reproducerbar import och alla44 källankare kontrollerade. Tjänster anslutna/noll lås vid bytet; externa login200 och skyddade API401, inklusive train-information. Inga befintliga driftdata eller lösenord ändrade.

Ny statisk förstudie docs/dolda-tagvagar-forstudie.md:18 huvudtågvägar saknar en representation för htvSpVI/IS266 men har känt NX-val och start-/målgräns.70 av85 undantagna växelvägar har också identifierad start-/målgräns; resterande15 kräver vidare utredning. Dessa är kandidater, inga nytillkomna driftprov eller aktiverade vägar. Lokal detaljrapport work/usecase-review/excluded-path-audit.json i arbetsytan. Nästa genomförande kan börja med de18 Spår6-vägarna och en källanknuten katalogknapp, utan gissad panelplacering eller sammanblandning med tvv6/8–6/9.


### Kontrollpunkt 03:47 – Spår 6 färdig lokalt

Version 0.7 tillför de 18 källtillåtna huvudtågvägarna via htvSpVI/IS266. Representation i listan, inga gissade koordinater eller ändrade originaldata. Varje väg använder uttryckligt käll-NX-val och rätt riktade gränser 6/8–6/9. Nu 270 vägar: 210 huvud och 60 växel. 85 växelpar återstår undantagna.

62 enhetstester och fyra processhelhetstester godkända, inklusive passage för alla 270 vägar. Nytt Spår 6-prov kontrollerar beläggning för alla 18, konflikt utan nya order, SVI-beläggning och återtagning med lås kvar. Ett första test förväntade fel med låsord men fick korrekt tidigare avvisning på motriktat körbesked; förväntningen rättades, förreglingen ändrades inte. UI: Spår 6 → Spår 11 KLAR och återtagen med samma listval; noll provlås. Reproducerbar import och syntax godkända. README uppdaterad från den äldre fyrvägsprofilen till aktuell funktion.

Nästa steg är kontrollerad publicering med test på server, backup och efterkontroll. Läs docs/spar6.md och docs/dolda-tagvagar-forstudie.md. Fysisk MGP, svenska signalbesked och TrainMeet återstår. Ingen rangeröverlämning eller gissad växlingsgräns aktiverad.


### Kontrollpunkt 03:51 – version 0.7 publicerad

Release `cbf1327`, backup `/root/charlottendal-backups/network-cbf1327-20260923T014936Z`, tidigare `d2f8fb6`. Alla 62 + 4 tester passerade på servern; fullständigt källunderlag verifierat. Tjänsterna anslutna, noll lås vid bytet; externa HTTPS-kontroller godkända. Ingen ändring av autentisering eller förlust av sparade uppgifter.

Nästa steg: 70 undantagna växeltågvägar med entydiga riktade start-/målgränser har granskats statiskt. Samtliga har två tvv-knappvillkor och exakt ett matchande NX-par. De kräver 30 ytterligare listkontroller (källsensorer IS finns), utan nya kartkoordinater. Explicit lista i work/usecase-review/shunt-catalog-review.json i arbetsytan. Återstående 15 växelpar har saknad start-/målgräns eller skyddsfel och ska förbli undantagna; motsägande regeln 0019C162 förblir spärrad. Ny funktion ska provas innan publicering och inte påstå identiskt beteende från saknade HandleRangering.py eller aktivera rangeröverlämning.


### Kontrollpunkt 03:57 – ytterligare 70 växeltågvägar klara lokalt

Version 0.8: 210 huvud + 130 växeltågvägar. Explicit sourceHash-bunden granskningslista i profiles/shunt-catalog-review.json; 30 källsensorer får en listrepresentation. Importen kontrollerar varje nytt pars regler, NX-gränser, signalordning och skyddande mål. Ingen ändring av källikoner eller gissad koordinat. De 15 kvarvarande paren avvisas med specifik gränsorsak, den motsägande 0019C162 förblir avvisad. Läs docs/vaxeltagvagar.md.

64 enhetstester och fyra processhelhetstester passerar. Alla 340 vägar har full passage; samtliga 70 nya avvisas med beläggning och spärr. Extra felprov och UI 7/10 → IIIev KLAR/återtagen, listval i naturlig nummerordning. Ett första nytt avbrottsprov förväntade held trots redan begärd återtagning; den korrekta cancelling-statusen och fortsatt återtagning efter nya rapporter verifierades. Ingen förreglingsändring gjordes för att möta felaktig testförväntning. Ursprunglig XML och övriga driftvillkor bevarade.

Ny previewsession 74078 på 9030/9031/9032, noll lås efter UI-prov; lokal manövrering, AIS av. Visningsversion 4 och tomt aktuellt tågnummerregister bevarade. Nästa steg kontrollerad publicering; nattarbete enligt befintlig automation till 08:00. Nästa sakliga utredning kan gälla signalernas särskilda villkor och aspekter, återstående manöverfall eller TrainMeet-kontraktet. Aktivera inte fysisk mappning eller saknade skript genom antaganden.


### Kontrollpunkt 04:04 – version 0.8 publicerad

Aktiv release b3f6a78, backup `/root/charlottendal-backups/network-b3f6a78-20260923T020134Z`, tidigare cbf1327. Alla 64 + 4 tester, XML/operations/syntax och efterkontroller godkända. 340 anslutna vägar; oförändrad autentisering och bevarade driftdata.

Ny spårbarhetskontroll: 25 körbara vägar (3 huvud, 22 växel) saknar sin fullständiga käll-NX-referens i route.nxIds när vägen har en mellanliggande signal. Registreringen innehåller endast intilliggande signalpar. Nuvarande rapport räknar därför 111/153 anslutna NX; unionen av explicit begärt par och ingående delpar är 133/153. Även manuell NX-spärr använder nxIds, så originalets fulla referens ska finnas kvar tillsammans med delparen. Åtgärda med regressionsprov och kompatibelt profilbyte utan lås. Ändra inte väggeometri, signalordning eller källregler för detta.

Signalutredning: 66 master, 55 turnoutsignalmast + 11 virtualsignalmast. De 55 har 329 aspektrader: 310 hänvisar till befintliga utgångsobjekt (121 unika LT), 19 saknar utgång i källan. Alla angivna namn/systemnamn går att lösa när båda uppslagen används. 1/5 skickar samtliga körvarianter genom samma LT210/closed; det räcker inte för att särskilja fysiskt besked. Detaljer i work/usecase-review/signal-aspect-bindings.json i arbetsytan. Fortsatt signalarbete får inte härleda svenska MGP-koder från CZ-profilen.


### Kontrollpunkt 04:05 – fullständiga NX-referenser rättade

Version 0.8.1 behåller begärt helt NX-par i source.requestedNxIds och unionen med intilliggande signalpar i nxIds. 25 vägar berörs; geometrin, ordningsföljden och de fysiska låsresurserna är oförändrade. 133/153 NX-definitioner har nu körbar koppling, 20 saknar sådan. NX-spärrreferensen som tillkommer i en ansluten manuell regel var redan skyddad genom överlappande fysiska resurser.

65 enhetstester och fyra helhetstester godkända. Det nya provet följer 3/5 → 6/9 för både huvud-/växeltågväg genom aktiv och hållen reservation och kontrollerar hela referensen samt kvarvarande delpar. Alla 130 växelvägar behåller originalregelns NX-id. Alla 340 vägar har full passage även efter rättningen; operations-/syntaxkontroll godkänd. Nya docs/signalbesked-forstudie.md för nästa etapp. Kontrollerad publicering med backup återstår.


### Kontrollpunkt 04:10 – version 0.8.1 publicerad

Release 470ff88 är aktiv på cda-tkl.trainmeet.app och sparad på privat GitHub. Backup `/root/charlottendal-backups/network-470ff88-20260923T021002Z`, tidigare b3f6a78. Alla 65 + 4 tester passerade på servern; full XML-, operations- och syntaxkontroll godkänd. Externt login 200 och skyddade API 401 med normal TLS-verifiering. Tjänsterna anslutna, noll lås vid bytet. Inga användaruppgifter eller drifttillstånd borttagna.

Samlad leverans under detta fortsättningspass: 0.6 manuell tåginformation/inkommande fält, 0.7 samtliga 18 Spår 6-vägar, 0.8 ytterligare 70 granskade växeltågvägar, 0.8.1 fullständiga NX-referenser. Nu 210 huvud + 130 växel. De 15 oklara växelparen och den motsägande 0019C162 är avvisade. Tre huvudtågvägsregler förblir motsägande/spärrade. Alla 153 NX-rader finns i register; 20 saknar ännu körbar koppling. Detta är fortsatt utvecklingsprofil, ingen fysisk MGP-driftsättning.

Nästa ofärdiga arbetsmoment: läs docs/signalbesked-forstudie.md och förbättra den källanknutna signalinspektionen/aspektregistret före nya fysiska besked. Källans 329 aspektrader, tomma utgångar och virtuella master är kartlagda. Arbetsytans work/claude-export/uploads/Charlottendal-TKL-underlag/Charlottendal-signalikoner.json och jmri-mod59/definitions innehåller användbart originalunderlag; exakta definitionsfiler för hsi_4, hdvsi_8 och sly_2 saknas i just den katalogen. Visa verifieringsstatus och skilj källbild/kommando från rapporterat besked. Läs även docs/trainmeet-forstudie.md vid adapterarbete. Aktivera inte okända MGP-koder, rangeröverlämning eller saknade Jython-beteenden genom gissning. Vändskiva, V1–V4, programmeringsläge, svenska signalberoenden och andra återstående användningsfall finns i ursprungsplanen.

Lokal preview är session 78992, TKL 9030, simulator 9031, LocoNet 9032, state /private/tmp/charlottendal-network-preview. Aktuell profil 0.8.1, ansluten, noll lås, AIS av/lokal manövrering. Visningsversion 4 och tomma aktuella tåguppgifter bevarade. CUA tab16/18 markerade för fortsatt arbete. Automationen charlottendal-tkl-nattarbete-till-08 kontrollerad ACTIVE, var 20:e minut till 23 september 08:00 Europe/Stockholm; pausa vid tidsgränsen. Inga subagenter och inga nya kostnader. Gör inte om dessa färdiga publiceringar eller fulla prov utan ny ändring som motiverar det.


### Kontrollpunkt 04:48 – signalregister färdigt lokalt

Version 0.9 ger en läsbar signalöversikt med samtliga 329 källbindningar, 117 relationer, relaterade regler och originalbilder där exakt matchning är verifierad. 310 utgångsreferenser lösta över alla turnouts-register, 19 tomma tydligt redovisade. Virtuella signaler och saknade bilddefinitioner får uttrycklig status. Aktuell rapport/begärt läge/råkod visas separat; ingen ny MGP-kod, logisk signalregel eller fysisk adress aktiverad. Bildreferenser byggs en gång och förladdas; serverströmmen uppdaterar endast aktuell text.

Fyra riktade prov samt syntax och reproducerbar operationsimport godkända. UI-prov på 1/5, 6/8, 6/7 och 3/5, native bildmått/smal skärm och tvåpanelstest med Cu → Spår 1a kör → stopp genomfört. Noll provlås. Inloggningsprovet utökat för signal-catalog.json. Full testkörning och kontrollerad publicering återstår. Läs docs/signalregister.md. Original-GIF från Desktop-underlaget matchar den befintliga proveniensens kontrollsummor; Claude-exportens GIF är omkodade och har inte använts som verifierade original i katalogen.


### Kontrollpunkt 04:54 – version 0.9 publicerad

Release ba25be2 är aktiv på cda-tkl.trainmeet.app och sparad på privat GitHub. Backup `/root/charlottendal-backups/network-ba25be2-20260923T025338Z`, tidigare 470ff88. Alla 69 enhetstester och fyra processhelhetstester godkända på servern, inklusive passage för alla 340 vägar. Full XML-, operations-, signal- och syntaxkontroll godkänd. Tjänster anslutna och noll lås efter bytet. Externa HTTPS-prov med normal certifikatkontroll: login200, skyddade API401 och ny signal-catalog.json303 till inloggning. Autentisering och driftdata bevarade. Ingen fysisk MGP- eller TrainMeet-anslutning har påståtts.

Nästa ofärdiga steg: V1–V4:s källbundna panelindikeringar eller andra kvarstående manöverfall. Förstudien docs/manoverfalt-forstudie.md har kompletterats med granskade fakta: logicType2=ALL_OR trots äldre AND-sträng, 30/30 +30/30 +16/16 täckta NX för V1–V3 men 0/4 för V4, alla13 sensorvillkor har källanknutna provdetektorer. V4 får inte göras komplett genom att anta de fyra ej anslutna NX inaktiva. IS251–IS258 är interna lampor, ingen belagd fysisk bomstyrning. Eventuell läsande indikering måste skilja härlett från fysiskt rapporterat och redovisa okända villkor. Inga V-funktioner aktiverade i0.9. Det äldre designgranskningsdokumentet är nu tydligt markerat som historiskt.

Lokal preview fortsatt session78992,9030/9031/wire9032, state/private/tmp/charlottendal-network-preview. Statisk UI0.9, oförändrad driftprofil, noll lås efter tvåpanelstest, AIS av/lokal manövrering. Tågnummer och visningsversion4 bevarade. CUA16/18 markerade för nästa pass, extratab21 stängd. Ingen konsolrapport av applikationsfel. Automationen charlottendal-tkl-nattarbete-till-08 kontrollerad ACTIVE och oförändrad: var20min till23september08:00Europe/Stockholm. Pausa vid tidsgränsen. Inga subagenter eller nya kostnader. Gör inte om färdiga publiceringar/testsviter utan ny anledning.


### Kontrollpunkt 05:26 – V1–V4 färdiga lokalt

Version0.10 tillför en läsande PanelIndications-modell samt källkatalog för grupp0012. Fyra regler,80NX+13sensorer,ALL_OR verifierad trots gamla antecedent-strängar. V1–V3 alla anslutna; V4s fyra oanslutna NX förblir okända. NX är sant vid active/traversing, falskt när anslutet utan reservation, annars okänt. Trevärd OR: sant om minst ett sant, falskt endast alla falska, annars okänt. Bruten kontakt eller lagringsfel ger okänt. Sensorer kräver färska samstämmiga alias och följer aktiv polaritet. Ingen orderfunktion, inga låsändringar, ingen läsning av simulatorintern data. Driftprofil/fingerprint oförändrad. Lamporna har originalplaceringar och samma tillstånd i tre skins; detaljer och källregel nås även från kompaktläge.

Sex nya riktade tester och alla fyra processhelhetstester passerar. UI-provat V1 etablering→aktiv→återtagning, omladdning/skins, V4 okänt→SLIbelagt→aktivt med2/6kända→avbrottokänt→återansluten/frittokänt. Efteråt0lås,fria provblock,lokal/AISav. Källregel och kompaktöppning godkända. Migrationstatus uppdaterad till ersättning/partial med begränsningar. Läs docs/vagindikeringar.md. Publicering med fulla serverprov och backup återstår.

Ny lokal preview session90879,9030/9031/9032, oförändrad state/private/tmp/charlottendal-network-preview. Tab16/18 behålls. Nattfönster till08Europe/Stockholm. Inga subagenter eller nya kostnader.


### Kontrollpunkt 05:31 – version 0.10 publicerad

Release `5104907` är aktiv på cda-tkl.trainmeet.app och sparad på privat GitHub. Backup `/root/charlottendal-backups/network-5104907-20260923T033106Z`, tidigare ba25be2. Alla 75 enhetstester och fyra processhelhetstester passerar på servern. Alla 340 vägar har passageprov; XML, operationsimport, signalregister och nya V-indikeringarnas källkatalog är verifierade. Tjänster anslutna, noll lås vid bytet. Externa HTTPS-kontroller godkända med normal TLS-verifiering: login200, API401, indications.json303 till inloggning. Inga driftdata eller autentiseringsinställningar ändrade. README och provresultat uppdaterade.

Nattarbetets nästa ofärdiga etapp kan förbereda verklig MGP-verifiering genom tydligare telegraminsamling och export, eftersom nuvarande trafikvy bara behåller de senaste100 ramarna. En eventuell inspelare ska vara läsande, begränsad i tid/storlek, skilja råtelegram från tolkning samt transporteko från återrapport, vara skyddad av samma inloggning och inte ändra förregling eller simulatorseparation. Proveniens ska ange aktuell profil och att fysisk utrustning ännu inte är verifierad. Aktivera inte påhittade svenska E4-besked eller fysisk USB-port utan underlag. Alternativt fortsätt andra verifierbara delar av ursprungsplanen.

En ny källkontroll av Vx95/Vx96 i docs/manuella-vaxlar.md visar att C33 och C34 har olika triggersCalc (no/yes) trots likartade åtgärder. Variabeltyp4 betyder CLOSED, inte THROWN. En ständig koppling eller omläggning på varje rapport är därför inte en säker översättning. Den automatiken förblir oaktiverad. Rangeröverlämning, vändskiva, programmeringsspår, fulla svenska signalbesked, TrainMeet och fysisk MGP återstår.

Preview session90879,9030/9031/wire9032, bevarad state i /private/tmp/charlottendal-network-preview. Noll provlås, SLI fri, anslutning på, lokal manövrering och AIS av. Tab16/18 markerade för fortsatt arbete, inga browserfel. Automationen fortsätter var20min till08:00Europe/Stockholm; pausa då och sammanfatta ärligt. Gör inte om detta färdiga versionsbyte utan ny ändring.


### Kontrollpunkt 06:17 – telegraminspelning klar lokalt

Version 0.11 tillför läsande telegraminspelning i båda riktningarna, rå protokollrad och separat tolkning. B0-eko/SENT behandlas inte som fältkvittens. Felaktiga ramar bevaras utan att accepteras av kärnan. Profiler och adressbindningar följer exporten med uttrycklig status att fysisk svensk MGP inte verifierats. Inga extra order eller läsning av simulatorns interna tillstånd. Max två minuter/10 000 händelser/fyra MB händelser; 100 filer utan automatisk radering. Pågående data i RAM, avslutade filer beständiga, normal avstängning sparar, oväntat haveri kan förlora pågående data. Lagringsfel behåller loggen för export/återförsök. Samma autentisering och ursprungskontroll som övriga appen.

Sju riktade enhetstester, fyra processhelhetstester och UI-prov godkända; syntaxkontroll görs före commit. UI-provat etablering/återtagning Cu→Spår1a, 4 762 inspelade rader, omladdning och automatisk sparning vid avbrott. Noll provlås, alla block fria och anslutning återställd. Ny preview session26631 på9030/9031/wire9032 med bevarat state. CUA nya tab3/4 (tidigare16/18 borttagna av användaren) markerade för fortsatt arbete. Full serverprovning och kontrollerad publicering återstår.

Användaren frågade ”vad är kvar?” under arbetet. Har fått kort status i commentary; slutrapporten ska besvara frågan självständigt med verklig MGP/LocoBuffer, svenska signalbesked, TrainMeet, återstående manöverfall/oklara tågvägar, Jython-ersättningar och fortsatt visuell avstämning. Hela XML finns bevarad men alla beteenden körs inte. Automationen är ACTIVE till08Europe/Stockholm; pausa vid tidsgränsen.


### Kontrollpunkt 06:22 – version 0.11 publicerad

Release540f2e3 aktiv på cda-tkl.trainmeet.app och sparad på privat GitHub. Backup `/root/charlottendal-backups/network-540f2e3-20260923T042118Z`, tidigare5104907. Alla82 enhetstester/fyra processhelhetstester godkända på servern, inklusive alla340 passager. XML och operations-/signal-/indikeringsimport reproducerade utan skillnader. Noll lås vid versionsbyte. Tjänster anslutna och inget startupfel. Externa HTTPS-prov via systemets curl godkända utan att stänga av certifikatkontroll: login200, vanliga API och nya inspelningsendpoints401. Python lokalt saknade certifikatkedja, därför användes systemverktygets normala förtroendearkiv.

Samlad lägesbild i docs/status.md besvarar användarens ”vad är kvar?”. README, provresultat och driftens huvudtabell uppdaterade. Alla XML-data bevarade betyder fortfarande inte alla beteenden körbara. Fysisk MGP/USB, fulla svenska signalbesked, TrainMeet, ranger/godsöverlämning, vändskiva, programmeringsspår, övriga oklara regler och full driftkonfiguration i admin återstår. UI ska fortfarande stämmas av mot Claude och accepteras av Casper.

Nästa nattpass kan välja en verifierbar del av manöverfallen/admin/visuell avstämning eller förbättra underlaget för fysisk anslutning. Hitta inte på saknade skriptbeteenden eller MGP-bindningar. Läs docs/status.md, ursprungsplanen och respektive förstudie först; upprepa inte den färdiga inspelningsleveransen eller fulla prov utan ny ändring. Friställa spår och extra växellåsplupp fortsatt vilande. TKL och simulator fortsatt åtskilda.

Preview session26631,9030/9031/wire9032, bevarad state/private/tmp/charlottendal-network-preview. Ingen pågående inspelning; två sparade UI-prov finns, noll lås, anslutning på, fria block, AIS av/lokalt. Tab3/4 markerade för fortsatt arbete. Inga browserfel. Automationen är ACTIVE var20min till08Europe/Stockholm; pausa vid tidsgränsen och lämna samlad rapport. Inga subagenter eller nya kostnader.


### Kontrollpunkt 06:54 – fortsatt direktarbete, version0.12 lokalt

Casper har uttryckligen bett att alla steg som går att kontrollera här ska byggas klart. Version0.12 inför sju beständiga linjespärrar, programmeringsspår med separat fältåterrapport och återstartslås, gemensam monoton modellklocka samt valbar felsignal. Handhavande och källgränser finns i docs/linjer-programmering-klocka.md. 95 enhetstester och fyra processhelhetstester passerade före två efterföljande gränsfallsrättelser: för gammal normalprogrammeringsrapport stoppar berörd aktiv väg; normalåterställning i fjärrläge undviker behörighetslåsning. Två ytterligare riktade tester införda; fulla serverprov görs före byte.

UI-prov visar blockerad linje avvisar väg utan nya lås, programmeringsspärr överlever avbrott/återanslutning och släpps först efter uttrycklig normalbegäran, växel133 visar låsorsak. Modellklockan provad med4× och paus, återställd1×/paus. Inga provlås/belagda provblock kvar. Preview45722 på9030/9031/wire9032 med bevarad state. Publicering återstår.

Nästa kontrollerbara arbete: seriell gateway och virtuellt portprov, källbundna signalberoenden utan påhittade svenska fältkoder, driftprofiladministration och TrainMeet-kontraktsadapter. Fysiska fakta och ofullständiga skript ska fortfarande särskiljas från färdig/provad mjukvara. Automationen pausas senast08:00; det nya direkta arbetsuppdraget får fortsätta.


### Kontrollpunkt 07:00 – version0.12 publicerad

Release0cfc8d0 finns på privat GitHub och är aktiv på servern. 97 enhetstester+4processhelhetstester godkända även på servern. Backup network-0cfc8d0-20260923T045842Z, tidigare540f2e3. Full import/XML/syntax och externa skyddskontroller passerar. Ny seriell gateway ligger ännu separat som lokalt arbete: fyra riktade tester samt riktigt POSIX-portprov genom PTY passerar. Den har inte öppnat någon fysisk serieport. Nästaarbete fortsätter enligt direktinstruktionen.


### Kontrollpunkt 07:15 – version0.13 lokalt

Seriell gateway implementerad med explicit enhet/hastighet/flöde, loopback och en klient, verkligt eko före SENT OK, begränsade köer och ingen omsändning efter osäkert utfall. Fyra riktade tester och POSIX-PTY-processprov passerar. TKL:s motor har ingen simulatorgren. Ingen fysisk serieport öppnad.

Läsande TrainMeet HTTPv1-adapter implementerad mot lokalt granskat kontrakt63f3fd1: ordinarie tkl_terminal-parkoppling, privat0600nyckel, stationskontext och display/klocka, validerade snapshots och stale-markering, inga driftmanövrer. Sju riktade tester+processprov över omstart passerar. Aktuell riktig origin/station/kod saknas fortfarande; ingen TrainMeet-installation har ändrats. UI-prov mot enbart påhittade tåg visade korrekt station/klocka/två rader, utan ändrade fälttillstånd. Läs docs/locobuffer-gateway.md och trainmeet-adapter.md. Full lokal svit och publicering följer.


### Kontrollpunkt 07:27 – version0.14 lokalt

Version0.13 är publicerad:108enhetstester och6processprov passerade även på servern, backup network-2798f31-20260923T051427Z. Privat GitHub uppdaterat, externa login200/TrainMeet401 kontrollerade.

0.14 bygger versionerade driftbindningar för637objekt/grupper, granskade tågvägar/direktmanövrer kan avaktiveras utan att grundvillkor förbigås. Alias ändras tillsammans; signal-/sensor-/orderkonflikter och kodöverlapp avvisas. Aktivering kräver AIS, inga lås, fungerande anslutning/lagring, ingen inspelning samt färska faktiska telegram för fria/kända/stopp/normal enligt föreslagen profil. Bunden modell och transport byggs om; AIS och all övrig state bevaras. Simulatorns profil ändras inte. Sex riktade tester och utökat4processhelhetsprov passerar. UI-provat adresskollision,Vx170 avstängd, profilversion1→återgång tillgrund i version2. Full lokal svit pågår före publicering.

Preview66183 på9030/9031/9032, samma statekatalog. TrainMeet-provkopplingen borttagen och provservern avslutad. Ursprunglig driftprofil återställd; AIS ska återställas efter färska rapporter vid avslut av UI-provet. Ingen fysisk utrustning eller riktig TrainMeet-installation har kontaktats.

### 23 september 07:38 – färdig lokal kontroll av driftadministration

114 enhetstester och fyra utökade kärn-/inloggningsprocessprov passerar. Växelns överlappande osynliga informationsyta borttagen; väljaren Visa växel läser enbart detaljer, den ursprungliga pluppen är uttryckligen märkt Manövrera växel. Vx170 provad i UI och återställd rakt. Konfigurationsformuläret använder befintlig responsiv layout. Publicering förbereds med skydd mot återgång till äldre kod som inte läser aktiva driftbindningar.

### 23 september 07:40 – version 0.14 publicerad

Release 3b3b90e: 114 enhetstester och sex processhelhetstester passerade på befintlig server. Oförändrad full XML-/regelkontroll. Backup /root/charlottendal-backups/network-3b3b90e-20260923T054032Z. Efterkontroll visar båda tjänster anslutna, inga lås eller uppstartsproblem, HTTPS-inloggning 200 och driftbindningarnas API 401 utan inloggning. Privat GitHub uppdaterat.

### 23 september 07:51 – nummerföljning färdig lokalt

Version 0.15 tillför uttryckligen tilldelad nummerföljning längs kärnans accepterade passage. Tio nya riktade prov, befintliga informationsprov och utökat helhetstest med två samtidiga tåg passerar. UI-prov visar full passage och säkert pausläge efter avbrott; återanslutning återupptar inte följningen. Inga provnummer/lås kvar. Format 2 sparar nummer och följningssteg atomiskt och läser äldre format 1; återgång måste använda kompatibel kod. Ingen automatisk lokidentifiering eller TrainMeet-skrivning införs.

### 23 september 07:56 – slutpublicering och återläsningsprov

Version 0.15.0, release e7542c7, publicerad 07:54. Samtliga 124 enhetstester och sex processhelhetstester passerade på servern före byte. Backup /root/charlottendal-backups/network-e7542c7-20260923T055457Z. Efterkontroll: anslutna tjänster, noll lås, HTTPS-login 200, följnings-API 401 utan session. GitHub uppdaterat.

Backupens verkliga driftkatalog återläst i isolerad serverkopia. Profil, spärrar, visning, tåginformation och modellklocka läsbara; noll fältorder, klocka pausad. Aktuella backupen hade noll lås/nummer; omstart med aktiva sådana prövas separat i testsystemet. Originalbackup och live-data orörda.

Samtliga U01–U54 och N01–N10 är avstämda i docs/acceptans-2026-09-23.md. Full fysisk ersättning återstår: råsensorernas sammansatta kedja/filtrering, full svenska signalbesked, ranger-/godsöverlämning, vändskivans L2-anslutning, källoklara tågvägar och riktig TrainMeet-parning/skrivning behöver verifierat underlag. Ingen sådan funktion har smugit in via gissade adresser eller gamla skriptanrop. Friställa spår och extra växelplupp förblir vilande. Lokala provnummer är tömda, anslutning återställd och noll provlås kvar.

## 24 september 2026 · 03:01–03:03 · Godkänt steg 1 genomfört

- Jämfört panelen med det befintliga Claude-projektet och sparat designunderlag. Reproducerat och rättat dolda signaluppgifter och dold anslutningsstatus i kompakt läge. Aktiva vägar/återtagning har en separat lista, ofullständigt knappval rensas vid avbrott och detaljer kan stängas med Escape.
- Två samtidiga UI-styrda tågfärder med P921/G922 genom separata anläggningsprocessen; låst växel vägrade omläggning. Samma pluppar återtog vägen. P923 pausades vid förbindelseavbrott och återupptogs inte vid återanslutning. Alla egna provnummer tömdes genom editorn och provvägar frigavs normalt.
- Reläpanelens passagevisning och fönsterbredder 390/1280/1440 kontrollerade. 198 signalbildlager behålls. Lokala länkar följer inställda portar. Webbklienten avslutade utan konsolfel/varningar.
- Publicerat kodrelease `bf2a372` / version 0.16.0 till privat GitHub och befintlig server efter 124 enhetstester, sex helhetstester, XML/operations/syntax lokalt och på servern. Backup `/root/charlottendal-backups/network-bf2a372-20260924T010118Z`. Efterkontroll: anslutna tjänster, noll lås, HTTPS-login 200 och oskyddad API-begäran 401.
- Nattautomationen är fortsatt pausad. Fysiska MGP/TrainMeet-beroenden och avsiktligt vilande funktioner är oförändrade. Caspers egen provkörning återstår som subjektiv acceptans av handhavande och utseende.

Full provrapport: [Steg 1, 24 september](provkorning-2026-09-24.md).


## 24 september 2026 · 03:27 · Kompisväxlar kontrollerade och rättade

- Caspers markerade övergång identifierad som Vx100/Vx101. Ömsesidig koppling, S100/S101 och manöverregel IX:AUTO:0007C1 verifierade i originalets Cda60.xml. Båda plupparna provade i webbläsaren; båda växelbilderna följer fältets individuella återrapporter.
- Reproducerat ett verkligt fel: Cu → Spår 1c kunde flytta den avvikande kompisen Vx101 trots beläggning på S101 utanför tågets färdväg. Nytt regressionstest misslyckades före rättningen. Nu kontrolleras varje växels eget spår före första order och under etablering. En redan rätt bekräftad kompis utanför färdvägen beställs inte om. Förenliga vägar delar en pågående beställning utan dubbla order.
- Tio nya riktade prov för manöver från båda sidor, fullständiga par i alla 340 vägar, lås, uteblivna/oväntade rapporter, beläggning/okänt/spärrat sidospår och samtidiga förenliga vägar. Samtliga 134 enhetstester och sex helhetstester passerade lokalt och på servern. Full XML/operations/syntax oförändrat godkända.
- UI-provet med S101 belagt avvisade Cu → Spår 1c före order och utan nya lås. Avslutat med S101 fritt, båda växlar rakt och inga provvägar. Ingen fysisk utrustning manövrerad.
- Kodrelease `7dd7f71` / version 0.16.1 pushad till privat GitHub och publicerad med backup `/root/charlottendal-backups/network-7dd7f71-20260924T012756Z`. Föregående release `bf2a372`. Efterkontroll: anslutna tjänster, noll lås, HTTPS-login 200 och skyddat API 401 utan inloggning. Driftformat, nätprofil och autentisering bevarade.
- Nattautomationen är fortsatt pausad. Elektrisk polarisering och fysiskt kortslutningsskydd återstår till hårdvaruprovet. Den extra låspluppen och Friställa spår är fortsatt vilande.

Detaljer: [Kompisväxlar](kompisvaxlar.md).


## 24 september 2026 · 06:14 · Tydlig manuell kompisinformation publicerad

- Efter Caspers godkännande tillagd tillfällig markering av vald växel och dess verifierat kopplade kompisar vid muspekning/tangentbordsfokus. Informationsrutan ligger kvar efter manöver, visar återrapporterat läge och spårstatus samt serverns spärrorsak. Begärt läge visas separat. Läget för en kompis utanför vyn är tillgängligt genom Visa Vx… utan order.
- Båda manuella vägarna (plupp/detaljknapp) använder samma återkoppling. Ingen extra bekräftelseruta, elektrisk kortslutningsdetektering eller ändring av kärnans manövervillkor infördes. Befintliga kopplingsdata avgör vilka kompisar som visas; oklara specialregler aktiveras inte.
- UI-prov av belagt/okänt S101, Cu → Spår 1c med låst växelpar, återtagning och återställning. Alla tre utseenden och 390/1280 pixlars vyer kontrollerade. Inga konsolfel. Provområdet återställt, noll lås, viewport återställd. Lokalt 14 riktade enhetstester och sex helhetstester godkända; initial EPERM för testportar löstes med normal behörig omkörning.
- Release `c868a44` / 0.16.2 pushad till privat GitHub och publicerad efter serverns 134 enhetstester, sex helhetstester och full XML/operations/syntax. Backup `/root/charlottendal-backups/network-c868a44-20260924T041452Z`; föregående `7dd7f71`. Efterkontroll: anslutna tjänster, noll lås, HTTPS-login 200 och API 401 utan inloggning.
- Nattautomationen förblir pausad. Extra växellåsplupp och Friställa spår är fortsatt vilande; tillfällig blå markering av manövergruppen är en separat visningsfunktion.


## 24 september 2026 · 07:14 · Ren panel och separat Verktyg-sida

- På Caspers begäran flyttat stödfunktionerna runt spårplanen till `#tools`, med trafik, manövrer/spärrar, utseende, anslutningar och händelser. Ren panel är standard på `#panel`; bara grundläggande panelmanövrer och anslutning syns permanent. Anläggningsregistret behålls på `#register`.
- Visa/Dölj verktyg ersatt av sidnavigation, direktlänkar och fungerande bakåtknapp. Spårplanens DOM och förladdade signalbilder byggs inte om. Tågnummerklick öppnar rätt verktygsfält; Visa kompisväxel återgår till panelen utan manöver. Signaluppgifter öppnas i tillfällig ruta. Aktiva stopp/fel/fjärrmeddelanden är gemensamma för sidorna.
- UI-prov i 390/1280 pixlar: draft över sidbyte, sparat P1700 på SIA och återöppning från spårplan, aktiv Cu → Spår 1c över sidbyte/register, normal återtagning, signalruta, kompisvisning, AIS och tågvägstyp. Provnumret tömt, AIS återställd, inga lås, fönsterstorlek återställd. Inga konsolfel. Ingen ny funktion för egen panelredigering byggd; framtida tillägg kan väljas separat.
- Sex processhelhetstester och syntax passerade lokalt. Release `bea8a85` / 0.17.0 pushad till privat GitHub och publicerad efter 134 enhetstester, sex helhetstester samt full XML/operations/syntax på servern. Backup `/root/charlottendal-backups/network-bea8a85-20260924T051423Z`, föregående `c868a44`. Efterkontroll: tjänster anslutna, noll lås, extern login 200 och skyddat API 401 utan inloggning.
- Inga driftregler, adresser, dataformat eller konton ändrade. Nattautomationen fortsatt pausad; tidigare vilande funktioner och fysiska verifieringsbehov oförändrade.


## 24 september 2026 · 07:27 · Fullskärmsknapp publicerad

- På Caspers begäran tillagd Fullskärm bredvid Verktyg. Text och ikon följer verkligt fullskärmsläge, även vid Escape. Hela dokumentet omfattas så att statusmeddelanden, signaluppgifter och stödsidor är kvar. Växling bygger inte om panelen och skickar inga fältorder.
- Knapp, tangentbord, Escape, signalruta, Verktyg och återgång samt bevarat Cu-startval provade i webbläsaren. Knappraden granskad vid 390 pixlar. Provval och fönsterstorlek återställda; inga konsolfel. Safari-reservanrop finns, men äldre Safari har inte körts.
- Lokal syntaxkontroll godkänd. Release `97c6546` / 0.17.1 pushad till privat GitHub och publicerad efter serverns 134 enhetstester, sex helhetstester samt XML/operations/syntax. Backup `/root/charlottendal-backups/network-97c6546-20260924T052720Z`, föregående `bea8a85`. Efterkontroll: anslutna tjänster, noll lås, extern login 200 och skyddat API 401 utan session.


## 24 september 2026 · 07:47 · V1–V3 färdigprovade, publicering inväntar provväg

- Byggt Caspers önskade viloläge och två växelvis blinkande röda lampor för V1–V3. 80 blink/minut per lampa, 40/60 ljus/mörker och 375 ms fasförskjutning. Blinkning gäller verklig tid i alla tre skins och fullskärm.
- Ny läsande varningsprojektion följer de faktiska strecken T152/T166/T172, korsande block och tågvägarnas geometri. Reservation håller varningen aktiv även under etablering/återtagning/kvarvarande lås. Originalets 93 XML-villkor och råa värde bevarade; V4 oförändrad.
- 13 riktade prov och sex helhetstester passerade lokalt. UI-prov med S100, S121, S165a, Cu → Bu, återtagning, avbrott/återanslutning, detaljer, skins och fullskärm. Provblock fria, inga lokala provvägar kvar, Original och normalt fönsterläge återställda; inga konsolfel.
- Kod `92bc576` / 0.18.0 pushad. Serverkontroller godkända: 141 enhetstester, sex helhetstester, XML/operations/syntax. Därefter avbröt publiceringsskyddet på kvarvarande Au → Spår 1a. Tidigare release `97c6546` återställd utan att radera lås. Tjänster aktiva och anslutna utan startfel, HTTPS-login 200.
- Tillfrågat Casper om normal återtagning av provvägen före publicering. Inget besked ännu; inga servervägar eller beläggningar har manuellt raderats. Nattautomationen oförändrat pausad.

## 24 september 2026 · Gemensam meny och lokal TrainMeet-förberedelse, version 0.19.0

- Samlat alla stödsidor och val för utseende, loggar, simulator, lösenord och fullskärm i en hamburger-meny. Panelen behåller tågvägstyp, stopp, anslutningsstatus och själva spårplanen. TrainMeet får en egen sida med serveradress, parkoppling och tåginformation.
- Tillagd beständig adressinställning med HTTPS/loopback-validering, revisionskontroll, valbar installationslåsning och krav på frånkoppling före serverbyte. Koder rensas vid adressbyte; sparade nycklar flyttas aldrig till en annan server. Adressinställningen i sig gör inget nätverksanrop.
- Alla 146 enhetstester, sex processhelhetstester och syntaxkontroll godkända lokalt. Webbläsarprov av meny, tangentbord, klick utanför, mobilvy, fullskärm och bibehållet Cu-startval samt adressvalidering, formulärutkast och omladdning. Inga konsolfel; provval och fönsterstorlek återställda. Befintlig lokal provadress återställd och ingen riktig TrainMeet-server parkopplad.
- Ingen TrainMeet-server upptäckt bland lyssnande tjänster på Macen. Casper tillfrågad om adress/port och vilken dator som kör servern; svar inväntas. Den läsande adaptern är förberedd, men en lokal nätserver behöver en nåbar förbindelse från TKL-servern.
- Läsande serverkontroll bekräftade fortsatt release `97c6546` och Au → Spår 1a i `held` utan begärd återtagning. Inget nytt publiceringsförsök, tjänstestopp eller ändring av serverns driftdata gjort. Den tidigare frågan om återtagning är fortsatt obesvarad. Nattautomationen förblir pausad.

## 24 september 2026 · Högerklick och modal nära objektet, version 0.19.1

- På Caspers begäran borttagen automatisk växelinformation vid muspekning, fokus och vänstermanöver. Högerklick på växel, signal eller vägövergång öppnar en gemensam modal vid klickpunkten. Skift+F10 finns som tangentbordsalternativ. Växel- och kompisuppgifter ligger i samma ruta och följer levande återrapporter.
- Rutan vänder inåt vid skärmkant och anpassas till liten skärm. Native modal låser bakgrundsinteraktion; utanförklick stänger utan att manövrera objektet bakom. Escape stänger detaljer före fullskärm och bevarar startval. Vänsterklicksmanöver och serverns samtliga skyddsvillkor oförändrade.
- Webbläsarprov av högerklick, verklig hover/fokus utan ruta, vänstermanöver, växelparets levande återrapport, återställning till rakt, utanförklick utan genomsläpp, Skift+F10, signal/V1, högerkant, 390 pixlar och fullskärm. Syntax godkänd. Upptäckt titeluppdateringsfel rättat och inga nya konsolfel efter omladdning. Provval och viewport återställda.
- Ingen webbpublicering utförd eftersom tidigare återtagningsfråga för Au → Spår 1a är obesvarad. TrainMeet-adressfrågan kvarstår. Ingen driftdata eller natt-automation ändrad.

## 24 september 2026 · Manöverknappar under panelen, version 0.20.0

- På Caspers begäran flyttat samtliga tillgängliga panelmanövrer till en rad under spårplanen, med grupperna Signaler, Tågvägar och Drift. Runda knappar inspirerade av JMRI-referensens nedre manöverfält; Trafikskärm har kantiga knappar. Stopp och återställning, tågvägstyp, återtagning och driftläge nås där. Detaljval för tågvägar, spärrar, programmeringsspår, nummer och klocka öppnas direkt under raden. Menyn behåller inställningar, anslutningar, register och journal.
- Spårtexter ändrade från importerad fetstil till normalvikt 400; destinationer 500. JMRI-originalet är fetare, men de fysiska referensernas smalare text motiverar valet. Samma familjer, koordinater, storlekar och orörda XML/JSON-källor. Inga nya nätladdade typsnitt.
- Befintliga kontroller flyttas med sina tillstånd och anropsvägar; inga nya frigivnings- eller nollställningsregler. Återställ stopp är bara aktiv när AIS är aktiv och servern tillåter återställningen. Normal återtagning, AIS/återställning, lokal/fjärr, nödåtertagning, paneltyp och utkast provade lokalt. Tre skins och 390 pixlar granskade. Original, lokalt läge, huvudtågväg, AIS av, noll provvägar och normal viewport vid avslut. Inga konsolfel.
- Syntax och sex helhetstester godkända; första portblockerade teststarten omkörd med behörig teståtkomst. Webbdrift oförändrad eftersom Au → Spår 1a fortfarande inväntar tidigare besked om återtagning. Ingen fysisk utrustning manövrerad och natt-automationen förblir pausad.


## 24 september 2026 · Stationstidtabell från TrainMeet, version 0.21.0

- Följt Caspers riktning att TKL blir en stationsklient likt TMBox. Kontrollerat serverns HTTP- och TMBox v2-kontrakt i 63f3fd1. Behållit ordinarie tkl_terminal-behörighet; ingen adminutökning eller påstådd v2/MQTT-implementation.
- Lagt till /v1/timetable för schema 3 efter verifierad stationskontext. Cache per publikation/dag/station i minnet, atomärt byte tillsammans med driftdata och uttrycklig omläsning. Verifierad spårkatalog/driftplatskoppling; tidssträngar och serverns ordning bevaras. Endast utvalda visningsfält går till klienten.
- Tidtabell som fysisk knapp under panelen. Ankomst, avgång, från/till, planerat/ändrat spår, genomfart, status och anmärkning. Träffklockan visas separat från TKL:s lokala modellklocka. Inga order, kvittenser eller beläggningar skapas av läsningen.
- 151 enhetsprov och sex processhelhetsprov passerar. Testdata genererad av TrainMeet-serverns egen parser används som referens. UI-prov av anslutning, spårbyte, text-escaping, bibehållen tabell vid avbrott samt 390-pixlars vy utan sidöverflöde. Tillfällig provanslutning kopplas från och provserver avslutas; riktig server är fortfarande inte ansluten.
- Ingen webbpublicering: tidigare fråga om Au → Spår 1a är fortfarande obesvarad. Ingen driftdata på servern eller natt-automation ändrad.

## 24 september 2026 · Separat AI-tidtabellsimport, version 0.22.0

- På Caspers begäran byggt flerfilsimport av PDF/PNG/JPEG/WebP och valt OpenAI enligt hans svar. Servern använder Responses med strikt svarsschema; ingen nyckel eller alternativ AI-adress exponeras i klienten. Underlagen behandlas som data, inte instruktioner.
- Bakgrundstolkning med beständigt granskningsutkast, fil-/sidreferenser, osäkerheter, rättning, radurval och uttrycklig aktivering. Ofullständiga svar och fel lämnar befintlig tidtabell kvar. Omstart återförsöker aldrig ett kostnadsbärande anrop.
- Ny stödsida i menyn och explicit källval under panelens Tidtabell-knapp. Inga fältorder, TrainMeet-skrivningar eller klockändringar. Separat begäran för AI så att panelmanövrer inte väntar på tolkningen.
- 161 enhetsprov och sju processhelhetsprov passerar. Webbläsarprov med kontrollerad testtransport: två filer, osäker rad, rättning av spår, sparande, granskningsspärr, aktivering, källbyte och mobilbredd. Testsvaret är uttryckligen märkt och testkopplingen finns endast i testfiler; ingen verklig AI/OCR-kvalitet har verifierats.
- Riktigt OpenAI-anrop inväntar säkert konfigurerad API-nyckel. Webbdriften ändras inte eftersom tidigare återtagningsfråga för Au → Spår 1a är obesvarad. Nattautomationen oförändrad.

## 24 september 2026 · Tidtabell i kolumner under spårplanen, version 0.23.0

- På Caspers begäran ersatt tidtabellens öppningsbara breda tabell med ett fast fält under spårplanen. Fyra kolumner × två rörelser vid 1280×720, sex × tre vid 1920×1080 och en kolumn på mobilbredd. Bläddring och intervallangivelse ger tillgång till hela tidtabellen utan växande höjd. Källans ordning bevaras; klockan byter inte visad sida.
- Panelens färger och typografi följs i alla tre skins. Tider, spår, sträcka och sammanfattning syns på varje rad. Komplett modal för klick/högerklick/Enter/Skift+F10, utan hover-popup. Ändrat spår visas separat från planerat. Källval och import flyttade till Meny → Tidtabell och import; den överflödiga öppningsknappen under panelen borttagen.
- Provat med 37 rörelser i isolerad testinstallation, separat från normal förhandsvisning och webbdrift: all bläddring, sista rörelsen 25:10, skilda trafikdagar, tomma tider, långa anmärkningar, text-escaping, TrainMeet-spårbyte, klockuppdatering och bibehållen sida. Mobil 390, desktop 1280/1920, tre skins, fullskärm och modal/tangentbord kontrollerade. Syntax godkänd. Ingen ny backendlogik eller nya tester som bara speglar markup.
- Ingen webbpublicering eller ändring av serverns lås. Tidigare återtagningsfråga för Au → Spår 1a kvarstår.

## 24 september 2026 · Gemensam visning och manuell tidtabell, version 0.24.0

- På Caspers förtydligande kompletterat egen tidtabell med direkt manuell inmatning. Samma beständiga modell och samma kolumnfält används för manuella/importerade uppgifter och TrainMeet; ingen alternativ runtime-vy. Källväljaren heter TrainMeet/Egen tidtabell och sidhuvudet anger Manuell/Importerad när relevant.
- Skapa, lägga till rörelser, spara, välja inkluderade rader, godkänna och återöppna manuella tabeller. Aktiv tabell bevaras medan ett utkast redigeras. Ingen AI-nyckel eller AI-begäran krävs för manuell inmatning. Källreferenser för filimport kan inte skrivas om via manuell redigering.
- Tolv riktade enhetsprov och två processhelhetsprov passerar. Verifierat omstart, aktiv tabell kvar under rättningar, versionskonflikter, 300-radersgräns, API-inloggning och inga fältorder/klockändringar. UI-prov med två manuella tåg utan AI-nyckel, sparande före tillägg, aktivering och rättat spår som blir synligt först efter godkännande. Inga konsolfel under detta prov.
- Lokal förhandsvisning uppdaterad. Inga ändringar i webbdriftens tågvägslås och ingen webbpublicering; tidigare fråga om Au → Spår 1a kvarstår.


## 24 september 2026 · Exakt Excel- och CSV-import, version 0.25.0

- På Caspers begäran lagt till direktimport av .xlsx och UTF-8 CSV med exakt tio svenska rubriker. Excel- och CSV-mallar med två exempelrader hämtas från importsidan. Excelmallen innehåller textformaterade beteckningar, tidsvärden, Ja/Nej-val och ett instruktionsblad.
- Ingen AI eller nyckel behövs. Filen ger ett beständigt granskningsutkast med rad-/bladreferenser och sparat original. Aktivering använder samma tidtabellsfält som manuell inmatning och TrainMeet. Aktiv tabell lämnas kvar under import och fel.
- Separat worker, tids- och minnesgräns samt kontroll av ZIP-expansion. Fasta kolumner, obligatoriska fält, exakta minuter, nollor, citattecken och radbrytningar. Formler och dolda datarader avvisas. Versionskontroll efter worker hindrar överskrivning av samtidiga rättningar.
- 171 enhetstester och två processhelhetsprov godkända. Excel/CSV genom riktiga HTTP-anrop, mallars GET/HEAD, inloggning, originalfil, granskning och omstart. Webbläsarprov: Exceluppladdning, rättat spår, aktivering och panelvisning samt CSV-nedladdning, inläsning och panelvisning. Isolerad provdata användes; normal förhandsvisnings tidtabell ändrades inte.
- Biblioteken låsta i package-lock. Beroendekontrollen visar inga kända sårbarheter. Nginx-konfigurationen kompletterad med 3 MB för direktimportens JSON.
- Lokal förhandsvisning uppdaterad. Ingen webbpublicering och inga ändringar av serverns befintliga tågvägslås; frågan om Au → Spår 1a är fortsatt obesvarad.

## 24 september 2026 · 22:09 – kontrollerad publicering av 0.25.0

- Casper godkände återtagning och publicering, loggade in i webbappen och gav därefter klartecken att fortsätta. Aktuell serverkontroll visade An → Spår 1a och Bn → Spår 3b, inte den tidigare Au-vägen.
- Återtog båda aktuella vägarna med appens vanliga knappar. Verifierade för varje väg kvittensen stopp bekräftat, vägen fri och lås frigivna. Därefter noll lås i både panel och sparade driftdata. En äldre nödåtertagningskvittens visades samtidigt och användes inte som bevis för aktuella lås. Ingen direkt radering eller omskrivning av driftdata.
- Förberedde release f2bbaef i separat katalog och verifierade arkivets SHA-256. Syntax, hela XML/operationsunderlaget, 171 enhetstester och sju processhelhetstester passerade på servern. Den aktiva versionen fortsatte köra under testerna.
- Kontrollerade att simulatorn saknade pågående tåg, beläggningar och injicerade fel. Tog backup av beständiga driftdata, inloggning och driftskonfiguration i /root/charlottendal-backups/network-f2bbaef-20260924T200907Z. Uppdaterade current och Nginx; båda tjänster omstartade. Automatisk återgång förberedd men behövde inte användas.
- Efterkontroll: båda tjänster anslutna utan startfel, noll lås, controls.json och autentiseringsfil identiska med backupen. AIS är kvar aktivt. Extern HTTPS-login 200, panel-/simulator-API och Excelmall 401 utan session. Webbläsaren visar version 0.25.0, ny meny, tidtabellsfält och tillgänglig Excel-/CSV-import med mallar; inga konsolfel.
- Ingen provtidtabell eller verkligt AI-anrop i webbdriften. OpenAI-nyckel, riktig TrainMeet-anslutning och fysisk MGP-verifiering återstår. Nattautomationen är oförändrad.

## 24 september 2026 – fast panel och bildrutestyrd visning, 0.26.0

Casper vill att panelen upplevs som en permanent fysisk anläggning. Statusfält, tidtabell och manöverfält har därför fasta platser; manöverdetaljer är modala och orsakar inte automatisk sidrullning. Hover lyser upp träffytan utan att skala symbolen. Alla signalvarianter hålls förladdade med fasta mått. Tågvägens ljusflöde använder en monoton klocka och bara aktiv animation begär nya bildrutor. Upprepade identiska SVG-värden lämnas orörda och tidtabellsändringar berör endast ändrade rader.

174 enhetstester, riktad omkontroll av rörelsepreferens och syntax godkända. Separat webbläsarprov med tågväg, AIS, avbrott, 23 tidtabellsrader, modaler, tre skins och skärmstorlekar. Se provresultat.md för mått och fullskärmsprovets begränsning. Backend, driftregler, autentisering och fysiska bindningar är oförändrade.

Publicerad kl. 22:53 som ed27e49. Serverns riktade renderingsprov och syntax godkända; backend, profiler, källdata och beroenden verifierat identiska med f2bbaef. Noll lås och AIS av vid byte, stoppläget bevarat. Endast TKL omstartad; simulatorn lämnad igång. Backup /root/charlottendal-backups/network-ed27e49-20260924T205321Z. Efterkontroll och inloggad webbläsare godkända, 0.26.0 synlig, inga konsolfel. Fullskärmskod oförändrad; testverktyget gav ingen verifierbar fullskärmsövergång.

## 25 september 2026 kl. 02:47 · version 0.26.1

Release `32a605e` ersätter `ed27e49` på cda-tkl.trainmeet.app. Casper godkände uttryckligen omstarten. Två aktiva tågvägar före bytet (Au → Spår 1a, Spår 11 → Bu) återställdes till stopp med samma id, ändpunkter, block, signaler och växellås. Ingen återtagning eller radering gjordes. Backend och driftprofil är byte-identiska med föregående release; simulatorn fortsatte köra och nginx ändrades inte.

V1–V3 har nu lugn blinkning som standard: 1,5 s per lampa, halva tidigare frekvensen, mjuka kanter och dämpat rött. Meny → Utseende och ljud → Övergångslampor erbjuder även Fast rött sken och Tidigare blinkning. Valet sparas i webbläsaren.

Backup: `/root/charlottendal-backups/network-32a605e-20260925T004712Z`. Föregående kod: `/opt/charlottendal/releases/ed27e49`. Aktuell kod: `/opt/charlottendal/releases/32a605e`. Backup innehåller driftdata, inloggning, tjänster och serverkonfiguration. Driftfiler ska inte skrivas över vid en kodåtergång; låsen bevaras.

Verifierat: syntax, tre renderingsprov och omstartsprovet för beständiga lås lokalt och på servern. Backend/profiler/källdata/beroenden oförändrade. Efterkontroll bekräftar båda tjänsterna, ny anslutning, skyddade API:er, oförändrad inloggning/manöverspärrar och båda låsen i `held`. Inloggad webbläsare visar 0.26.1, LocoNet ansluten, lugna V1–V3 med 1,5 s / −0,75 s och inga konsolfel. De båda vägarna behöver återtas och läggas på nytt för nya körbesked.

## 25 september 2026 kl. 18:17 · version 0.26.2

Release `1708b25` ersätter `32a605e`. Lugn blinkning har nu 3 s period per lampa, −1,5 s fasförskjutning och 300 ms mjuk tändning/släckning. Ursprungliga snabbläget är borttaget. Fast rött sken finns kvar. Äldre sparat classic-val faller tillbaka till lugnt läge.

Backup: `/root/charlottendal-backups/network-1708b25-20260925T161752Z`. Föregående kod: `/opt/charlottendal/releases/32a605e`. Caspers tidigare uttryckliga omstartsgodkännande användes för denna fortsatta lampjustering. De aktuella vägarna Cu → Spår 11 och Bn → Spår 2b bevarades med samma id/reservationer och återställdes till held. Inga vägar raderades eller återtogs. Simulatorn fortsatte köra, nginx oförändrad.

Syntaxkontroll och lokalt UI-prov godkända; sparat lugnt val, två menyval, 3 s / −1,5 s och fast sken kontrollerades. Serverns tre renderingsprov och omstartsprov godkända; backend/profil/källdata/beroenden byte-identiska. Efterkontroll bekräftade anslutna tjänster, skyddade API:er, oförändrad inloggningsfil/manöverspärrar och två bevarade lås. Produktionsflikens äldre session var utgången och omladdning visade inloggning; inloggat UI-efterprov där återstår, lokala UI-provet är klart. Tillfälliga provblocket S100 frigavs och 9050-provet stängdes.

## 25 september 2026 kl. 18:26 · version 0.26.3

Release `286f5aa` ersätter `1708b25`. Accepterad tågväg visar lugnt växlande start-/slutplupp under setting/establishing/clearing, fast sken när klar. Fyra renderingsprov och syntax godkända lokalt och på servern, omstartsprov godkänt på servern. Backend, driftprofil, källdata och beroenden oförändrade. Lokalt UI-prov genomförde verklig reservation till klar väg och normal återtagning på Trafikskärm samt Reläpanel. Inga provvägar kvar.

Backup: `/root/charlottendal-backups/network-286f5aa-20260925T162630Z`. Föregående kod: `/opt/charlottendal/releases/1708b25`. Med tidigare omstartsgodkännande bevarades tre aktuella reservationer: Cu → Spår 11, Bn → Spår 2b och Spår 1c → Spår 1a. Samma id, block, växlar och signaler verifierade; samtliga återställda till held. Ingen återtagning/radering av livevägar. Simulatorn fortsatte köra; nginx och inloggningsfil oförändrade.

Inloggad produktionsflik verifierar 0.26.3, LocoNet ansluten, tre stoppade vägar med lås kvar, inga fel i konsolen och ingen väntblinkning på de sex ändpunkterna. Förberedelseblinkningen provades lokalt, inga extra livevägar lades för provet. Nya körbesked kräver normal återtagning och ny läggning av befintliga vägar.

## 25 september 2026 kl. 20:04 · version 0.27.0

Release `4058803` ersätter `286f5aa`. Synligt TKL-id under Meny → TrainMeet sparas beständigt och skickas som både client_id och display_name vid parkoppling. Inloggad webbkontroll sparade `cda-tkl` tillsammans med befintlig `https://server.trainmeet.app`; omladdning verifierade båda värdena och version 0.27.0. Inga konsolfel. Station och anslutningskod är ännu tomma; ingen verklig parkoppling påstås.

Backup: `/root/charlottendal-backups/network-4058803-20260925T180412Z`. Föregående kod: `/opt/charlottendal/releases/286f5aa`. Tre befintliga reservationer Cu → Spår 11, Bn → Spår 2b och Spår 1c → Spår 1a bevarades med samma id, block, växlar och signaler, i held. Simulatorn fortsatte köra. Inloggningsfil, manöverspärrar och TrainMeet-inställning var oförändrade genom versionsbytet; först därefter ändrades id:t uttryckligen via gränssnittet. Befintligt importutkast lämnades i sin flik.

178 lokala enhetstester och TrainMeet-processprov godkända. På servern passerade 20 riktade prov, HTTP-processprov med omstart, beständiga-lås-prov och syntaxkontroll. Endast TrainMeet-adaptern ändrades i backend; förregling, simulator, profiler, källdata och beroenden verifierades oförändrade. Efterkontroll bekräftade anslutna tjänster och skyddade API:er.


## 25 september 2026 kl. 20:53 · version 0.28.0

Release `f1ce9d8` ersätter `4058803`. Administrationen visar översikter med redigering i modaler eller separata arbetsytor. Tidtabeller har en egen kalkylbladssida med cellredigering, områdesmarkering, tangentbordsstyrning, kopiera/klistra in, ångra/gör om, validering och uttrycklig sparning/godkänd aktivering. Importerad källspårning bevaras. Inga moduler har tagits bort; frågorna om den separata anslutningssidan och avancerade verktyg väntar på Casper.

183 lokala enhetstester, sju processhelhetsprov och det utökade HTTP-provet för kalkylblad/omstart passerade. Serverns syntax, 37 riktade prov, sju processhelhetsprov och låsomstartsprov passerade. Förregling, profiler, källdata, simulator, nginx och beroenden är oförändrade. Backendändringen gäller tidtabellens atomiska utkastssparning och dess befintligt skyddade API.

Backup: `/root/charlottendal-backups/network-f1ce9d8-20260925T185337Z`. Föregående kod: `/opt/charlottendal/releases/4058803`. Endast TKL startades om; simulatorn fortsatte köra. Tre befintliga reservationer Cu → Spår 11, Bn → Spår 2b och Spår 1c → Spår 1a bevarades i held med identiska id/reservationer. TrainMeet, tidtabellsutkast, konfiguration, bindningar, anteckningar, stoppläge och inloggning jämfördes med backupen och bevarades. Ingen liveväg återtogs och ingen provtidtabell tillfördes.

Inloggad webbkontroll i en ny flik bekräftar 0.28.0, LocoNet ansluten, befintligt utkast med en rad i den nya kalkylbladsvyn och cda-tkl / https://server.trainmeet.app i anslutningsöversikten. Redigera anslutning öppnar modal; Avbryt lämnar värdena orörda. Inga konsolfel observerades. Den äldre importsidan lämnades orörd för att bevara eventuell osparad inmatning. Verklig TrainMeet-parkoppling återstår.


## 25 september 2026 kl. 21:14 · version 0.28.1

Release `ff62c71` ersätter `f1ce9d8` efter Caspers godkännande av de två menyförenklingarna. Profilinformationen finns i Anläggningsregistret; den dubblerande anslutningssidan är borttagen. XML-granskning, införandestatus och protokollinspelning nås under Avancerat. Äldre anslutningslänk leder till registret. Konto/lösenordsbyte, TrainMeet och driftjournalen finns kvar.

Lokalt UI-prov verifierade navigation, direktlänk/omladdning, källavsnitt till objektdetalj, helregistersökning, inspelningsdialog samt förenklad meny. Syntax/diffkontroll godkända. Serverns syntax och låsomstartsprov passerade; backend, profiler, källdata, simulatorfiler, nginx och beroenden jämfördes och är oförändrade. Ingen ny full testsvit kördes för denna rena navigationsändring; 0.28.0:s 183 enhetsprov och sju helhetsprov är föregående fulla resultat.

Backup: `/root/charlottendal-backups/network-ff62c71-20260925T191454Z`. Föregående kod: `/opt/charlottendal/releases/f1ce9d8`. Endast TKL omstartad, simulatorn fortsatte köra. Samma tre held-reservationer med alla resurser bevarade. Tidtabell, TrainMeet, konfiguration, bindningar, anteckningar, inspelningsarkiv, stoppläge och autentisering jämfördes med backup och var oförändrade. Inga liveprovdata eller manövrer.

Livewebbläsaren visar 0.28.1, LocoNet ansluten, tre ingångar under Avancerat och profilinformationen i registret. Den borttagna sidan saknas och XML-verktygen visas inte på registeröversikten. Inga konsolfel observerades.


## 25 september 2026 kl. 21:44 · version 0.28.2

Release `32fa1a3` ersätter `ff62c71`. Driftmeddelanden visas som toast ovanpå panelen. Det reserverade statusfältet och tomtexten är borta. Tillfälliga besked tonas bort efter åtta sekunder med paus vid pekare/fokus; aktiva AIS/fjärr/nödåtertagningsbesked följer fortsatt sitt driftvillkor. Ingen ändring av manöverregler.

Syntax, fyra renderingsprov och lokalt UI-prov godkända. Serverns syntax, fyra renderingsprov och låsomstartsprov passerade. Backend, profiler, källdata, simulator, nginx och beroenden jämfördes och är oförändrade. Backup: `/root/charlottendal-backups/network-32fa1a3-20260925T194443Z`. Tidigare kod: `/opt/charlottendal/releases/ff62c71`.

Endast TKL omstartad; simulatorn fortsatte köra. Tre reservationer behållna i held med samma resurser. Tidtabell, inställningar, anteckningar, inspelningsarkiv, controls och autentisering bevarade. Livewebbläsaren visar 0.28.2, LocoNet ansluten, panelens överkant 0 och spårplanens överkant 40. Tom meddelanderegion är dold. Inga konsolfel och inga liveprovmanövrer. Isolerat AIS-prov återställt och inga provvägar skapade.


## 25 september 2026 kl. 22:08 · version 0.29.0

Release `4919f97` ersätter `32fa1a3`. Tidtabellen har enkel ljus text och en rad per tågrörelse (tåg, ank., avg., spår), med högst tre kolumner som fylls nedåt och sedan åt höger. Detaljdialogen behåller resten av uppgifterna. Den stora knappraden är ersatt av Meny → Driftverktyg med sex förklarade ingångar. Casper har uttryckligen valt att behålla Alla signaler i stopp direkt på panelen; Återställ stopp visas bara när AIS är aktiv. Ingen driftfunktion har raderats. [Bedömning av samtliga tidigare knappar](panel-och-verktyg.md).

Lokalt prov: 37 provrader utan bortfall på tre sidor, 15 samtidigt vid 1280 × 720, 13 px text/24 px radhöjd. Spårplanens fasta yta ökade från 344 till 496 px. Raddetaljer, inledande nollor, tid 25:10 och anmärkning bevarade. Samtliga driftverktyg, huvud-/växeltågvägsval, Cu → Spår 1a till klar och normal återtagning samt AIS/återställning provade. Inga kvarvarande provvägar eller AIS. Adminnavigation, dialog/Escape/fokus och 390 × 844 utan sidöverflöde godkända; normal fönsterstorlek återställd. Inga konsolfel.

Syntax och fyra renderingsprov passerade lokalt och på servern; serverns låsomstartsprov passerade. Backend, profiler, källdata, simulatorfiler, nginx och beroenden är identiska med föregående release. Backup: `/root/charlottendal-backups/network-4919f97-20260925T200810Z`. Föregående kod: `/opt/charlottendal/releases/32fa1a3`. Endast TKL omstartad; simulatorn fortsatte köra. Tre held-reservationer bevarades med identiska id, block, växlar och signaler. Tidtabell, TrainMeet, inställningar, anteckningar, loggarkiv, stoppläge och autentisering jämfördes med backup och bevarades.

Livewebbläsaren visar 0.29.0, LocoNet ansluten, bara stoppknappen permanent och den nya driftmenyn med tre befintliga vägar. Ingen tidtabell är aktiverad i produktion; befintligt utkast är bevarat och inga provrader har publicerats. Inga konsolfel eller liveprovmanövrer. Lokal förhandsvisning stängd efter kontroll.


## 25 september 2026 kl. 23:41 · version 0.30.0

Release `c605c16` ersätter `4919f97`. En enda direktknapp, Återställ panel, begär stopp i alla signaler och nollställer samtliga tågvägsreservationer efter nya stoppåterrapporter. AIS hävs då automatiskt. Enligt Caspers förtydligande hindrar beläggning inte just denna uttryckliga nollställning; detektortillstånd ändras aldrig av kommandot. Lok/vagnar som rapporteras kvar fortsätter visas belagda och hindrar nya vägar/manuella omläggningar enligt ordinarie villkor. Övergångar varnar fortsatt för belagda korsande block. Vanlig återtagning/nödåtertagning behåller sina tidigare fria-spår-villkor.

Återställningen är beständig och idempotent medan den pågår. Den visar väntorsak vid saknad anslutning/stoppåterrapport och kräver nytt knapptryck efter avbruten serveromstart. En senare separat stopp-/nödåtertagningsorder förhindrar automatisk AIS-hävning. Lagringsfel tillåter varken färdigindikering eller nya medgivanden. Knappen ger ingen växelomläggning; tidtabell, spärrar och andra administrativa uppgifter påverkas inte. Detaljer i [panelhandhavandet](panel-och-verktyg.md).

188 enhetsprov och åtta processhelhetsprov passerade både lokalt och på servern, inklusive ny HTTP-kedja för återställning med beläggning och bibehållen V1-varning. Återstarts-, felsvars-, dubbla order-, lagringsfel- och samtidiga stoppfall provade. Nytt API kräver befintlig inloggning. Lokalt webbprov lade Cu → Spår 1c, belade S100, återställde utan kvarvarande väg/AIS och verifierade beläggning samt V1-varning. Ny väg över S100 avvisades; efter frirapport släcktes V1. Vänteläge och fortsättning vid LocoNet-avbrott/återanslutning provade. Inga konsolfel. Lokal testmiljö stängd med fria provspår och inga provvägar.

Backup: `/root/charlottendal-backups/network-c605c16-20260925T214128Z`. Föregående kod: `/opt/charlottendal/releases/4919f97`. Förkontrollen fann noll tågvägar och AIS aktiv; detta aktuella läge bevarades, liksom tidtabell, TrainMeet, konfiguration, bindningar, anteckningar, inspelningsarkiv och inloggning. Endast TKL omstartad; simulatorn fortsatte köra. Backendändringen är begränsad till engine och HTTP-endpoint; profiler, källdata, övrig backend, simulatorfiler, nginx och beroenden är oförändrade.

Livewebbläsaren visar 0.30.0, LocoNet ansluten och en aktiverad Återställ panel-knapp. Befintlig AIS-indikering kvarstår. Ingen återställningsmanöver utfördes mot produktionen under efterkontrollen.
