# Ren panel och separat verktygssida

Ställverket öppnas på `/#panel`. Spårplan, signaler, växelpluppar och tågnummer finns kvar på sina platser. Från version 0.20.0 innehåller överkanten bara namn, anslutningsstatus och hamburgerknappen. Själva manöverfunktionerna finns under spårplanen.

## Manöverfält under spårplanen (0.20.0, lokalt färdigt)

Runda knappar med text ovanför följer JMRI-referensens nedre manöverfält; Trafikskärm använder kantigare knappar. Signaler, Tågvägar och Drift utgör tre grupper. På smal skärm bryts grupperna till nya rader utan sidledes överflöde.

- **Signaler:** Alla signaler i stopp och Återställ stopp. Återställning är bara tillgänglig när AIS är aktiv och servern tillåter den; gamla tågvägar återupptas inte automatiskt.
- **Tågvägar:** Huvudtågväg, Växeltågväg, Tågvägar, Avbryt val och Nödåterta alla. Tågvägar öppnar listval och aktiva vägars normala återtagning direkt nedanför knapparna. Antalet kvarvarande vägar syns på knappen.
- **Drift:** Spårspärrar, Linjer / prog., Tågnummer, Modellklocka och Fjärrmanövrering. De fyra första öppnar respektive befintligt manöverfält under raden; fjärrknappen byter driftläge enligt befintliga villkor. Ett tryckt fjärrval betyder fortfarande inte att ett fjärrsystem är anslutet.

Ett manöverfält visas åt gången och kan stängas med samma knapp, Stäng eller Escape inne i fältet. Formulärutkast bevaras vid fältbyte. Fälten återanvänder samma kontroller och serveranrop som tidigare; inga lås eller återrapportkrav nollställs när visningen öppnas, stängs eller byts. Nödåtertagning är fortsatt en stopp-/frigivningsbegäran och raderar inte lås.

Spårtexterna använder normalvikt 400, med befintliga typsnittsfamiljer, storlekar och positioner. Destinationsskyltar använder 500. Detta är en visuell anpassning till de smalare texterna i de fysiska ställverksreferenserna, inte ett påstående om exakt typsnittsidentifiering. JMRI-bilden och originalets XML har faktiskt fetare etiketter. Originaldata ändras inte och inga nya typsnitt laddas från nätet.

## Gemensam meny (0.19.0, lokalt färdig)

Hamburgerknappen samlar Ställverk, TrainMeet, Utseende och ljud, Anslutningar, Anläggningsregister, Händelser och loggar samt Fullskärm. Från 0.20.0 ligger trafik- och manöverfunktionerna under panelen. Simulator och Byt lösenord visas i menyn när installationen erbjuder dem. TrainMeet har en egen sida på `/#trainmeet` med serveradress, parkoppling och tåginformation.

Samma meny finns i sidhuvudet på stödsidorna. Den kan öppnas med tangentbord; pilknappar flyttar fokus. Escape stänger menyn före fullskärm eller startval, och klick utanför stänger den. Att bara öppna/stänga menyn bevarar panelens pågående startval. Menyn ryms även vid 390 pixlars bredd; längre menyer kan rullas.

## Fullskärm (0.17.1)

Knappen **Fullskärm**, från 0.19.0 placerad i menyn, använder webbläsarens fullskärmsläge. Samma knapp byter till **Avsluta fullskärm**. Escape lämnar fullskärmen när menyn är stängd; pågående startval och öppna uppgifter bevaras när fullskärmsläget växlas. Webbläsarens egna ändringar uppdaterar knappens text, ikon och tillgängliga läge.

Hela appdokumentet visas i fullskärm, så stopp, felmeddelanden och tillfälliga informationsrutor finns kvar. Verktyg och anläggningsregister går att använda i samma läge. Ingen spårplan eller signalbild laddas om och inga manöverorder skickas av knappen. Om webbläsaren inte stöder eller tillåter funktionen visas ett meddelande.

