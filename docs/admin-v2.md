# Admin v2 bredvid dagens admin

Underlag 2 oktober 2026. Admin v2 byggs som en egen modul (`#objekt`, planen i objektkonfiguration-plan.md) och dagens admin lämnas orörd tills varje del har en ersättare eller är beslutad borttagen. Det här dokumentet håller tre saker: vad som ska bort, hur datavyn ska fungera, och hur vyerna i v2 hänger ihop.

## Växeltågvägarna

Ingen bugg. Rangerbangården var överlämnad till rangeraren, och då spärrar TKL sina egna växeltågvägar i rangerområdet tills manöverrätten återtas (yard-control.mjs, rangerbangard-overlamning.md).

Det som är värt att ta med sig: panelen sa inte varför. Startknappen svarade "saknar en ansluten växeltågväg som start" och slutpunkterna "Inte en möjlig slutpunkt nu", medan kärnan hade orsaken i klartext ("Återta rangerbangårdens manövrer till TKL."). Förslag, inte gjort: statusraden visar "Rangerbangården överlämnad" så länge det gäller, och avvisningen av en växeltågväg i rangerområdet nämner orsaken. Litet jobb, passar en 0.44.x.

## Preliminär lista: vad som försvinner ur admin

Grunden är tre beslut som redan är tagna: ingen operationell koppling till JMRI, TrainMeet är källan till tidtabell, tågnummer och klocka, och Objekt och regler blir det enda stället där anläggningen beskrivs. Allt i dagens admin som finns för att överbrygga JMRI, för att beskriva anläggningen på ett annat sätt, eller för att göra driftmanövrer utanför ställverket blir då överflödigt.

| Sida i dag | Vad den gör | Förslag |
|---|---|---|
| Drift · Driftverktyg | Trafiköversikt: lagda tågvägar, manövrer och spärrar | **Flyttas till panelmenyn.** Det som panelen redan gör tas bort; listan över lagda tågvägar och spärrarna blir en Drift-flik i ställverkets meny. |
| Drift · Tågvägar | Lista och detaljer per tågväg | **Ersätts** av Data-vyn (informationsmängden Tågvägar). |
| Drift · Tågklarering | Manuell tågklarering mot grannstation | **Tas bort** när stationen är parkopplad med TrainMeet; adaptern sköter anmälan, ankomst och avgång. Behålls tills dess. |
| Drift · Spårspärrar | Spärra spårledningar | **Flyttas till panelmenyn** som driftmanöver. |
| Drift · Linjer och programmeringsspår | Linjernas läge och programmeringsspårets villkor | **Ersätts** av Objekt och regler (linjer är objekt, programmeringsspåret en regel). |
| Drift · Tågnummer | Tågnummer på spårledningar | **Tas bort.** Tågnumren kommer från TrainMeets tidtabell. |
| Drift · Modellklocka | Starta, stoppa, ställa klockan | **Flyttas till panelmenyn** som en knapp. Klockan följer träffen. |
| Drift · Lokal- och fjärrläge | Växla manöverläge | **Flyttas till panelmenyn.** |
| Tidtabeller · Tidtabeller, Importera, Redigera utkast | Egen tidtabell som kalkylblad, CSV/Excel-import | **Tas bort.** TrainMeet är källan. Beslut för Casper: behövs en lokal reserv när träffen saknar nät? |
| Tidtabeller · TrainMeet | Parkoppling och stationsval | **Behålls**, blir Anslutning i v2. |
| Händelser | Driftjournalen | **Behålls**, blir informationsmängden Händelser i Data-vyn. |
| Utseende | Tema, blinkning, ljud | **Tas bort.** Planen är harmoniserad sedan 0.44.0. Ljud av/på blir en knapp i panelmenyn. |
| Stream Deck · Anslutning, Layout | WebHID och knapplayout | **Behålls oförändrad**, flyttas sist. |
| Anläggning · Anläggningsregister | Objekt ur Cda60.xml med anteckningar och versionshistorik | **Ersätts** av Objekt och regler. XML:en blir en läst källa, inte ett register. |
| Anläggning · Anläggningsöversikt | Stationens delar i text | **Ersätts** av planen i Konfigurera. |
| Anläggning · Orter och telefon | Grannstationer och telefonnummer | **Ersätts**: orten och telefonnumret hör till linjeobjektet. |
| Anläggning · Visningsinställningar | Visningsnamn per objekt | **Ersätts**: namnet är en egenskap på objektet, redigeras i Data-vyn. |
| Anläggning · Driftinställningar | Driftbindningar, aktiveringsvillkor, historik | **Ersätts** av Bindningar och aktiveringen med skillnadslista. |
| Avancerat · Avancerat | Ingångssida | **Tas bort.** |
| Avancerat · XML-granskning | Importen mot originalet, källavsnitt | **Tas bort som sida.** Bindningarna visar XML-kommentaren de kom från; originalfilen kan fortfarande hämtas. |
| Avancerat · Införandestatus | Vilka JMRI-regler som är provade, ersatta, återstår | **Tas bort.** Utan JMRI finns inget att införa; Genomgång och Driftsättning visar status. |
| Avancerat · Protokollinspelning | LocoNet-trafik, inspelning | **Behålls**, blir Lyssna-läget i Driftsättning. |
| Avancerat · Simulator ↗ | Länk | **Behålls** i menyn. |

Summering av 25 sidor: 9 ersätts av Objekt och regler, 7 tas bort, 5 flyttar till panelmenyn, 4 behålls. Admin v2 får då fyra flikar, Konfigurera, Data, Genomgång, Driftsättning, och en femte, Anslutning, för TrainMeet och Stream Deck när de flyttas.

