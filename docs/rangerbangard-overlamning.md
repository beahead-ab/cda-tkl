# Rangerbangårdens manöverrätt

**Ersatt i 0.62.0 av [rangerarläget](rangerlage.md).** Överlämningen av området finns
inte längre; rangeraren har ett eget område och begär växelgrupper av TKL. Texten nedan
beskriver modellen 0.40.0–0.60.0 och behålls som historik.

Driftsatt 26 september 2026 i version 0.40.0 (`7c1e422`). Fysisk rangerpanel är ännu inte ansluten.

## Egen manöverkärna – inget JMRI-program behövs

TKL lagrar och kontrollerar själv vem som har manöverrätten. JMRI, Python-skripten
HandleFreeArea.py/HandlePanel.py och deras interna frigivningssensorer behöver
varken finnas eller köras. Den gamla XML-filen är ett granskningsunderlag för
objekt, adresser, anslutningar och befintliga skyddsvillkor. Vid profilbygge blir
dessa statiska data; överlämningen använder en ny egen regelmodell.

Knappen **Lämna över rangerbangården** ligger under spårplanen bredvid
återställningsknappen. Vid överlämning lyser den blå indikeringen och fria
rangerspår blir blågrå, inklusive lastspår och lokstallsområdets vändskivespår.
Knappen byter till **Återta rangerbangården**. Beläggning, spärrar, okänd
återrapport och lagda tågvägar behåller sina egna markeringar.

Detta är en bekräftelse på **sparad manöverrätt i den gemensamma kärnan**,
inte en uppdiktad kvittens från ett fysiskt rangerställverk. Inga LocoNet-order
skickas bara för att manöverrätten byts. Den externa rangerpanelen är ännu inte
ansluten. Den måste använda samma kärna med en serverbestämd rangerbehörighet;
direkta order från en annan panel till dekodrarna kan denna lösning inte hindra.

## Beslutade rättigheter

TKL får alltid begära båda lägena för **112, 131 och 154**, även vid överlämning.
Rangeraren får endast återställa dessa så att förbindelsen mot TKL stängs:

| Växel | TKL | Rangeraren | Förbindelse i rangerarens tillåtna läge |
|---|---|---|---|
| 112 | C och T | T (avvikande) | A–C inom rangerområdet; B mot TKL frånkopplad |
| 131 | C och T | T (avvikande) | A–B inom rangerområdet; C mot TKL frånkopplad |
| 154 | C och T | C (rakt) | A–C inom TKL-området; B från rangerområdet frånkopplad |

Detta är logiska lägen. Den befintliga orderfunktionen översätter växel 131:s
elektriska inversion exakt en gång. Rätten att manövrera upphäver aldrig
beläggningskontroller, spårspärrar, signalvillkor eller tågvägslås.

TKL behåller godkända huvudtågvägar till och från **11, 12 och 13** från båda
sidor. Under en sådan tågväg låses även berörda rangerväxlar för rangeraren.
TKL:s övriga manövrer och växeltågvägar i rangerområdet spärras tills TKL återtar
området. Rangerrollen kan manövrera deklarerade lokala växlar medan området är
överlämnat, med samma spår- och signalvillkor som andra manuella manövrer.

Gränsväxlarnas individuella regler behåller hela den ursprungliga knappgruppens
spår-, signal- och NX-skydd samt kontroll av gruppväxlarnas lägen och lås.
En order flyttar endast den valda gränsväxeln. Andra olösta gruppmanövrer är
fortsatt spärrade; ingen elektrisk koppling till följdväxlar gissas.

## Byte och återhämtning

Byte kräver fungerande förbindelse och lagring, lokal manövrering, kända
växellägen, färska detektorbesked och bekräftat stopp i skyddande signaler.
Berörda tågvägar och programmeringsreservationer måste först återtas. Parkerade
vagnar får finnas kvar; beläggningsbesked ändras aldrig av överlämningsknappen.

Manöverrätten sparas innan ändringen visas. Lagringsfel lämnar den tidigare
ägaren kvar och spärrar fortsatt manövrering. Avbrott, omstart och panelåterställning
behåller överlämningen. Profilbyte är spärrat medan området är överlämnat.
Gamla eller dubbla kommandon avvisas med sessions- och revisionskontroll.

TKL:s befintliga HTTP-manöver väljer TKL-behörighet på serversidan. Ett inskickat
rollfält kan inte göra anroparen till rangerare. Någon separat ranger-HTTP-ingång
har inte öppnats; anslutningen av rangerpanelen återstår.

## Verifiering

Automatiska prov omfattar båda TKL-lägena, rangerarens skyddslägen, inversion,
infart och utfart till 11–13 från båda sidor, lås, beläggning, spärrar, okända
besked, AIS, lagringsfel, omstart och panelåterställning. Processprov använder
bara den nya TKL-servern och anläggningssimulatorn, utan JMRI eller dess skript.
Detta är program- och simulatorprov, inte fysisk provning av MGP-modulerna.

## Verifierat i Cda60.xml

Källans SHA-256 är `c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87`.

- `rsAckRangeFri` är sensorn **LS931**. Regel `IX:AUTO:0006C3` låser TKL:s rangerfunktioner när sensorn är aktiv.
- `rsAckRangeRet` är sensorn **LS933**. Samma regel skriver dess tillstånd som motsatsen till LS931. Den är därför inte belägg för en oberoende fysisk återtagningskvittens.
- Namnen förekommer också som **turnoutobjekt på L2**, med adresser 1831 och 1833. Dessa är märkta ”Lampa”. Begäransnamnen `rsReqRangeFri` och `rsReqRangeRet` är också L2-lampor, 1830 respektive 1832. De ska inte automatiskt behandlas som manöverkommandon på det primära LocoNet-nätet.
- `HandleFreeArea.py` och `HandlePanel.py` anges som skript för områdeslåsningen. Deras innehåll följer inte med XML-filen och har inte hittats i det genomgångna projektunderlaget.
- Grupp `0022` innehåller lokala rangerorder för växlarna **103, 111, 113, 114, 115, 116, 119, 123, 126, 127, 128, 130, 131, 133, 150 och 155**. Den nya regeln ersätter den fria rangeromläggningen av **131** med rätten att bara återställa skyddsläget. Listan är en källinventering, inte ensam ett bevis för hela områdesgränsen.

### Anslutningsspår

Panelens spår **11, 12 och 13** är källans **3a, 4a och 5a**, med knapparna `htvSpIIIA`, `htvSpIVA` och `htvSpVA`.

| Spår | Vänster frigivning | Höger frigivning |
|---|---|---|
| 11 | fri3avr / IS229 | fri3ahr / IS386 |
| 12 | fri4avr / IS230 | fri4ahr / IS387 |
| 13 | fri5avr / IS231 | fri5ahr / IS388 |

Dessa sex är **interna JMRI-tillstånd**, inte färdiga LocoNet-återrapportadresser. Originalets spårbegäran har separata LS-sensorer: in 907–912 och ut 924–929. Begäran är inte liktydig med frigivning.

### Växelgrupper vid gränsen

Originalets manuella knappar heter `vxv102/112`, `vxv131/132` och `vxv144/154`. Den importerade layouten verifierar inte dessa som fysiskt kopplade par. De manuella gruppreglerna är markerade som olösta; de individuella ersättningarna för just 112, 131 och 154 beskrivs ovan. Den permanenta TKL-rätten får varken användas för att gissa kopplingarna eller överlåta deras eventuella följdväxlar automatiskt.