Webbläsarprov: in/ut via knapp, Enter, Escape, signaluppgifter, Verktyg och tillbaka, bibehållet Cu-startval samt knapprad vid 390 pixlars bredd. Provvalet avbrutet och normal fönsterstorlek återställd. Inga konsolfel. Stödet följer [Fullscreen API](https://fullscreen.spec.whatwg.org/); äldre WebKit-anrop finns som reserv men har inte provats i en äldre Safari-version.

## Verktyg

`/#tools` samlar stödfunktionerna i tre avsnitt:

- **Utseende:** panelutseende, zoom, ljud och teckenförklaring.
- **Anslutningar:** installationsöversikt samt länkar till TrainMeet och anläggningsregistret. Simulator och kontolänk finns i menyn.
- **Händelser:** journal, protokolltrafik och telegraminspelning.

Anläggningsregistret finns kvar på `/#register`. Sidnavigationen och Tillbaka till ställverket återför till panelen. Webbläsarens bakåt/framåt och direktöppning av sidans adress fungerar. Funktionen Visa/Dölj verktyg på själva panelsidan är ersatt av sidbytet; profilpresentation, permanent instruktionstext, teckenförklaring och versionsfot visas inte på panelsidan.

## Kontext och bevarat tillstånd

Från 0.19.1 öppnas information för växlar, signaler och vägövergångar med **högerklick**. En modalruta placeras intill klickpunkten och flyttas inåt vid skärmkanten. Muspekning och vanligt fokus öppnar ingen information. Vänsterklick på växelpluppen manövrerar fortfarande växeln, utan att öppna en ruta. Skift+F10 eller tangentbordets menyknapp öppnar samma information för fokuserat objekt; signaler och vägövergångar kan också öppnas med Enter.

Rutan samlar objektets uppgifter och, för växlar, kompisarnas återrapporter, spårstatus och spärrorsaker. Den uppdateras medan den är öppen. Stäng, Escape eller klick utanför stänger rutan och tar bort kompisringen. Bakgrunden kan inte manövreras medan rutan är öppen; klicket som stänger den skickas inte vidare till växelpluppen bakom. Escape stänger rutan före fullskärm och bevarar ett påbörjat startval. Rutan ryms i 390 pixlars bredd och rullar internt om höjden inte räcker.

Objektinformationen öppnas alltid i modalen; den tidigare separata växelväljaren på Verktyg behövs inte längre. Visa Vx… rullar fram växeln utan order. Klick på ett registrerat tågnummer i spårplanen öppnar motsvarande fält under manöverraden.

Aktiva stopp, fjärrläge och felmeddelanden visas även när panelen är renodlad. Befintliga spärrvillkor och driftdataformat är oförändrade. En sidväxling skickar inga fältorder och bygger inte om spårplanen eller de förladdade signalbilderna. Pågående tågvägar och inmatningsutkast bevaras; ett halvfärdigt start-/slutval avbryts vid sidbyte. Knapparna för huvud-/växeltågväg är synkroniserade med tågvägslistans väljare.

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

## Tidtabell som en del av ställverket (0.23.0)

Tidtabellen visas alltid direkt under spårplanen, före manöverknapparna. Den separata Tidtabell-knappen behövs därför inte längre. Fältet följer Original, Reläpanel och Trafikskärm och behåller en begränsad höjd: antalet kolumner anpassas till bredden och varje kolumn innehåller 2–4 tågrörelser beroende på fönstrets höjd.

Läs uppifrån och ned i en kolumn, sedan nästa till höger. Källans radordning bevaras. Vid 1280×720 ryms fyra kolumner med två rörelser vardera; vid 1920×1080 sex kolumner med tre. Nästa/Föregående visar resterande rörelser med ett tydligt intervall och totalantal. Sidans plats bevaras vid klock-/statusuppdatering. Vid storleksbyte behålls den första tidigare synliga rörelsen på den nya sidan. Fältet växer inte till en lång lista på en smal skärm.

Tågnummer, ankomst, avgång, spår och från/till syns direkt. Anmärkningar och extra uppgifter sammanfattas på en tredje rad; lång text kortas visuellt. Klick, högerklick, Enter eller Skift+F10 öppnar samtliga uppgifter i en modal nära tåget. Muspekning öppnar inget. Ändrat spår markeras med en stjärna; detaljrutan visar både aktuellt och planerat spår. Kontaktbortfall markerar hela tidtabellen som gamla uppgifter. Tidtabellen skickar inga manöverorder.

**Meny → Tidtabell och import** samlar källval och uppladdning. Välj mellan TrainMeet och den godkända separata importen. Källbytet bevarar båda och påverkar inga signaler, tågvägar eller klockor. Se [handhavande och installation](tidtabellsimport.md).

Kolumnlayouten är provad med 37 tydligt märkta provrörelser: samtliga sidor, tom ankomst, tid över 24:00, flera trafikdagar, lång anmärkning, text som innehåller HTML-tecken, TrainMeet-spårbyte och levande klocka. Tre skins, fullskärm, detaljmodal, tangentbord och 390-pixlars vy utan horisontellt sidöverflöde är granskade i webbläsaren. Backend och importformat är oförändrade.
