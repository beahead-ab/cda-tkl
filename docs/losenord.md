# Lösenordsinloggning

Webbdrift använder `CHARLOTTENDAL_AUTH_MODE=password` och den separata filen `CHARLOTTENDAL_AUTH_FILE`. Lokal körning utan publik adress är oförändrad.

Första lösenordet skapas med `scripts/initialize-password.mjs`, via standard input, aldrig som kommandoradsargument. Skriptet vägrar skriva över en befintlig fil. Första inloggningen måste följas av lösenordsbyte innan panelens eller simulatorns API blir tillgängligt. Nya lösenord har 12–128 tecken.

Lösenord lagras med individuellt salt och scrypt (N=131072, r=8, p=1). Sessionsnycklar är 32 slumpbyte; bara deras SHA-256-hash lagras. Sessioner gäller 12 timmar och skickas i en Secure, HttpOnly, SameSite=Strict, __Host-cookie. Lösenordsbyte avslutar alla gamla sessioner och TKL:s händelseströmmar. Utloggning återkallar aktuell session. Fem misslyckade försök per minut tillåts totalt, även över omstart. POST kräver korrekt Origin.

## Serverinstallation

Skapa systemgruppen `charlottendal-auth` och katalogen `/var/lib/charlottendal-auth`, ägd av `charlottendal:charlottendal-auth`, med rättighet 2750. Båda systemtjänsterna har gruppen som tilläggsgrupp. TKL får skriva i katalogen; simulatorn får endast läsa. Filen har rättighet 0640. Anläggningstillstånden delas inte.

Kör initieringen som `charlottendal` med `CHARLOTTENDAL_AUTH_FILE=/var/lib/charlottendal-auth/auth.json`. Spara inte det tillfälliga lösenordet i Git eller loggar. Säkerhetskopiera lösenordsfilen och håll den skyddad på samma sätt som originalet. Vanliga lösenordsbyten sker på `/account` via **Byt lösenord** i panelen.

Alternativet `CHARLOTTENDAL_AUTH_MODE=cloudflare` behåller tidigare JWT-verifiering och kräver inställningarna i `deploy/app.env.example`. Två yttre inloggningsflöden bör inte läggas ovanpå varandra av misstag.

## Provning

`npm run test:integration` testar båda verkliga processerna: nekad anonym åtkomst, obligatoriskt första byte, fel lösenord, cookies, sessionsåterkallelse, CSRF, beständig session över omstart, förfallna sessioner och begränsning av gissningar över omstart. Testlösenorden gäller enbart temporära testfiler som raderas efteråt.
