# Genomgång av moduler, spårledningar, växlar och signaler mot MGP-modulerna

6 oktober 2026, version 0.67.0, kompletterad med bedömningarna i 0.67.1, signalrapporten per profil i 0.68.0 och
AI-analysen av XML:en den 8 oktober (0.72.2, [sist i dokumentet](#ai-analys-av-cda60xml-8-oktober-0722)).
**Publicerad: 0.71.1** (cda-tkl main `96461c9`, `beahead-ab/cda-tkl-install` main `018de42`, 7 oktober); webbdriften
tar den med Uppdatera nu under Inställningar → Uppdatering, eller `sudo charlottendal-update` på servern. Sedan
0.71.0 ligger allt som nämns här i Studio: driftbindningarna under Driftsättning → Driftbindningar, Mät objekt och
Kort och MGP under Driftsättning, källan under Data → Källa (XML) och avvikelserna under Genomgång. Underlag: Bennys `Cda60.xml` (källversion `c69a865ae9a8`), panelgeometrin,
driftprofilen och Studios register. XML:en är kvar som fallback och källa; ingenting i den har ändrats.

Frågan var: hänger allt ihop mot de riktiga LocoNet-modulerna? Svaret före genomgången var nej på två
punkter som hade stoppat driftsättningen helt, och ja med anmärkningar på resten.

## Vad som ändrats i 0.67.0

| Objekt | Före | Nu |
|---|---|---|
| 49 växlar | LT-adressen ur XML (95–172), Vx131 omvänd | Oförändrat |
| 66 signaler | Bänkadresser 1501–1566, ingen koppling till någon utgång | 53 master bundna till sin huvudutgång LT200–LT325 ur XML; 11 virtuella master utan utgång och 2 (4/2, L1) på utgångar märkta "Ej använd" räknas som panelbesked |
| 197 spårledningar | Bänkadresser 3001–3132, ingen koppling till någon ingång | 161 bundna till LS-ingångarna ur XML (20 med flera ingångar); 36 utan ingång i källan behåller bänkadress |
| Kärnan | Väntade på rapport från alla 66 signaler | Bekräftar de 13 panelsignalerna själv; väger flera ingångar per spårledning |
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

**Rapportadressen är samma som orderadressen, och rapporten är B1.** Före 0.76.0 antog profilen SE-telegram (E4 09)
ur det publicerade CZ-exemplet; [Bennys monitorering den 9 oktober](#bennys-loconet-monitorering-9-oktober-0760)
visar att korten rapporterar signalerna som växlar, med B1 på samma adress och ingen E4. Sedan 0.76.0 är
växelrapporten standard (CLOSED = kör, THROWN = stopp enligt Cda60.xml:s mastdefinitioner); SE finns kvar som val
per profil och per signal i driftbindningarna (Studio → Driftsättning → Driftbindningar) om någon mast skulle visa sig
sända E4. Bekräftas per signal vid Mät objekt.

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

- 132 spårledningar med en ingång, t.ex. S100 → LS60 (M02-21-1). En JMRI-regel kan sätta flera
  spårledningar: SN1B sätter även S170 (LS199) och "S95/96 kors" sätter S95b och S96b (LS13).
- 20 med flera ingångar och JMRI:s "någon av"-logik, t.ex. SIA → LS90 **eller** LS100 (M04 och M05),
  SG53 → LS73/LS97/LS107/LS117 (fyra moduler längs godsspår 53).
- 9 växelberoende delar (S100b, S101a, S110a/b, S117a, S120a/b, S125a/b) där JMRI väljer ingång efter
  växelläge; förenklade till ingången. **S100a** läser den interna sensorn slS100 i stället för en ingång; sedan 0.72.2 följs kedjan till LS60 (se AI-analysen).
- Polariteten är antagen: aktiv = belagd.
- Tågvägens passage (ordnad beläggning och frigivning) följer spårledningens första ingång; beläggningen
  för låsning och konflikter väger alla ingångar. Ett tåg som kommer in i SIA från LS100-änden räknas
  som belagt direkt men som passerat först när LS90 sett det.

En fysisk detektor matar ofta flera JMRI-block (LS72 → S112, S113, S116 med delar; LS174 → S151, S152, S154
med delar). Det är avsiktligt i Bennys anläggning – en detektor per växelgata – och profilen speglar det.
Driftbindningarnas katalog har därför en rad per adress: alla block på samma detektor ändras tillsammans.

**36 spårledningar stod kvar på bänkadress** (35 sedan 0.72.2, när S100a fick LS60) (3001+) för att källan inte har någon ingång:

- 16 är inte spår (vägövergångarnas lampor v1–v4, perronger, ram, vändskiva).
- 11 har ingen sensor: Slokstall1–9, SL1a, SL1b (lokstallet och linje D).
- 8 har en sensor men ingen regel: S112b, S155, S155b, S155c, S164, S164b, S171, S172.
- S100a enligt ovan (bunden till LS60 i 0.72.2).

Växelblocken utan regel är intressanta: Vx155 (vändskivans tillfart), Vx164 (3d:s gränsväxel) och
M11:s växlar 171–172. Ingen tågväg kräver fri spårledning där i dag, men tågvägar över Vx164 och Vx171
har ingen beläggningskontroll av själva växelblocket. Kandidater bland de obundna ingångarna finns (se
bedömningen nedan) men inget binds utan mätning.

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
| M07 | Vx130–133 (130-1…4), ProgSpår LT134 (130-5) | LT260–269: 1/8, 2/8, 3/8, 4/8, 5/8, 6/8; LT428–439 | LS140–149 | Alla modulens ingångar bundna. LS149 "Godsspå vx133" utan modulkommentar och utan block. |
| M08 | Vx140–144 (140-1…5) | LT270–279: 1/6, 2/6, 1/9, 2/9, 5/9; LT310–311: 6/9, SXv; LT440–451 | LS150–164 | Användarnamnen är förskjutna ett steg (LS158 heter Sp08-159 … LS164 heter Sp08-165) och LS163 har skrivfelet "M08-03-4". Systemnumret är det som går på bussen. LS150, 151, 161, 164 saknar block. LT312–319 "Ej använd". |
| M09 | Vx150–155 (150-1…5, 155-1) | LT280–289: 1/11, 2/11, 3/9, 4/9, 10/11; LT320–325: 3/11, 3/6, 6/11; LT452–461 | LS170–178 | LS172, 173 saknar block. LT156–159 "Ej använd". |
| M10 | Vx160–166 (160-1…5, 165-1, 165-2) | LT290–299: 1/4, 2/4; LT462–467 | LS190–199 | LS195 saknar block. LT167–169, LT292–299 "Ej använd". |
| M11 | Vx170, (Vx171, Vx172 "Ej använd") | LT300–309: 1/2, 2/2, U1, N1, SIIIdö, 3/2 (LT305 utan namn, LT306 D3/2) | – | Kommentarerna säger "M11-165-x" men adresserna är 170–174: basadressen 165 är M10:s, M11:s dekoder sitter rimligen på 170. LS200–204 (Sp11-200…204) saknar modulkommentar; 202–204 är bundna (SIIId, SU1a, SN1a), 200–201 inte. **LT307 (4/2) och LT308 (L1) är märkta "Ej använd" men bär signalmaster.** |

Obundna fysiska ingångar totalt: 87. Av dem är 40 panelens egna knappar och lampor (LS901–940: frigivning,
tågvägsväljare, Broker/Nattpanel/Rangerpanel, ProgOn), 24 helt namnlösa (LS4, LS179, LS205–215, LS220–229,
LS4095), 3 namngivna utan modul (LS149, LS200, LS201) och 20 har en modul men ingen spårledning – se tabellen.
Dessa är kandidaterna när växelblocken utan regel ska få detektering, men bara mätning kan säga vilken
ingång som hör till vilket block.

## Konstigheterna och min bedömning

Vad som är rätt, objekt för objekt. "Gjort" betyder att profilen redan följer bedömningen; "mät" betyder att
beslutet tas med Mät objekt på banan.

| Konstighet | Vad källan säger | Bedömning | Gjort / mät |
|---|---|---|---|
| **4/2 och L1 på LT307/LT308 "M11-Ej använd"** | Masterna finns i panelen vid linje D:s ände och pekar på två kanaler Benny märkt oanvända. Linje D har inga tågvägar, SL1a/SL1b har ingen sensor. | Signalerna är inte inkopplade; linje D är inte i drift. Att vänta på rapport från dem hade låst AIS för hela stationen utan att ge något. Rätt är att räkna dem som panelbesked, som de elva virtuella. | Gjort i 0.67.1. Svarar LT307/308 ändå vid mätningen är bindningen en rad i generatorn. |
| **Elva virtuella master** (3/1, 6/5–9/5, 6/6, 6/7, 6/10–9/10) | VirtualSignalMast utan utgång. Dvärgar på godsspår 51–54, lastspåren och mot lokstall/kolgård, alltså rangerbangården. | Där lägger rangeraren växelgator för hand och det finns inga fysiska dvärgar; Benny lät panelen visa beskedet. Behåll som panelbesked. 3/1 är undantaget: utgången D3/1 (LT214, M02) finns, så en fysisk dvärg finns troligen vid 3/1 men var aldrig kopplad till masten. | Gjort. Mät: beställ LT214 CLOSED och se om dvärgen vid 3/1 tänder kör; då binds 3/1. |
| **S170 "utan regel"** | Regeln SN1B sätter både slSN1b och slS170 från LS199. Inventeringen läste bara första spårledningen i varje regel. | Benny menade att Vx170 ligger i SN1b:s detektoravsnitt. Rätt är LS199, delad med SN1B och S166a. | Gjort i 0.67.1 (S170 → LS199, S95b/S96b → LS13 på samma sätt). |
| **S171, S172** | Sensorer utan regel; LT171/LT172 "Ej använd". | Vx171 ligger rakt i alla 203 tågvägar mot Bn men dess kanal är oanvänd: växeln är troligen fast eller handlagd. Rätt är att vänta på mätningen (Caspers beslut 6 oktober), inte gissa. | Mät adress 171: svarar den inte, märks den fast i profilen. 172 rörs inte. |
| **Vx124 (M06-120-5)** | Finns i växeltabellen och i Vxi-indikeringen och panelåterställningen, men i ingen tågväg och inte i planen. | En reserverad eller borttagen växel på M06:s dekoder. Ingenting i driften behöver den. Rätt är att lämna den utanför planen. | Inget görs. Står kvar i Studio som "utan plats i planen" tills Casper säger var den sitter. |
| **M11:s kommentarer "M11-165-x"** | Adresserna är 170–174; basadress 165 är M10:s andra Servo5. | Skrivfel i kommentaren. Adressen på bussen är det som gäller, och den är 170. | Inget görs. Studio visar både kommentar och adress. |
| **M08:s ingångar Sp08-159…165 på LS158–164, "M08-03-4"** | Användarnamnen är förskjutna ett steg mot systemnumren från LS158 och framåt; LS163 har en felskriven modulkommentar. | Skrivfel i etiketterna. Logixreglerna pekar på systemnumret (t.ex. S140 → Sp08-161 = LS160), så bindningen är rätt. | Inget görs. Namnen är bara etiketter. |
| **LS124 "M06-63-5, S125a"** | Kommentaren säger S125a, men S125a:s regel använder LS121 (S125:s detektor) med växelvillkor. LS124 används ingenstans. | Benny drog troligen en egen detektor för S125a (ingången finns och heter så) men regeln blev aldrig ändrad. Rätt är sannolikt LS124, men XML:en säger LS121. | Mät: belägg S125a och se om LS124 slår; då byts S125a till LS124 som egen spårledning. Tills dess LS121. |
| **Växelblock utan regel** (S112b, S155 med delar, S164 med delar, S171, S172) | Sensorer finns, regel saknas. Obundna ingångar med modul: M03 76, 79, 81–84; M09 172, 173; M10 195; M11 200, 201. | Per modul passar det nästan ett till ett: M10 har en obunden ingång (LS195) och ett odetekterat växelblock (Vx164); M09 har LS172/173 för Vx155; M11 LS200/201 för Vx171/172. Bedömningen är att Benny drog detektorer till växelblocken men aldrig skrev reglerna. | Mät: en vagn på varje växelblock, se vilken ingång som slår. Binds när mätningen visar det, inte förr. |
| **Signalernas rapportadress** | JMRI använde feedback MONITORING på LT-utgången, alltså växelmeddelandet (B1), inte SE-telegrammet (E4). | **Avgjort 9 oktober:** Bennys monitorering visar B1 på signalens egen adress och ingen E4. Korten rapporterar i B1:s ingångsformat, som TKL före 0.76.0 inte läste alls. | **Gjort i 0.76.0:** B1 är standard i profilen och avkodaren läser ingångsformatet. SE finns kvar som val. Mät: bekräfta per signal, och se vilka utgångar som inte rapporterar alls (se nedan). |
| **Kompisparen i X1 och X2** | Vx140+Vx142 och Vx162+Vx165 bildar ingen förbindelse i ritningen. | **Rättat 8 oktober:** paren i profilen kommer ur XML:en, inte ur knappgrupperna: spårplanens växlar anger varandra som andra växel (`TO3 Vx140 secondturnoutname="Vx142"`, `TO7 Vx162 → Vx165`), och JMRI beordrar då båda tillsammans. Studios förslag (140+143, 141+142; 162+166, 163+165) är diagonalerna genom korsningarna, inte en koppling i källan. | Mät: lägg paren och se vilka tungor som rör sig. |
| **M00 med tre ingångar** | LS1–3 (SU2a, SN2a, SIIIe) utan dekoder i kommentarerna. | En fristående detektormodul vid utfarten mot Au/An. Inget fel. | Inget görs. |

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

1. **Discover** mot riktiga kort: koppla kortens adresser till M00–M11 i Studio → Driftsättning → Kort och MGP.
2. **Mät objekt**, i den här ordningen: en växel per dekoder, sedan en signal per Signal10 (stopp-order,
   vänta på SE-rapport – kommer ingen rapport är det rapportadressen eller SV23 som ska avgöras), sedan
   spårledningarna genom att belägga dem en i taget.
3. **Prova LT214 (3/1) och LT307/LT308 (4/2, L1)**: tänder något blir de fysiska signaler igen.
4. **Växelblocken utan detektering**: S155, S164, S171, S172, S112b och delarna; kandidatingångarna står i
   bedömningen ovan.
5. Svenska beskedskoder för Signal10 (sju masttyper) när SE-rapporterna är inspelade.

Studio visar läget i avvikelselistan: *Signaler med bänkadress* är 0, *Spårledningar utan verklig ingång* 35 (36 före 0.72.2),
*Virtuella signaler i JMRI utan utgång* 13, *Växeladresser ej uppmätta i fält* 49.

## AI-analys av Cda60.xml (8 oktober, 0.72.2)

Casper bad om en genomgång med AI av det som återstod: spårledningarna utan regel, de växelberoende delarna, kryssväxlarna
X1/X2 och ändarna av spår 11–13. Analysen läste varje regel (conditional), spårplanens geometri och sensorernas namn och
kommentarer. **(X)** = står i XML:en, **(S)** = slutsats. Inget av (S) binds förrän mätningen visar det.

**Rättat i 0.72.2:** S100a har en regel. `IX:AUTO:0002C77 "S100a"` sätter `slS100c` när `slS100` är aktiv och Vx100 ligger
CLOSED; `slS100` sätts av regeln S100 (C24) från Sp02-60 = LS60 (X). Inventeringen följde bara LS-sensorer och tappade
omvägen. Nu följs kedjan: S100a har adress 60 som S100 och S100b, och ligger inte längre på bänkadress. S100a ingår i 44
tågvägar; mot riktig utrustning hade de väntat på en rapport som aldrig kom.

### Spårledningar utan regel

| Sektion | Förslag | Säkerhet | Belägg |
|---|---|---|---|
| S164 | LS195 | medel–hög (S) | M10:s kanalordning 190 S160, 191 S161, 192 SIIId, 193 S162, 194 S163, **195 –**, 196 S165, 197 S166; luckan står där 164 hör hemma, och LS195 är M10:s enda obundna ingång. Logixen "Vx164" kräver att slS164 är inaktiv, men ingen regel sätter den. |
| S164b | LS195 med Vx164 THROWN | medel (S) | Blockkommentaren "Vx164 thrown"; samma mönster som S100b, S110b, S120b, S125b. |
| S112b | LS72 med Vx112 THROWN | medel (S) | Blockkommentaren "Vx112 thrown"; syskonet S112a läser slS112 = LS72. Alternativ: LS62 eller en obunden M03-ingång (låg). |
| S155 | LS172 eller LS173 | medel att det är en av dem, låg för vilken (S) | LT155 är M09-155-1; M09-91-3/91-4 är namngivna men oanvända. |
| S155b, S155c | samma ingång som S155, med Vx155 THROWN respektive CLOSED | låg (S) | Blockkommentarerna "Vx155 thrown"/"closed". |
| S171 | LS199 | medel (S) | Banan går S166a (LS199) → S170 (LS199) → S171 → SN1B (LS199); S171 ligger mellan två block på samma detektor. S171/S172 är de sist skapade blocken och regeln skrevs troligen aldrig. |
| S172 | LS200 eller LS201, osäkert | låg | Vx172 leder till en stoppbock; LT172 "Ej använd"; ingen tågväg. LS200/201 kan lika gärna höra till linje D. |
| S125a | LS124 eller LS121 med Vx125 CLOSED | medel (S) | Kommentaren "M06-63-5, S125a"; LS124 används ingenstans, regeln C85 läser LS121. |

Biprodukter: LS113 (M06-61-4, mellan SIIIa och SVa) är troligen SIVA:s (spår 12) högra ände, och LS150/151
(M08-81-1/2) troligen andra detektorn för SIB och SIIB (S). De obundna ingångarna nämns ingenstans utanför sin
egen definition (X). M08:s förskjutna användarnamn påverkar inte bindningarna; systemnumren gäller (S).

### De växelberoende delarna

Alla regler har logicType 1 (alla villkor) och utlöses av både ingång och växel (X).

| Sektion | JMRI-regel (X) | Profilen | Växelmedveten modell |
|---|---|---|---|
| S100a | slS100 (LS60) och Vx100 CLOSED | LS60 sedan 0.72.2 | LS60 vid CLOSED |
| S100b | LS60 och Vx100 THROWN | LS60 | LS60 vid THROWN |
| S101a | LS64 och Vx101 CLOSED | LS64 | LS64 vid CLOSED; LS64 bär även S101 och S102 |
| S110a / S110b | LS70 och Vx110 CLOSED / THROWN | LS70 | efter Vx110 |
| S117a | LS71 och Vx117 CLOSED | LS71 | LS71 utan villkor: i JMRI försvann beläggningen när växeln låg THROWN |
| S120a | LS110 och Vx120 CLOSED | LS110 | LS110 utan villkor, av samma skäl |
| S120b | LS119 och Vx120 THROWN | LS119 | LS119 vid THROWN; S120 är LS119 utan villkor |
| S125a / S125b | LS121 och Vx125 CLOSED / THROWN | LS121 | efter Vx125 (S125a möjligen LS124) |

Låsning och konfliktkontroll läser fortsatt ingången utan villkor, som profilen gör: det är säkert även när växeln är i
rörelse eller okänd. Växelvillkoret ska bara avgöra **vilket ben** tåget står på, för tågspårning, passageordning och frigivning.

### Kryssväxlarna X1 och X2

Detekteringen beror inte på växelläge; en ingång per kvadrant (X): X1 Vx140 LS160, Vx141 LS159, Vx142 LS163, Vx143 LS162;
X2 Vx162 LS193, Vx163 LS194, Vx165 LS196 (S165a LS198), Vx166 LS197 (S166a LS199). Styrkopplingen är 140+142 och 162+165
(`secondturnoutname`, X); korsningarna förbinder 140–143, 141–142, 162–166 och 163–165 (X). Knapparna C12 och C18 lägger
bara Vx140 respektive Vx162; 141, 143, 163 och 166 läggs av NX-tågvägarna och återställningen. Ingenting i XML:en kopplar
140+143. Om någon utgång är kopplad i hårdvaran kan bara mätning visa.

### Ändarna av spår 11–13 (SIIIA, SIVA, SVA)

- **Vänster:** nio block (S112, S112a, S113, S113a, S113b mot spår 11, S113c, S116, S116c mot spår 12, S116a mot spår 13)
  på **LS72** utan villkor. Var tåget står kan bara räknas fram ur lägena på 112, 113 och 116.
- **Höger:** S123, S123a, S123b (spår 11), S123c (spår 12), S126, S126c (spår 13) på **LS122**; S126a, S131, S131a, S131c
  på **LS147**; S121/S121b på LS120; S122 på LS111; S120/S120b och S125 med delar enligt tabellen ovan.
- Spåren själva: SIIIA = LS92/LS102/LS78/LS112, SIVA = LS93/LS103, SVA = LS94/LS104/LS114 (någon av).

En begränsning går inte att lösa i mjukvaran: ett tåg vid 4/10 håller LS72 belagd och fördröjer därmed frigivningen av en
tågväg över 3/10.

### Mätningar som avgör förslagen

1. **S164:** vagn på Vx164 → slår LS195? Lägg Vx164 THROWN, flytta till S164b: samma ingång eller LS172/173?
2. **S155:** vagn på Vx155 → LS172 eller LS173? Flytta till S155b och S155c.
3. **S112b:** vagn mellan Vx112:s C-ben och A49 → LS72 (mönstret), LS62 (hör till S103a) eller en obunden M03-ingång.
4. **S100a:** Vx100 CLOSED, vagn på S100a → LS60 ska slå.
5. **S125a:** vagn på benet Vx125 → A4: slår LS124 men inte LS121, byt S125a till LS124.
6. **S171:** vagn på Vx171 → LS199 (SN1b:s avsnitt) eller LS200/201 (egen detektor).
7. **S172:** vagn på stumpen mot stoppbocken → LS200, LS201 eller inget.
8. **SIVA:** vagn i spår 12:s högra ände → LS113? Vänstra änden → LS79?
9. **X1/X2:** beordra bara LT140 THROWN och se vilka tungor som rör sig; samma med LT162.

## Bennys LocoNet-monitorering (9 oktober, 0.76.0)

Benny monitorerade LocoNet i JMRI på sin bana (växlar Vx22c–Vx34, signaler 1/4–4/7, LS6–LS221; inte Charlottendals
adresser, men samma slags MGP-kort) och skickade telegrammen med JMRI:s tolkning. Uppstarten (JMRI ställer allt i
normalläge) och MGP-appen är inte monitorerade än. Ramarna ligger ordagrant i `test/benny-monitoring.test.mjs`.

**Vad telegrammen visar**

| Del | Telegram | Vad det betyder för TKL |
|---|---|---|
| Växelorder | `B0 06 10 59` ON, sedan `B0 06 00 49` OFF | Som vi sänder, men JMRI sänder också OFF. Sedan 0.76.0 sänder transporten OFF 200 ms efter ON. |
| Växelrapport | `B1 06 60 28` = Thrown, `B1 06 70 38` = Closed | **B1 i ingångsformatet** (bit 6 satt, bit 5 = växelingång, bit 4 = läge). TKL:s avkodare räknade det som *unsupported*: mot riktig bana hade ingen växel- eller signalrapport någonsin lästs. Rättat i 0.76.0; simulatorn sänder nu samma format. |
| Sensorrapport | `B2 6D 70 50` = LS220 High | Som vi läser. |
| Signal | `B0 72 30 0D` + `B1 72 70 4C` för 4/7 | **Signalerna hanteras som växlar**: order B0 och rapport B1 på samma adress, ingen E4. På Bennys bana är stopp = Closed och kör = Thrown; Charlottendals XML definierar det omvända (Stop/Unlit = thrown, Clear/Lit = closed), och profilen följer XML:en. |
| Utan rapport | LT4 (Vx22c), LT124 (1/4), LT125 (2/4), LT130 (S4s) | Fyra utgångar svarade inte med B1 alls. Kärnan kräver rapport från varje växel i vägen och varje fysisk signal, så sådana objekt stoppar driftsättningen tills de är märkta (virtuella signaler, fast växel). Mät objekt visar vilka Charlottendal-utgångar som svarar. |
| SV2 | `E5 10 01 02 02 10 06 00 15 00 10 00 00 00 00 18` läser SV21 på kort 6 (svar 6); skrivning av SV178 | Byte för byte som Studio sänder. SV21 = adressen (servo 1; servo 2 får +1). **SV178 = ingångarnas belagd-nivå** (0 = belagd vid låg, 1 = belagd vid hög): när Benny bytte värde rapporterade alla fem ingångar LS6–LS10 om med motsatt nivå. Det är polariteten profilen antar ("aktiv = belagd") och kan läsas per kort. |

**Gjort i 0.76.0:** avkodaren läser B1:s ingångsformat (hjälpingången, bit 5 noll, är inget läge); simulatorn rapporterar
i ingångsformatet; transporten pulsar ON/OFF; profilens signalrapport är B1 (`signalReport.kind = switch`), SE kvar som
val; `MGP_SV` namnger SV21 och SV178. Provat mot Bennys ramar och mot kärnan.

**Kvar:** monitorera uppstarten (vad korten sänder när de får ström, och om något svarar på en avfrågning), MGP-appens
avläsning, och på Charlottendal: vilka utgångar som rapporterar, och SV178 per kort.
