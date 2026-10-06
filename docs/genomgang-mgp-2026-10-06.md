# Genomgång av moduler, spårledningar, växlar och signaler mot MGP-modulerna

6 oktober 2026, version 0.67.0. Underlag: Bennys `Cda60.xml` (källversion `c69a865ae9a8`), panelgeometrin,
driftprofilen och Studios register. XML:en är kvar som fallback och källa; ingenting i den har ändrats.

Frågan var: hänger allt ihop mot de riktiga LocoNet-modulerna? Svaret före genomgången var nej på två
punkter som hade stoppat driftsättningen helt, och ja med anmärkningar på resten.

## Vad som ändrats i 0.67.0

| Objekt | Före | Nu |
|---|---|---|
| 49 växlar | LT-adressen ur XML (95–172), Vx131 omvänd | Oförändrat |
| 66 signaler | Bänkadresser 1501–1566, ingen koppling till någon utgång | 55 master bundna till sin huvudutgång LT200–LT325 ur XML; 11 virtuella master utan utgång |
| 197 spårledningar | Bänkadresser 3001–3132, ingen koppling till någon ingång | 159 bundna till LS-ingångarna ur XML (20 med flera ingångar); 38 utan ingång i källan behåller bänkadress |
| Kärnan | Väntade på rapport från alla 66 signaler | Bekräftar de 11 virtuella själv; väger flera ingångar per spårledning |
| Simulatorn | Rapporterade bänkadresserna | Samma adresser som TKL, varje ingång en gång, inget från virtuella signaler |
| Driftbindningar | En rad per JMRI-sensor | En rad per fysisk detektor; fleringångsblock ägs av detekteringsregeln, virtuella signaler saknar rad |

Allt är fortfarande **ej uppmätt**: adresserna är det XML:en säger, inte det banan har bekräftat. Mät objekt
i Studio är vägen från "ur XML" till "uppmätt i fält".

### Signaler: hur mappningen gjordes

Alla 55 fysiska master är `TurnoutSignalMast` i JMRI. Varje besked lägger en JMRI-växel (en LT-utgång på en
Signal10): stoppbeskedet (`Stop`, `Sh0`, `Unlit`) lägger huvudutgången **THROWN**, alla körbesked lägger samma
utgång **CLOSED**. Dvärgarnas Sh2/Sh3 och huvuddvärgarnas Sh1 går på egna utgångar (D…, D…sh2, D…sh3) som
TKL inte styr i dag. Det är exakt det binära kontrakt kärnan redan skickar (kör = CLOSED, stopp = THROWN), så
huvudutgången blev orderadress.

- Huvudsignal (hsi_2/4/5) och huvuddvärg (hdvsi_8, hsi_3+dvsi): utgången S*n* (t.ex. 1/1 → LT200, 1/5 → LT210).
- Dvärg (dvsi_4): utgången D*n* (3/2 → LT306, 6/9 → LT310).
- Slutsignal/slutpunkt (sly_2: Xv, IIIdo, IIIev): utgången SS*n*; "kör" = Lit (CLOSED), stopp = Unlit.
- 3/6 skriver körbeskeden på `LT322` i stället för `S3/6`; det är samma utgång.

**Rapportadressen antas vara samma som orderadressen.** Signal10 rapporterar sitt besked med SE-telegram
(E4 09); det publicerade CZ-exemplet använder samma adress som växelordern, men det är inte verifierat på
Charlottendals svenska dekodrar. Koderna 0 (stopp) och 8/18 (kör) är fortfarande provisoriska. Detta är den
största återstående risken: **om en Signal10 inte sänder SE-rapporter alls kan AIS aldrig återställas**,
eftersom kärnan kräver bekräftat stopp från varje signal. Alternativet, att läsa Signal10:s switch-feedback
(B1 på samma adress, SV23) som stopp/kör, är inte infört; det beslutas efter bänkprovet.

### Virtuella signaler

Elva master är `VirtualSignalMast` i JMRI: **3/1, 6/5, 7/5, 8/5, 9/5, 6/6, 6/7, 6/10, 7/10, 8/10, 9/10**. De har
ingen utgång; i JMRI fanns beskedet bara på panelen. De är inte ofarliga i TKL: infarten till Spår VI
(alla nio huvudtågvägar dit) klareras av 6/7 och skyddas av 6/6, och 44 växeltågvägar går över dem. Före
0.67.0 hade dessa tågvägar aldrig blivit klara mot riktig utrustning, och AIS hade aldrig kunnat återställas
eftersom elva signaler aldrig rapporterar.

Nu bär de `virtual: true`: kärnan sätter beskedet själv när det begärs, utan order och utan att vänta på
rapport, och det blir aldrig gammalt så länge LocoNet är anslutet. Simulatorn låter tåget passera dem.
Signalinformationen visar "Virtuell, bara i panelen".

