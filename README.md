# Installera CDA-TKL · Charlottendal TKL

CDA-TKL är ett ställverk för modelljärnvägen Charlottendal, med anslutning till TrainMeet och möjlighet att ansluta banans LocoNet. Här går vi från en tom dator till ett installerat ställverk.

Programmet, installationsskripten och uppdateringarna finns i det publika förrådet **[beahead-ab/cda-tkl](https://github.com/beahead-ab/cda-tkl)**. Du behöver inget GitHub-konto, ingen GitHub-token och ingen separat installation av Git eller Node.js. Installationen hämtar sin egen Node.js 22 och programmets beroenden.

## Välj din dator

- **[Raspberry Pi 5 – från minneskort till ställverk](#raspberry-pi-5)**
- **[Mac – installera via Terminal](#mac)**
- **[PC med Windows – installera via PowerShell](#pc-med-windows)**
- **[Första gången i ställverket](#första-gången-i-ställverket)**
- **[Uppdatera en befintlig installation](#uppdatera-en-befintlig-installation)**
- **[Felsökning](#felsökning)**
- **[Var program och driftdata sparas](#var-program-och-driftdata-sparas)**

**Redan installerat från det tidigare installationsförrådet?** Kör den nya installationsraden för din dator en gång enligt [uppdateringsavsnittet](#uppdatera-en-befintlig-installation). Det flyttar uppdateringarna till huvudförrådet och behåller dina inställningar och driftdata.

## Raspberry Pi 5

### 1. Ta fram det här

- Raspberry Pi 5, strömförsörjning för Pi 5 och kylning.
- microSD-kort på minst 32 GB och en kortläsare till din Mac eller PC. Kortet kommer att raderas.
- En Mac eller Windows-dator med internet, för att skriva minneskortet och ansluta med SSH.
- Nätverkskabel till routern eller uppgifter till ditt Wi-Fi.
- HDMI-skärm och rätt micro-HDMI-kabel om ställverket ska visas på Pi:n. Tangentbord och mus behövs om du vill arbeta direkt på Pi:ns skrivbord.
- Valfritt: Stream Deck, USB-LocoBuffer eller BTLocoBridge. De behövs inte för att installera och komma igång utan ansluten LocoNet.

Datorn och Pi:n ska vara anslutna till samma lokala nätverk. Internet behövs under installation och uppdatering.

### 2. Skriv operativsystemet på minneskortet

1. På din **Mac eller PC**, öppna [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
2. Ladda ned versionen för din dator, installera den och öppna **Raspberry Pi Imager**.
3. Sätt minneskortet i datorns kortläsare.
4. Välj **Raspberry Pi 5** som enhet.
5. Välj **Raspberry Pi OS (64-bit)** med skrivbord. Välj inte **Lite** om Pi:ns egen skärm ska visa ställverket. Välj inte ett 32-bitars system.
6. Välj ditt minneskort under lagring. Kontrollera att det är rätt kort: allt på det raderas när du skriver det.
7. Öppna anpassningen av operativsystemet, **Customisation/Anpassning**. I äldre Imager heter det **Edit settings/Redigera inställningar**.
8. Ange följande värden. Exemplen nedan används i resten av guiden:

   | Inställning | Ange |
   |---|---|
   | Värdnamn / Hostname | `cda-tkl` |
   | Användarnamn / Username | `pi` |
   | Lösenord | Ett eget lösenord som du sparar |
   | Tidszon | `Europe/Stockholm` |
   | Tangentbord | Svenskt / `se` |
   | Wi-Fi | Ditt nätverksnamn och lösenord, land Sverige / `SE`; hoppa över vid nätverkskabel |

9. Under **Remote Access/Fjärråtkomst** (i äldre Imager **Services/Tjänster**): slå på **Enable SSH/Aktivera SSH** och välj **Use password authentication/Lösenordsautentisering**.
10. Spara inställningarna och fortsätt till skrivningen. Godkänn att inställningarna används och att kortet raderas.
11. Vänta tills både skrivning och verifiering är färdiga.
12. Mata ut minneskortet säkert från datorn och ta ur det.

`pi` är användaren du själv skapar i steg 8. Den finns inte automatiskt och har inget förinställt lösenord. Väljer du ett annat namn måste du använda det i SSH-kommandona nedan. Har du flera Pi-datorer ska varje Pi ha ett eget värdnamn.

### 3. Starta Pi:n

1. Sätt minneskortet i Pi:n när strömmen är urkopplad.
2. Anslut nätverkskabel om du använder kabel.
3. Anslut eventuell skärm, tangentbord och mus.
4. Anslut strömmen sist.
5. Vänta några minuter. Första starten kan göra en automatisk omstart.

### 4. Öppna rätt terminal på din Mac eller PC

Du använder din vanliga dator för att logga in på Pi:n:

- **Mac:** tryck **⌘ + mellanslag**, skriv `Terminal` och tryck **Retur**.
- **Windows:** öppna Start, skriv `Windows PowerShell` och öppna programmet. Du behöver inte välja ”Kör som administratör”.

Skriv eller klistra in följande rad och tryck **Retur**:

```sh
ssh pi@cda-tkl.local
```

Första gången frågar SSH om du vill ansluta till den nya datorn. Kontrollera att adressen är din Pi, skriv `yes` och tryck **Retur**. Skriv därefter lösenordet som du valde i Imager och tryck **Retur**. **Inga tecken eller stjärnor visas medan du skriver lösenordet.** Det är normalt.

Visas i stället **WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!**, följ [stegen för ändrad SSH-värdnyckel](#pi-ssh-varnar-att-värdnyckeln-har-ändrats) innan du fortsätter.

När inloggningen har lyckats visas en kommandorad ungefär så här:

```text
pi@cda-tkl:~ $
```

Nu körs kommandona du skriver **på Pi:n**. Fönstret är fortfarande öppet på din Mac eller PC, men installationen hamnar på Pi:n.

**Om `cda-tkl.local` inte hittas:** öppna Terminal direkt på Pi:ns skrivbord och kör:

```sh
hostname -I
```

Använd Pi:ns lokala IPv4-adress i stället. Om den till exempel är `192.168.1.42`, kör på din Mac eller PC:

```sh
ssh pi@192.168.1.42
```

`192.168.1.42` är bara ett exempel, inte en fast adress för CDA-TKL. Utan skärm kan du hitta Pi:ns adress i routerns lista över anslutna enheter under namnet `cda-tkl`.

**Alternativ utan SSH:** öppna Terminal på Pi:ns eget skrivbord och fortsätt med steg 5 där.

### 5. Installera CDA-TKL på Pi:n

Kör följande i terminalen där du är inloggad på Pi:n. Kör en rad i taget och vänta tills den är klar innan du fortsätter:

```sh
sudo apt-get update
sudo apt-get install -y curl ca-certificates
curl -fsSL https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.sh -o /tmp/cda-tkl-install.sh
sudo sh /tmp/cda-tkl-install.sh
```

Om `sudo` frågar efter lösenord använder du Pi-användarens lösenord. Installationen hämtar programmet och Node.js, installerar beroenden och skapar tjänsterna. Räkna med flera minuter. Låt terminalen vara öppen. Om en rad ger ett fel: lös felet innan du fortsätter, se [felsökning](#felsökning).

Till slut ska det stå att **Charlottendal TKL … är installerad och startar automatiskt**, följt av beskedet om automatisk omstart. Efter omstarten kan du vid behov ansluta med SSH igen och kontrollera tjänsterna:

```sh
systemctl is-active cda-tkl cda-tkl-simulator
curl -fsS http://127.0.0.1:8910/api/config > /dev/null && echo "TKL svarar"
```

Det ska komma två rader med `active` och därefter `TKL svarar`.

### 6. Vänta på automatisk omstart och öppna ställverket

Efter en lyckad **förstagångsinstallation** startar Pi:n om automatiskt efter en minut. Du behöver inte skriva `sudo reboot`. Slutmeddelandet talar om när omstarten är beställd.

SSH-förbindelsen bryts när Pi:n startar om. Det är väntat och betyder inte att installationen misslyckats. Vänta tills Pi:n har startat igen. En installation som avbryts med fel beställer ingen omstart.

Har du valt bort omstarten med `sudo CDA_TKL_REBOOT=0 sh /tmp/cda-tkl-install.sh` kan du starta om senare med `sudo reboot`. Vanliga uppdateringar startar om TKL-programmet utan att starta om hela Pi:n.

På Raspberry Pi OS med skrivbord och **labwc** ställer installationen in automatisk skrivbordsinloggning och Chromium i helskärm. Ställverket ska därför öppnas på Pi:ns skärm efter omstarten. Om det inte öppnas, öppna Chromium på Pi:n och skriv följande i adressfältet:

```text
http://127.0.0.1:8910
```

Fortsätt med [Första gången i ställverket](#första-gången-i-ställverket).

### 7. Öppna Pi:ns ställverk från din Mac eller PC

TKL lyssnar som standard bara på Pi:n. För att komma åt det via din vanliga dator använder du en SSH-tunnel. Öppna ett terminalfönster på **din Mac eller PC** och kör:

```sh
ssh -o ExitOnForwardFailure=yes -L 127.0.0.1:8910:127.0.0.1:8910 pi@cda-tkl.local
```

Ange Pi:ns lösenord och låt terminalfönstret vara öppet. Om du behövde en IP-adress i steg 4 använder du samma adress här i stället för `cda-tkl.local`.

Öppna sedan webbläsaren på **din Mac eller PC** och skriv:

```text
http://127.0.0.1:8910
```

Nu visas **Pi:ns** ställverk på din dator. Port 8910 på din Mac eller PC måste vara ledig; kör du redan TKL lokalt där måste du stoppa den kopian först, eller använda Pi:ns egen skärm. Om SSH skriver att porten redan används ska du inte fortsätta till webbläsaren, eftersom du då kan hamna i den lokala kopian. Stänger du SSH-fönstret försvinner tunneln, men TKL fortsätter köra på Pi:n. Avsluta tunneln genom att skriva `exit` i SSH-fönstret och trycka Retur.

Adressen `http://cda-tkl.local:8910` fungerar inte direkt med standardinstallationen. För en separat rangerarstation eller åtkomst direkt över nätverket finns [avancerade Pi-anvisningar](docs/raspberry-pi.md#10-nå-pin-från-en-annan-dator).

## Mac

### 1. Kontrollera förutsättningarna

- macOS 13 Ventura eller senare, med Apple Silicon eller Intel.
- Internetanslutning under installation och uppdatering.
- Google Chrome rekommenderas om du vill använda den skapade appens eget fönster. För Stream Deck använder du Chrome eller Microsoft Edge; Safari saknar den enhetsanslutning som behövs.

Om du vill ha Chrome: öppna [Google Chrome](https://www.google.com/chrome/), ladda ned Mac-versionen, öppna den hämtade `.dmg`-filen och dra Chrome till **Program**. Starta Chrome en gång och slutför dess första start.

### 2. Öppna Terminal

1. Tryck **⌘ + mellanslag**.
2. Skriv `Terminal`.
3. Tryck **Retur**.

Du behöver inte ansluta med SSH för att installera på den Mac du sitter vid.

### 3. Installera

Klistra in följande i Terminal, en rad i taget, och tryck **Retur** efter varje rad:

```sh
curl -fsSL https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.sh -o /tmp/cda-tkl-install.sh
sh /tmp/cda-tkl-install.sh
```

**Kör utan `sudo`.** Installationen ska tillhöra ditt vanliga användarkonto. Om du fortfarande är SSH-inloggad på en Pi: skriv `exit` först eller öppna ett nytt Terminal-fönster på Macen.

Vänta tills det står att **Charlottendal TKL … är installerad och startar när du loggar in**. Installationen skapar en app och öppnar panelen. Du behöver inte installera Node.js eller några utvecklingsverktyg separat.

### 4. Öppna och kontrollera

1. Om panelen inte öppnades automatiskt: öppna webbläsaren och gå till [http://127.0.0.1:8910](http://127.0.0.1:8910).
2. Följ [Första gången i ställverket](#första-gången-i-ställverket).
3. Öppna Finder → **Program** och leta efter **Charlottendal TKL**. Om appen inte finns där: välj **Gå → Gå till mapp**, skriv `~/Applications` och tryck Retur.
4. Dra gärna appen till Dock. Den öppnar panelen igen nästa gång.

TKL startar automatiskt när du loggar in på Macen och fortsätter köra när du stänger Terminal eller panelens fönster. Datorn måste vara vaken för att ställverket ska vara tillgängligt.

## PC med Windows

### 1. Kontrollera förutsättningarna

- Windows 10 eller 11, 64-bitars (x64 eller ARM64).
- Microsoft Edge eller Google Chrome. Edge följer normalt med Windows och fungerar med Stream Deck.
- Internetanslutning under installation och uppdatering.
- Du ska vara inloggad på det Windows-konto som ska använda TKL. Administratörsrättigheter behövs inte.

### 2. Öppna Windows PowerShell

1. Klicka på **Start**.
2. Skriv `Windows PowerShell`.
3. Klicka på **Windows PowerShell**. Välj vanlig start.

Använd Windows PowerShell, inte Kommandotolken (`cmd`). Om fönstret är SSH-inloggat på en Pi ska du öppna ett nytt PowerShell-fönster på PC:n.

### 3. Installera

Klistra in följande i PowerShell, en rad i taget, och tryck **Retur** efter varje rad:

```powershell
$TklInstaller = Join-Path $env:TEMP 'cda-tkl-install.ps1'
Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.ps1' -OutFile $TklInstaller
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $TklInstaller
```

Den sista raden tillåter det hämtade skriptet i just den PowerShell-processen. Den ändrar inte datorns permanenta skriptpolicy. Vänta medan programmet, en egen Node.js 22 och beroendena hämtas och installeras. Låt fönstret vara öppet.

Till slut ska det stå att **Charlottendal TKL … är installerad och startar när du loggar in**. Panelen öppnas och genvägen **Charlottendal TKL** skapas på skrivbordet. Om texten **Installationen avbröts** visas, se [felsökning](#felsökning).

### 4. Öppna och kontrollera

1. Om panelen inte öppnades automatiskt: öppna Edge och gå till [http://127.0.0.1:8910](http://127.0.0.1:8910).
2. Följ [Första gången i ställverket](#första-gången-i-ställverket).
3. Använd skrivbordsgenvägen **Charlottendal TKL** när du vill öppna panelen igen.

TKL startar dolt när du loggar in på Windows. Du kan stänga PowerShell och panelen efter en lyckad installation; tjänsten fortsätter köra i din användarsession. Datorn måste vara vaken.

## Första gången i ställverket

Dessa steg gäller alla tre plattformarna:

1. Öppna **Kom igång** i ställverket. Om guiden inte redan visas: klicka på dess chip eller välj **⋯ → Kom igång**.
2. Skapa ägaren med din e-postadress och ett eget lösenord. Pi-användarens eller datorns lösenord är separat från TKL-kontot. Spara uppgifterna; ägaren används för skyddade inställningar.
3. Börja med **LocoNet ej ansluten**. Då kan du kontrollera panelen och programmets egen återrapport utan att ansluta banan.
4. Ska du ansluta till TrainMeet? Öppna din TrainMeet Server i webbläsaren, logga in som administratör och välj **Drift → Anslut en box**. Kopiera serveradressen och anslutningskoden. I TKL väljer du **⋯ → TrainMeet**, fyller i adressen och koden och klickar **Anslut**. TKL väljer stationen själv. För en första lokal kontroll kan du hoppa över TrainMeet i Kom igång.
5. AI-funktionerna är valfria. Har du en Anthropic-nyckel kan du lägga in den under **Inställningar → Den här datorn → AI-tjänst**. Annars hoppar du över det steget. Ingen AI-nyckel behövs för själva installationen eller ställverkets grundfunktioner.
6. Med Stream Deck: anslut USB-kabeln och stäng Elgatos egen app om den körs. Öppna **⋯ → Stream Deck** i TKL. På Mac och PC klickar du **Anslut** och väljer enheten i webbläsarens dialog. På Pi:ns lokala Chromium ställer installationen in automatisk anslutning. Om den uteblir, anslut via samma meny.
7. När du ska använda fysisk LocoNet: följ [LocoNet-anvisningen](docs/loconet-anslutning.md) för LocoBuffer eller BTLocoBridge och välj anslutningen under **Inställningar → Banan (LocoNet)**. Windows använder BTLocoBridges utgående COM-port. Verklig utrustning och driftbindningar behöver kontrolleras vid banan innan fysisk körning.

För installation på den egna datorn öppnar du `http://127.0.0.1:8910`. Adressen betyder alltid **datorn där webbläsaren körs**. För Pi via SSH-tunneln använder du i stället `http://127.0.0.1:8910` på din Mac eller PC.

## Uppdatera en befintlig installation

### Flytta från det tidigare installationsförrådet

Kör detta en gång även om den gamla panelen inte kan hitta en uppdatering. Använd samma dator och samma användarkonto som vid installationen. Avinstallera ingenting och ta inte bort driftdata.

**Raspberry Pi:** logga in med `ssh pi@cda-tkl.local` och kör på Pi:n:

```sh
curl -fsSL https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.sh -o /tmp/cda-tkl-install.sh
sudo sh /tmp/cda-tkl-install.sh
```

**Mac:** kör i Macens Terminal, utan `sudo`:

```sh
curl -fsSL https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.sh -o /tmp/cda-tkl-install.sh
sh /tmp/cda-tkl-install.sh
```

**Windows:** kör i Windows PowerShell på PC:n:

```powershell
$TklInstaller = Join-Path $env:TEMP 'cda-tkl-install.ps1'
Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/beahead-ab/cda-tkl/main/install.ps1' -OutFile $TklInstaller
powershell.exe -NoProfile -ExecutionPolicy Bypass -File $TklInstaller
```

Installationen ersätter programversionen och uppdateringsskripten. Inställningar, konton och driftdata behålls. En uttryckligt sparad adress till det tidigare standardförrådet flyttas till `beahead-ab/cda-tkl`; ett eget stationsförråd behålls. Äldre installationer kan inte automatiskt upptäcka flytten när det gamla repot har tagits bort: därför behövs den här manuella körningen.

### Senare uppdateringar

1. Välj en tid när ställverket kan startas om.
2. Klicka på uppdateringsnotisen i panelen eller öppna **Inställningar → Uppdatering**.
3. Sök efter en ny version och välj **Uppdatera nu**.
4. Vänta tills uppdateringen är klar och ladda om panelen om det behövs.
5. Kontrollera versionsnumret och anslutningarna.

Du kan också alltid köra installationsraderna ovan igen. På Pi går det efter flytten även att köra `sudo cda-tkl-update`. Om en ny version inte svarar under installationens startkontroll försöker installeraren återställa föregående version.

En uppdatering startar om TKL. Sparade tågvägslås behålls, men körmedgivanden återupptas inte automatiskt. Kontrollera läget efter omstarten.

## Felsökning

### Pi: SSH hittar inte datorn

- Kontrollera ström, att första starten är klar och att datorn och Pi:n är på samma nät. Gästnät kan hindra kontakt mellan enheter.
- Prova Pi:ns riktiga IP-adress enligt Pi-avsnittets steg 4.
- **Connection refused:** kontrollera att SSH är aktiverat. På Pi:ns lokala terminal kan du köra `sudo raspi-config` och aktivera SSH under **Interface Options → SSH**.
- **Permission denied:** kontrollera användarnamnet och lösenordet från Imager. Användaren behöver inte heta `pi`.
- Om Windows säger att `ssh` inte finns: öppna Inställningar, sök efter **Valfria funktioner**, välj att lägga till **OpenSSH-klient** och öppna sedan ett nytt PowerShell-fönster.

### Pi: SSH varnar att värdnyckeln har ändrats

Om SSH visar följande och avbryter inloggningen:

```text
WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!
Host key verification failed.
```

Din Mac eller PC har sparat en annan SSH-värdnyckel för adressen i filen `known_hosts`. Det kan hända när du har skrivit om Pi:ns minneskort eller när en annan dator har fått samma IP-adress. Varningen kan också betyda att du ansluter till fel dator. **Kontrollera vilken Pi adressen tillhör och om nyckelbytet är väntat. Vid ett oväntat byte ska du verifiera det nya fingeravtrycket innan du ersätter den sparade nyckeln.**

Exemplet nedan gäller `ssh admin@192.168.0.160`. Byt adress och användarnamn mot dina egna; guiden i övrigt använder `pi@cda-tkl.local`.

**Rättelsen görs på datorn du ansluter från.** Du kan alltså ta bort den gamla posten och ansluta igen helt från Macens Terminal eller PC:ns PowerShell. Filen `known_hosts` i varningen ligger på den datorn, inte på Pi:n.

#### Utan skärm på Pi:n

**Har du själv just installerat om Pi:n?** Kontrollera i routerns lista över anslutna enheter att `192.168.0.160` verkligen tillhör just den Pi:n, till exempel genom dess tidigare kända MAC-adress. När du vet att du når din ominstallerade Pi kan du godkänna dess nya nyckel som vid en första anslutning. Kör en rad i taget på **Macen eller PC:n**:

```sh
ssh-keygen -R 192.168.0.160
ssh admin@192.168.0.160
```

Vid frågan om den nya nyckeln skriver du `yes` och trycker **Retur**. Ange därefter lösenordet du valde när du installerade Pi:n. Detta är ett nytt godkännande av värdnyckeln; det är inte en oberoende kontroll av fingeravtrycket. Om nyckelbytet är oväntat eller du är osäker på datorns identitet, använd kontrollen nedan innan du godkänner något.

**Har du en redan öppen, betrodd SSH-session till samma Pi?** Behåll den öppen och kör följande där:

```sh
hostname -I
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Du kan också använda ett annat tidigare verifierat värdnamn för samma Pi, till exempel `ssh admin@cda-tkl.local`, om dess sparade värdnyckel fortfarande godtas utan nyckelvarning eller fråga om en okänd nyckel. Jämför fingeravtrycket med varningen. När det stämmer öppnar du ett **nytt lokalt terminalfönster på Macen eller PC:n** och kör de två rättningsraderna ovan. Skriv `yes` först när det nya fingeravtrycket stämmer.

Om ingen betrodd SSH-väg finns kan den blockerade anslutningen inte själv bevisa Pi:ns identitet. Använd då en betrodd konsol eller den lokala kontrollen nedan. Att bara hämta nyckeln med `ssh-keyscan` ger ingen sådan verifiering, se [OpenSSH:s manual](https://man.openbsd.org/ssh-keyscan.1).

#### Kontrollera med skärm och tangentbord på Pi:n

1. Anslut skärm och tangentbord till **Pi:n** och öppna Terminal på dess skrivbord. Kör:

   ```sh
   hostname -I
   ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
   ```

   Kontrollera att IP-adressen är den du försöker nå. Jämför hela fingeravtrycket som börjar med `SHA256:` med det som visas i SSH-varningen på din Mac eller PC. Det här gäller varningens **ED25519**-nyckel. Om fingeravtrycken skiljer sig, eller om du inte kan kontrollera dem, avbryt och ta reda på vilken dator du ansluter till.

2. **När adressen och fingeravtrycket är bekräftade:** gå tillbaka till Terminal på **Macen**, eller PowerShell på **PC:n**, och kör:

   ```sh
   ssh-keygen -R 192.168.0.160
   ```

   Kommandot tar bort sparade värdnycklar för just den adressen, även om adressen är dold i `known_hosts`. Övriga värdar behålls. Originalfilen sparas som `known_hosts.old`. Du behöver inte redigera den angivna raden, till exempel rad 20, för hand eller radera hela filen.

3. Anslut igen från **Macen eller PC:n**:

   ```sh
   ssh admin@192.168.0.160
   ```

4. SSH frågar nu om den nya nyckeln ska godkännas. Kontrollera åter att fingeravtrycket stämmer med det du läste direkt på Pi:n. Skriv `yes`, tryck **Retur**, ange Pi-användarens lösenord och tryck **Retur** igen. Inga tecken visas när lösenordet skrivs.

Om varningen gäller värdnamnet `cda-tkl.local`, använd i steg 2 i stället `ssh-keygen -R cda-tkl.local` och anslut sedan med `ssh pi@cda-tkl.local`. Använder du både IP-adress och värdnamn kan båda ha gamla sparade nycklar; ta bara bort posterna för den Pi vars nya nyckel du har kontrollerat.

Låt SSH:s kontroll av värdnyckeln vara påslagen. Kommandona beskrivs i [OpenSSH:s manual för ssh-keygen](https://man.openbsd.org/ssh-keygen.1).

### Pi: panelen öppnas inte

Logga in på Pi:n och kör:

```sh
systemctl status cda-tkl cda-tkl-simulator --no-pager
sudo journalctl -u cda-tkl -u cda-tkl-simulator -n 60 --no-pager
```

Starta om tjänsterna vid behov:

```sh
sudo systemctl restart cda-tkl-simulator cda-tkl
```

Om tjänsterna är aktiva men ingen panel syns på den anslutna skärmen: kontrollera att du installerade Raspberry Pi OS med skrivbord. Öppna Chromium och `http://127.0.0.1:8910` för hand. Automatisk helskärm förutsätter skrivbordsmiljön labwc.

### Mac: panelen öppnas inte

Öppna Terminal och kör:

```sh
launchctl print "gui/$(id -u)/se.beahead.cda-tkl"
tail -n 60 "$HOME/Library/Application Support/Charlottendal TKL/logs/tkl.log"
```

Starta om vid behov:

```sh
launchctl kickstart -k "gui/$(id -u)/se.beahead.cda-tkl"
```

Öppna sedan `http://127.0.0.1:8910` i webbläsaren. Om autostarten inte kunde registreras: logga ut från macOS, logga in igen och kör installationsraderna en gång till om felet kvarstår.

### Windows: panelen öppnas inte

1. Tryck **Windows + R**.
2. Klistra in `%LOCALAPPDATA%\Charlottendal TKL\logs` och tryck **Retur**.
3. Öppna `tkl.log`. Vid uppdateringsfel finns även `update.log`.
4. Logga ut från Windows och logga in igen för att starta om TKL. Öppna sedan `http://127.0.0.1:8910` i Edge.
5. Om installationen avbröts: kör installationsraderna igen och spara feltexten om felet återkommer. Om datorn förvaltas av en organisation och blockerar skript eller nedladdningar behöver dess IT-ansvariga hjälpa till.

### Hämtningen eller starten misslyckas

Kontrollera internetanslutningen och att hela kommandot kopierats. Alla adresser i den här guiden går till det publika huvudförrådet. Du ska inte behöva ange GitHub-inloggning. Kör inte nästa rad om hämtningen misslyckas.

Om port 8910 redan används: stäng den andra TKL-kopian, exempelvis en utvecklingskopia som körs i en annan terminal. Kör sedan installationen igen. Standardinstallationen lyssnar bara lokalt och behöver ingen öppning av port 8910 i routern.

## Var program och driftdata sparas

| Plattform | Program och versioner | Inställningar | Driftdata |
|---|---|---|---|
| Raspberry Pi | `/opt/cda-tkl/` | `/etc/cda-tkl/app.env` | `/var/lib/cda-tkl/` |
| Mac | `~/Library/Application Support/Charlottendal TKL/` | `app.env` i samma mapp | `state/` i samma mapp |
| Windows | `%LOCALAPPDATA%\Charlottendal TKL\` | `app.env` i samma mapp | `state\` i samma mapp |

Ta en säkerhetskopia av både inställningarna och driftkatalogen medan TKL är stoppat. Konton och eventuella sparade tjänstenycklar finns i driftdatan; förvara kopian privat. På Pi finns [steg för säkerhetskopiering](docs/raspberry-pi.md#11-säkerhetskopiera).

## Mer hjälp

- [Användare och inloggning](docs/anvandare.md)
- [LocoNet: USB och Bluetooth](docs/loconet-anslutning.md)
- [Avancerad Pi-installation, nätverksåtkomst och säkerhetskopiering](docs/raspberry-pi.md)
- [Handhavande](docs/panel-och-verktyg.md)
- [Projektets läge och verifiering](docs/status.md)

Imager och SSH-stegen bygger på Raspberry Pis officiella anvisningar för [installation](https://www.raspberrypi.com/documentation/computers/getting-started.html) och [fjärråtkomst](https://www.raspberrypi.com/documentation/computers/remote-access.html). Menynamnen kan skilja sig mellan Imager-versioner; använd värdena i tabellen ovan.
