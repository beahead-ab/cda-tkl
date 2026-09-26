# Publicering 0.34.0 — 26 september 2026

Publicerad kod: `5e91df3`. Föregående release: `7b3e2bc`.

- Ellipsknappen öppnar hela administrationen direkt i ett stort fönster med gemensam vänsternavigering, stängknapp, fokusbegränsning och skydd för osparade ändringar. Panelen ligger kvar med samma storlek bakom fönstret.
- Tågvägskatalogen väljer bland giltiga alternativ utifrån hur många andra rörelser som kan lämnas tillgängliga. Det är en beräknad normalväg; ingen automatisk omledning runt en senare beläggning görs.
- Sammanhängande tågvägar kan utökas utan att den första delen förlorar sitt körmedgivande. Klick på ursprunglig start och kedjans nya slut begär återtagning av hela kedjan. Belagda delar behåller sina lås tills återtagningsvillkoren är uppfyllda.
- Övergångslampornas kontinuerliga, lugna växling från 0.33.2 ingår.

210 funktionstester och 8 integrationstester godkända på servern för `2cfe1fd`. Publicerad release har byteidentiska backendfiler, profiler, tester, skript och beroenden. Dessutom har syntaxkontroll och 10 tester för panelrendering, zoom och kalkylblad körts på den slutliga releasen.

Inför omstart kontrollerades noll sparade tågvägar, noll belagda spårledningar, inga tåg i rörelse, samtliga signaler i stopp och normal matning. Nya webbkommandon blockerades kort under versionsbytet. Driftfiler och inloggning säkerhetskopierades och inga sparade driftfiler återställdes eller tömdes.

Backup på servern: `/root/charlottendal-backups/network-5e91df3-20260926T013526Z`.

Efterkontroll: båda tjänsterna aktiva och anslutna, inga startfel, skyddade API:er kräver inloggning, driftinställningar och autentisering bevarade. Produktionsgränssnittet verifierat genom stängning till panel, direktöppning via ellips och navigation mellan Driftverktyg, Utseende och ljud samt Tidtabeller. Inga JavaScript-fel observerade i kontrollfliken. Även smal skärmbredd visade fast vänsternavigering och separat innehållsyta.
