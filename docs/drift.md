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
| Driftsatt kodversion | `a88c3a8` (23 september 2026, 01:18) |
| Aktiv release | `/opt/charlottendal/current` → `/opt/charlottendal/releases/a88c3a8` |
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

Verifierat: 23 enhetstester och 3 processbaserade helhetstester godkända lokalt; alla tre helhetstester även godkända på servern. Båda tjänsterna är aktiva. Det tillfälliga lösenordet fungerar; båda API:erna nekar åtkomst tills första bytet är gjort. Externa anrop visar inloggningssidan (200) och nekas till panelens och simulatorns API (401). Lösenordet har inte bytts åt användaren.

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
