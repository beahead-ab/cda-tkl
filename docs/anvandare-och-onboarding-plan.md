# Användare, AI-tjänst och onboarding

Plan från 5 oktober 2026, efter att Studio (steg 1–6) mergats som cda-tkl#12. Tre önskemål från
Casper, i den ordning de bygger på varandra.

## 1. AI-motor och nyckel i appens inställningar

Studio använder Claude API för chatten och AI-genomgången. Valet av modell och nyckeln ska
ligga i appens inställningar, där administratören har tillgång, inte bara i serverns miljöfil.

- Inställningen sparas av TKL-servern i `ai.json` i tillståndskatalogen (rättighet 0600).
  Nyckeln skickas aldrig tillbaka till webbläsaren; sidan visar bara de fyra sista tecknen.
- Modeller som fungerar med lösningen (strukturerade svar och adaptivt tänkande):
  `claude-opus-5-5` (standard), `claude-sonnet-5-5` (snabbare och billigare) och
  `claude-fable-5-1` (mest kapabel, dyrare). Inget annat går att välja.
- Ett provanrop visar att nyckeln och modellen fungerar innan de sparas.
- Miljövariabeln `ANTHROPIC_API_KEY` finns kvar som reservvärde för installationer som sätter
  den där; inställningen i appen går före.
- Sidan: Inställningar → Den här datorn → AI-tjänst. Kräver administratör.

## 2. Användare och inloggning, som i TrainMeet Server

Samma modell som server.trainmeet.app, men funktionellt självständig: TKL har sin egen
användarlista och kan köras utan nät och utan TrainMeet.

- **Konton** i `users.json` i tillståndskatalogen: användarnamn (3–64 tecken, skiftlägesokänsligt
  unikt), roll, lösenord lagrat med individuellt salt och scrypt, sessioner som bara lagras som
  SHA-256-hash och gäller 12 timmar, försöksbegränsning.
- **Roller:** ägaren lägger till och tar bort användare och byter roll; administratören sköter
  allt annat. Den sista ägaren kan inte tas bort eller degraderas.
- **Inbjudan:** ägaren skapar kontot och får en engångskod (åtta tecken, sju dagar, en gång). Den
  som bjuds in löser in koden under "Jag har en inbjudningskod" på inloggningssidan och väljer sitt
  eget lösenord. Ingen sätter någon annans lösenord. Glömt lösenord: en engångskod skrivs ut av
  `scripts/recover-user.mjs` i serverns terminal; beviset är fysisk åtkomst till maskinen.
- **Vem du är och var du står.** Ställverket (`/`) körs av operatören. Lokalt (Mac, Raspberry Pi,
  lokalnätet) kräver det ingen inloggning. Inställningar, Studio och administrationens API-vägar
  kräver alltid en inloggad administratör. I molnet (`CHARLOTTENDAL_AUTH_MODE=password`, HTTPS)
  kräver allt inloggning, som i dag.
- **Före första ägaren** är administrationen öppen från privat nät, så att onboardingen kan skapa
  den; öppningen stängs i samma anrop. I molnet skapas första ägaren med
  `scripts/create-owner.mjs`, eller genom att dagens `auth.json` migreras till ägaren `admin` med
  samma hash.
- Cloudflare-läget behålls oförändrat.

## 3. Onboarding vid nyinstallation

Ett nyinstallerat system ska inte kunna missa det som krävs för att det ska fungera som väntat.

- Vid första start visar ställverket **Kom igång**: 1 skapa ägaren, 2 AI-tjänst med provanrop,
  3 anslutningen till banan (simulator eller fysisk, läses ur installationen), 4 TrainMeet med eget
  TKL-id och parkoppling, 5 klart.
- Status sparas i `onboarding.json`. Varje steg kan göras senare från Inställningar, men
  statusraden visar "Kom igång · N steg kvar" tills allt är gjort.
- Fler uppgifter som visar sig krävas vid installation läggs till som steg här, inte som
  fotnoter i installationsguiden.

## Byggordning

1. AI-tjänst: inställning, sida, prov, Studio använder inställningen.
2. Användare: konton, roller, inbjudan, inloggningssidan, administrationens vägar, skripten,
   migreringen av dagens lösenord.
3. Onboarding: Kom igång med stegen ovan.
4. Installationsguiden och lösenordsdokumentet uppdaterade; webbdriften får ägaren migrerad.
