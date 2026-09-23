# Tågnummer och inkommande tåg · källkontroll 23 september

U04/U05 i den godkända planen är nästa avgränsade del. Käll-XML är fortsatt oförändrad.

## Verifierade fält

XML innehåller 44 BlockContentsIcon men bara 43 unika blocknamn. 38 ikoner har hidden=yes; sex är synliga: SIIA, S160b, S161b, S152b, S113a och S112b. Samtliga koordinater och attribut är redan bevarade i källregistret.

SN2A förekommer två gånger: (40,422) och (40,472). SU2A har ett eget block/minne men ingen BlockContentsIcon i listan. Detta ser ut som en möjlig felreferens i originalet, men källan räcker inte för att fastslå en rättning. En ny vy ska bevara och redovisa avvikelsen; inte tyst byta den övre etiketten till SU2A.

Sju memoryicon visar inkommande tåg, samtliga hidden=no och ursprungsvärde ett streck:

| Namn | Minnes-ID | Placering |
|---|---|---|
| AuppIn | IM:AUTO:0166 | 150,895 |
| AnedIn | IM:AUTO:0167 | 150,915 |
| BuppIn | IM:AUTO:0168 | 1940,835 |
| BnedIn | IM:AUTO:0169 | 1940,860 |
| CuppIn | IM:AUTO:0170 | 150,835 |
| CnedIn | IM:AUTO:0171 | 150,855 |
| DIn | IM:AUTO:0172 | 1940,895 |

Inga importerade Logix-regler refererar dessa sju namn. Det säger inte att de saknade skripten aldrig använder dem. Placeringarna ligger utanför den beskurna spårplanen. Visa dem därför i ett kompakt informationsfält.

Minnesobjekt med blocknamn har kommentaren Spårblockinnehåll och saknar initialt värde, exempelvis SIA=IM:AUTO:0001, SU2A=IM:AUTO:0138 och SN2A=IM:AUTO:0139. Blocken har egna IB-identiteter och spårledningssensorer. Det finns dubbla blockdefinitioner i XML; den fullständiga importen bevarar båda. Slå inte ihop block, minne och detektor till samma objekt.

## Gräns för nästa implementation

Beläggningstelegram ger beläggning, inte tågnummer. Simulatorns interna P421 får därför inte läsas av TKL eller stoppas in i ett påhittat MGP-telegram. En lokal manuell tågidentitet eller en senare verifierad TrainMeet-källa kan tillföra numret oberoende av fältgränsen. Provanläggningen ska fortsätta tala samma LocoNet-gränssnitt som fysisk utrustning.

En första användbar implementation kan omfatta serverlagrade manuella inkommande fält och blockidentiteter, med käll-ID, ändringsrevision, avsändartyp, tid och journal. Dessa är information och får aldrig uppfylla frihets-/signalvillkor. Samtidiga paneler får inte skriva över varandras nyare uppgifter. Omstart ska bevara informationen men markera gamla lägesanknytningar som okontrollerade.

Automatisk förflyttning kräver en uttrycklig modell: ingångsidentitet, riktad reserverad väg, obruten och entydig beläggningsföljd samt hantering av samtidiga tåg, delade sensorer, avbrott och okänd position. Vid tvetydighet ska identiteten hållas för kontroll, inte gissas eller raderas. Koppling av minnesnamn till A/B/C/D:s faktiska riktning ska härledas ur källan, inte ur skärmplaceringen ensam.

Första UI-etappen kan välja en läsbar informationsoverlay för alla 44 källankare som uttrycklig ny presentation, med originalets hidden-attribut åtkomligt i registret. Den måste fungera med alla tre skins och kompakt panel utan att större tomma ytor återinförs. Aktiv drift ska inte påstå att TrainMeet är anslutet förrän det kontraktet och autentiseringen faktiskt verifierats.
