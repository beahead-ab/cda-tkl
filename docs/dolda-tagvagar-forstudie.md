# Undantagna tågvägar · statisk förkontroll 23 september

Vid denna förkontroll hade profilen 252 anslutna vägar och 103 undantagna tillåtna par. Förkontrollen i sig aktiverade inga vägar. De 18 huvudtågvägarna för Spår 6 är därefter genomförda och provade i version 0.7; se [handhavande och verifiering](spar6.md). Därmed återstår 85 undantagna växeltågvägar.

Samtliga103 undantagna par har en geometrisk väg mellan de NX-ändpunkter som källreglerna anger.94 har start som matchar första signalgränsen.93 har en identifierad målsignal som också finns bland skyddssignalerna. Gemensamt uppfyller18 huvudtågvägar och70 växeltågvägar båda dessa villkor och har minst en riktad signal. Det gör dem kandidater för fortsatt granskning, inte verifierade driftvägar.

Alla18 huvudtågvägar gäller htvSpVI. Sensorn finns som IS266, men saknar ikon i panelen. Den ska alltså inte beskrivas som en dold befintlig ikon. Källreglernas olika start-/slutmål går genom tvs6/8 eller tvs6/9. En katalogknapp med källa IS266 kan bli en uttrycklig ersättning; den kräver ingen gissad koordinat. Två befintliga tvv-ikoner för6/8 och6/9 är dolda, men är andra sensoridentiteter och får inte blandas ihop med htvSpVI.

Bland de85 undantagna växeltågvägarna finns både faktiskt dolda ikoner och saknade tvv-ikoner. Exempel på dolda är tvv3/3, tvv6/8, tvv6/9, tvv6/5–9/5, tvv6/10–9/10 och knappar till lastspår, kolgård och lokstall. Flera signalnära tvv-namn saknar ikon helt.

Nio mål saknar identifierad signalgräns: rörelser till LastSp1in/LastSp2in/LastSp3in, kolgardin och lokstallin i olika kombinationer. Ytterligare fall har felaktig startmatchning eller skyddsgräns. Dessa behöver definierad växlingsgräns och särskilda villkor; de får inte aktiveras genom att helt enkelt slopa synlighetskontrollen.

## Nästa prövning

1. Granska vart och ett av de18 htvSpVI-parens regler, riktning, signaler och reserverade resurser; använd källans NX-val, inte en fri geometrisk genväg.
2. Lägg vid behov till en uttrycklig katalogrepresentation för IS266/Spår6. Originalpanelen och original-XML ska vara oföränderliga referenser.
3. Prova samtliga nya vägar genom oberoende fältmodell: etablering, signalordning, passage, konflikt, återtagning och fel. Uppdaterad profil får inte publiceras om gamla lås finns kvar.
4. Därefter granska de70 växelvägskandidaterna individuellt. Det nya huvud-/växeltågvägsläget kan ersätta panelens dolda knappar, men ska inte aktivera rangeröverlämning som fortfarande beror på saknade skript.
5. Behåll resterande15 växelvägsfall spärrade tills start-/målgränserna är entydiga och testade.

Det detaljerade lokala analysunderlaget finns i arbetsytans work/usecase-review/excluded-path-audit.json. Källans SHA-256 och driftprofilernas genererade underlag är oförändrade av granskningen.
