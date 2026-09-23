# Manuell omläggning

Version 0.4 använder XML:s lokala villkor för **20 knappregler som omfattar 24 växlar**. En obelastad del av anläggningen kan manövreras samtidigt som en oberoende tågväg ligger i en annan del. Servern kontrollerar villkoren; panelens grå knappar visar samma spärrorsak i detaljvyn.

En manöver kräver att:

- växeln och dess uttryckligt kopplade växlar saknar tågvägslås;
- källregelns NX-vägar och berörda spårresurser saknar kvarvarande reservationer;
- lokala spårledningar har aktuella fria besked och ingen administrativ spärr;
- signaler som kan ge tillträde till det berörda området har bekräftat stopp;
- berörda växlar har aktuella lägesbesked och inte redan håller på att läggas om;
- anslutningen fungerar, lagringen är frisk och AIS är återställd.

Det krävs inte längre att varje spår på hela anläggningen är fritt. Okända eller för gamla lokala besked stoppar dock alltid manövern. Även hållna eller återställda tågvägslås skyddar växlarna tills vägen kan återtas enligt vanliga villkor.

## Källspårning och kvarvarande undantag

Logix `IX:AUTO:0007` innehåller 35 knappregler och två automatiska följdregler. JMRI 5.8 använder `logicType=1` som ALL_AND: samtliga listade variabler ingår. Det äldre sparade uttrycket med R-nummer används endast för MIXED. Därför utelämnas inte exempelvis spårledningsvillkoret i C35 på grund av en inaktuell uttryckstext.

20 regler är anslutna och provade. 15 spärras, även om operatören väljer en enskild växel i detaljvyn: fem knappgrupper saknar fullständig verifierad koppling i layouten och tio regler kräver `rsAckRangeFri`, vars rangeröverlämning ännu inte är införd. Inga gruppnamn används som gissning om fysisk samverkan. Automatiken mellan Vx95 och Vx96 i C33/C34 återstår och är inte en ständig koppling mellan växlarna.

Växelns eget block kontrolleras även när källregeln inte uttryckligen nämner en spårledning (Vx171/Vx172). Detta är ett avsiktligt strängare villkor i ersättningen. Signaler som skyddar området härleds från den anslutna profilens signalavsnitt. Denna funktion är provad mot anläggningssimulatorn; fysiska MGP-bindningar och externa rangerbesked är inte verifierade.

## Körbeskedets ordning

Ett regressionstest visade att ett körbesked som kom före körordern kunde accepteras när både rapport och order hade samma millisekundvärde. Nu krävs en rapportsekvens efter den senaste körordern. Ett oväntat körbesked under växelläggning, etablering eller klarsättning håller vägen i stopp med reservationerna kvar. Ett prov med omsänd order vid identisk tidpunkt visar att föregående rapport inte återanvänds.

Sekvensen anger mottagningsordning i TKL. LocoNet-telegrammen innehåller inte något nytt korrelations-ID till en specifik order; därför är detta inte en verifiering av fysisk utrustnings interna tidpunkt eller av transportfördröjda besked. Inspelad fysisk trafik behövs fortfarande för driftsättningen.


## Förtydligande av C33/C34 inför fortsatt arbete

Källkontroll 23 september: båda reglerna använder variabeltyp4, som i JMRI Conditional.java betyder TURNOUT_CLOSED (typ3 är THROWN). C33 läser Vx95 och skickar en SET_TURNOUT-åtgärd till Vx96 med data2 vid sant. C34 gör motsvarande från Vx96 till Vx95. C33:s enda variabel har triggersCalc=no; C34 har triggersCalc=yes. Båda reglerna har triggerOnChange=yes. Den asymmetrin måste utredas innan automatiken översätts. En ständig dubbelriktad koppling eller automatisk omläggning på varje rapport skulle inte återge källans utlösningsvillkor. Ingen sådan automatik är aktiverad i version0.10.
