# GitHub och DigitalOcean

Skapade och verifierade 22 september 2026.

## Källkod

- Produktnamn: **Charlottendal TKL**.
- Privat repository: [beahead-ab/cda-tkl](https://github.com/beahead-ab/cda-tkl).
- Huvudgren: `main`.
- Första applikationsversion: commit `ac78b11`.
- Lokala driftdata och anteckningar i `var/` är undantagna från Git, liksom miljöfiler och privata nyckelfiler.

## Server

| Uppgift | Värde |
|---|---|
| Leverantör | DigitalOcean |
| Droplet | [charlottendal-tkl-demo](https://cloud.digitalocean.com/droplets/602563860) |
| Droplet-ID | 602563860 |
| Projekt | All apps |
| Region | Frankfurt, FRA1 |
| Operativsystem | Ubuntu 24.04.4 LTS, x86-64 |
| Resurser | Basic Regular, 1 vCPU, 2 GB RAM, 50 GB SSD |
| Publik IPv4 | 161.35.25.62 |
| SSH | Befintliga nyckeln TrainMeet DigitalOcean |
| Backup | Daily Backups aktiverad, 7 dagars lagring enligt vald plan |
| Grundkostnad | 12,00 USD/månad |
| Backupkostnad | 3,60 USD/månad |
| Visad total | 15,60 USD/månad före eventuell moms |

Godkänd budget är högst 20 USD/månad inklusive backup. Med 25 % moms blir ovanstående 19,50 USD. Eventuella framtida tillval eller förbrukning utöver inkluderade kvoter ingår inte i denna konfiguration. En backupplan är aktiverad; någon genomförd återläsning eller första färdig backup har ännu inte verifierats.

SSH-åtkomst och serverns hostname/operativsystem har verifierats. Den privata SSH-nyckeln finns endast i den befintliga lokala nyckelmiljön; den har inte lagts i repositoryt eller kopierats till servern.

```sh
ssh -i ~/.ssh/trainmeet_digitalocean root@161.35.25.62
```

## Domän och HTTPS

- Adress: **https://cda-tkl.trainmeet.app/**.
- Cloudflare: proxierad A-post `cda-tkl` → `161.35.25.62`, automatisk TTL. Den ersätter tidigare `charlottendal-tkl`.
- Nginx hanterar adressen på den nya Dropleten. HTTP omdirigeras till HTTPS.
- Ett Cloudflare Origin CA-certifikat för enbart `cda-tkl.trainmeet.app` är installerat på servern, giltigt till 18 september 2041. Den privata nyckeln finns endast på servern.
- Cloudflares befintliga zoninställning är automatiskt SSL-läge **Full**. Den har inte ändrats för övriga TrainMeet-adresser. Origin CA-certifikatet förutsätter att Cloudflare-proxyn används.
- Domänkonfiguration: `/etc/nginx/sites-available/cda-tkl`. Aktiv källversion: [deploy/nginx-app.conf](../deploy/nginx-app.conf).
- Den tillfälliga startsidan är ersatt av appen. Den gamla konfigurationen finns kvar som `/etc/nginx/sites-available/cda-tkl.holding-backup` för felsökning.

## Status för publicering

TKL och anläggningssimulatorn är installerade och startade som separata systemtjänster. TKL finns på `/`, simulatorns webbgränssnitt på `/anlaggning/`. De kommunicerar endast via LocoNet-over-TCP och har separata anläggningstillstånd. Den lokala installationen är oberoende av serverversionen.

| Del | Plats / inställning |
|---|---|
| Driftsatt kodversion | `32fa1a3` · version 0.28.2 (25 september 2026, 21:44) |
| Aktiv release | `/opt/charlottendal/current` → `/opt/charlottendal/releases/32fa1a3` |
| TKL-tjänst | `charlottendal-tkl.service`, användare `charlottendal` |
| Simulator | `charlottendal-simulator.service`, användare `charlottendal-sim` |
| Automatisk start | Båda tjänsterna aktiverade vid serverstart och omstart efter processfel |
| Lås, anteckningar, journal | `/var/lib/charlottendal-tkl`, skrivbar endast för TKL-tjänsten |
| Driftinställningar | `/etc/charlottendal-tkl/app.env`, endast läsbar för root/systemd |
| Interna portar | 8910, 8911 och 8912 lyssnar enbart på `127.0.0.1` |
| Node.js | 22.23.2 |

Inga ändringar har gjorts i befintliga Droplets eller i TrainMeet-systemet. Webbversionen är samma utvecklingsprofil som den lokala appen, med preliminära MGP-signalbesked och utan fysisk LocoBuffer-anslutning.

## Inloggning

Appen använder nu lösenord på användarens begäran. Minimilängden är 6 tecken. Det tillfälliga lösenordet måste bytas innan panelen eller simulatorn kan öppnas. **Byt lösenord** finns därefter i panelen. Lösenordet är inte sparat i Git.

- Läge: `CHARLOTTENDAL_AUTH_MODE=password`.
- Skyddad autentiseringsfil: `/var/lib/charlottendal-auth/auth.json`, ägare `charlottendal:charlottendal-auth`, rättighet 0640; katalog 2750.
- Scrypt, slumpade sessioner, obligatoriskt första byte, återkallelse vid lösenordsbyte, 12 timmars session och begränsning av felaktiga försök. Se [lösenordsdrift](losenord.md).
- Hela panelen och simulatorn, deras filer och API:er kräver inloggning. Endast själva inloggningssidan och dess hjälpfiler är öppna.
- Cloudflare fortsätter hantera DNS, proxy och HTTPS. Den tidigare e-postinloggningen är vilande: Access-app `070f6609-baf9-4ed8-808c-a84a92ff2734` heter nu **Charlottendal TKL – e-postinloggning vilande** och ligger på `cda-tkl-access.trainmeet.app`. Ingen ny DNS-post skapades för den adressen. Befintlig e-postpolicy är bevarad för eventuell återgång.
- Zero Trust Free-kontot och teamet `wild-field-8422.cloudflareaccess.com` finns kvar. Planen aktiverades efter uttryckligt godkännande av villkoren (0 USD/månad upp till gratisgränserna). Ingen betalplan har lagts till.

Verifierat vid införandet av lösenordsinloggningen: 23 enhetstester och 3 processbaserade helhetstester godkända lokalt; alla tre helhetstester även godkända på servern. Båda tjänsterna är aktiva. Det tillfälliga lösenordet fungerar; båda API:erna nekar åtkomst tills första bytet är gjort. Externa anrop visar inloggningssidan (200) och nekas till panelens och simulatorns API (401). Lösenordet har inte bytts åt användaren.

Säkerhetskopia före övergången finns på servern i `/root/charlottendal-backups/password-20260922/` med gamla driftinställningar, tjänstefiler och anläggningsdata. För återgång behöver både tidigare kod/miljö och Access-appens värdnamn återställas tillsammans.

## Drift och uppdatering

```sh
systemctl status charlottendal-tkl charlottendal-simulator
journalctl -u charlottendal-tkl -u charlottendal-simulator -n 100
```

En uppdatering läggs i en ny releasekatalog med `npm ci --omit=dev --ignore-scripts`. Testa före byte av `current` och omstart av tjänsterna. Flytta aldrig driftdata in i releasekatalogen. Ta en separat kopia av `/var/lib/charlottendal-tkl` och driftkonfigurationen före ändringar; ta inte bort lås för att kringgå återstående frigivningsvillkor. En omstart återtar aldrig körmedgivanden automatiskt.

## Utökad nätverksprofil 23 september 2026

Version `85fa2f3` är publicerad: 192 huvudtågvägsval, 49 växlar, 66 signaler och separat simulator med ordnad tågpassage. Alla 192 vägar har provats både för etablering och passage/frigivning. 34 enhetstester och 4 processbaserade helhetstester godkända på servern. Externa efterkontroller: /login 200, båda API:erna 401 utan inloggning. Tjänsterna är anslutna; inga lås fanns vid profilbytet.

Backup: `/root/charlottendal-backups/network-85fa2f3-20260922T230058Z`. Den omfattar driftdata, autentisering, inställningar, tjänstefiler och webbserverkonfiguration; ligger endast på servern. Tidigare kod finns kvar i `/opt/charlottendal/releases/31d2f8b`. Ett första efterprov förväntade felaktigt 200 där simulatorn avsiktligt omdirigerar inloggningen med 303; automatisk återgång fungerade. Publiceringen genomfördes därefter med korrekt efterkontroll.

Kontrollera alltid kvarvarande lås innan återgång/profilbyte. Återställ aldrig en äldre tom driftfil över nya lås. Fysiska MGP-bindningar och TrainMeet är ännu inte verifierade. Nattarbete fortsätter enligt arbetsjournalen.

### Version 0.3 – växeltågvägar och manövrer

Aktiv release `a88c3a8`: 192 huvudtågvägar  + 60 växeltågvägar, AIS, beständiga spårspärrar och införandestatus för 1 377 regler. Samtliga 37 enhetstester och 4 helhetstester passerade på servern. Efterkontroll: inloggning 200, båda API 401 utan session, båda tjänster anslutna, inga kvarvarande lås vid bytet. Backup `/root/charlottendal-backups/network-a88c3a8-20260922T231757Z`; föregående release 85fa2f3 finns kvar.

AIS/spårspärrar sparas i `controls.json` i samma beständiga katalog som tågvägarna. Även denna fil ska bevaras och säkerhetskopieras. Återställning av AIS återupptar aldrig tidigare tågvägar.


### Version 0.3.1 – visningsinställningar

Aktiv release `eedf31a` ger serverlagrade utkast, fältjämförelse, validering och versionshistorik för namn/beskrivningar. Aktivering och återställning spärras vid kvarvarande tågvägslås. Läs [admininstruktionen](admin.md). Inga driftbindningar, autentiseringsuppgifter eller ursprungliga XML-fält har ändrats.

42 enhetstester och 4 helhetstester godkända på servern. Efterkontroll visar anslutna tjänster, noll lås vid bytet och skydd även av de nya admin-API:erna. Backup `/root/charlottendal-backups/network-eedf31a-20260922T235720Z`, tidigare kod `a88c3a8`. `configuration.json` ska ingå i framtida säkerhetskopior av datakatalogen.


### Version0.4 – lokala växelvillkor och signalordning

Aktiv release `e0b10a5`.20 källregler styr24 växlar med lokala villkor;15 knappregler är uttryckligt spärrade av saknat kopplings-/rangerunderlag. Körkvittens måste komma efter senaste order även när tidstämplar är lika. Ett för tidigt körbesked håller vägen med låsen kvar. Läs [manuell omläggning](manuella-vaxlar.md).

48 enhetstester och4 helhetstester godkända på servern, inklusive alla252 tågvägars passage och alla20 anslutna manuella regler. XML- och operationskontroller passerar. Båda tjänsterna anslutna; inga lås före profilbytet. Extern HTTPS-inloggning200 och skyddade API401. Backup `/root/charlottendal-backups/network-e0b10a5-20260923T003132Z`, tidigare release `eedf31a`. Tillstånd och visningsinställningar bevarade.

### Version 0.5 – nödåtertagning och manöverläge

Aktiv release `f1e7eb1`. Nödåtertagning begär stopp och individuell frigivning först efter fria/kända resurser och nya stoppbesked; AIS återställs separat. Lokal-/fjärrläge lagras på servern. Fjärrsystem är ännu inte anslutet. Se [handhavande, källspårning och formatversion 2](manoverlage-och-nodatertagning.md).

54 enhetstester och fyra helhetstester godkända på servern. XML/operations/syntax godkända; tjänster anslutna och noll lås vid bytet. Backup `/root/charlottendal-backups/network-f1e7eb1-20260923T011118Z`, tidigare release `e0b10a5`. Uppstart skriver inte om gamla kontroller, men första sparade manövern skriver formatversion 2. Efter det kan äldre kod inte läsa filen: återgång kräver kompatibel kod eller granskad migrering av aktuella kontroller. Radera eller återläs aldrig bort nya driftlås/manöverspärrar för att tvinga fram en start.

### Version 0.6 – tågnummer och inkommande tåg

Aktiv release `d2f8fb6`. Sju inkommande fält, manuell nummerregistrering för197 block,44 källankare och atomisk flytt mellan informationsfält. Tågnummer är separat information och påverkar inte signal-/beläggnings-/låsvillkor. Läs [handhavande](taginformation.md).

61 enhetstester och fyra helhetstester godkända på servern. Full XML-, operations-, källankars- och syntaxkontroll passerar. Efterkontroll: tjänster anslutna, noll lås vid bytet, nya informations-API:t kräver inloggning. Backup `/root/charlottendal-backups/network-d2f8fb6-20260923T013515Z`, tidigare release `f1e7eb1`. Den nya filen train-information.json ingår i framtida katalogbackup och ska bevaras även om kod rullas tillbaka.


### Version 0.7 – Spår 6

Aktiv release `cbf1327`. De 18 huvudtågvägarna till/från Spår 6 nås genom panelens lista med källsensor IS266. Totalt 210 huvudtågvägar och 60 växeltågvägar. Läs [Spår 6](spar6.md).

62 enhetstester och fyra helhetstester passerade även på servern. Fullständig XML-, operations- och syntaxkontroll godkänd. Tjänsterna är anslutna, inga lås fanns vid profilbytet. Externa efterkontroller med normal TLS-verifiering: inloggning 200; panelens, adminens, tåginformationens och simulatorns API 401 utan session. Backup `/root/charlottendal-backups/network-cbf1327-20260923T014936Z`, tidigare release `d2f8fb6`. Samtliga driftdata och autentiseringsinställningar bevarade.


### Version 0.8 – utökade växeltågvägar

Release `b3f6a78`: 210 huvudtågvägar + 130 växeltågvägar. 70 nya granskade listval, 15 geometriskt oklara par kvar undantagna och en motsägande källregel spärrad. [Handhavande och undantag](vaxeltagvagar.md).

64 enhetstester och fyra helhetstester passerade på servern. Full XML-, operations- och syntaxkontroll godkänd; tjänster anslutna och noll lås vid profilbyte. Externa HTTPS-kontroller: login 200, skyddade API 401. Backup `/root/charlottendal-backups/network-b3f6a78-20260923T020134Z`, tidigare `cbf1327`. Inga driftdata eller autentiseringsinställningar raderade.


### Version 0.8.1 – fullständiga NX-referenser

Aktiv release `470ff88`. Sammansatta tågvägar bevarar hela källans NX-par tillsammans med mellanliggande delpar. 133 av 153 NX-definitioner har körbar koppling; totalt fortsatt 340 vägar. Ändringen förbättrar källspårning och fullständigheten i NX-spärrvillkoren.

65 enhetstester och fyra helhetstester godkända på servern. XML, deterministisk import och syntax kontrollerade. Tjänster anslutna och noll lås vid bytet. Extern HTTPS-efterkontroll: inloggning 200, skyddade API 401 utan session. Backup `/root/charlottendal-backups/network-470ff88-20260923T021002Z`, tidigare release `b3f6a78`. Driftdata, administrativa versioner och autentisering bevarade.


### Version 0.11 – telegraminspelning

Release540f2e3 publicerad23september06:21. 82 enhetstester och fyra processhelhetstester godkända på servern. XML och samtliga importer är verifierade. Noll lås vid byte, båda tjänster anslutna efter omstart. Backup `/root/charlottendal-backups/network-540f2e3-20260923T042118Z`, föregående kod5104907. Driftdata och autentisering bevarade.

Inspelningar lagras under `/var/lib/charlottendal-tkl/telegram-recordings/` och ingår i samma driftbackup. Färdiga filer överlever omstart; pågående inspelning avslutas och sparas vid normal tjänsteavstängning. Undvik versionsbyte under pågående inspelning så att provserien inte avbryts. Ett oväntat processhaveri kan fortfarande förlora den pågående loggen. Se [handhavande och gränser](telegraminspelning.md).

Extern HTTPS-efterkontroll med systemets curl och normal certifikatverifiering: login200, panel-/simulator-API401, inspelningslista och nedladdning401 utan inloggning. Den lokala Python-installationens certifikatarkiv saknade kedjan; ingen certifikatkontroll stängdes av.


### Version0.12 – linjer, programmeringsspår och klocka

Release0cfc8d0 publicerad06:58. 97 enhetstester och fyra processhelhetstester passerade på servern. XML, import och syntax verifierade. Backup `/root/charlottendal-backups/network-0cfc8d0-20260923T045842Z`, tidigare540f2e3. Tjänster anslutna och noll lås vid bytet. Externa HTTPS-prov: login200, TKL/simulator401, klockmanöver401 utan session. Programmeringsspärr kontrolleras nu också före profilbyte.

controls.json sparas i format3 vid nästa manöver. Återgång till äldre kod får aldrig ske genom att radera nya spärrar. model-clock.json och tidigare driftdata ingår i katalogbackup. Se docs/linjer-programmering-klocka.md.


### Version0.13 – seriell transport och TrainMeet-läsning

Release2798f31 publicerad07:14. 108 enhetstester och sex processhelhetstester passerade på servern, inklusive POSIX-serieportprovet på Linux. Backup `/root/charlottendal-backups/network-2798f31-20260923T051427Z`, tidigare0cfc8d0. Tjänster anslutna och noll lås vid bytet. Externa HTTPS-prov: login200, TrainMeet-parkoppling401 utan session. Ingen fysisk port eller verklig TrainMeet-server aktiverad. Riktig origin/station/anslutningskod och LocoBuffer-inställningar återstår.


### Version 0.14 – driftbindningar

Release 3b3b90e publicerad 07:40. 114 enhetstester och sex processhelhetstester passerade på servern. Backup `/root/charlottendal-backups/network-3b3b90e-20260923T054032Z`, tidigare 2798f31. Efterkontroll: anslutna tjänster, inga lås, HTTPS-login 200 och bindings-API 401 utan session. bindings.json ingår i katalogbackup; äldre kod som ignorerar aktiva bindningar får inte återställas automatiskt. Se [driftbindningar](driftbindningar.md).


### Version 0.15 – nummerföljning

Release e7542c7 publicerad 07:54. 124 enhetstester och sex processhelhetstester godkända på servern före byte. XML, import och syntax verifierade. Backup `/root/charlottendal-backups/network-e7542c7-20260923T055457Z`, tidigare kod 3b3b90e. Anslutna tjänster och noll lås vid byte; externa HTTPS-prov visar login 200 och nya följnings-API 401 utan session.

Backupens faktiska driftkatalog har dessutom kopierats till en tillfällig isolerad katalog på servern och lästs av release e7542c7. Driftprofil, manöverspärrar, lås, visningsinställningar, tåginformation och modellklocka gick att återläsa. Noll fältorder skickades, klockan var pausad. Backupen innehöll noll lås och noll tågnummer; provet påstår därför inte att just den kopian testat återläsning av aktiva lås. Sådana scenarier ingår separat i de automatiska testerna. Provet ändrade inte live-data och den tillfälliga kopian togs bort. Detta är ett applikationsbackup-prov, inte återställning av hela DigitalOcean-maskinen.

Tåginformationens format 2 kräver programversion 0.15 eller senare när det sparats. Publiceringen spärrar automatisk återgång till kod som inte kan läsa aktuellt format; data raderas aldrig som återställningsåtgärd. Se [nummerföljning](taginformation.md).

### Version 0.16 – provkörd kompakt panel

Release `bf2a372` publicerad 24 september 2026 kl. 03:01 svensk tid. Synliga signaluppgifter, anslutningsstatus och aktiva tågvägar i kompakt läge; avbrott rensar ofullständigt knappval. Reläpanelens passagevisning, smala fönster och lokala korslänkar rättade.

124 enhetstester och sex helhetstester passerade både lokalt och på servern. XML, operationsimport och syntax godkända. Backup `/root/charlottendal-backups/network-bf2a372-20260924T010118Z`; föregående release `e7542c7`. Ingen ändring av driftdataformat, profiler, adresser eller autentisering. Tjänster anslutna, inga aktiva lås efter versionsbytet. Extern HTTPS-kontroll: inloggning 200, skyddat API 401 utan session.

[Webbläsarprov och designavstämning](provkorning-2026-09-24.md). Den publika inloggningssidan öppnades efter versionsbytet; den inloggade panelen provades lokalt. Ingen användarsession skapades eller ändrades.


### Version 0.16.1 – skydd för kompisväxel utanför färdvägen

Release `7dd7f71` publicerad 24 september 2026 kl. 03:27 svensk tid. Omläggning av en kompisväxel kontrollerar dess eget spår även när tåget inte passerar där. En belagd, okänd eller spärrad kompis som behöver ändras avvisar hela tågvägsbegäran före order. Redan bekräftade kompisar utanför färdvägen får ingen onödig order. [Felbild och verifiering](kompisvaxlar.md).

134 enhetstester och sex processhelhetstester godkända både lokalt och på servern före versionsbytet. Full XML-, operations- och syntaxkontroll passerade. Backup `/root/charlottendal-backups/network-7dd7f71-20260924T012756Z`; tidigare release `bf2a372` finns kvar. Tjänsterna är anslutna och inga aktiva lås fanns vid efterkontrollen. Extern HTTPS-kontroll: login 200, skyddat API 401 utan session.

Ingen ändring av driftdataformat, den publicerade nätprofilens adresser eller autentisering. Den äldre provprofilen har fått explicita växel–detektorkopplingar för samma skydd. Webbläsarprovet kördes lokalt mot separat simulator; fysisk elektrisk polarisering och kortslutningsskydd är inte verifierade.


### Version 0.16.2 – synliga kompisväxlar vid manuell manöver

Release `c868a44` publicerad 24 september 2026 kl. 06:14 svensk tid. Tillfälliga markeringar och en informationsruta visar den valda växeln och dess kopplade kompisar, återrapporterat läge, spårstatus och spärrar. Växlar utanför vyn kan rullas fram utan manöver. Inga nya växelkopplingar, behörigheter, driftvillkor eller dataformat har införts. [Handhavande och webbläsarprov](kompisvaxlar.md).

14 riktade enhetstester och sex processhelhetstester godkända lokalt. Publiceringsservern körde hela sviten: 134 enhetstester och sex helhetstester godkända, liksom syntax, full XML och operationsimport. Backup `/root/charlottendal-backups/network-c868a44-20260924T041452Z`; föregående release `7dd7f71`. Tjänster anslutna, inga aktiva lås, extern login 200 och skyddat API 401 utan session. Inloggning och driftdata bevarade.


### Version 0.17 – ren panel och Verktyg

Release `bea8a85` publicerad 24 september 2026 kl. 07:14 svensk tid. Panelen på `/#panel` har renodlats; trafikverktyg, modellklocka, manövrer/spärrar, utseende, TrainMeet och händelser finns på `/#tools`. Registret finns kvar på `/#register`. Aktiva tågvägar och osparade inmatningar bevaras vid sidbyte; signal- och kompisinformation visas vid behov. [Handhavande och webbläsarprov](panel-och-verktyg.md).

Sex processhelhetstester godkända lokalt. Full serverkontroll: 134 enhetstester och sex helhetstester godkända, liksom syntax, full XML och operationsimport. Backup `/root/charlottendal-backups/network-bea8a85-20260924T051423Z`; föregående release `c868a44`. Efterkontroll: anslutna tjänster, noll lås, extern login 200 och skyddat API 401 utan session. Profiler, adresser, driftdataformat och inloggning är oförändrade.


## 24 september 2026 – fullskärmsknapp, version 0.17.1

Release `97c6546` publicerad kl. 07:27 svensk tid. Fullskärm finns bredvid Verktyg på panelen, med återgång via samma knapp eller Escape. Hela dokumentet omfattas så att meddelanden, detaljer och sidnavigation förblir tillgängliga. Se [handhavande och webbläsarprov](panel-och-verktyg.md).

Lokal syntaxkontroll och webbläsarprov godkända. Serverns 134 enhetstester, sex helhetstester, XML-, operations- och syntaxkontroller passerade före bytet. Backup `/root/charlottendal-backups/network-97c6546-20260924T052720Z`; föregående release `bea8a85`. Efterkontroll: tjänster anslutna, noll lås, extern login 200 och skyddat API 401 utan session. Driftregler, adresser, dataformat och inloggning oförändrade.


## 24 september 2026 · 07:47 – publicering av 0.18.0 stoppad av kvarvarande lås

Kodrelease `92bc576` med V1–V3:s nya vägövergångsvisning finns i privat GitHub. Före byte passerade syntax, hela XML, operationsimport, 141 enhetstester och sex helhetstester på servern. Publiceringsskyddet hittade kvarvarande tågväg Au → Spår 1a och avbröt utan att radera tillstånd. Föregående kodrelease `97c6546` återställdes och båda tjänsterna startades. Låset finns kvar som `held`; Casper har tillfrågats om normal återtagning före nytt publiceringsförsök. Ännu inget svar eller återtagning.

Efterkontroll av föregående version: båda tjänster aktiva, LocoNet ansluten, inga fel efter start och extern HTTPS-login 200. Ingen ny releasebackup hann tas före låskontrollen; senaste fullständiga releasebackup är fortsatt `network-97c6546-20260924T052720Z`. Utrullningslogg finns lokalt i `work/deploy-network-92bc576.log`.

## 24 september 2026 – 0.19.0 lokalt färdig, oförändrad webbdrift

Hamburger-meny och särskild TrainMeet-sida med sparbar serveradress är färdiga lokalt. 146 enhetstester, sex helhetstester, syntax och webbläsarprov passerade. Adressinställningen använder befintlig `trainmeet.json`; det sparade formatet är fortsatt version 1. `CHARLOTTENDAL_TRAINMEET_ORIGIN` låser adressen om den är satt. Läs [anslutningsanvisningen](trainmeet-adapter.md) före riktig parkoppling.

Ny läsande kontroll bekräftade att `/opt/charlottendal/current` fortfarande pekar på `97c6546` och att Au → Spår 1a är kvar i `held` med `cancelRequested: false`. Ingen ny publicering eller tjänsteomstart har gjorts. Tidigare återtagningsfråga inväntar svar; den riktiga TrainMeet-adressen och serverns placering är också efterfrågade. Lokalt finns förhandsvisningen på `http://127.0.0.1:9030/`.

Version 0.19.1 tillför högerklicksöppnad objektinformation i en modal nära klickpunkten. Lokal syntaxkontroll och webbläsarprov godkända enligt [provresultaten](provresultat.md). Ingen backend- eller driftformatsändring och inget nytt publiceringsförsök; samma blockerande serverväg inväntar besked.

Version 0.20.0 är lokalt färdig med panelmanövrer under spårplanen och normalvikt för spårtexterna. Webbläsarprov, syntax och sex helhetstester godkända. Ändringen återanvänder befintliga manöveranrop och ändrar inget driftdataformat. Ingen publicering utförd; tidigare Au → Spår 1a behöver fortfarande hanteras genom den normala återtagningsprocessen enligt väntande fråga.

## 24 september 2026 · 22:09 – version 0.25.0 publicerad

Release `f2bbaef` ersätter `97c6546` efter Caspers klartecken. Vid förkontrollen fanns två kvarhållna vägar: An → Spår 1a och Bn → Spår 3b. Båda återtogs genom den inloggade appens vanliga Återta-knappar. Appen kvitterade stoppbesked, fri väg och frigivna lås; serverfilen bekräftade noll vägar. AIS lämnades aktivt. Inga driftfiler redigerades för att frigöra lås.

Före versionsbytet passerade syntax, fullständig XML-/operationskontroll, 171 enhetstester och sju processhelhetstester på servern. Simulatorn hade inga belagda spår, pågående tåg eller injicerade fel. Säkerhetskopian omfattar beständiga driftdata, inloggning, inställningar, tjänstefiler och Nginx:
`/root/charlottendal-backups/network-f2bbaef-20260924T200907Z`.
Föregående kod finns kvar i `/opt/charlottendal/releases/97c6546`. Simulatorns tillstånd finns i minnet och ingår inte i filbackupen; därför kontrollerades den före omstart.

Nginx har uppdaterats med separata uppladdningsgränser för AI-underlag, Excel/CSV och granskningsutkast samt komprimering av källdata. Konfigurationen validerades före omladdning. Efterkontroll: båda tjänster aktiva, färsk LocoNet-anslutning utan startfel, noll lås, identisk controls.json inklusive AIS och oförändrad autentiseringsfil. Extern HTTPS med normal certifikatkontroll: login 200, panel-/simulator-API och Excelmall 401 utan session.

Webbläsaren visar 0.25.0 med bibehållen inloggning, ny meny, manöverknappar och tidtabellsfält. Manuell inmatning, Excel-/CSV-import och båda mallänkarna är tillgängliga. Inga konsolfel observerades. Ingen provtidtabell lades in i webbdriften. AI-tolkning inväntar serverns OpenAI-nyckel; riktig TrainMeet-parkoppling och fysisk MGP-verifiering återstår. Den tidigare publiceringsblockeringen är därmed löst.

## 24 september 2026 · 22:53 – fast panel, version 0.26.0 publicerad

Release `ed27e49` är aktiv efter 174 godkända lokala enhetstester och visuell/manuell kontroll av fasta positioner. Serverns syntax och tre nya renderingsprov passerade. Byte-för-byte-jämförelse verifierade oförändrad backend, driftprofiler, källdata, simulatorfiler och beroenden jämfört med 0.25.0, vars fullständiga helhetsprov passerat samma kväll. Ingen förändring i signalauktoritet eller återrapporter.

Förkontrollen visade noll lås och AIS av; det aktuella stoppläget bevarades. Endast TKL startades om. Simulatorn fortsatte köra med sitt aktuella tillstånd. Backup av beständiga driftdata, inloggning och driftskonfiguration: `/root/charlottendal-backups/network-ed27e49-20260924T205321Z`. Föregående release `/opt/charlottendal/releases/f2bbaef` finns kvar.

Efterkontroll godkänd: tjänster anslutna, noll lås, oförändrade controls/inloggningsfiler, login 200 och API 401 utan session. Den inloggade webbfliken visar 0.26.0, färdig fast panel, ingen dokumentrullning och inga konsolfel. Faktisk fullskärmsövergång kunde inte verifieras i testverktyget; befintlig fullskärmsfunktion är oförändrad.

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

## 26 september 2026 · 0.30.1 · gemensam nollställning av panelval

- Release `ae4c083` publicerad kl. 00:30 svensk tid utan omstart. Endast `public/app.js` och `public/index.html` lades också atomiskt på den körande processens gamla public-sökväg, `/opt/charlottendal/releases/c605c16/public`. `/opt/charlottendal/current` pekar nu på `/opt/charlottendal/releases/ae4c083`; nästa vanliga omstart använder den fullständiga nya releasen. Backend är byte-identisk med 0.30.0.
- Backup: `/root/charlottendal-backups/ui-ae4c083-20260925T223027Z`. Vid rollback till c605c16 måste även `public/app.js` och `public/index.html` återställas från backupens `public/`; det räcker inte att byta current-länken. Återställ inga driftfiler.
- Båda tjänsternas process-id behölls. En befintlig tågväg låg kvar, och routes, controls, TrainMeet, tidtabell och konfiguration var oförändrade. Skyddade API:er kräver fortsatt inloggning.
- Lokalt verifierat med två paneler: startval, shuntläge och växel-/kompismarkeringar rensas i båda vid återställning; nya startval överlever följande tillståndsuppdateringar. En aktiv Cu → Spår 1c återställdes med belagt S100: noll vägar/lås, alla signaler i stopp, fortsatt S100-beläggning och V1-varning. Inga konsolfel. Syntax och fyra renderingsprov godkända lokalt och på servern. Inga nya detektor- eller växelorder har lagts till.

## 26 september 2026 · 0.30.2 · endast Original

Release `e91f4da` publicerad kl. 00:36 svensk tid utan omstart. Original är enda panelutseendet; tidigare sparat Trafikskärm-/Reläpanel-val ignoreras och rensas. Ingen zoomändring är genomförd; förslag lämnat separat. Verifierat lokalt med spara/avbryt och visuellt på panelen, samt i produktion där Trafikskärm ersattes av Original och version 0.30.2 bekräftades. Syntaxkontroll godkänd lokalt och på servern.

Backup: `/root/charlottendal-backups/ui-e91f4da-20260925T223612Z`. `current` pekar på `/opt/charlottendal/releases/e91f4da`. Backendprocessen kör fortsatt från `c605c16` med byte-identisk backend. Dess tre statiska filer `public/app.js`, `public/index.html` och `public/admin-appearance.js` uppdaterades också atomiskt på plats. Vid återgång till 0.30.1 utan omstart: återställ dessa tre filer på `c605c16/public` från backupens `public/` och peka current mot `ae4c083`. Rör inga driftfiler. Nästa vanliga omstart använder hela e91f4da-releasen.

Båda process-id oförändrade. Tågvägar, driftkontroller, TrainMeet, tidtabell och konfiguration oförändrade efter publiceringen. API-skyddet verifierat.

## 0.31.0 – zoom per webbläsare, 26 september 01:54

`current`: `/opt/charlottendal/releases/f917153`. Befintliga backend- och simulatorprocesser fortsätter utan omstart; körande backend serverar public ur c605c16. Fem befintliga UI-filer och nya panel-zoom.js har lagts där. Beroenden, backend, profiler, deploymentkonfiguration och driftfiler är oförändrade. Sju riktade prov, syntax, tjänststatus och API-skydd godkända.

Backup: `/root/charlottendal-backups/ui-f917153-20260925T235458Z`. För UI-rollback, återställ backupens fem public-filer till c605c16/public, ta bort nya panel-zoom.js där, peka current tillbaka till e91f4da. Rör inte state-kopian eller aktuella driftfiler. Nästa ordinarie omstart använder current-releasen. Zoomvärden ligger endast i användarens lokala webbläsarlagring.


## 26 september 2026 kl. 02:26 · Linje 0.32.0

Release `afe9e99` publicerad efter Caspers uttryckliga godkännande att genomföra samtliga diskuterade ändringar. [Linje och redigeringsprinciperna](admin-linje.md) är införda: svartvit admin, smal sidomeny på breda skärmar, översikter, modaler och separata arbetsytor, fältnära validering, fast dialogfot och tydliga utkast/aktiveringssteg. Visningsinställningarna är nu en egen arbetsyta. Panelheader borttagen, vänster trepunktsmeny med LocoNet-status, ortsnamn utan ramar och med vektorpilar, tom tidtabell utan onödig text/bläddring samt återställningsknapp förankrad nere till höger.

Syntax och tio riktade rendering-/zoom-/kalkylbladsprov godkända både lokalt och på servern. Webbprov av Spara/Avbryt, osparade formulär/celler, bibehållen inmatning vid fel, anläggningsarbetsyta, TrainMeet, Avancerat och responsiv layout. Noll respektive tre rader ger ingen bläddrare; 37 rader ger fungerande sidbyte utan ändrad spårplanshöjd. Livekontroll visar 0.32.0, LocoNet ansluten, den nya menyn, rätt ortsetiketter och fungerande inställningsdialog. Inga konsolfel eller provmanövrer i produktion; zoom 95 % bevarad i användarens webbläsare.

`current` pekar på `/opt/charlottendal/releases/afe9e99`. Backend och simulator kör vidare med samma process-id, utan omstart. Körande backend serverar statiska filer ur `c605c16/public`; tretton befintliga filer och nya `admin-line.css` är överlagda där. Backend, profiler, deploymentkonfiguration och beroenden är byte-identiska. Skyddade API:er kräver fortsatt inloggning. Routes, controls, configuration, TrainMeet och tidtabell var oförändrade efter publiceringen.

Backup: `/root/charlottendal-backups/ui-afe9e99-20260926T002655Z`. Återgång utan omstart: återlägg backupens tretton public-filer i `/opt/charlottendal/releases/c605c16/public`, ta bort endast den nytillkomna `admin-line.css` där och peka current på `/opt/charlottendal/releases/f917153`. Återställ inga driftfiler. Nästa ordinarie omstart använder hela afe9e99-releasen.


### Gemensam meny 0.33.1
Release `bd2ff96` publicerad 26 september 03:06 svensk tid. Panel och admin använder samma meny; Driftverktyg har sex arbetsytor. Elva riktade tester godkända på servern. Statisk publicering utan omstart, driftfiler oförändrade. Backup `/root/charlottendal-backups/ui-bd2ff96-20260926T010628Z`.

### Övergångslampor 0.33.2
V1–V3 tonar växelvis mellan rött och släckt utan gemensam mörk paus. Samma lugna tresekunderscykel; fast rött sken oförändrat.
