# Visningsinställningar och versionshistorik

Under **Anläggningsregister → Visningsinställningar** går det att ändra visningsnamn och beskrivning för profilens signaler, växlar, spåravsnitt, tågvägsknappar och tågvägar. Källidentiteten finns kvar och original-XML ändras aldrig. Adresser, beskedskoder, kopplingar och regler kan inte ändras här; fysisk driftsättning behöver ett separat verifierat ändringsflöde.

1. Välj objekttyp och sök fram objektet.
2. Välj **Redigera valt objekt**, ändra namn eller beskrivning i modalen och välj **Spara i utkast**. Utkastet sparas på servern och finns kvar efter omladdning eller omstart. Panelens aktiva namn är ännu oförändrade.
3. Granska kolumnerna **Aktivt nu** och **Efter aktivering**. Alla sparade ändringar i det gemensamma utkastet ingår.
4. Välj **Granska och aktivera**, beskriv ändringen i modalen och välj **Aktivera utkast**. Servern kräver att inga tågvägslås eller lagringsfel finns. Aktiva och hållna vägar spärrar båda aktivering.
5. För återställning: hämta en äldre version under **Versionshistorik**, granska skillnaderna och aktivera. Detta skapar en ny version; historiken skrivs inte över.

**Ångra osparat** återgår till det sparade objektet. **Kasta sparat utkast** lämnar den aktiva versionen oförändrad. Ett befintligt utkast måste hanteras innan en äldre version hämtas, så att utkast inte skrivs över av misstag.

Två öppna adminpaneler får inte skriva över varandra. En föråldrad sparning nekas med besked om att läsa in senaste versionen. Aktiverade namn uppdateras i öppna paneler utan att signalbilder eller spårplan byggs om. Nya namn visas i objektdetaljer, sökregister och relevanta vallistor; kartans ursprungliga tryckta texter behålls. Driftjournalen använder stabila källidentiteter så att tidigare händelser förblir spårbara.

## Lagring och kontroll

`configuration.json` i TKL:s beständiga datakatalog innehåller gemensamt utkast, aktiv versionspekare och samtliga aktiverade versioner. Filen skrivs atomärt innan en ändring syns i minnet. Säkerhetskopiera den tillsammans med `routes.json`, `controls.json` och anteckningar. Simulatorn läser inte denna fil.

Driftprofilen och dess fingeravtryck påverkas inte av visningsnamn. Okända objekt och alla andra ändringsfält avvisas. API:erna omfattas av samma inloggning och ursprungskontroll som övriga manövrer. Testerna omfattar beständighet, samtidighet, låsspärr, validering, lagringsfel och granskad återställning, även mellan separata serverprocesser.

Från 0.28.0 används översikter och modaler enligt [adminomläggningen](admin-forenkling.md).
