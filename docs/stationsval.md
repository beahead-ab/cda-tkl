# Välj station på en dator

Förslag 0.82.9, inte publicerat. Inställningar → Den här datorn → Station visar bara stationer vars data redan finns i installationen. Programmet kör en station åt gången. Ägaren kan välja en annan station när inga tågvägar, kvarhållna lås, programmeringslås, rangerbegäran, inspelningar eller automatiska/pågående manövrer finns och LocoNet är frånkopplad.

## Start som stöder byte

I källförrådet finns båda stationerna. Starta med `npm start` utan stationsargument eller fast `CHARLOTTENDAL_STATION`. Startövervakaren avslutar servern och den interna återrapporten kontrollerat före nästa start. Ett fel eller uteblivet avslut stoppar bytet. Ingen driftfil flyttas eller nollställs. Charlottendal behåller `var/`, Träkvista `var/trakvista/`.

Valet sparas i `.tkl-installation/station.json`, utanför stationernas driftdata. `TKL_INSTALLATION_CONFIG` kan välja en annan installationsfil. Det är ingen stationshämtare: ett paket med en enda station visar bara den stationen. Tk-paketets fasta startargument låser dess identitet som tidigare.

## Befintliga kataloger

Fasta stationval, användarfiler, authfiler, profiler och TrainMeet-adresser låser stationsbyte. `CHARLOTTENDAL_STATE_DIR` behåller sin företrädesregel. För att använda en befintlig katalog tillsammans med separata stationer krävs en uttrycklig karta i installationsfilen. Exempel med egna absoluta sökvägar:

```json
{
  "version": 1,
  "stationId": "charlottendal",
  "requireTrainMeetConnect": false,
  "stationStateDirectories": {
    "charlottendal": "/absolut/befintlig-cda-katalog",
    "trakvista": "/absolut/separat-tk-katalog"
  }
}
```

Kartans ursprungsstation måste använda exakt den redan angivna `CHARLOTTENDAL_STATE_DIR`. Ingen migration görs. Katalogerna måste vara olika även om sökvägarna innehåller symboliska länkar. En målstation som har LocoNet ansluten i sitt sparade läge nekas; den behöver först startas separat och kopplas från.

Befintliga Pi- och Mac-tjänster startar server och återrapport var för sig och behåller sin fasta station. Att ändra installerarnas tjänstestart till övervakaren är en separat ändring. Render behåller en egen tjänst per station och har inget stationsbyte i panelen.

## Efter bytet

Panelen läses om och du använder den valda stationens egna användare. Även återrapportens HTTP-gränssnitt använder den stationens användarkatalog. Gamla sessioner är inte giltiga i den andra stationen.

TrainMeet är pausad efter varje byte, också om stationen har en sparad parkoppling och programmet startas om igen. Öppna TrainMeet och anslut uttryckligen med rätt adress och kod. Uppdatering av kontext, klarering och trafiktåg väntar tills en sådan anslutning lyckats. Automatisk återanslutning till en annan träff görs inte vid stationsbytet.

## Prov

Enhetsprov täcker katalogkarta, lås, pågående manövrer, sparfel och kontrollerad processordning. HTTP-processprov täcker byte åt båda håll, egna användare/inställningar, rätt panel, kvarhållna tågvägar, målstation med sparat LocoNet samt noll automatisk TrainMeet-kontakt. Både standardkataloger och en uttrycklig karta provas i isolerade installationer. [Trafikprotokollet](stationsstyrd-trafik-2026-10-18.md) redovisar resultat och begränsningar. Riktig webbläsaracceptans och native installation återstår.
