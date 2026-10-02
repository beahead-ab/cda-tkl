# Charlottendal TKL på Raspberry Pi

Charlottendal TKL installeras på samma sätt som TrainMeet Server: en rad i terminalen, resten
sker av sig själv. Resultatet är ett fristående ställverk: TKL och anläggningssimulatorn som
tjänster, ställverket i helskärm när Pi:n startar, och Stream Deck som kopplas upp av sig själv.

## Installera

Raspberry Pi 5 med Raspberry Pi OS 64-bit (Desktop). Öppna Terminal på Pi:n, eller logga in med
`ssh`, och kör:

```sh
curl -fsSL https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.sh | sudo sh
```

Starta om när installationen är klar:

```sh
sudo reboot
```

Efter omstarten öppnar Chromium ställverket i helskärm. Genvägen **Charlottendal TKL** på
skrivbordet öppnar det igen om fönstret stängs.

> **Medan förrådet är privat** behövs en GitHub-token med läsrätt till `beahead-ab/cda-tkl`:
>
> ```sh
> curl -fsSL -H "Authorization: Bearer TOKEN" https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.sh | sudo CDA_TKL_TOKEN=TOKEN sh
> ```
>
> Tokenen sparas i `/etc/cda-tkl/github-token` (bara root kan läsa den) så att uppdateringar fungerar.

## Vad installationen gör

| Del | Var |
|---|---|
| Node.js 22, hämtad från nodejs.org och kontrollerad mot dess kontrollsumma | `/opt/cda-tkl/node` (systemets Node rörs inte) |
| Programmet, en katalog per installation | `/opt/cda-tkl/releases/<version>-<tid>`, `/opt/cda-tkl/current` pekar på den som körs |
| Inställningar, skrivs en gång och behålls vid uppdatering | `/etc/cda-tkl/app.env` |
| Driftdata | `/var/lib/cda-tkl` |
| Tjänster | `cda-tkl` (ställverket, port 8910) och `cda-tkl-simulator` (anläggningen, 8911, LocoNet 8912) som användaren `cda-tkl` |
| Helskärm | `/usr/local/bin/cda-tkl-browser`, startas från labwc:s autostart; Chromium startas om om det stängs |
| Stream Deck | udev-regel `50-cda-tkl-streamdeck.rules` och Chromium-policyn `WebHidAllowDevicesForUrls` |

TKL lyssnar bara på den egna datorn (127.0.0.1) och kräver ingen inloggning där. Skärmen släcks
aldrig, och Pi:n loggar in på skrivbordet av sig själv.

## Uppdatera

```sh
sudo cda-tkl-update
```

Det hämtar senaste versionen och installerar den på samma sätt. Inställningar och driftdata ligger
kvar. Den nya versionen läggs i en egen katalog och tas i bruk först när den svarar; svarar den inte
inom 30 sekunder återställs den föregående av sig själv. De tre senaste versionerna sparas.
Ställverket visar "Ny version · ladda om" i statusraden när TKL har startats om med en ny version;
helskärmsfönstret laddar man om med det chipet.

## Stream Deck

Koppla in Stream Deck i en USB-port. Ställverket kopplar upp den av sig själv, både vid start och när
den kopplas in senare. Ingen dialog behövs, eftersom Chromium-policyn redan tillåter Elgatos enheter för
ställverkets adress. Väljer man **Koppla bort** under Stream Deck i menyn förblir den bortkopplad på
den här enheten tills man ansluter igen.

## Felsökning

```sh
systemctl status cda-tkl cda-tkl-simulator
journalctl -u cda-tkl -n 50
```

## Inte med ännu

- **Riktig anläggning.** Installationen kör mot anläggningssimulatorn. LocoBuffer på USB
  (`scripts/locobuffer-gateway.mjs`) kopplas in i driftsättningssteget, när MGP-underlaget finns.
- **Åtkomst från andra enheter**, till exempel en iPad på träffens nät. Det kräver inloggning och
  läggs till när det behövs.
- **Mac.** På Mac körs TKL för utveckling med `npm start`.

TrainMeet Server kan installeras på samma Pi; de använder olika portar (8787 och 1883 mot 8910–8912),
men båda öppnar då var sitt helskärmsfönster.

## Provat

Installationen, en uppdatering ovanpå och en trasig version som återställs har provats i en
Debian 12-container på arm64 (samma processorarkitektur som Pi 5) med systemd: Node 22.23 hämtades,
båda tjänsterna startade som `cda-tkl`, ställverket och simulatorn svarade, inställningarna och
driftdata låg kvar efter uppdateringen, och den trasiga versionen ersattes av den föregående. Skrivbordsdelen
provades med Chromium 154 från Debian; den känner till WebHID-policyn. På en riktig Pi 5 med skärm och
Stream Deck är det inte provat än.