Ordningen är given av beroendena: först det som ersätts (när Objekt och regler kan visa samma uppgifter), sedan det som flyttar till panelmenyn, sist borttagningarna, som bara är radering.

## Data-vyn, som i Cloud

TrainMeet Cloud (`/Users/casper/GitHub/trainmeet-cloud`, `/traff/:slug/data`, AllDataWorkspace.tsx, DataGrid.tsx, allData.ts) visar all data för en träff på ett sätt som är värt att kopiera rakt av. Det bärande är inte rutnätet utan sex val:

1. **En sida, inte lista och detalj.** Informationsmängderna är chips med antal; man tänder och släcker dem och ser flera rutnät staplade under varandra.
2. **Korsfilter i stället för navigering.** Ett globalt filter (i Cloud stationen eller källfilen) filtrerar varje mängd genom dess relationer: en sträcka matchar om endera änden är stationen. Man "går" aldrig till en post, man filtrerar allt på den.
3. **Relationer som avnormaliserade kolumner.** En sträcka har kolumnerna Från, Kod, Till, Kod i stället för id:n. Inga chips, inga sidopaneler för relationer.
4. **En last.** Hela träffen hämtas i ett anrop, inklusive avvikelser som räknas om vid varje läsning. Tabellerna är projektioner i webbläsaren.
5. **Utkast med ångra.** En revision, 50 stegs ångra/gör om, en sparning av helheten med förväntad revision; konflikt ger "ändrats i ett annat fönster" och utkastet behålls.
6. **Djuplänk som läses en gång.** `?set=…&station=…&kalla=…` sätter startläget; därefter lever vyn i sessionslagring, inte i adressen.

Det som inte ska kopieras: React-tillståndet, omrendering av allt vid varje ändring och att varje cell letar sin radposition med `findIndex` (kostar rader² × kolumner). I TKL räcker vanlig DOM med `data-row-id` och en Map id → index.

### Översatt till TKL

| Informationsmängd | Antal i dag | Kolumner utöver namn |
|---|---|---|
| Växlar | 49 | kompisväxel, läge nu, antal tågvägar, bindning, uppmätt |
| Signaler | 66 | typ, spårledning före och efter, riktning, adress, antal tågvägar, källa (Hsi/Dvs) |
| Spårledningar | 197 | ingångar, signaler vid gränsen, antal tågvägar, belagd nu |
| Linjer | 7 | grannstation, telefon, riktning, spärr |
| Korsningar och vägövergångar | 3 + 4 | spårledningar, regel |
| Tågvägar | 340 | typ, start, slut, växlar med läge, spårledningar i ordning, skyddssignaler, källa, prov |
| Regler | ~12 | klartext, objekt, var de verkställs, provad |
| Bindningar | 373 | modul, ut-/ingång, objekt, XML-kommentar, uppmätt datum |
| Avvikelser | 14+ | typ, objekt, vad som löser den |
| Händelser | 150 senaste | tid, objekt, text, bara läsning, uppdateras live |

Det globala filtret är **ett objekt**: Vx100 filtrerar tågvägar som lägger den, signaler som skyddar den, spårledningar över den, regler som nämner den, bindningar och händelser. Högerkolumnen visar det valda objektets relationer med antal; en rad där filtrerar om allt. Det ersätter både detaljsidor och korsreferenser.

Djuplänk: `#objekt/data?set=tagvagar,signaler&objekt=Vx100`. Adressen sätter startläget och återställs av Visa i data från planen och Genomgången.

### Så beror vyerna på varandra

```
                 en last: objekt + bindningar + regler + tågvägstabell + avvikelser + revision
                 ─────────────────────────────────────────────────────────────────────────────
  Konfigurera ──── urval (ett eller flera objekt) ────► Data        chips, rutnät, korsfilter
  planen, chatt ◄── Visa i planen ─────────────────────  ◄── Visa i data ── Genomgång   avvikelser med länk
       │                                                    ▲                 │
       └── regelkort → utkast ─────── skillnadslista ───────┘                 │
                                                                              ▼
  Driftsättning ── uppmätt, telegram ──► kolumnen "uppmätt" i Bindningar ◄── Lyssna-läget
```

- **Samma urval överallt.** Det valda objektet ligger i adressen och följer med mellan flikarna. Markera Vx100 i planen, byt till Data: allt är filtrerat på Vx100.
- **Samma avvikelser överallt.** De räknas om vid varje läsning och visas som antal i Genomgångens kolumn, som chip i Data och som röda punkter i planen.
- **Ett utkast.** Regelkort från chatten, namnändring i Data och en bindning i Driftsättning hamnar i samma utkast och aktiveras med samma skillnadslista.
- **Data är läsvy med små ändringar.** Namn, anteckning och bindning redigeras i raden. Regler och tågvägar ändras bara via Konfigurera och kompilatorn; i Data ser man resultatet.

Designskiss: tavla 6 i Claude Design-artefakten (Data.dc.html), toppraden har fått fliken Data.

### Det som kan tas från Cloud direkt

- `allData.ts`: projektionsfunktionerna och kolumnschemat (`{key,label,width,readonly,options}`) som styr rutnät, kolumnfilter, sökning och raddetaljer från samma definition. Rena funktioner, bara typerna försvinner.
- `DataGrid.tsx`: ordningen filter → sortering → gruppering → synliga rader, cellraden med adress och Raddetaljer, kolumnbredder 44–600 px.
- Tätheten: 27 px rader, 12,5 px celler, 11,5 px rubriker, `tabular-nums`. TKL behåller sina egna mörka toner och IBM Plex.
- `timetableGrid.ts`: TSV-urklipp med skydd mot formelinjektion, om kopiering ur rutnätet ska finnas.
