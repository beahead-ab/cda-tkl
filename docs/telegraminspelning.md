# Telegraminspelning · version 0.11

Öppna **Visa protokolltrafik** under Händelser. Skriv ett valfritt namn och välj **Starta inspelning**. Genomför den manöver du vill undersöka och välj **Stoppa och spara**. **Hämta JSON** laddar ned den avslutade loggen. En pågående logg kan också hämtas som en ögonblicksbild.

Inspelaren lyssnar på TKL:s befintliga transport. Den skickar inga manövrer, återspelar inga order och läser inte simulatorns tillstånd. Ordinarie förregling, återrapporter och lås hanteras som tidigare.

## Vad filen innehåller

- Löpnummer, väggklocka och monoton tid sedan start. Ordningen förblir entydig även om serverns väggklocka justeras.
- Båda riktningarna med fullständiga normaliserade ASCII-rader: SEND, RECEIVE, SENT och eventuella transportfel. Radrensning av inledande/avslutande blanksteg och CR/LF har redan skett i transporten; TCP-paketgränser eller seriell elektrisk trafik spelas inte in.
- Bytevärden och separat protokolltolkning för giltiga telegram. Även ramar med felaktig kontrollsumma eller okänd opcode finns kvar, med sin status. För långa rader avvisas av transporten och registreras som transportfel.
- Anslutning/avbrott samt orsak till avslut.
- Aktuell profilmärkning, profilens kontrollsumma, XML-kontrollsumma och adressbindningar. Inga autentiseringsuppgifter, användaranteckningar eller serverns anslutningsinställningar exporteras.

En mottagen B0-order kan vara eko eller komma från en annan avsändare. Den är ingen lägeskvittens. SENT är transportkvittens, inte bevis för utförd manöver. B1-utgångsrapport, B2-detektor och den uttryckligt preliminära Signal10-CZ-formen hålls isär. En svensk MGP-beskedsmappning är fortfarande inte verifierad.

## Gränser och beständighet

En inspelning avslutas vid det första av två minuter, 10 000 händelser, fyra MB serialiserade händelser eller bruten bussanslutning. Profiluppgifter och läsbar JSON-formatering tillkommer i nedladdningsfilens storlek. Äldre rader kastas inte bort för att ge plats åt nya. Arkivet rymmer högst 100 avslutade filer; när det är fullt avvisas ny inspelning och de gamla filerna bevaras.

Pågående inspelning samlas i minnet. Vid manuellt stopp, automatisk gräns eller normal serveravstängning skrivs en egen fil under `telegram-recordings/` i driftkatalogen. Filen synkroniseras innan den publiceras under sitt unika namn och ersätter aldrig en tidigare inspelning. Färdiga filer laddas efter omstart. Vid ett oväntat processhaveri kan den pågående inspelningen gå förlorad. En redan avslutad fil berörs inte.

Om lagringen misslyckas finns den avslutade loggen kvar i minnet med möjlighet att hämta den eller försöka spara igen. Start av en ny inspelning är spärrad tills felet är hanterat. Två paneler kan inte samtidigt starta skilda inspelningar eller stoppa en annan än den de visar. Alla anrop och filer skyddas av appens befintliga inloggning; manövrer kräver samma ursprungskontroll som resten av appen.

## Inför verklig MGP-provning

Funktionen gör trafik från den valda anslutningen observerbar. Den skapar inte en USB-anslutning till LocoBuffer. Nästa steg kräver identifierad buffert, MGP-moduler och verifierade adress-/beskedsbindningar. Använd korta, namngivna observationer med en känd manöver per prov. Jämför råtelegram med verklig återrapport innan någon fysisk profil tas i bruk. Simulatorns loggar kan användas för jämförelse, men är inte bevis för hårdvarans beteende.