**Beslut för Casper:** förblir de panelbesked som i JMRI, eller ska fysiska dvärgar kopplas in? 3/1 har
utgången `LT214` (D3/1, M02) i källan men masten är virtuell, så där finns redan en utgång att prova.

### Spårledningar: hur mappningen gjordes

Varje layoutblock i JMRI har en intern sensor (slS…) som sätts av en logixregel ur de fysiska ingångarna
(LS…). Studios detekteringsinventering läser dessa regler, och profilen bär nu LS-numret som adress:

- 130 spårledningar med en ingång, t.ex. S100 → LS60 (M02-21-1).
- 20 med flera ingångar och JMRI:s "någon av"-logik, t.ex. SIA → LS90 **eller** LS100 (M04 och M05),
  SG53 → LS73/LS97/LS107/LS117 (fyra moduler längs godsspår 53).
- 9 växelberoende delar (S100b, S101a, S110a/b, S117a, S120a/b, S125a/b) där JMRI väljer ingång efter
  växelläge; förenklade till ingången. **S100a** har ingen ingång alls i sin regel och är kvar på bänkadress.
- Polariteten är antagen: aktiv = belagd.
- Tågvägens passage (ordnad beläggning och frigivning) följer spårledningens första ingång; beläggningen
  för låsning och konflikter väger alla ingångar. Ett tåg som kommer in i SIA från LS100-änden räknas
  som belagt direkt men som passerat först när LS90 sett det.

En fysisk detektor matar ofta flera JMRI-block (LS72 → S112, S113, S116 med delar; LS174 → S151, S152, S154
med delar). Det är avsiktligt i Bennys anläggning – en detektor per växelgata – och profilen speglar det.
Driftbindningarnas katalog har därför en rad per adress: alla block på samma detektor ändras tillsammans.

**38 spårledningar står kvar på bänkadress** (3001+) för att källan inte har någon ingång:

- 16 är inte spår (vägövergångarnas lampor v1–v4, perronger, ram, vändskiva).
- 11 har ingen sensor: Slokstall1–9, SL1a, SL1b (lokstallet och linje D).
- 10 har en sensor men ingen regel: S96b, S112b, S155, S155b, S155c, S164, S164b, S170, S171, S172.
- S100a enligt ovan.

De tio växelblocken utan regel är intressanta: Vx155 (vändskivans tillfart), Vx164 (3d:s gränsväxel) och
M11:s växlar 170–172. Ingen tågväg kräver fri spårledning där i dag, men tågvägar över Vx164 och Vx170/171
har ingen beläggningskontroll av själva växelblocket. Kandidater bland de obundna ingångarna finns (se nedan)
men inget binds utan mätning.

## Modul för modul

Modulnamnen M00–M11 kommer ur kommentarerna i XML:en ("M03-110-1" = modul 3, dekoder med basadress 110,
kanal 1). Inget kort har ännu svarat på Discover; identiteterna är antagna.

