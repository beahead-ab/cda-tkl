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
- Domänkonfiguration: `/etc/nginx/sites-available/cda-tkl`. Källversion: [deploy/nginx-connection.conf](../deploy/nginx-connection.conf).
- Tillfällig startsida: `/var/www/cda-tkl/index.html`, från [deploy/holding.html](../deploy/holding.html).
- Verifierat 22 september 2026: HTTPS svarar 200 med rätt startsida via Cloudflare; HTTP svarar 308 till HTTPS; sidan öppnas utan certifikatfel i webbläsaren.

## Status för publicering

Domänen och HTTPS är anslutna till instansen. Adressen visar en tillfällig startsida. TKL-appen och simulatorn är ännu inte installerade eller internetpublicerade där; de körs fortfarande lokalt på utvecklingsdatorn.

Node.js 22.23.2, Nginx, tjänstekonton och en brandvägg för SSH/HTTP/HTTPS är förberedda. Nästa steg för apppublicering är att installera TKL och simulatorn som separata tjänster med beständig lagring och inloggning. Cloudflare Access är ännu inte konfigurerat. Inga ändringar har gjorts i befintliga Droplets eller i TrainMeet-systemet.
