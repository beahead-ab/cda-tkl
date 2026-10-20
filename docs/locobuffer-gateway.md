# Seriell LocoBuffer-gateway

Gatewayn ansluter TKL:s befintliga LocoNet-over-TCP till en POSIX-serieport på macOS/Linux. TKL-kärnan och dess regler byts inte. Ingen fysisk port har öppnats under utvecklingen; provet använder en virtuell serieport.

Kör på datorn vid anläggningen med Node22+ och Python3. Ange den faktiska enheten, verifierad hastighet och flödeskontroll. Exemplet nedan gäller den dokumenterade USB-varianten, inte en identifiering av Caspers buffert:

```
node scripts/locobuffer-gateway.mjs --device /dev/VERIFIERAD-PORT --baud 57600 --flow rtscts --port 8912
```

Samma gateway når också en BTLocoBridge över Bluetooth (0.83.0). Kortet paras i datorn först; gatewayen öppnar en
RFCOMM-förbindelse till dess serieprofil med `scripts/bluetooth-port.py`, eller läser den parade serieporten direkt
om adressen anges som en `/dev`-enhet (Mac). Hastighet och flödeskontroll saknar betydelse över Bluetooth.

```
node scripts/locobuffer-gateway.mjs --adapter btlocobridge --address AA:BB:CC:DD:EE:FF --channel 1 --port 8912
node scripts/locobuffer-gateway.mjs --adapter btlocobridge --address /dev/cu.BTLocoBridge-SPP --port 8912
```

8 databitar, ingen paritet,1 stoppbit. Hastigheter9600/19200/38400/57600/115200 och flöde none/rtscts stöds. `--help` visar argument. Porten öppnas exklusivt; avsluta JMRI/andra serieprogram före anslutning. Gatewayn och simulatorn får inte använda samma TCP-port samtidigt. TKL körs med backend-kommandot, inte startkommandot som också startar simulatorn. Mellan banan och molnservern behövs en skyddad tunnel som skapar samma lokala TCP-anslutning. Ingen publik bussport öppnas av gatewayn.

## Transportgarantier

- Lyssnar endast på127.0.0.1 och tar emot en styrande klient åt gången.
- Kontrollerar telegramlängd och XOR-checksumma; fragment och flera ramar i samma läsning hanteras.
- Svarar SENT OK först efter att exakt sänt telegram kommit tillbaka från serieporten, och efter RECEIVE. Eko är fortfarande ingen växel-/signalrapport.
- Oberoende B1/B2/E4 och andra giltiga ramar skickas oförändrade. Inga lägen eller startsvar fabriceras.
- Saknat eko, portfel, full kö, överlappande order eller klientavbrott under sändning stänger transporten. Ingen automatisk omsändning av en order vars utfall är osäkert.
- Felaktiga ramar ger felmeddelande. Avbruten/ogiltig ram kan inte bli transportkvittens. Kön är begränsad; kvarvarande seriell utkö töms vid avslut.

Fyra riktade transporttester och ett processprov genom en riktig POSIX-PTY verifierar fragmenterat eko, separat återrapport, checksummefel, timeout och frånkoppling. Linux serverprov ingår också före release. PTY verifierar inte USB-elektronik, elektriska kollisioner, RTS/CTS-timing eller den faktiska MGP-konfigurationen. BREAK-detektering ingår inte. Tyst utrustning ger fortfarande gamla/okända TKL-lägen; aktiv fysisk avfrågning får inte gissas fram.

Källor: [LocoNet-over-TCP](https://loconetovertcp.sourceforge.net/Protocol/LoconetOverTcp.html), [Python termios](https://docs.python.org/3/library/termios.html) och den tidigare granskade [LocoBuffer-USB-manualen](https://rrcirkits.com/locobuffer-usb/LB-USB-manual.pdf). Se också protokollunderlag.md för skillnaden mellan dokumenterat, beräknat och uppmätt.
