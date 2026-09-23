# Nästa manöverfält – verifierade källfakta

## Rangeröverlämning

`rsAckRangeFri` är faktiskt definierad som **LS931**, inte som intern IS-sensor. `rsAckRangeRet` är **LS933**. Adresserna finns alltså i XML; fysisk trafik och returtelegrammens betydelse är fortfarande inte uppmätta. De tio manuella knappregler som använder rsAckRangeFri kräver INACTIVE.

Regel0006C3 har följande två grenar (åtgärdsalternativ1=sant,2=falskt,3=båda):

| rsAckRangeFri | Panelåtgärd | Områdesåtgärd | rsAckRangeRet |
|---|---|---|---|
| Aktiv | rtvlock via HandlePanel | lockRange via HandleFreeArea | INACTIVE |
| Inaktiv | rtvunlock via HandlePanel | freeRange via HandleFreeArea | ACTIVE |

Områdets exakta omfattning ligger i saknade skript. Innan en ersättning aktiveras ska området definieras uttryckligen genom källans beroenden, befintliga tågvägar hållas eller avvisas korrekt och återrapport ske över telegramgränsen. TKL får inte läsa simulatorns interna läge. Ingen sådan överlämning är aktiverad i0.4.

## Nödåtertagning

Nodutlosning(IS290) aktiverar enligt0016C1 Nödutlösning indikering(IS291), som släcks efter1sekund. Indikeringen pulserar AIS och sätter minnet Tågmöte till NEJ via0016C2.

Grupp0018 innehåller137 regler: NX_ACTIVE(typ35) och Nödutlösning indikering ACTIVE utlöser NXPAIR_SEGMENT(åtgärd53). Det är ett växlingskommando till NX-funktionen, inte en explicit frihetskvittens från anläggningen. Fyra regler(C35–C38) ger två NX-kommandon vardera; därför finns141 åtgärder. Dessa ska inte köras som generell blind växling i en ny kärna.

Införd och provad ersättning i version 0.5: begär stopp i alla signaler, begär återtagning av redan reserverade vägar och behåll varje lås tills den vanliga frigivningskontrollen har färska stoppbesked samt fria och kända resurser. AIS kan kvarstå tills operatören återställer den. Detta är avsiktligt strängare än en kort indikeringspuls och innebär inte att tvångsutlösning av belagt eller okänt område införs.

## Lokal/fjärr

0006C16 kräver Lokalstyrd ACTIVE och tvactive INACTIVE före växling av Lokalbevakad indikering.0006C15 växlar Fjärrbevakad indikering och anropar HandlePanel med pnlunlock eller pnllock. Skriptet saknas. En ersättning behöver därför definiera serverns manöverbehörighet, kontrollera alla kvarvarande reservationer och hålla AIS/nödåtertagning tillgängliga även när vanlig lokal manövrering är spärrad. Fjärrläge innebär inte att TrainMeet redan är anslutet.

Version 0.5 inför det beständiga manöverläget och nödåtertagningen ovan. Se [handhavande och lagringsformat](manoverlage-och-nodatertagning.md). Rangeröverlämning och Tågmöte-minnets driftfunktion återstår.
