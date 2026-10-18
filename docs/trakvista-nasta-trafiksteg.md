# Förslag: Träkvistas linjer och trafikspelets tåg

18 oktober 2026. Underlag till Caspers nästa beslut. Ingen av dessa trafikändringar ingår i PR #80–83.
En ny container löser inte de återstående trafikfunktionerna.

## Nästa trafik-PR: A/B/C och manuell trafik

Läs samma stationsbindningar i server, ortsinställningar, panel, tågspårning och Field. Följande finns redan i
Träkvistas stationsfil och genererade tågvägar:

| Linje | Knapp | Yttre block | Infartssignal | Utfartssignal |
|---|---|---|---|---|
| A | `htvA` | `SA2` | `2/1` | `2/10` |
| B | `htvB` | `SB2` | `2/2` | `2/9` |
| C | `htvC` | `SC2` | `1/2` | `1/9` |

Stationsspåren är I/II/III/IIIa/IIIc, med block SI/SII/SIII/SIIIa/SIIIc. Använd de uttryckliga bindningarna;
rå panelgeometri kan annars koppla en knapp till ett grannspår eller ett dekorativt segment.
Välj verklig TrainMeet-anslutning ur hämtad kontext. En ej ansluten C får ingen påhittad granne eller något placerat tåg.

Berörda delar är främst `server`, `destinations`, `train-tracking`, `field` och panelens konsumenter av
`destination-data`. `TrafficTrains` tar redan emot linjer och spår som argument; återanvänd det kontraktet.
Field måste känna igen A/B/C också vid utfart, annars står tåget kvar på linjen i den interna modellen.
Träkvista saknar Charlottendals importerade `incoming:*`-fält och ska inte få bindningar till dess minnen.

## Följande trafik-PR: automaten

Ge automaten en uttrycklig Träkvistapolicy med tidtabellsspår och nästa granne ur TrainMeet.
Enkelspår använder samma knapp in och ut; Charlottendals jämförelse mot normalt utfartsspår kan därför inte återanvändas.
Klarering godkänns först efter aktiv infart och mot senaste revisionen. Vid konflikt, gammal kontext, avslag eller
saknat underlag lämnar automaten över. Alla vägar går genom samma förregling.

Charlottendals spårordning, väntetider, linjemappning, sju ortsposter, profil och sparade format lämnas exakt som de är.

## Prov som avgör om det fungerar

- Lokal TrainMeet-provserver: tåg från A/B och ansluten C, rätt block/nummer/riktning, manuell infart till rätt spår,
  ankomst, frigivning och utfart som lämnar Field. Ingen trafik på en ej ansluten C.
- Båda stationerna samtidigt med olika portar och driftkataloger: separata användare, inloggning, ortskopplingar och
  omstart med inställningar och hållna växellås. Inga verkliga driftdata används.
- Automaten: tidtabellsspår, mötande tåg på enkelspår, belagda/okända spår, utebliven dubbelklarering och överlämning
  vid avbrott, avslag och omstart. Charlottendals befintliga automatprov och prioritering ska fortsatt gå igenom.
- Samma prov i källförrådet och i Tk-paketet, byggt utan push. Alla befintliga kontroller gröna; Charlottendals
  genererade filer, hela profilobjekt, källhash och `var/` oförändrade.

## Containersteget därefter

Prova de befintliga Render-avbildningarna, beständig lagring, inloggning och start/omstart per station.
Casper skapar Träkvistas Render-tjänst och deltar i acceptansprovet. Pi och Mac behåller sina vanliga installationer.
Eget `tkl`-förråd, Charlottendals filflytt och gemensam tjänst med stationsval beslutas senare.
