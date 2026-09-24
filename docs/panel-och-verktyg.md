# Ren panel och separat verktygssida

Version 0.17.0 öppnar ett renodlat ställverk på `/#panel`. Spårplan, signaler, växelpluppar och tågnummer finns kvar på sina platser. Den lilla överkanten innehåller namn, anslutningsstatus, tågvägstyp, Alla signaler i stopp och länken Verktyg. Hjälpen för start/slut visas bara under ett pågående val.

## Fullskärm (0.17.1)

Knappen **Fullskärm** bredvid Verktyg använder webbläsarens fullskärmsläge. Samma knapp byter till **Avsluta fullskärm**. Escape lämnar fullskärmen; pågående startval och öppna uppgifter bevaras när fullskärmsläget växlas. Webbläsarens egna ändringar uppdaterar knappens text, ikon och tillgängliga läge.

Hela appdokumentet visas i fullskärm, så stopp, felmeddelanden och tillfälliga informationsrutor finns kvar. Verktyg och anläggningsregister går att använda i samma läge. Ingen spårplan eller signalbild laddas om och inga manöverorder skickas av knappen. Om webbläsaren inte stöder eller tillåter funktionen visas ett meddelande.

Webbläsarprov: in/ut via knapp, Enter, Escape, signaluppgifter, Verktyg och tillbaka, bibehållet Cu-startval samt knapprad vid 390 pixlars bredd. Provvalet avbrutet och normal fönsterstorlek återställd. Inga konsolfel. Stödet följer [Fullscreen API](https://fullscreen.spec.whatwg.org/); äldre WebKit-anrop finns som reserv men har inte provats i en äldre Safari-version.

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


## Publicering

Version 0.17.0 (`bea8a85`) publicerad 24 september 2026 kl. 07:14 svensk tid på [cda-tkl.trainmeet.app](https://cda-tkl.trainmeet.app). Serverns 134 enhetstester och sex helhetstester passerade före byte. Backup och efterkontroller är dokumenterade i [driftuppgifterna](drift.md).


Version 0.17.1 (`97c6546`) med fullskärmsknappen publicerad 24 september 2026 kl. 07:27 svensk tid. Lokal webbläsarkontroll och syntax samt serverns 134 enhetstester, sex helhetstester och importkontroller godkända. Backup och extern efterkontroll godkända enligt driftuppgifterna.
