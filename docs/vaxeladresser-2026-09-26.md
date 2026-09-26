# Växeladresser – avstämning mot Cda60.xml

Kontroll av original-XML, panelobjekt, anläggningsregister, driftprofil, simulatorprofil och manuella växelgrupper.

XML SHA-256: `c69a865ae9a85cdb842d70c34d2573dde4b11c50f601a561d5b941136ac6fa87`.

Samtliga 49 panelväxlar har entydig LocoNet-adress enligt originalet. Inga adressrättningar behövdes.
Inverteringen för Vx131 är bevarad. Adresserna är källverifierade; fysisk dekoderprogrammering har inte mätts.

| Layoutobjekt | Växel | JMRI-systemnamn | LocoNet-adress | Inverterad | Modulreferens i XML |
|---|---|---|---:|---|---|
| TO36 | Vx95 | LT95 | 95 | Nej | M01-95-1 |
| TO45 | Vx96 | LT96 | 96 | Nej | M01-95-2 |
| TO1 | Vx100 | LT100 | 100 | Nej | M02-100-1 |
| TO4 | Vx101 | LT101 | 101 | Nej | M02-100-2 |
| TO11 | Vx102 | LT102 | 102 | Nej | M02-100-3 |
| TO5 | Vx103 | LT103 | 103 | Nej | M02-100-4 |
| TO6 | Vx110 | LT110 | 110 | Nej | M03-110-1 |
| TO42 | Vx111 | LT111 | 111 | Nej | M03-110-2 |
| TO12 | Vx112 | LT112 | 112 | Nej | M03-110-3 |
| TO18 | Vx113 | LT113 | 113 | Nej | M03-110-4 |
| TO25 | Vx114 | LT114 | 114 | Nej | M03-110-5 |
| TO38 | Vx115 | LT115 | 115 | Nej | M03-115-1 |
| TO29 | Vx116 | LT116 | 116 | Nej | M03-115-2 |
| TO10 | Vx117 | LT117 | 117 | Nej | M03-115-3 |
| TO35 | Vx118 | LT118 | 118 | Nej | M03-115-4 |
| TO28 | Vx119 | LT119 | 119 | Nej | M03-115-5 |
| TO27 | Vx120 | LT120 | 120 | Nej | M06-120-1 |
| TO37 | Vx121 | LT121 | 121 | Nej | M06-120-2 |
| TO9 | Vx122 | LT122 | 122 | Nej | M06-120-3 |
| TO31 | Vx123 | LT123 | 123 | Nej | M06-120-4 |
| TO19 | Vx125 | LT125 | 125 | Nej | M06-125-1 |
| TO30 | Vx126 | LT126 | 126 | Nej | M06-125-2 |
| TO33 | Vx127 | LT127 | 127 | Nej | M06-125-3 |
| TO34 | Vx128 | LT128 | 128 | Nej | M06-125-4 |
| TO32 | Vx130 | LT130 | 130 | Nej | M07-130-1 |
| TO26 | Vx131 | LT131 | 131 | Ja | M07-130-2 |
| TO24 | Vx132 | LT132 | 132 | Nej | M07-130-3 |
| TO23 | Vx133 | LT133 | 133 | Nej | M07-130-4 |
| TO3 | Vx140 | LT140 | 140 | Nej | M08-140-1 |
| TO44 | Vx141 | LT141 | 141 | Nej | M08-140-2 |
| TO39 | Vx142 | LT142 | 142 | Nej | M08-140-3 |
| TO22 | Vx143 | LT143 | 143 | Nej | M08-140-4 |
| TO21 | Vx144 | LT144 | 144 | Nej | M08-140-5 |
| TO2 | Vx150 | LT150 | 150 | Nej | M09-150-1 |
| TO17 | Vx151 | LT151 | 151 | Nej | M09-150-2 |
| TO16 | Vx152 | LT152 | 152 | Nej | M09-150-3 |
| TO15 | Vx153 | LT153 | 153 | Nej | M09-150-4 |
| TO20 | Vx154 | LT154 | 154 | Nej | M09-150-5 |
| TO41 | Vx155 | LT155 | 155 | Nej | M09-155-1 |
| TO13 | Vx160 | LT160 | 160 | Nej | M10-160-1 |
| TO14 | Vx161 | LT161 | 161 | Nej | M10-160-2 |
| TO7 | Vx162 | LT162 | 162 | Nej | M10-160-3 |
| TO43 | Vx163 | LT163 | 163 | Nej | M10-160-4 |
| TO0 | Vx164 | LT164 | 164 | Nej | M10-160-5 |
| TO40 | Vx165 | LT165 | 165 | Nej | M10-165-1 |
| TO8 | Vx166 | LT166 | 166 | Nej | M10-165-2 |
| TO46 | Vx170 | LT170 | 170 | Nej | M11-165-1 |
| TO48 | Vx171 | LT171 | 171 | Nej | M11-165-2 Ej använd |
| TO47 | Vx172 | LT172 | 172 | Nej | M11-165-3 Ej använd |

## Källobjekt utan plats i spårplanen

- **Vx124 → LT124**: M06-120-5. Ingen layoutväxel anger detta namn; ingen driftbindning eller manöver har lagts till på en gissad position.

Övriga JMRI-turnoutobjekt omfattar bland annat interna Vxi-objekt och Vxo-objekt på den separata L2-anslutningen. Dessa ersätter inte panelväxlarnas LT-adresser.

## Manöverbegränsningar som inte är adressfel

- **vxv102/112**: Knappgruppens fullständiga växelkoppling är inte verifierad i XML-layouten.
- **vxv131/132**: Knappgruppens fullständiga växelkoppling är inte verifierad i XML-layouten.
- **vxv140/141/142/143**: Knappgruppens fullständiga växelkoppling är inte verifierad i XML-layouten.
- **vxv144/154**: Knappgruppens fullständiga växelkoppling är inte verifierad i XML-layouten.
- **vxv162/163/165/166**: Knappgruppens fullständiga växelkoppling är inte verifierad i XML-layouten.
- **vxv114**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv119**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv115**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv111/118**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv127**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv128**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv130**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv133**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv150**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.
- **vxv155**: Rangeröverlämningen är ännu inte ansluten; manuell omläggning är spärrad.

Flera knappar saknar alltså godkänd manöverregel trots korrekta adresser. Koppling mellan växlar och rangeröverlämning måste granskas separat; adresserna ska inte ersättas för att kringgå dessa villkor.

## Produktionskontroll 26 september 2026

Körande TKL från 545e649 har samma 49 växelbindningar. Aktiv driftinställningsversion är 0, utan adressöverstyrningar eller växeländringar i utkast. Granskningen är läsande; inga växlar manövrerades.
