# Svenska signalbesked · förstudie 23 september 2026

Källa är den oförändrade Cda60.xml med SHA-256 c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87. Kontrollsumman i källregistret är auktoritativ; nedan redovisas dess mast- och utgångsdefinitioner. Denna förstudie aktiverar inga nya besked eller fysiska adresser.

Källan innehåller 66 master: 55 turnoutsignalmast och 11 virtualsignalmast. Masttyperna är dvsi_4 (18), hdvsi_8 (19), hsi_2 (7), hsi_3+dvsi (2), hsi_4 (8), hsi_5 (9) och sly_2 (3).

De 55 utgångsstyrda masterna har 329 aspektrader. 310 rader hänvisar till befintliga utgångsobjekt; det är 121 unika LT-objekt. Namn och systemnamn måste båda kunna slås upp. 19 rader har tomt utgångsnamn och behöver redovisas som en begränsning i källmappningen.

| Mast | Tomma utgångar |
|---|---|
| 6/8, 6/9, 6/11 | Sh1 Stop, Sh1 80, Sh1 40, Sh2, Sh3 på var och en |
| 3/11, 3/6 | Stop and Sh2, Stop and Sh3 på var och en |

De virtuella masterna är 6/7, 6/6, 6/5–9/5, 6/10–9/10 samt 3/1. De har ingen egen fysisk utgångsdefinition i mastregistret.

Ett konkret exempel är 1/5: Stop använder S1/5 = LT210 i thrown. Clear 80, Clear 80 Expect Stop, Clear 80 Expect 80, Clear 80 Expect 40, Clear 40 och Clear 40 Short Entry Route använder samtliga samma LT210 i closed. XML kan alltså spåra vilket körmedgivande JMRI skickar, men en sådan utgångsorder räcker inte för att särskilja alla svenska återrapporterade besked. MGP-konfiguration och uppmätt telegramtrafik behövs för den fysiska tolkningen.

Regelgruppernas roll behöver prövas tillsammans med mastdefinitionerna:

- 0003: 26 aspektvillkor med 26 utgångsåtgärder för medgivandedvärgar.
- 0004: tre regler för stopplyktor, 11 NX-villkor och sex mastaspektåtgärder.
- 0009 och 0010: 33 regler vardera för sh2/sh3-utgångar. Villkor, sanna/falska åtgärder och utgångarnas betydelse ska läsas exakt; liknande namn räcker inte för en tolkning.
- 0011: tio utfartsregler med spårlednings-, NX- och mastaspektvillkor.
- 0012: fyra regler med 80 NX- och 13 sensorvillkor ger V1–V4:s indikeringar. Det är inte belägg för ett verifierat fysiskt bomkommando.

Nästa genomförbara steg är ett källanknutet signalregister i appen: samtliga aspekter, utgångar, beroenden och originalikoner ska gå att granska. Därefter kan den logiska beskedsmodellen och källans hastighets-/försignalberoenden provas separat. Koppla den till fysiska E4-koder först när aktuell svensk MGP-profil eller inspelade telegram verifierar mappningen. Den nuvarande CZ-profilens 0/8/18 förblir uttryckligt preliminär.

Det detaljerade arbetsunderlaget finns i arbetsytans work/usecase-review/signal-aspect-bindings.json. Denna sammanställning bygger endast på källan; ingen fysisk utrustning eller TrainMeet har anropats.


## Bildunderlag för nästa etapp

Alla 66 panelikoner deklarerar imageset mod59 och behåller källans position, rotation och skala. Arbetsytans Claude-export innehåller Charlottendal-signalikoner.json med masttyper och aspektbindningar samt jmri-mod59/definitions med officiella utseendefiler. Filernas proveniens är låst till JMRI-commit da190a99ac7ac41bb21b7718cd6e54ea3e54a47d och finns i public/assets/mod59/proveniens.json.

De cachade definitionsfilerna har exakta typer för bland annat hsi_2, hsi_5, hsi_3+dvsi och dvsi_4. Det finns ingen fil med exakt namnet appearance-hsi_4.xml, appearance-hdvsi_8.xml eller appearance-sly_2.xml i den katalogen. Befintliga närliggande typer måste därför redovisas som tolkningar tills matchningen har verifierats. Ett nytt aspektregister kan visa källans namn och utgångsbindning även när exakt bildmappning saknas.


## Genomfört i version 0.9

Det källanknutna signalregistret är nu implementerat. Se [Signalbesked i appen](signalregister.md) för innehåll, bildproveniens och avgränsning. Fysisk MGP-mappning och full logisk beräkning av svenska besked återstår.