| Modul | Utgångar (växlar) | Signalutgångar | Ingångar | Anmärkning |
|---|---|---|---|---|
| M00 | – | – | LS1–3 (SU2a, SN2a, SIIIe) | Bara tre ingångar, ingen dekoder i kommentarerna. Troligen en detektor vid Spår 2:s utfart. |
| M01 | Vx95, Vx96 (95-1, 95-2) | LT200–209: 1/1, 2/1, U2, N2, SIIIev, 1/3, 2/3, U4, N4; LT400–403 | LS10–24 | LS18, 23, 24 (12-4, 13-4, 13-5) saknar block. LT205 "Ej använd". Vx95/96-automatiken saknas som följregel. |
| M02 | Vx100–103 (100-1…4) | LT210–219: 1/5, 2/5, 1/12, 2/12, 3/1 (D3/1), 3/3; LT404–407 | LS60–64 | LS61, LS63 (21-2, 21-4) saknar block. LT216–219 "Ej använd". 3/1:s utgång finns men masten är virtuell. |
| M03 | Vx110–119 (110-1…5, 115-1…5) | LT220–229: 3/10, 4/10, 5/10; LT408–413 | LS70–84 | LS76, 79, 81–84 saknar block (sex ingångar). LT226–229 "Ej använd". |
| M04 | – | LT230–239: 1/10, 2/10; LT414–417 | LS90–98 | Första halvan av Spår I–V och G51–54 (41-x, 42-x). Alla bundna. |
| M05 | – | LT240–249: 1/7, 2/7; LT418–421 | LS100–108 | Andra halvan av samma spår (51-x, 52-x). Alla bundna. |
| M06 | Vx120–128 (120-1…5, 125-1…4) | LT250–259: 3/5, 4/5, 5/5; LT422–427 | LS110–124 | **Vx124** (120-5) finns i XML men inte i planen. LS113 saknar block. LS124 är kommenterad "S125a" men S125a:s regel använder LS121; LS124 är obunden. |
| M07 | Vx130–133 (130-1…4), ProgSpår LT134 (130-5) | LT260–269: 1/8, 2/8, 3/8, 4/8, 5/8, 6/8; LT428–439 | LS140–149 | LS147, LS148 saknar block. LS149 "Godsspå vx133" utan modulkommentar och utan block. |
| M08 | Vx140–144 (140-1…5) | LT270–279: 1/6, 2/6, 1/9, 2/9, 5/9; LT310–311: 6/9, SXv; LT440–451 | LS150–164 | Användarnamnen är förskjutna ett steg (LS158 heter Sp08-159 … LS164 heter Sp08-165) och LS163 har skrivfelet "M08-03-4". Systemnumret är det som går på bussen. LS150, 151, 161, 164 saknar block. LT312–319 "Ej använd". |
| M09 | Vx150–155 (150-1…5, 155-1) | LT280–289: 1/11, 2/11, 3/9, 4/9, 10/11; LT320–325: 3/11, 3/6, 6/11; LT452–461 | LS170–178 | LS172, 173 saknar block. LT156–159 "Ej använd". |
| M10 | Vx160–166 (160-1…5, 165-1, 165-2) | LT290–299: 1/4, 2/4; LT462–467 | LS190–199 | LS195 saknar block. LT167–169, LT292–299 "Ej använd". |
| M11 | Vx170, (Vx171, Vx172 "Ej använd") | LT300–309: 1/2, 2/2, U1, N1, SIIIdö, 3/2 (LT305 utan namn, LT306 D3/2) | – | Kommentarerna säger "M11-165-x" men adresserna är 170–174: basadressen 165 är M10:s, M11:s dekoder sitter rimligen på 170. LS200–204 (Sp11-200…204) saknar modulkommentar; 202–204 är bundna (SIIId, SU1a, SN1a), 200–201 inte. **LT307 (4/2) och LT308 (L1) är märkta "Ej använd" men bär signalmaster.** |

Obundna fysiska ingångar totalt: 87. Av dem är 36 panelens egna knappar och lampor (LS901–940: frigivning,
tågvägsväljare, Broker/Nattpanel/Rangerpanel, ProgOn), 26 helt namnlösa (LS205–229, LS4095, LS4, LS179, LS930,
LS932) och 25 har en modul men ingen spårledning – se tabellen. Dessa 25 är kandidaterna när de tio
växelblocken utan regel ska få detektering, men bara mätning kan säga vilken ingång som hör till vilket block.

## Växlar

- 49 växlar med LT-adress ur XML, återrapport LNALTERNATE-stil på samma adress. Vx131 är omvänd i källan;
  profilen vänder ordern och rapporten en gång.
- **Vx124** (M06-120-5) finns i XML:en men saknar plats i planen. Beslut: ta in i planen eller lämna utanför.
- **Vx171, Vx172** är "Ej använd" i källan men ligger i panelen; 171 ingår rakt i alla 203 tågvägar mot Bn.
  Kontrolleras vid driftsättningen enligt [status](status.md).
- Kompisparen Vx140+Vx142 och Vx162+Vx165 bildar ingen förbindelse i ritningen (X1, X2); Studio föreslår
  Vx140+Vx143/Vx141+Vx142 och Vx162+Vx166/Vx163+Vx165. Bekräftas på banan.
- Vändskivan (L2T1–7) är manuell; ingen bindning.

## Kvar att göra vid driftsättningen

1. **Discover** mot riktiga kort: koppla kortens adresser till M00–M11 i Studio → Drift.
2. **Mät objekt**, i den här ordningen: en växel per dekoder, sedan en signal per Signal10 (stopp-order,
   vänta på SE-rapport – kommer ingen rapport är det rapportadressen eller SV23 som ska avgöras), sedan
   spårledningarna genom att belägga dem en i taget.
3. **Avgör virtuella signaler** (panelbesked eller fysiska dvärgar) och **LT307/LT308** (4/2 och L1 pekar på
   utgångar som är "Ej använd").
4. **Växelblocken utan detektering**: S155, S164, S170–172, S96b, S112b och delarna; kandidatingångarna finns i
   tabellen ovan.
5. Svenska beskedskoder för Signal10 (sju masttyper) när SE-rapporterna är inspelade.

Studio visar läget i avvikelselistan: *Signaler med bänkadress* är 0, *Spårledningar utan verklig ingång* 38,
*Virtuella signaler i JMRI utan utgång* 11, *Växeladresser ej uppmätta i fält* 49.
