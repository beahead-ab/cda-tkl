# Utfartssignaler — 0.35.0

Huvudtågvägar till de sex anslutna linjeknapparna inkluderar även utfartssignalen och spårledningen omedelbart efter den:

| Linjeknapp | Utfartssignal | Spårledning efter signalen |
| --- | --- | --- |
| Bu | U1 | SU1A |
| Bn | N1 | SN1A |
| Au | U2 | SU2A |
| An | N2 | SN2A |
| Cu | U4 | SU4A |
| Cn | N4 | SN4A |

Tidigare slutade skyddsvägen vid signalen, som då låg kvar som stoppgräns. Nu reserveras även linjedetektorn och utfartssignalen ingår sist i signalföljden. Klarställningen sker därför från utfarten tillbaka mot starten, med vanlig återrapport före nästa signal. Det är en ändring i driftmodellen, inte en grön ikon som målas av gränssnittet.

Kopplingen verifieras mot XML:s ankare, riktning och linjeknappens spårledning vid generering. Ingen signal väljs efter närhet på skärmen. Ingen ny detektoradress införs. Belagt, okänt eller spärrat linjespår hindrar utfart; signalvägran hindrar bakomliggande signaler från att klarställas. Passage och återtagning återställer signalerna via den vanliga kärnlogiken.

Mål inne på stationen och växeltågvägar behåller sina befintliga stoppgränser. D/L1 saknar ansluten huvudtågväg i källprofilen och aktiveras inte av denna ändring. Fysisk MGP-mappning är fortfarande inte driftsatt.

Verifiering omfattar alla 210 huvudtågvägars etablering och passage samt särskilda fall för varje utfart: reserverad linjedetektor, beläggning, stopp i motsatta signaler, återtagning och vägrad signal. Den fullständiga testsviten omfattar även linjespärrar, fel, växeltågvägar och utökade tågvägar.
