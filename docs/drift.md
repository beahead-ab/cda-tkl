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
| Driftsatt kodversion | `d6209b4` |
| Aktiv release | `/opt/charlottendal/current` → `/opt/charlottendal/releases/d6209b4` |
| TKL-tjänst | `charlottendal-tkl.service`, användare `charlottendal` |
| Simulator | `charlottendal-simulator.service`, användare `charlottendal-sim` |
| Automatisk start | Båda tjänsterna aktiverade vid serverstart och omstart efter processfel |
| Lås, anteckningar, journal | `/var/lib/charlottendal-tkl`, skrivbar endast för TKL-tjänsten |
| Driftinställningar | `/etc/charlottendal-tkl/app.env`, endast läsbar för root/systemd |
| Interna portar | 8910, 8911 och 8912 lyssnar enbart på `127.0.0.1` |
| Node.js | 22.23.2 |

Inga ändringar har gjorts i befintliga Droplets eller i TrainMeet-systemet. Webbversionen är samma utvecklingsprofil som den lokala appen, med preliminära MGP-signalbesked och utan fysisk LocoBuffer-anslutning.

## Inloggning

Cloudflare Zero Trust Free aktiverades efter användarens uttryckliga godkännande av villkoren, inklusive eventuell debitering över gratisgränserna. Aktiveringen visade 0 USD/månad och upp till 50 användare.

- Team: `wild-field-8422.cloudflareaccess.com`.
- Access-app: `Charlottendal TKL`, ID `070f6609-baf9-4ed8-808c-a84a92ff2734`.
- Endast engångskod via e-post är vald för denna app. Policyn tillåter `casper@winsnes.se`.
- Skyddet gäller hela värdnamnet, inklusive simulatorn, statiska filer och API. Ingen bypass-regel används.
- Båda apptjänsterna verifierar dessutom Cloudflares JWT-signatur, utfärdare, applikation, giltighetstid och tillåten e-postadress. En förfalskad e-postheader ger ingen åtkomst.
- Sessionstid: 24 timmar; HttpOnly aktiverat. TKL:s händelseström avslutas när JWT:n löper ut.

Verifierat på servern: 23 enhetstester och 2 processbaserade helhetstester godkända; båda tjänsterna aktiva och automatiskt startande; LocoNet-rapporter når TKL. Direktanrop till respektive API utan inloggning svarar 403. Externa anrop till panel, simulator och API hänvisas till Access-inloggning. Den första engångskoden har begärts; manuell kontroll av den publicerade panelen efter inloggning återstår.

## Drift och uppdatering

```sh
systemctl status charlottendal-tkl charlottendal-simulator
journalctl -u charlottendal-tkl -u charlottendal-simulator -n 100
```

En uppdatering läggs i en ny releasekatalog med `npm ci --omit=dev --ignore-scripts`. Testa före byte av `current` och omstart av tjänsterna. Flytta aldrig driftdata in i releasekatalogen. Ta en separat kopia av `/var/lib/charlottendal-tkl` och driftkonfigurationen före ändringar; ta inte bort lås för att kringgå återstående frigivningsvillkor. En omstart återtar aldrig körmedgivanden automatiskt.
