# Signalbesked i appen · version 0.9

Klicka på en signal och välj **Signalbesked och källuppgifter**. Samma uppgifter finns under signaler i anläggningsregistret. Översikten förenar källans besked, utgångar, regler och signalrelationer utan att ändra driftkärnans signalorder.

För samtliga 66 signalmaster finns typ, ursprunglig placering och hänvisning till det kompletta källobjektet. De 55 utgångsstyrda masternas samtliga 329 aspektbindningar redovisas: 310 leder till befintliga utgångsobjekt och 19 saknar utgång i XML. Uppslaget omfattar både namn och systemnamn i alla växelregister; exempelvis ligger LT210 i den andra turnouts-sektionen. Alla 117 signalrelationer går att öppna med sina ursprungliga villkor. Relaterade mastvillkor, maståtgärder och utgångsregler länkas också.

De 11 virtuella masterna märks uttryckligen som virtuella. Där exakt typdefinition finns visas dess besked som referens, utan påhittad fysisk utgång. Dessa kompletterande referensrader räknas inte in i källans 329 aspektbindningar.

## Bilder och ursprung

Referensbilderna förladdas och visas i GIF-filens ursprungliga proportioner. Återrapporter uppdaterar bara textfält; bildtabellen byggs inte om när nya driftbesked kommer. En bild används bara när både masttyp och aspektnamn matchar en verifierad definition. Exakta definitioner för hsi_4, hdvsi_8 och sly_2 saknas i tillgängligt underlag, liksom vissa aspekter i andra typer. Dessa rader visar **Bild ej verifierad** och behåller sina fullständiga källbindningar.

De 14 utseendedefinitionerna, aspects.xml och de 23 ursprungliga GIF-filerna finns under public/assets/mod59/definitions respektive reference-icons. Proveniensen är public/assets/mod59/proveniens.json, låst till JMRI-commit da190a99ac7ac41bb21b7718cd6e54ea3e54a47d. Bildfilerna hämtades från det befintliga lokala originalunderlaget eftersom Claude-exportens GIF-filer är omkodade och inte har samma filkontrollsummor. Befintliga panelbilder har inte ersatts i denna version. Originalfiler och använda definitionsfiler verifieras vid kataloggenerering; full källkontroll körs separat.

## Återrapport och källbild är skilda uppgifter

Överst visas aktuellt rapporterat stopp/kör, begärt medgivande, råkod och provadress. Vid frånkoppling, gammal rapport eller okänt besked visas okänt läge utan giltig råkod. Informationen kommer från samma serverström som ställverkspanelen.

Tabellen därunder är ett källregister. Exempelvis använder signal 1/5 sex skilda körbesked med samma LT210/closed; dessa markeras som delad order. Varken referensbilden eller utgångsordern bevisar vilket svenskt signalbesked en fysisk MGP-modul återrapporterar. Den preliminära provmappningen har därför inte utökats eller gjorts till fysisk konfiguration.

## Kontroller

Fyra nya riktade prov kontrollerar fullständighet, utgångsuppslag, samtliga relationer, tomma utgångar, virtuella master, exakt bildmatchning, reproducerbar katalog och aktuella/gamla/okända signalrapporter. Inloggningsprovet omfattar även den nya katalogen.

Webbläsarprov på lokal testanläggning: 1/5 → LT210 öppnar rätt källobjekt; 6/8 redovisar fem tomma utgångar; 6/7 skiljer virtuella referenser från fysiska utgångar; 3/5 visar saknad exakt bilddefinition och länkar till 3/5 → 6/7 med rätt villkor. Original-GIF:ernas lästa och visade mått kontrollerades. Tabellen granskades på smal skärm. Cu → Spår 1a gav köråterrapport och återtagning i en andra panel uppdaterade den redan öppna signalvyn till stopp. Noll provlås kvar efteråt.
