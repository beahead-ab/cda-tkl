# Ren panel och separat verktygssida

Version 0.17.0 öppnar ett renodlat ställverk på `/#panel`. Spårplan, signaler, växelpluppar och tågnummer finns kvar på sina platser. Den lilla överkanten innehåller namn, anslutningsstatus, tågvägstyp, Alla signaler i stopp och länken Verktyg. Hjälpen för start/slut visas bara under ett pågående val.

## Verktyg

`/#tools` samlar stödfunktionerna i fem avsnitt:

- **Trafik:** aktiva tågvägar och återtagning, tågvägslistor, objektinformation samt inkommande tåg, nummerregistrering och nummerföljning.
- **Manövrer:** lokal-/fjärrläge, nödåtertagning, spår- och linjespärrar, programmeringsspår och modellklocka.
- **Utseende:** panelutseende, zoom, ljud och teckenförklaring.
- **Anslutningar:** anläggningssimulator, TrainMeet och befintligt kontolänkval.
- **Händelser:** journal, protokolltrafik och telegraminspelning.

Anläggningsregistret finns kvar på `/#register`. Sidnavigationen och Tillbaka till ställverket återför till panelen. Webbläsarens bakåt/framåt och direktöppning av sidans adress fungerar. Funktionen Visa/Dölj verktyg på själva panelsidan är ersatt av sidbytet; profilpresentation, permanent instruktionstext, teckenförklaring och versionsfot visas inte på panelsidan.

## Kontext och bevarat tillstånd

Signaluppgifter öppnas vid klick i en tillfällig detaljruta på panelen. Kompisväxelmarkering och dess informationsruta visas vid manöver/fokus. Visa Vx… från Verktyg återgår till panelen och rullar fram växeln utan order. Klick på ett registrerat tågnummer i spårplanen öppnar motsvarande fält på Verktyg.

Aktiva stopp, fjärrläge och felmeddelanden visas även när panelen är renodlad. Befintliga spärrvillkor och driftdataformat är oförändrade. En sidväxling skickar inga fältorder och bygger inte om spårplanen eller de förladdade signalbilderna. Pågående tågvägar och inmatningsutkast bevaras; ett halvfärdigt start-/slutval avbryts vid sidbyte. Väljaren för huvud-/växeltågväg är synkroniserad mellan panelen och tågvägslistan.

Inga driftfunktioner har raderats. Framtida tillägg på panelen kan väljas separat utan att först behöva återställa verktygen. Någon redigerare för egna panelmoduler ingår inte i denna ändring.

## Prov

- Ren panel granskad i 1280 och 390 pixlars bredd. Verktyg, avsnittslänkar och återväg granskade i båda bredderna; fönsterstorleken återställd efter provet.
- Direkt omladdning av `#tools`, bakåtknapp, öppning av anläggningsregister och återgång till panelen.
- Osparat P1700 behölls över sidbyte/bakåt. Numret sparades till SIA, visades på spårplanen och öppnade rätt verktygsfält vid klick. Provnumret tömdes efteråt.
- Cu → Spår 1c lades i panelen, behölls vid sidbyte och registerbesök, och återtogs från Verktyg. Noll lås kvar.
- Signal 1/5 öppnade detaljer på panelen; stängning återförde detaljrutan till Verktyg. Visa Vx101 från Verktyg öppnade panelen och behöll markeringen av båda växlarna, utan omläggning.
- AIS aktiverades och visades på båda sidor; återställd efter bekräftat stopp. Huvud-/växeltågvägstyp provades mellan båda sidor och återställdes till huvudtågväg.
- Inga konsolfel eller varningar. Lokal syntaxkontroll och sex processhelhetstester godkända. Inga nya tester som enbart speglar sidornas markup har tillförts.
